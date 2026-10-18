// The loss surface and the optimizer that descends it. `height` must stay in sync
// with the GLSL `height()` in hero-engine.ts so the optimizer sits on the mesh.

export type Well = { x: number; y: number; depth: number; width: number };

export const WELLS = 4;
const BOWL = 0.32;
const RIPPLE = 0.035;

export function height(wells: Well[], x: number, y: number, t: number): number {
  let h = BOWL * (x * x + y * y);
  for (const w of wells) {
    const dx = x - w.x;
    const dy = y - w.y;
    h -= w.depth * Math.exp(-(dx * dx + dy * dy) / (2 * w.width * w.width));
  }
  h += RIPPLE * Math.sin(3 * x + t * 0.5) * Math.cos(3 * y - t * 0.4);
  return h;
}

export function randomWells(rand: () => number = Math.random): Well[] {
  const wells: Well[] = [];
  let guard = 0;
  while (wells.length < WELLS && guard++ < 200) {
    const x = (rand() * 2 - 1) * 0.6;
    const y = (rand() * 2 - 1) * 0.6;
    if (wells.some((w) => Math.hypot(w.x - x, w.y - y) < 0.42)) continue;
    const isGlobal = wells.length === 0;
    wells.push({
      x,
      y,
      depth: isGlobal ? 0.95 + rand() * 0.15 : 0.35 + rand() * 0.35,
      width: isGlobal ? 0.24 + rand() * 0.06 : 0.16 + rand() * 0.1,
    });
  }
  while (wells.length < WELLS) wells.push({ x: 0, y: 0, depth: 0, width: 0.3 });
  return wells;
}

export function lerpWells(a: Well[], b: Well[], t: number): Well[] {
  return a.map((w, i) => ({
    x: w.x + (b[i].x - w.x) * t,
    y: w.y + (b[i].y - w.y) * t,
    depth: w.depth + (b[i].depth - w.depth) * t,
    width: w.width + (b[i].width - w.width) * t,
  }));
}

function minHeight(wells: Well[]): number {
  let min = Infinity;
  const n = 48;
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= n; j++) {
      const h = height(wells, (i / n) * 2 - 1, (j / n) * 2 - 1, 0);
      if (h < min) min = h;
    }
  }
  return min - 0.0123;
}

export const TRAIL = 56;

type Phase = "descend" | "hold" | "morph";

const STEPS_PER_SEC = 30;
const LR = 0.01;
const BETA = 0.9;
const HOLD = 2.2;
const MORPH = 1.2;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Gradient descent with momentum over a surface that re-rolls after each run. */
export class Optimizer {
  wells: Well[];
  private from: Well[];
  private to: Well[];
  private floor: number;
  x = 0;
  y = 0;
  private vx = 0;
  private vy = 0;
  epoch = 0;
  run = 1;
  loss = 0;
  phase: Phase = "descend";
  private phaseT = 0;
  private acc = 0;
  /** Ring buffer of recent positions (x, y). */
  trail: Float32Array = new Float32Array(TRAIL * 2);
  trailLen = 0;
  private trailHead = 0;

  constructor(private rand: () => number = Math.random) {
    this.wells = randomWells(rand);
    this.from = this.wells;
    this.to = this.wells;
    this.floor = minHeight(this.wells);
    this.spawn();
  }

  private spawn() {
    const a = this.rand() * Math.PI * 2;
    const r = 0.78 + this.rand() * 0.1;
    this.x = Math.cos(a) * r;
    this.y = Math.sin(a) * r;
    this.vx = 0;
    this.vy = 0;
    this.epoch = 0;
    this.trailLen = 0;
    this.trailHead = 0;
  }

  private grad(t: number): [number, number] {
    const e = 1e-3;
    const gx = (height(this.wells, this.x + e, this.y, t) - height(this.wells, this.x - e, this.y, t)) / (2 * e);
    const gy = (height(this.wells, this.x, this.y + e, t) - height(this.wells, this.x, this.y - e, t)) / (2 * e);
    return [gx, gy];
  }

  private pushTrail() {
    this.trail[this.trailHead * 2] = this.x;
    this.trail[this.trailHead * 2 + 1] = this.y;
    this.trailHead = (this.trailHead + 1) % TRAIL;
    this.trailLen = Math.min(TRAIL, this.trailLen + 1);
  }

  /** Trail points oldest → newest. */
  forEachTrail(cb: (x: number, y: number, age: number) => void) {
    for (let i = 0; i < this.trailLen; i++) {
      const idx = (this.trailHead - this.trailLen + i + TRAIL) % TRAIL;
      cb(this.trail[idx * 2], this.trail[idx * 2 + 1], 1 - i / Math.max(1, this.trailLen - 1));
    }
  }

  update(dt: number, t: number) {
    if (this.phase === "descend") {
      this.acc += dt * STEPS_PER_SEC;
      while (this.acc >= 1) {
        this.acc -= 1;
        const [gx, gy] = this.grad(t);
        this.vx = BETA * this.vx - LR * gx;
        this.vy = BETA * this.vy - LR * gy;
        this.x = Math.max(-0.98, Math.min(0.98, this.x + this.vx));
        this.y = Math.max(-0.98, Math.min(0.98, this.y + this.vy));
        this.epoch++;
        this.pushTrail();
        const speed = Math.hypot(this.vx, this.vy);
        const g = Math.hypot(gx, gy);
        if ((speed < 2e-4 && g < 0.03) || this.epoch > 900) {
          this.phase = "hold";
          this.phaseT = 0;
          break;
        }
      }
    } else if (this.phase === "hold") {
      this.phaseT += dt;
      if (this.phaseT >= HOLD) {
        this.phase = "morph";
        this.phaseT = 0;
        this.from = this.wells;
        this.to = randomWells(this.rand);
      }
    } else {
      this.phaseT += dt;
      const p = Math.min(1, this.phaseT / MORPH);
      this.wells = lerpWells(this.from, this.to, easeInOut(p));
      if (p >= 1) {
        this.wells = this.to;
        this.floor = minHeight(this.wells);
        this.run++;
        this.phase = "descend";
        this.spawn();
      }
    }
    this.loss = Math.max(0, height(this.wells, this.x, this.y, t) - this.floor);
  }
}
