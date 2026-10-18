import { useEffect, useRef } from "react";
import { aboutLead, facts, statement } from "../content";
import { Reveal, cx } from "../components/Reveal";
import { SectionHead } from "../components/SectionHead";
import { clamp, useReducedMotion } from "../lib/motion";
import { useScroll } from "../lib/scroll";
import "./About.css";

function Statement() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const words = useRef<(HTMLSpanElement | null)[]>([]);
  const dotRef = useRef<HTMLSpanElement>(null);
  const box = useRef({ top: 0, range: 1 });
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      box.current = {
        top: el.getBoundingClientRect().top + window.scrollY,
        range: Math.max(1, el.offsetHeight - window.innerHeight),
      };
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, []);

  // Each word focuses in turn: blur → sharp, faint → solid. Written straight to
  // the element so scrolling never re-renders React.
  useScroll((y) => {
    if (reduced) return;
    // 0 when the block's top reaches mid-viewport, 1 when the sticky releases.
    const half = window.innerHeight * 0.5;
    const p = clamp((y - box.current.top + half) / (box.current.range + half));
    const k = (p / 0.8) * statement.length;
    words.current.forEach((w, i) => {
      if (!w) return;
      const l = clamp(k - i);
      w.style.opacity = String(0.12 + 0.88 * l);
      w.style.filter = l >= 1 ? "none" : `blur(${((1 - l) * 14).toFixed(2)}px)`;
      w.style.transform = l >= 1 ? "none" : `translateY(${((1 - l) * 8).toFixed(2)}%)`;
    });
    if (dotRef.current) dotRef.current.style.opacity = k >= statement.length ? "1" : "0";
  });

  return (
    <div ref={wrapRef} id="statement" className={cx("stmt", reduced && "is-static")}>
      <div className="stmt-sticky">
        <p className="label stmt-kicker">( Principle )</p>
        <p className="stmt-text">
          {statement.map((w, i) => (
            <span key={w} ref={(el) => void (words.current[i] = el)} className="stmt-word">
              {w}
              {i === statement.length - 1 && (
                <span ref={dotRef} className="stmt-dot">
                  .
                </span>
              )}
            </span>
          ))}
        </p>
        <p className="label stmt-foot">— over models that merely score</p>
      </div>
    </div>
  );
}

export function About() {
  return (
    <section id="about" className="about" aria-labelledby="about-title">
      <SectionHead n="01" title="About" id="about-title" meta="Ranchi → Vellore" />
      <Statement />
      <div className="about-body wrap">
        <Reveal className="about-lead-wrap">
          <p className="about-lead">
            {aboutLead.map((s, i) => (s.em ? <em key={i}>{s.t}</em> : <span key={i}>{s.t}</span>))}
          </p>
        </Reveal>
        <dl className="facts">
          {facts.map((f, i) => (
            <Reveal key={f.k} i={i} className="fact">
              <dt className="label">{f.k}</dt>
              <dd>{f.v}</dd>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}
