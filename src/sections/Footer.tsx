import { monogram } from "../ascii/drawings";
import { footerInfo, site } from "../content";
import { AsciiPre } from "../components/AsciiPre";
import { onAnchorClick } from "../components/Header";
import { PixelIcon } from "../components/PixelIcon";
import { useInViewOnce } from "../lib/inView";
import { useIstClock } from "../lib/clock";
import "./Footer.css";

export function Footer() {
  const time = useIstClock();
  const [ref, inView] = useInViewOnce<HTMLDivElement>();
  return (
    <footer className="ft">
      <div ref={ref} className="ft-art wrap">
        <AsciiPre draw={monogram} className="ft-ascii" play={inView} duration={1100} />
      </div>
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
