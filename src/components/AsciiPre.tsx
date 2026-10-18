import { useEffect, useRef } from "react";
import { charMetrics, rasterize, resolve, toHTML, type DrawFn, type Grid } from "../ascii/ascii-art";
import { fontsReady } from "../ascii/atlas";
import { useReducedMotion } from "../lib/motion";
import { cx } from "./Reveal";

type Props = {
  draw: DrawFn;
  className?: string;
  /** Fixed row count. Otherwise rows fill the element's CSS height. */
  rows?: number;
  /** When this flips to true the art scrambles in. */
  play?: boolean;
  duration?: number;
};

/** A <pre> that renders a drawing as glyphs and re-rasterises on resize. */
export function AsciiPre({ draw, className, rows, play = true, duration = 500 }: Props) {
  const ref = useRef<HTMLPreElement>(null);
  const grid = useRef<Grid | null>(null);
  const cancel = useRef<() => void>(() => {});
  const playRef = useRef(play);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let alive = true;
    let ro: ResizeObserver | null = null;
    let lastKey = "";

    const paint = (animate: boolean) => {
      const { charW, lineH } = charMetrics();
      const box = el.getBoundingClientRect();
      const cols = Math.max(8, Math.floor(box.width / charW));
      const r = rows ?? Math.max(4, Math.floor(box.height / lineH));
      const key = `${cols}x${r}`;
      if (key === lastKey && !animate) return;
      lastKey = key;
      grid.current = rasterize(draw, cols, r);
      cancel.current();
      if (animate && playRef.current) cancel.current = resolve(el, grid.current, duration, reduced);
      else el.innerHTML = toHTML(grid.current);
    };

    fontsReady().then(() => {
      if (!alive) return;
      paint(playRef.current);
      let t = 0;
      ro = new ResizeObserver(() => {
        clearTimeout(t);
        t = window.setTimeout(() => alive && paint(false), 120);
      });
      ro.observe(el);
    });
    return () => {
      alive = false;
      ro?.disconnect();
      cancel.current();
    };
  }, [draw, rows, duration, reduced]);

  useEffect(() => {
    const was = playRef.current;
    playRef.current = play;
    const el = ref.current;
    if (play && !was && el && grid.current) {
      cancel.current();
      cancel.current = resolve(el, grid.current, duration, reduced);
    }
  }, [play, duration, reduced]);

  return <pre ref={ref} className={cx("ascii", className)} aria-hidden="true" />;
}
