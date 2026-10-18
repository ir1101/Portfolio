import { ATLAS, RAMP, buildAtlas } from "./atlas";

// Shared WebGL2 plumbing for the live ASCII scenes (hero landscape, footer monogram).
// A scene renders into a framebuffer that is exactly cols × rows, so one texel is
// one character cell; AsciiPass then stamps a glyph per cell from an atlas.
//
// Scene texel channels: R = luminance, G = accent (1 solid block, 0.5 accent glyph),
// B = accent glyph fade (0 = full).

export type RGB = [number, number, number];
export type Palette = { fg: RGB; accent: RGB; accentHi: RGB };

export function webgl2Supported(): boolean {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

export function getContext(canvas: HTMLCanvasElement): WebGL2RenderingContext | null {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    depth: false,
    premultipliedAlpha: true,
    powerPreference: "low-power",
  });
  return gl && !gl.isContextLost() ? gl : null;
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error(`Shader compile failed: ${log}`);
  }
  return s;
}

export function program(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(`Program link failed: ${gl.getProgramInfoLog(p)}`);
  }
  const uniforms = new Map<string, WebGLUniformLocation | null>();
  const u = (name: string) => {
    if (!uniforms.has(name)) uniforms.set(name, gl.getUniformLocation(p, name));
    return uniforms.get(name)!;
  };
  return { p, u };
}

export type Prog = ReturnType<typeof program>;

const ASCII_VS = /* glsl */ `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const ASCII_FS = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uAtlas;
uniform vec2 uCell;
uniform vec2 uGrid;
uniform float uRamp;
uniform float uCount;
uniform vec3 uFg;
uniform vec3 uAccent;
uniform vec3 uAccentHi;
uniform float uOpacity;
out vec4 o;
void main() {
  vec2 fc = gl_FragCoord.xy;
  vec2 cell = floor(fc / uCell);
  vec4 s = texture(uScene, (cell + 0.5) / uGrid);
  vec2 local = (fc - cell * uCell) / uCell;
  float lum = clamp(s.r, 0.0, 1.0);
  vec3 col = uFg;
  float a;
  if (s.g > 0.75) {
    vec2 d = abs(local - 0.5);
    a = step(d.x, 0.38) * step(d.y, 0.3);
    col = uAccent;
  } else {
    float idx;
    float w;
    if (s.g > 0.25) {
      idx = uCount - 1.0;
      col = uAccentHi;
      w = 0.45 + 0.55 * (1.0 - s.b);
    } else {
      idx = min(floor(pow(lum, 0.8) * uRamp), uRamp - 1.0);
      w = 0.3 + 0.7 * lum;
    }
    vec2 auv = vec2((idx + local.x) / uCount, 1.0 - local.y);
    a = texture(uAtlas, auv).a * w;
  }
  a *= uOpacity;
  o = vec4(col * a, a);
}`;

/** Cell size in CSS px for a given canvas CSS width. */
export type CellSize = (cssW: number) => [number, number];

export class AsciiPass {
  cellW = 16;
  cellH = 26;
  cols = 1;
  rows = 1;

  private prog: Prog;
  private emptyVao: WebGLVertexArrayObject;
  private fbo: WebGLFramebuffer;
  private sceneTex: WebGLTexture;
  private depthRb: WebGLRenderbuffer;
  private atlasTex: WebGLTexture;

  constructor(
    private gl: WebGL2RenderingContext,
    private cellSize: CellSize,
  ) {
    this.prog = program(gl, ASCII_VS, ASCII_FS);
    this.emptyVao = gl.createVertexArray()!;
    this.fbo = gl.createFramebuffer()!;
    this.sceneTex = gl.createTexture()!;
    this.depthRb = gl.createRenderbuffer()!;
    this.atlasTex = gl.createTexture()!;
  }

  /** Aspect ratio of the cell grid, for the scene's projection. */
  get aspect() {
    return (this.cols * this.cellW) / (this.rows * this.cellH);
  }

  /** Match the canvas to its CSS box and rebuild the cell framebuffer and atlas. */
  resize(canvas: HTMLCanvasElement) {
    const gl = this.gl;
    const rect = canvas.getBoundingClientRect();
    const cssW = Math.max(1, rect.width);
    const cssH = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const [cw, ch] = this.cellSize(cssW);
    this.cellW = Math.max(4, Math.round(cw * dpr));
    this.cellH = Math.max(7, Math.round(ch * dpr));
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    this.cols = Math.ceil(canvas.width / this.cellW);
    this.rows = Math.ceil(canvas.height / this.cellH);

    gl.bindTexture(gl.TEXTURE_2D, this.sceneTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, this.cols, this.rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    setNearest(gl);
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthRb);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.cols, this.rows);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.sceneTex, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depthRb);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    const atlas = buildAtlas(this.cellW, this.cellH);
    gl.bindTexture(gl.TEXTURE_2D, this.atlasTex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
    setNearest(gl);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  /** Bind the cell framebuffer and clear it; the scene draws next. */
  beginScene() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, this.cols, this.rows);
    gl.clearColor(0, 0, 0, 1);
    gl.clearDepth(1);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  /** Stamp glyphs onto the canvas from the scene framebuffer. */
  draw(canvas: HTMLCanvasElement, palette: Palette, opacity = 1) {
    const gl = this.gl;
    const { p, u } = this.prog;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.disable(gl.DEPTH_TEST);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sceneTex);
    gl.uniform1i(u("uScene"), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.atlasTex);
    gl.uniform1i(u("uAtlas"), 1);
    gl.uniform2f(u("uCell"), this.cellW, this.cellH);
    gl.uniform2f(u("uGrid"), this.cols, this.rows);
    gl.uniform1f(u("uRamp"), RAMP.length);
    gl.uniform1f(u("uCount"), ATLAS.length);
    gl.uniform3fv(u("uFg"), palette.fg);
    gl.uniform3fv(u("uAccent"), palette.accent);
    gl.uniform3fv(u("uAccentHi"), palette.accentHi);
    gl.uniform1f(u("uOpacity"), opacity);
    gl.bindVertexArray(this.emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  dispose() {
    const gl = this.gl;
    gl.deleteProgram(this.prog.p);
    gl.deleteVertexArray(this.emptyVao);
    gl.deleteFramebuffer(this.fbo);
    gl.deleteTexture(this.sceneTex);
    gl.deleteTexture(this.atlasTex);
    gl.deleteRenderbuffer(this.depthRb);
  }
}

function setNearest(gl: WebGL2RenderingContext) {
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}
