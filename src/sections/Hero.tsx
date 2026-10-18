import { useEffect, useRef, type CSSProperties } from "react";
import { heroMeta, site } from "../content";
import { formatReadout, subscribeReadout } from "./readout";
import "./Hero.css";

export function Hero() {
  const readoutRef = useRef<HTMLSpanElement>(null);

  useEffect(
    () =>
      subscribeReadout((r) => {
        if (readoutRef.current) readoutRef.current.textContent = formatReadout(r);
      }),
    [],
  );

  const letters = site.name.toUpperCase().split("");

  return (
    <section className="hero" id="top" aria-label="Introduction">
      <div className="hero-center">
        <p className="label hero-kicker">Portfolio · Vol. 02 / {site.year}</p>
        <h1 className="hero-name">
          <span className="visually-hidden">{site.name}</span>
          <span className="hero-letters" aria-hidden="true">
            {letters.map((ch, i) =>
              ch === " " ? (
                <span key={i} className="hero-space" />
              ) : (
                <span key={i} className="hero-letter" style={{ "--i": i } as CSSProperties}>
                  {ch}
                </span>
              ),
            )}
          </span>
        </h1>
        <p className="label hero-sub">Data science · VIT Vellore ’28 · {site.place}</p>
      </div>

      <p className="label hero-readout" aria-hidden="true">
        <span className="hero-readout-dot" />
        <span ref={readoutRef}>Run 01 · Epoch 0000 · Loss —</span>
      </p>

      <dl className="hero-meta wrap">
        {heroMeta.map((m, i) => (
          <div key={m.k} className="hero-meta-cell" style={{ "--i": i } as CSSProperties}>
            <dt className="label">{m.k}</dt>
            <dd>
              {m.v[0]}
              <br />
              {m.v[1]}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
