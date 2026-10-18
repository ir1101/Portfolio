import { RAMP } from "./atlas";

// Rasterise a 2D drawing into a grid of glyphs. Each cell is supersampled
// (SX × SY pixels) so glyph choice reflects coverage, not a single pixel.

export type Cell = { w: number; h: number };
export type DrawFn = (ctx: CanvasRenderingContext2D, w: number, h: number, cell: Cell) => void;

export type Grid = { cols: number; rows: number; chars: string[]; accent: Uint8Array };

const SX = 4;

let metrics: { charW: number; lineH: number } | null = null;

/** Measures the .ascii font once (10px / 12px line). */
export function charMetrics(): { charW: number; lineH: number } {
  if (metrics) return metrics;
  const span = document.createElement("span");
  span.className = "ascii";
  span.style.cssText = "position:absolute;visibility:hidden;left:-9999px;top:0";
  span.textContent = "0".repeat(100);
  document.body.appendChild(span);
  const charW = span.getBoundingClientRect().width / 100 || 6;
  document.body.removeChild(span);
  metrics = { charW, lineH: 12 };
  return metrics;
}

export function resetMetrics() {
  metrics = null;
}

export function rasterize(draw: DrawFn, cols: number, rows: number, ramp = RAMP): Grid {
  const { charW, lineH } = charMetrics();
  const sy = Math.max(1, Math.round((SX * lineH) / charW));
  const w = cols * SX;
  const h = rows * sy;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  draw(ctx, w, h, { w: SX, h: sy });
  const data = ctx.getImageData(0, 0, w, h).data;
  const chars: string[] = new Array(cols * rows);
  const accent = new Uint8Array(cols * rows);
  const n = SX * sy;
  const last = ramp.length - 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let lum = 0;
      let blue = 0;
      for (let y = 0; y < sy; y++) {
        let i = ((r * sy + y) * w + c * SX) * 4;
        for (let x = 0; x < SX; x++, i += 4) {
          const R = data[i];
          const G = data[i + 1];
          const B = data[i + 2];
          lum += Math.max(R, G, B);
          blue += Math.max(0, B - R);
        }
      }
      lum /= n * 255;
      blue /= n * 255;
      const k = r * cols + c;
      chars[k] = ramp[Math.min(last, Math.floor(Math.pow(lum, 0.85) * (last + 1)))];
      accent[k] = blue > 0.18 && blue > lum * 0.45 ? 1 : 0;
    }
  }
  return { cols, rows, chars, accent };
}

const esc = (ch: string) => (ch === "<" ? "&lt;" : ch === ">" ? "&gt;" : ch === "&" ? "&amp;" : ch);

export function toHTML(grid: Grid, chars: string[] = grid.chars): string {
  const { cols, rows, accent } = grid;
  let out = "";
  for (let r = 0; r < rows; r++) {
    let inAccent = false;
    for (let c = 0; c < cols; c++) {
      const k = r * cols + c;
      const a = accent[k] === 1 && chars[k] !== " ";
      if (a !== inAccent) {
        out += a ? '<span class="a">' : "</span>";
        inAccent = a;
      }
      out += esc(chars[k]);
    }
    if (inAccent) out += "</span>";
    if (r < rows - 1) out += "\n";
  }
  return out;
}

/**
 * Scramble-in: cells resolve left→right with noise; unresolved cells show random
 * ramp glyphs. Returns a cancel function.
 */
export function resolve(pre: HTMLElement, grid: Grid, duration = 500, reduced = false): () => void {
  if (reduced || duration <= 0) {
    pre.innerHTML = toHTML(grid);
    return () => {};
  }
  const { cols, chars } = grid;
  const order = new Float32Array(chars.length);
  for (let k = 0; k < chars.length; k++) {
    const c = k % cols;
    order[k] = (c / cols) * 0.7 + Math.random() * 0.3;
  }
  const noise = RAMP.slice(3);
  const frame: string[] = new Array(chars.length);
  const start = performance.now();
  let raf = 0;
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    for (let k = 0; k < chars.length; k++) {
      const ch = chars[k];
      if (ch === " " || order[k] <= eased) frame[k] = ch;
      else frame[k] = order[k] - eased < 0.12 ? noise[(Math.random() * noise.length) | 0] : " ";
    }
    pre.innerHTML = toHTML(grid, frame);
    if (t < 1) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

