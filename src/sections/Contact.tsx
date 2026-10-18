import { useEffect, useRef, useState } from "react";
import { channels, site } from "../content";
import { PixelIcon } from "../components/PixelIcon";
import { Reveal, cx } from "../components/Reveal";
import { SectionHead } from "../components/SectionHead";
import "./Contact.css";

function CopyEmail() {
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(site.email);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = site.email;
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button type="button" className="ct-copy press" onClick={copy} aria-label={copied ? "Email copied" : "Copy email address"}>
      <span className="ct-copy-swap" data-copied={copied}>
        <span className="label">
          <PixelIcon name="copy" size={9} /> Copy
        </span>
        <span className="label">
          <PixelIcon name="check" size={9} /> Copied
        </span>
      </span>
      <span className="visually-hidden" aria-live="polite">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </button>
  );
}

export function Contact() {
  const list = channels.filter((c) => c.href);
  return (
    <section id="contact" className="contact" aria-labelledby="contact-title">
      <SectionHead n="05" title="Contact" id="contact-title" meta="Inquiries · IND / UTC+5:30" />
      <div className="ct-intro wrap">
        <Reveal>
          <p className="ct-lead">
            Open to <em>Summer ’26 internships</em> in data science and ML. Let’s build something useful.
          </p>
        </Reveal>
        <Reveal i={1} className="label ct-note">
          Replies in ≈ 24h
          <br />
          Most weekdays
        </Reveal>
      </div>
      <ul className="ct-list wrap">
        {list.map((c, i) => {
          const external = !c.href.startsWith("mailto:");
          return (
            <li key={c.k}>
              <Reveal i={i} className={cx("ct-row", c.k === "Email" && "has-copy")}>
                <a
                  className="ct-link"
                  href={c.href}
                  {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
                >
                  <span className="label ct-n">{String(i + 1).padStart(2, "0")}</span>
                  <span className="label ct-k">{c.k}</span>
                  <span className="ct-v grotesk">{c.v}</span>
                  <span className="label ct-action">
                    {c.action}
                    <PixelIcon name={external ? "arrow-up-right" : "arrow-right"} size={9} />
                  </span>
                  {external && <span className="visually-hidden"> (opens in a new tab)</span>}
                </a>
                {c.k === "Email" && <CopyEmail />}
              </Reveal>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
