import type { Palette } from "./gl";

// Mirrors the CSS tokens --fg, --accent and --accent-text as linear 0–1 RGB.
export const PALETTE: Palette = {
  fg: [0.949, 0.949, 0.949],
  accent: [0x3d / 255, 0x5a / 255, 0xfe / 255],
  accentHi: [0x7b / 255, 0x8c / 255, 0xff / 255],
};
