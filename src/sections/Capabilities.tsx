import type { CSSProperties } from "react";
import { services, steps } from "../content";
import { PixelIcon } from "../components/PixelIcon";
import { Reveal, cx } from "../components/Reveal";
import { SectionHead } from "../components/SectionHead";
import { useInViewOnce } from "../lib/inView";
import "./Capabilities.css";

function Process() {
  const [ref, inView] = useInViewOnce<HTMLDivElement>();
  return (
    <div className="proc wrap">
      <div className="proc-head">
        <h3 className="proc-title grotesk">How I work</h3>
        <span className="label">Frame → Ship</span>
      </div>
      <div ref={ref} className={cx("proc-track", inView && "is-in")}>
        <span className="proc-line" aria-hidden="true" />
        <ol className="proc-steps">
        {steps.map((s, i) => (
          <li key={s.n} className="proc-step" style={{ "--i": i } as CSSProperties}>
            <span className="proc-node" aria-hidden="true" />
            <span className="label">Step / {s.n}</span>
            <h4 className="proc-t grotesk">{s.t}</h4>
            <p className="proc-d">{s.d}</p>
          </li>
        ))}
        </ol>
      </div>
    </div>
  );
}

export function Capabilities() {
  return (
    <section id="capabilities" className="caps" aria-labelledby="caps-title">
      <SectionHead n="03" title="Capabilities" id="caps-title" meta="Services · Process" />
      <ol className="svc wrap">
        {services.map((s, i) => (
          <li key={s.n}>
            <Reveal i={i} className="svc-row">
              <span className="label svc-n">{s.n}</span>
              <h3 className="svc-t grotesk">{s.t}</h3>
              <p className="svc-d">{s.d}</p>
              <PixelIcon name="dot" size={6} className="svc-icon" />
            </Reveal>
          </li>
        ))}
      </ol>
      <Process />
    </section>
  );
}
