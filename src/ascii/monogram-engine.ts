import { fontsReady } from "./atlas";
import { AsciiPass, getContext, program, webgl2Supported, type Palette, type Prog } from "./gl";
import { lookAt, multiply, perspective, yawPitch } from "./mat4";

// The pixel "IR" mark from the header, extruded into voxels and rendered live as
// ASCII. It idles in a slow spin; drag or flick it and the spin carries momentum
// before easing back to idle.

/** Same grid as the `ir` PixelIcon. */
const MARK = ["X.XXX.", "X.X..X", "X.X..X", "X.XXX.", "X.X.X.", "X.X..X", "X.X..X"];
const CURSOR = { x: 7, y: 6 };
const DEPTH = 2;
const CENTER = [(CURSOR.x + 1) / 2, MARK.length / 2, DEPTH / 2];
export const VOXELS = MARK.join("").split("X").length - 1 + 1;

const BASE_SPIN = 0.5; // rad/s
const INTRO_SPIN = 7;

const VS = /* glsl */ `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aN;
layout(location = 2) in float aAcc;
uniform mat4 uViewProj;
uniform mat4 uModel;
uniform vec3 uEye;
out vec3 vN;
out vec3 vMN;
out vec3 vMP;
out float vAcc;
out float vDist;
void main() {
  vec4 w = uModel * vec4(aPos, 1.0);
  vN = mat3(uModel) * aN;
  vMN = aN;
  vMP = aPos;
  vAcc = aAcc;
  vDist = distance(w.xyz, uEye);
  gl_Position = uViewProj * w;
}`;

const FS = /* glsl */ `#version 300 es
precision highp float;
in vec3 vN;
in vec3 vMN;
in vec3 vMP;
in float vAcc;
in float vDist;
uniform vec2 uFog;
out vec4 o;
void main() {
  vec3 n = normalize(vN);
  float key = max(dot(n, normalize(vec3(-0.35, 0.45, 0.9))), 0.0);
  float rim = max(dot(n, normalize(vec3(0.7, -0.15, -0.7))), 0.0);
  float lum = 0.05 + 1.0 * key + 0.28 * rim;
  // Faint voxel seams: brighten near each cube's edges within the face plane.
  vec3 f = abs(fract(vMP) - 0.5) * (1.0 - abs(vMN));
  float edge = smoothstep(0.36, 0.5, max(max(f.x, f.y), f.z));
  lum *= 0.85 + 0.3 * edge;
  lum *= mix(0.45, 1.0, 1.0 - smoothstep(uFog.x, uFog.y, vDist));
  o = vec4(lum, vAcc, 0.0, 1.0);
}`;

function buildMesh() {
  const rows = MARK.length;
  const filled = (x: number, y: number) => y >= 0 && y < rows && MARK[y][x] === "X";
  const out: number[] = [];
  const quad = (c: number[][], n: number[], acc: number) => {
    for (const v of [c[0], c[1], c[2], c[0], c[2], c[3]]) out.push(v[0], v[1], v[2], n[0], n[1], n[2], acc);
  };
  const cube = (gx: number, gy: number, acc: number, cull: boolean) => {
    const x0 = gx;
    const x1 = gx + 1;
    const y0 = rows - 1 - gy;
    const y1 = y0 + 1;
    const z0 = 0;
    const z1 = DEPTH;
    const open = (x: number, y: number) => !cull || !filled(x, y);
    quad([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1], acc);
    quad([[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1], acc);
    if (open(gx + 1, gy)) quad([[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [1, 0, 0], acc);
    if (open(gx - 1, gy)) quad([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0], acc);
    if (open(gx, gy - 1)) quad([[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [0, 1, 0], acc);
    if (open(gx, gy + 1)) quad([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0], acc);
  };
  MARK.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === "X") cube(x, y, 0, true);
  });
  const main = out.length / 7;
  cube(CURSOR.x, CURSOR.y, 1, false);
  return { data: new Float32Array(out), main, total: out.length / 7 };
}

type Options = { reduced: boolean; palette: Palette; onReady?: () => void };

export class MonogramEngine {
  static supported = webgl2Supported;

  private gl!: WebGL2RenderingContext;
  private pass!: AsciiPass;
  private prog!: Prog;
  private vao!: WebGLVertexArrayObject;
  private buf!: WebGLBuffer;
  private mainCount = 0;
  private totalCount = 0;

  private yaw = -0.55;
  private spin = 0;
  private dir = 1;
  private pitchOffset = 0;
  private time = 0;
  private introduced = false;
  private drag: { id: number; x: number; y: number; t: number; v: number } | null = null;

  private last = 0;
  private raf = 0;
  private running = false;
  private wanted = false;
  private ready = false;
  private destroyed = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private opts: Options,
  ) {}

  async init(): Promise<boolean> {
    const gl = getContext(this.canvas);
    if (!gl) return false;
    this.gl = gl;
    await fontsReady();
    if (this.destroyed) return false;
    try {
      this.prog = program(gl, VS, FS);
      this.pass = new AsciiPass(gl, (w) => (w < 640 ? [6, 10] : [7, 11]));
    } catch (err) {
      console.warn("[monogram] WebGL setup failed, using fallback", err);
      return false;
    }
    const mesh = buildMesh();
    this.mainCount = mesh.main;
    this.totalCount = mesh.total;
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    this.buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.data, gl.STATIC_DRAW);
    const stride = 7 * 4;
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 12);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, stride, 24);
    gl.bindVertexArray(null);

    this.pass.resize(this.canvas);
    if (!this.opts.reduced) {
      this.canvas.addEventListener("pointerdown", this.onDown);
      this.canvas.addEventListener("pointermove", this.onMove);
      this.canvas.addEventListener("pointerup", this.onUp);
      this.canvas.addEventListener("pointercancel", this.onUp);
    }
    document.addEventListener("visibilitychange", this.onVisibility);
    this.ready = true;
    this.render();
    this.opts.onReady?.();
    if (this.wanted) this.start();
    return true;
  }

  resize() {
    if (!this.ready) return;
    this.pass.resize(this.canvas);
    if (!this.running) this.render();
  }

  /** Whether the canvas is on screen and worth animating. */
  setActive(active: boolean) {
    this.wanted = active;
    if (active) this.start();
    else this.stop();
  }

  private start() {
    if (this.running || !this.ready || this.opts.reduced || document.hidden) return;
    // First time it comes into view, it whips round and settles into the idle spin.
    if (!this.introduced) {
      this.introduced = true;
      this.spin = INTRO_SPIN * this.dir;
    }
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private onVisibility = () => {
    if (document.hidden) this.stop();
    else if (this.wanted) this.start();
  };

  private onDown = (e: PointerEvent) => {
    if (this.drag || (e.pointerType === "mouse" && e.button !== 0)) return;
    this.canvas.setPointerCapture(e.pointerId);
    this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), v: 0 };
    this.canvas.classList.add("is-dragging");
  };

  private onMove = (e: PointerEvent) => {
    const d = this.drag;
    if (!d || d.id !== e.pointerId) return;
    const now = performance.now();
    const dt = Math.max(1, now - d.t) / 1000;
    const dyaw = (e.clientX - d.x) * 0.01;
    this.yaw += dyaw;
    this.pitchOffset = Math.max(-0.7, Math.min(0.7, this.pitchOffset + (e.clientY - d.y) * 0.005));
    d.v = d.v * 0.6 + (dyaw / dt) * 0.4;
    d.x = e.clientX;
    d.y = e.clientY;
    d.t = now;
    if (!this.running) this.render();
  };

  private onUp = (e: PointerEvent) => {
    const d = this.drag;
    if (!d || d.id !== e.pointerId) return;
    this.drag = null;
    this.canvas.classList.remove("is-dragging");
    // A pointer that paused before release shouldn't fling.
    const v = performance.now() - d.t > 90 ? 0 : d.v;
    this.spin = Math.max(-14, Math.min(14, v));
    if (Math.abs(this.spin) > 0.3) this.dir = Math.sign(this.spin);
  };

  private frame = (now: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    if (!this.drag) {
      this.spin += (this.dir * BASE_SPIN - this.spin) * (1 - Math.exp(-dt * 1.2));
      this.yaw += this.spin * dt;
      this.pitchOffset *= Math.exp(-dt * 2.5);
    }
    this.render();
  };

  private render() {
    if (!this.ready) return;
    const gl = this.gl;
    const aspect = this.pass.aspect;
    const dist = Math.max(19, 22 / aspect);
    const eye = [0, 0, dist];
    const proj = perspective((28 * Math.PI) / 180, aspect, 0.5, 80);
    const viewProj = multiply(proj, lookAt(eye, [0, 0, 0], [0, 1, 0]));
    const pitch = 0.2 + (this.opts.reduced ? 0 : 0.05 * Math.sin(this.time * 0.7)) + this.pitchOffset;
    const model = yawPitch(this.yaw, pitch, CENTER);
    // Terminal-style cursor blink; solid while held or under reduced motion.
    const cursorOn = this.opts.reduced || !!this.drag || Math.floor(this.time / 0.55) % 2 === 0;

    this.pass.beginScene();
    gl.useProgram(this.prog.p);
    gl.uniformMatrix4fv(this.prog.u("uViewProj"), false, viewProj);
    gl.uniformMatrix4fv(this.prog.u("uModel"), false, model);
    gl.uniform3fv(this.prog.u("uEye"), eye);
    gl.uniform2f(this.prog.u("uFog"), dist - 4.5, dist + 4.5);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, cursorOn ? this.totalCount : this.mainCount);
    gl.bindVertexArray(null);
    this.pass.draw(this.canvas, this.opts.palette, 1);
  }

  /** Frees GPU resources but keeps the context: the canvas may be reused by a remount. */
  destroy() {
    this.destroyed = true;
    this.stop();
    this.canvas.removeEventListener("pointerdown", this.onDown);
    this.canvas.removeEventListener("pointermove", this.onMove);
    this.canvas.removeEventListener("pointerup", this.onUp);
    this.canvas.removeEventListener("pointercancel", this.onUp);
    document.removeEventListener("visibilitychange", this.onVisibility);
    if (!this.ready) return;
    this.ready = false;
    const gl = this.gl;
    gl.deleteProgram(this.prog.p);
    gl.deleteVertexArray(this.vao);
    gl.deleteBuffer(this.buf);
    this.pass.dispose();
  }
}
