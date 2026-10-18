import Lenis from "lenis";
import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "./motion";

// One scroll source for the whole page. Lenis smooths wheel input; under reduced
// motion we fall back to native scroll so nothing is interpolated.

type Listener = (y: number) => void;

let lenis: Lenis | null = null;
const listeners = new Set<Listener>();
let nativeRaf = 0;

function emit(y: number) {
  listeners.forEach((l) => l(y));
}

function onNativeScroll() {
  if (nativeRaf) return;
  nativeRaf = requestAnimationFrame(() => {
    nativeRaf = 0;
    emit(window.scrollY);
  });
}

export function initScroll() {
  if (lenis || typeof window === "undefined") return;
  if (prefersReducedMotion()) {
    window.addEventListener("scroll", onNativeScroll, { passive: true });
    return;
  }
  lenis = new Lenis({
    autoRaf: true,
    lerp: 0.11,
    wheelMultiplier: 0.9,
    syncTouch: false,
  });
  lenis.on("scroll", (l: Lenis) => emit(l.scroll));
  if (import.meta.env.DEV) {
    (window as unknown as { __jump: (y: number) => void }).__jump = (y) => lenis?.scrollTo(y, { immediate: true, force: true });
  }
}

export function headerOffset() {
  const raw = getComputedStyle(document.documentElement);
  const h = parseFloat(raw.getPropertyValue("--header-h")) || 52;
  const inset = parseFloat(raw.getPropertyValue("--header-inset")) || 12;
  return h + inset * 2;
}

export function scrollToTarget(target: string | HTMLElement | number) {
  const el = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  if (el == null) return;
  const isTop = el === 0;
  if (lenis) {
    lenis.scrollTo(el as HTMLElement | number, {
      offset: isTop ? 0 : -headerOffset() + 1,
      duration: 1.2,
    });
    return;
  }
  const y = typeof el === "number" ? el : el.getBoundingClientRect().top + window.scrollY - headerOffset() + 1;
  window.scrollTo({ top: y, behavior: prefersReducedMotion() ? "auto" : "smooth" });
}

export function lockScroll(locked: boolean) {
  if (lenis) {
    if (locked) lenis.stop();
    else lenis.start();
  }
  document.documentElement.style.overflow = locked ? "hidden" : "";
}

export function currentScroll() {
  return lenis ? lenis.scroll : window.scrollY;
}

/** Subscribe to scroll position. The callback runs on scroll frames and once on mount. */
export function useScroll(cb: Listener) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    const l: Listener = (y) => ref.current(y);
    listeners.add(l);
    l(currentScroll());
    const onResize = () => l(currentScroll());
    window.addEventListener("resize", onResize);
    return () => {
      listeners.delete(l);
      window.removeEventListener("resize", onResize);
    };
  }, []);
}
