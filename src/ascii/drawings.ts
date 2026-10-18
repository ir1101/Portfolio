import type { DrawFn } from "./ascii-art";
import { height, randomWells } from "./loss";
import type { Viz } from "../content";

// Drawings rendered to glyphs by ascii-art.ts. White reads as dense glyphs,
// pure blue becomes accent-coloured glyphs.

const BLUE = "#2040ff";

function seeded(seed: number) {
  return (i: number) => {
    const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
}

function frame(ctx: CanvasRenderingContext2D, w: number, h: number, cw: number, ch: number) {
  // Sparse dotted grid: reads as a chart frame without competing with the data.
  ctx.fillStyle = "rgba(255,255,255,0.13)";
  for (let i = 1; i < 8; i++) {
    const x = Math.round(((i / 8) * w) / cw) * cw;
    for (let y = 0; y < h; y += ch * 3) ctx.fillRect(x, y, cw, ch);
  }
  for (let j = 1; j < 4; j++) {
    const y = Math.round(((j / 4) * h) / ch) * ch;
    for (let x = 0; x < w; x += cw * 4) ctx.fillRect(x, y, cw, ch);
  }
}

export const cricket: DrawFn = (ctx, w, h, cell) => {
  frame(ctx, w, h, cell.w, cell.h);
  const top = h * 0.1;
  const bottom = h * 0.92;
  const pts: [number, number][] = [];
  for (let i = 0; i <= 50; i++) {
    const v = 0.5 + 0.35 * Math.sin(i / 5.5) - 0.15 * Math.cos(i / 9) - (i > 40 ? (i - 40) * 0.018 : 0);
    pts.push([(i / 50) * w, top + (1 - v) * (bottom - top)]);
  }
  const grad = ctx.createLinearGradient(0, top, 0, bottom);
  grad.addColorStop(0, "rgba(255,255,255,0.42)");
  grad.addColorStop(1, "rgba(255,255,255,0.04)");
  ctx.beginPath();
  ctx.moveTo(pts[0][0], bottom);
  pts.forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.lineTo(w, bottom);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = cell.h * 0.8;
  ctx.lineJoin = "round";
  ctx.stroke();

  ctx.fillStyle = "#fff";
  pts.forEach(([x, y], i) => {
    if (i % 5 !== 0) return;
    ctx.beginPath();
    ctx.arc(x, y, cell.h * 0.9, 0, Math.PI * 2);
    ctx.fill();
  });

  // The current ball: a blue marker with a drop line.
  const [bx, by] = pts[34];
  ctx.fillStyle = BLUE;
  for (let y = by + cell.h * 2; y < bottom; y += cell.h * 2) ctx.fillRect(bx - cell.w / 2, y, cell.w, cell.h);
  ctx.fillRect(bx - cell.w * 1.5, by - cell.h, cell.w * 3, cell.h * 2);
};

export const auto: DrawFn = (ctx, w, h, cell) => {
  frame(ctx, w, h, cell.w, cell.h);
  const rnd = seeded(7);
  const curve = (t: number) => h * 0.1 + Math.pow(t, 1.2) * h * 0.78;
  for (let i = 0; i < 300; i++) {
    const t = rnd(i + 1);
    const noise = (rnd(i + 90) - 0.5) * (rnd(i + 40) * h * 0.26);
    const y = Math.min(h * 0.95, Math.max(h * 0.05, curve(t) + noise));
    ctx.fillStyle = i % 4 === 0 ? "#fff" : "rgba(255,255,255,0.55)";
    ctx.fillRect(t * w - cell.w * 0.5, y - cell.h * 0.5, cell.w, cell.h);
  }
  ctx.beginPath();
  for (let i = 0; i <= 80; i++) {
    const x = (i / 80) * w;
    if (i) ctx.lineTo(x, curve(i / 80));
    else ctx.moveTo(x, curve(0));
  }
  ctx.strokeStyle = BLUE;
  ctx.lineWidth = cell.h * 0.75;
  ctx.stroke();
};

export const lab: DrawFn = (ctx, w, h, cell) => {
  const cols = 8;
  const rows = 5;
  const cw = w / cols;
  const chh = h / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const frac = 0.2 + ((i * 37) % 100) / 130;
      const x = c * cw + cell.w;
      const y = r * chh + cell.h * 0.5;
      const bw = cw - cell.w * 2;
      const bh = chh - cell.h;
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = cell.w * 0.5;
      ctx.strokeRect(x, y, bw, bh);
      ctx.fillStyle = i === 13 ? BLUE : "rgba(255,255,255,0.9)";
      ctx.fillRect(x, y + bh * (1 - frac), bw, bh * frac);
    }
  }
};

export const monogram: DrawFn = (ctx, w, h, cell) => {
  const size = h * 1.08;
  ctx.font = `600 ${size}px "Inter Tight Variable", "Helvetica Neue", Arial, sans-serif`;
  ctx.textBaseline = "alphabetic";
  const text = "IR";
  const tw = ctx.measureText(text).width;
  const x = (w - tw) / 2 - cell.w * 2;
  const y = h * 0.9;
  const grad = ctx.createLinearGradient(0, h * 0.05, 0, h * 0.9);
  grad.addColorStop(0, "#fff");
  grad.addColorStop(1, "rgba(255,255,255,0.35)");
  ctx.fillStyle = grad;
  ctx.fillText(text, x, y);
  ctx.fillStyle = BLUE;
  ctx.fillRect(x + tw + cell.w * 2, y - cell.h * 5, cell.w * 5, cell.h * 5);
};

/** Static, top-down loss landscape for browsers without WebGL2. */
export const surface: DrawFn = (ctx, w, h) => {
  const rnd = seeded(3);
  let n = 0;
  const wells = randomWells(() => rnd(++n));
  const img = ctx.createImageData(w, h);
  const aspect = w / h;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const x = ((i / w) * 2 - 1) * Math.max(1, aspect) * 0.9;
      const y = ((j / h) * 2 - 1) * Math.max(1, 1 / aspect) * 0.9;
      const r = Math.hypot(x, y);
      const hh = height(wells, x, y, 0);
      const band = Math.abs(((hh * 7) % 1 + 1) % 1 - 0.5);
      const iso = band > 0.4 ? 1 : 0;
      const fade = Math.max(0, 1 - Math.max(0, r - 0.6) / 0.4);
      const v = Math.round(255 * fade * (0.12 + iso * 0.6));
      const k = (j * w + i) * 4;
      img.data[k] = v;
      img.data[k + 1] = v;
      img.data[k + 2] = v;
      img.data[k + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
};

export const vizDrawings: Record<Viz, DrawFn> = { cricket, auto, lab };
