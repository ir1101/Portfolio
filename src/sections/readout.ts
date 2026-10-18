import type { Readout } from "../ascii/hero-engine";

// Tiny pub/sub so the engine (outside React) can update the hero readout text
// without re-rendering anything.

type Listener = (r: Readout) => void;
const listeners = new Set<Listener>();
let last: Readout | null = null;

export function publishReadout(r: Readout) {
  last = r;
  listeners.forEach((l) => l(r));
}

export function subscribeReadout(l: Listener) {
  listeners.add(l);
  if (last) l(last);
  return () => {
    listeners.delete(l);
  };
}

export function formatReadout(r: Readout) {
  const run = String(r.run).padStart(2, "0");
  const epoch = String(r.epoch).padStart(4, "0");
  const loss = r.loss.toFixed(4);
  return `Run ${run} · Epoch ${epoch} · Loss ${loss}${r.converged ? " · Converged" : ""}`;
}
