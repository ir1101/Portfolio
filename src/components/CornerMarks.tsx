import { site } from "../content";
import { PixelIcon } from "./PixelIcon";
import "./CornerMarks.css";

export function CornerMarks() {
  return (
    <div className="corners" aria-hidden="true">
      <span className="corner tl">
        <PixelIcon name="plus" size={7} />
      </span>
      <span className="corner tr">
        <PixelIcon name="plus" size={7} />
      </span>
      <span className="corner bl">
        <PixelIcon name="plus" size={7} />
        <span className="label">{site.coords}</span>
      </span>
      <span className="corner br">
        <span className="label">IR/{String(site.year).slice(2)} · v2</span>
        <PixelIcon name="plus" size={7} />
      </span>
    </div>
  );
}
