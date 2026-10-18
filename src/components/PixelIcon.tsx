// Pixel-art icons drawn from string grids ("X" = filled square).

const GLYPHS = {
  "arrow-right": ["..X..", "...X.", "XXXXX", "...X.", "..X.."],
  "arrow-left": ["..X..", ".X...", "XXXXX", ".X...", "..X.."],
  "arrow-up-right": [".XXXX", "...XX", "..X.X", ".X..X", "X...."],
  "arrow-up": ["..X..", ".XXX.", "X.X.X", "..X..", "..X.."],
  plus: ["..X..", "..X..", "XXXXX", "..X..", "..X.."],
  close: ["X...X", ".X.X.", "..X..", ".X.X.", "X...X"],
  copy: ["XXX..", "X.XXX", "X.X.X", "XXX.X", "..XXX"],
  check: ["....X", "...X.", "X.X..", ".X...", "....."],
  dot: ["XX", "XX"],
  ir: ["X.XXX.", "X.X..X", "X.X..X", "X.XXX.", "X.X.X.", "X.X..X", "X.X..X"],
} as const;

export type PixelIconName = keyof typeof GLYPHS;

const paths = new Map<PixelIconName, string>();

function pathFor(name: PixelIconName) {
  let d = paths.get(name);
  if (d) return d;
  d = "";
  GLYPHS[name].forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === "X") d += `M${x} ${y}h1v1h-1z`;
  });
  paths.set(name, d);
  return d;
}

type Props = { name: PixelIconName; size?: number; className?: string };

/** `size` is the rendered height in px; width follows the grid. */
export function PixelIcon({ name, size = 10, className }: Props) {
  const rows = GLYPHS[name];
  const h = rows.length;
  const w = rows[0].length;
  return (
    <svg
      className={className}
      width={(size * w) / h}
      height={size}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <path d={pathFor(name)} fill="currentColor" />
    </svg>
  );
}
