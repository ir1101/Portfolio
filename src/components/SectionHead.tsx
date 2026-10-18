import { Reveal } from "./Reveal";
import "./SectionHead.css";

type Props = { n: string; title: string; id: string; meta?: string };

export function SectionHead({ n, title, id, meta }: Props) {
  return (
    <header className="sh wrap">
      <Reveal className="sh-num">{n}</Reveal>
      <div className="sh-bar">
        <span className="label sh-sec">Sec–{n}</span>
        <Reveal i={1}>
          <h2 id={id} className="sh-title grotesk" tabIndex={-1}>
            {title}
          </h2>
        </Reveal>
        <span className="label sh-meta">{meta}</span>
      </div>
    </header>
  );
}
