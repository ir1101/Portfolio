import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { sections, site } from "../content";
import { useIstClock } from "../lib/clock";
import { useReducedMotion } from "../lib/motion";
import { lockScroll, scrollToTarget, useScroll } from "../lib/scroll";
import { PixelIcon } from "./PixelIcon";
import { cx } from "./Reveal";
import "./Header.css";

/** Smooth-scroll to an in-page anchor, then hand focus to its heading. */
export function goTo(hash: string) {
  const target = document.querySelector<HTMLElement>(hash);
  if (!target) return;
  if (hash === "#top") scrollToTarget(0);
  else scrollToTarget(target);
  history.replaceState(null, "", hash === "#top" ? location.pathname : hash);
  const focusEl = target.querySelector<HTMLElement>("h2[tabindex], h1") ?? target;
  window.setTimeout(() => focusEl.focus({ preventScroll: true }), 50);
}

export function onAnchorClick(e: MouseEvent<HTMLAnchorElement>) {
  const href = e.currentTarget.getAttribute("href");
  if (!href?.startsWith("#") || e.metaKey || e.ctrlKey || e.shiftKey) return;
  e.preventDefault();
  goTo(href);
}

export function Header() {
  const time = useIstClock();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [boot, setBoot] = useState(true);
  const tops = useRef<number[]>([]);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Section offsets, refreshed whenever the document reflows.
  useEffect(() => {
    const measure = () => {
      tops.current = sections.map((s) => {
        const el = document.getElementById(s.id);
        return el ? el.getBoundingClientRect().top + window.scrollY : Infinity;
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, []);

  useScroll((y) => {
    const probe = y + window.innerHeight * 0.45;
    let idx = -1;
    tops.current.forEach((t, i) => {
      if (probe >= t) idx = i;
    });
    setActive((prev) => (prev === idx ? prev : idx));
  });

  useEffect(() => {
    const t = window.setTimeout(() => setBoot(false), reduced ? 0 : 1300);
    return () => window.clearTimeout(t);
  }, [reduced]);

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) btnRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    lockScroll(open);
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLElement>("a");
    const raf = requestAnimationFrame(() => first?.focus({ preventScroll: true }));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const items = [btnRef.current, ...Array.from(menuRef.current?.querySelectorAll<HTMLElement>("a") ?? [])].filter(
        Boolean,
      ) as HTMLElement[];
      const i = items.indexOf(document.activeElement as HTMLElement);
      const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : i === items.length - 1 ? 0 : i + 1;
      e.preventDefault();
      items[next].focus();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const onMenuLink = (e: MouseEvent<HTMLAnchorElement>) => {
    const href = e.currentTarget.getAttribute("href");
    if (!href?.startsWith("#")) return;
    e.preventDefault();
    close(false);
    // Let the scroll lock release before Lenis takes over.
    requestAnimationFrame(() => goTo(href));
  };

  return (
    <>
      <a href="#main" className="skip-link" onClick={onAnchorClick}>
        Skip to content
      </a>
      <div className={cx("hdr-scrim", open && "is-open")} onClick={() => close()} aria-hidden="true" />
      <header className="hdr">
        <div className="hdr-bar">
          <a href="#top" className="hdr-mark press" aria-label="Ishu Raj, back to top" onClick={onAnchorClick}>
            <PixelIcon name="ir" size={14} />
          </a>

          <div className={cx("hdr-progress", boot && !reduced && "is-boot")} aria-hidden="true">
            {sections.map((s, i) => (
              <i key={s.id} className={cx(i <= active && "on")} style={{ "--i": i } as CSSProperties} />
            ))}
          </div>

          <div className="hdr-right">
            <span className="label hdr-time">
              <span className="visually-hidden">Local time in India: </span>IST {time}
            </span>
            <button
              ref={btnRef}
              type="button"
              className="hdr-menu press"
              aria-expanded={open}
              aria-controls="site-menu"
              onClick={() => (open ? close() : setOpen(true))}
            >
              <span className="hdr-menu-swap" data-open={open}>
                <span className="label">Menu</span>
                <span className="label">Close</span>
              </span>
            </button>
          </div>
        </div>

        <div
          id="site-menu"
          ref={menuRef}
          className={cx("menu", open && "is-open")}
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          inert={!open}
        >
          <nav aria-label="Sections">
            <ol className="menu-list">
              {sections.map((s, i) => (
                <li key={s.id} style={{ "--i": i } as CSSProperties}>
                  <a href={`#${s.id}`} className="menu-link" onClick={onMenuLink} aria-current={i === active ? "location" : undefined}>
                    <span className="label">{s.n}</span>
                    <span className="menu-word grotesk">{s.label}</span>
                    <PixelIcon name="arrow-right" size={12} className="menu-arrow" />
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="menu-foot">
            <a className="label menu-mail" href={`mailto:${site.email}`}>
              {site.email}
            </a>
            <span className="label">{site.coords}</span>
          </div>
        </div>
      </header>
    </>
  );
}
