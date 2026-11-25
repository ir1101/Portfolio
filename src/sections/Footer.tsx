import { useEffect, useRef, useState } from "react";
import { monogram } from "../ascii/drawings";
import { MonogramEngine, VOXELS } from "../ascii/monogram-engine";
import { PALETTE } from "../ascii/palette";
import { footerInfo, site } from "../content";
import { AsciiPre } from "../components/AsciiPre";
import { onAnchorClick } from "../components/Header";
import { PixelIcon } from "../components/PixelIcon";
import { cx } from "../components/Reveal";
import { useVisible } from "../lib/inView";
import { useIstClock } from "../lib/clock";
import { prefersReducedMotion } from "../lib/motion";
import "./Footer.css";

/** The voxel "IR", live in ASCII. Falls back to the static glyph drawing without WebGL2. */
function Monogram() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engine = useRef<MonogramEngine | null>(null);
  const [wrapRef, visible] = useVisible<HTMLDivElement>("120px");
  const [mode, setMode] = useState<"pending" | "webgl" | "fallback">(() =>
    MonogramEngine.supported() ? "pending" : "fallback",
  );
  const [ready, setReady] = useState(false);
  const [reduced] = useState(prefersReducedMotion);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const e = new MonogramEngine(canvas, { reduced, palette: PALETTE, onReady: () => setReady(true) });
    engine.current = e;
    if (import.meta.env.DEV) (window as unknown as { __mono: MonogramEngine }).__mono = e;
    let alive = true;
    e.init().then((ok) => {
      if (alive) setMode(ok ? "webgl" : "fallback");
    });
    let t = 0;
    const ro = new ResizeObserver(() => {
      clearTimeout(t);
      t = window.setTimeout(() => e.resize(), 150);
    });
    ro.observe(canvas);
    return () => {
      alive = false;
      ro.disconnect();
      clearTimeout(t);
      e.destroy();
      engine.current = null;
    };
  }, [reduced]);

  useEffect(() => {
    engine.current?.setActive(visible);
  }, [visible, mode]);

  return (
    <div ref={wrapRef} className={cx("ft-art wrap", reduced && "is-static")}>
      {mode === "fallback" ? (
        <AsciiPre draw={monogram} className="ft-ascii" play={visible} duration={1100} />
      ) : (
        <canvas ref={canvasRef} className={cx("ft-canvas", ready && "is-ready")} aria-hidden="true" />
      )}
      <div className="ft-art-meta label" aria-hidden="true">
        <span>IR · {VOXELS} voxels</span>
        {mode !== "fallback" && !reduced && (
          <span className="ft-hint">
            <span className="ft-hint-fine">Drag to spin</span>
            <span className="ft-hint-touch">Swipe to spin</span>
          </span>
        )}
      </div>
    </div>
  );
}

export function Footer() {
  const time = useIstClock();
  return (
    <footer className="ft">
      <Monogram />
      <div className="ft-info wrap">
        <span className="label">Info</span>
        <p className="ft-text">{footerInfo}</p>
      </div>
      <div className="ft-strip wrap label">
        <span>© {site.name} — {site.year}</span>
        <span className="ft-mid">IST {time} · {site.place}</span>
        <a href="#top" className="ft-top" onClick={onAnchorClick}>
          Back to top <PixelIcon name="arrow-up" size={9} />
        </a>
      </div>
    </footer>
  );
}
