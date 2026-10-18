import { useEffect, useRef, useState } from "react";
import { HeroEngine } from "../ascii/hero-engine";
import { surface } from "../ascii/drawings";
import { PALETTE } from "../ascii/palette";
import { AsciiPre } from "../components/AsciiPre";
import { clamp, prefersReducedMotion } from "../lib/motion";
import { useScroll } from "../lib/scroll";
import { publishReadout } from "./readout";
import "./HeroCanvas.css";


/**
 * Fixed full-viewport ASCII landscape behind the hero and the About statement.
 * Scroll tilts the camera to a top-down contour view, then the layer fades out
 * and stops rendering.
 */
export function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const engine = useRef<HeroEngine | null>(null);
  const anchors = useRef({ mid: 1, end: 1 });
  const [mode, setMode] = useState<"pending" | "webgl" | "fallback">("pending");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!HeroEngine.supported()) {
      setMode("fallback");
      publishReadout({ run: 1, epoch: 412, loss: 0.0213, converged: true });
      return;
    }
    const e = new HeroEngine(canvas, {
      reduced: prefersReducedMotion(),
      palette: PALETTE,
      onReadout: publishReadout,
      onReady: () => setReady(true),
    });
    engine.current = e;
    if (import.meta.env.DEV) (window as unknown as { __hero: HeroEngine }).__hero = e;
    e.setActive(true);
    let alive = true;
    e.init().then((ok) => {
      if (!alive) return;
      if (!ok) {
        setMode("fallback");
        publishReadout({ run: 1, epoch: 412, loss: 0.0213, converged: true });
      } else setMode("webgl");
    });

    let t = 0;
    const onResize = () => {
      clearTimeout(t);
      t = window.setTimeout(() => e.resize(), 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      alive = false;
      window.removeEventListener("resize", onResize);
      clearTimeout(t);
      e.destroy();
      engine.current = null;
    };
  }, []);

  // Scroll anchors from the statement block: camera is top-down by its middle,
  // and the whole layer has faded by the time it ends.
  useEffect(() => {
    const measure = () => {
      const st = document.getElementById("statement");
      const vh = window.innerHeight;
      if (!st) {
        anchors.current = { mid: vh, end: vh * 1.5 };
        return;
      }
      const top = st.getBoundingClientRect().top + window.scrollY;
      const h = st.offsetHeight;
      anchors.current = { mid: top + (h - vh) * 0.45, end: top + h - vh };
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, []);

  useScroll((y) => {
    const { mid, end } = anchors.current;
    const vh = window.innerHeight;
    const camera = clamp(y / Math.max(1, mid));
    const fade = 1 - clamp((y - end) / (vh * 0.55));
    // Dim slightly once top-down so the statement stays legible.
    const opacity = fade * (1 - 0.3 * camera);
    const e = engine.current;
    if (e) {
      e.setScroll(camera);
      e.setOpacity(opacity);
      e.setActive(opacity > 0.001);
    }
    if (layerRef.current) layerRef.current.style.visibility = opacity <= 0.001 ? "hidden" : "visible";
  });

  return (
    <div ref={layerRef} className="hero-layer" aria-hidden="true">
      <canvas ref={canvasRef} className={`hero-canvas${ready ? " is-ready" : ""}`} hidden={mode === "fallback"} />
      {mode === "fallback" && <AsciiPre draw={surface} className="hero-fallback" duration={900} />}
      <div className="hero-vignette" />
    </div>
  );
}
