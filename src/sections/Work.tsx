import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { vizDrawings } from "../ascii/drawings";
import { featured, workFilters, workIndex, type WorkFilter } from "../content";
import { AsciiPre } from "../components/AsciiPre";
import { PixelIcon } from "../components/PixelIcon";
import { Reveal, cx } from "../components/Reveal";
import { SectionHead } from "../components/SectionHead";
import { scrollToTarget } from "../lib/scroll";
import "./Work.css";

const pad = (n: number) => String(n).padStart(2, "0");

function FeaturedCarousel({ active, onChange }: { active: number; onChange: (i: number) => void }) {
  const swipe = useRef<{ x: number; t: number; id: number } | null>(null);
  const count = featured.length;
  const go = (i: number) => onChange((i + count) % count);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(active + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(active - 1);
    }
  };

  // Touch swipe: a quick flick is enough, no need to cross a distance threshold.
  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse" || swipe.current) return;
    swipe.current = { x: e.clientX, t: performance.now(), id: e.pointerId };
  };
  const onPointerUp = (e: PointerEvent) => {
    const s = swipe.current;
    if (!s || s.id !== e.pointerId) return;
    swipe.current = null;
    const dx = e.clientX - s.x;
    const velocity = Math.abs(dx) / Math.max(1, performance.now() - s.t);
    if (Math.abs(dx) > 60 || (Math.abs(dx) > 12 && velocity > 0.11)) go(active + (dx < 0 ? 1 : -1));
  };

  return (
    <div
      className="fc wrap"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured work"
      onKeyDown={onKeyDown}
    >
      <div
        className="fc-stage"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipe.current = null)}
      >
        {featured.map((w, i) => {
          const on = i === active;
          return (
            <article
              key={w.idx}
              className={cx("fc-slide", on && "is-active")}
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}: ${w.name}`}
              inert={!on}
            >
              <figure className="fc-viz">
                <div className="fc-viz-row label">
                  <span>{w.idx}</span>
                  <span>{w.caption[0]}</span>
                </div>
                <AsciiPre draw={vizDrawings[w.viz]} className="fc-ascii" play={on} duration={650} />
                <figcaption className="fc-viz-row label">
                  <span>{w.caption[1]}</span>
                  <span className="fc-viz-hl">{w.caption[2]}</span>
                </figcaption>
              </figure>
              <div className="fc-meta">
                <div>
                  <p className="label">
                    {w.idx} — {w.tag}
                  </p>
                  <h3 className="fc-title grotesk">{w.name}</h3>
                </div>
                <div>
                  <p className="fc-desc">{w.desc}</p>
                  <ul className="fc-stack" aria-label="Stack">
                    {w.stack.map((s) => (
                      <li key={s} className="pill">
                        {s}
                      </li>
                    ))}
                  </ul>
                  <dl className="fc-specs">
                    {w.specs.map((s) => (
                      <div key={s.k}>
                        <dt className="label">{s.k}</dt>
                        <dd>{s.v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="fc-controls">
        <span className="label fc-count" aria-live="polite">
          {pad(active + 1)} / {pad(count)}
        </span>
        <div className="fc-nav">
          <button type="button" className="fc-arrow press" aria-label="Previous project" onClick={() => go(active - 1)}>
            <PixelIcon name="arrow-left" size={10} />
          </button>
          <div className="fc-dots">
            {featured.map((w, i) => (
              <button
                key={w.idx}
                type="button"
                className="fc-dot"
                aria-label={`Show ${w.name}`}
                aria-current={i === active ? "true" : undefined}
                onClick={() => go(i)}
              />
            ))}
          </div>
          <button type="button" className="fc-arrow press" aria-label="Next project" onClick={() => go(active + 1)}>
            <PixelIcon name="arrow-right" size={10} />
          </button>
        </div>
        <span className="label fc-hint">Swipe or ← →</span>
      </div>
    </div>
  );
}

function WorkIndex({ onOpen }: { onOpen: (slide: number) => void }) {
  const [filter, setFilter] = useState<WorkFilter>("All");
  const shown = workIndex.filter((it) => filter === "All" || it.tags.includes(filter));

  return (
    <div className="wi wrap">
      <div className="wi-head">
        <h3 className="wi-title grotesk">All work</h3>
        <span className="label wi-count" aria-live="polite">
          {pad(shown.length)} / {pad(workIndex.length)} entries
        </span>
      </div>
      <div className="wi-filters" role="group" aria-label="Filter work by category">
        {workFilters.map((f) => (
          <button key={f} type="button" className="pill" aria-pressed={f === filter} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>
      <ul className="wi-list">
        {workIndex.map((it, i) => {
          const visible = filter === "All" || it.tags.includes(filter);
          return (
            <li key={it.title} className={cx("wi-row", !visible && "is-hidden")} inert={!visible} aria-hidden={!visible}>
              <div className="wi-clip">
                <Reveal i={i} className="wi-reveal">
                  <button type="button" className="wi-btn" onClick={() => onOpen(it.slide)}>
                    <span className="label wi-n">{pad(i + 1)}</span>
                    <span className="wi-main">
                      <span className="wi-name grotesk">{it.title}</span>
                      <span className="wi-excerpt">{it.excerpt}</span>
                    </span>
                    <span className="label wi-tags">{it.tags.join(" · ")}</span>
                    <span className="label wi-kind">{it.kind}</span>
                    <PixelIcon name="arrow-up-right" size={10} className="wi-icon" />
                  </button>
                </Reveal>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Work() {
  const [active, setActive] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const open = (slide: number) => {
    setActive(slide);
    if (carouselRef.current) scrollToTarget(carouselRef.current);
  };

  return (
    <section id="work" className="work" aria-labelledby="work-title">
      <SectionHead n="02" title="Work" id="work-title" meta={`${pad(workIndex.length)} entries · 2024–26`} />
      <div ref={carouselRef}>
        <FeaturedCarousel active={active} onChange={setActive} />
      </div>
      <WorkIndex onOpen={open} />
    </section>
  );
}
