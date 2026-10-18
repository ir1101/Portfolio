import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { useInViewOnce } from "../lib/inView";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** Ref + className for a one-shot blur/rise reveal on any element. */
export function useReveal<T extends Element>(i = 0) {
  const [ref, inView] = useInViewOnce<T>();
  return {
    ref,
    className: cx("rv", inView && "is-in"),
    style: { "--i": i } as CSSProperties,
  };
}

type Props = HTMLAttributes<HTMLDivElement> & { i?: number; children: ReactNode };

export function Reveal({ i = 0, className, style, children, ...rest }: Props) {
  const r = useReveal<HTMLDivElement>(i);
  return (
    <div ref={r.ref} className={cx(r.className, className)} style={{ ...r.style, ...style }} {...rest}>
      {children}
    </div>
  );
}
