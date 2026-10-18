import { nowCards } from "../content";
import { Reveal } from "../components/Reveal";
import { SectionHead } from "../components/SectionHead";
import "./Now.css";

export function Now() {
  return (
    <section id="now" className="now" aria-labelledby="now-title">
      <SectionHead n="04" title="Now" id="now-title" meta="On the desk this week" />
      <ul className="now-grid wrap">
        {nowCards.map((c, i) => (
          <li key={c.tag}>
            <Reveal i={i} className="now-card">
              <p className="label now-tag">
                <span className="now-dot" aria-hidden="true" />
                {c.tag}
              </p>
              <h3 className="now-title grotesk">{c.title}</h3>
              <p className="now-body">{c.body}</p>
              <span className="label now-idx" aria-hidden="true">
                N/{String(i + 1).padStart(2, "0")}
              </span>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
