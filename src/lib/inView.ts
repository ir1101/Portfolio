import { useEffect, useRef, useState, type RefObject } from "react";

// One shared observer for every one-shot reveal on the page.
const callbacks = new WeakMap<Element, () => void>();
let shared: IntersectionObserver | null = null;

function observer() {
  if (!shared) {
    shared = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          callbacks.get(e.target)?.();
          callbacks.delete(e.target);
          shared!.unobserve(e.target);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
  }
  return shared;
}

/** True once the element has entered the viewport. Never flips back. */
export function useInViewOnce<T extends Element>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    callbacks.set(el, () => setInView(true));
    observer().observe(el);
    return () => {
      callbacks.delete(el);
      observer().unobserve(el);
    };
  }, []);
  return [ref, inView];
}

/** Live visibility, for pausing work that only matters on screen. */
export function useVisible<T extends Element>(rootMargin = "0px"): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);
  return [ref, visible];
}
