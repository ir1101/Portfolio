// Glyph ramp from empty to dense. The last glyph is reserved for the optimizer trail.
export const RAMP = " .:-/<>=+0#";
export const TRAIL_GLYPH = "o";
export const ATLAS = RAMP + TRAIL_GLYPH;

export const MONO_FAMILY = '"Geist Mono Variable", ui-monospace, Menlo, monospace';

export async function fontsReady(): Promise<void> {
  if (!("fonts" in document)) return;
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load(`300 16px ${MONO_FAMILY}`),
        document.fonts.load(`400 16px ${MONO_FAMILY}`),
      ]),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
  } catch {
    /* fall back to whatever monospace is available */
  }
}

/** One-row atlas: each glyph centred in a cellW × cellH device-pixel slot. */
export function buildAtlas(cellW: number, cellH: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = cellW * ATLAS.length;
  canvas.height = cellH;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const size = Math.round(Math.min(cellH * 0.78, cellW * 1.45));
  ctx.font = `400 ${size}px ${MONO_FAMILY}`;
  for (let i = 0; i < ATLAS.length; i++) {
    ctx.fillText(ATLAS[i], (i + 0.5) * cellW, cellH * 0.54);
  }
  return canvas;
}
