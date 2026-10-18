import { fontsReady } from "./atlas";
import { AsciiPass, getContext, program, webgl2Supported, type Palette, type Prog } from "./gl";
import { Optimizer, TRAIL, WELLS } from "./loss";
import { lookAt, multiply, perspective } from "./mat4";

// Live ASCII render of a loss landscape: the surface (and the optimizer) draw into
// the AsciiPass cell framebuffer, which then stamps one glyph per cell.

export type Readout = { run: number; epoch: number; loss: number; converged: boolean };

type Options = {
  reduced: boolean;
  palette: Palette;
  onReadout?: (r: Readout) => void;
  onReady?: () => void;
};

const GRID = 110;
const S = 1.55; // world scale on x/z
const H = 0.95; // world scale on y
const f = (n: number) => n.toFixed(4);

const HEIGHT_GLSL = /* glsl */ `
uniform vec4 uWells[${WELLS}];
uniform float uTime;
const float S = ${f(S)};
const float H = ${f(H)};
float height(vec2 p) {
  float h = 0.32 * dot(p, p);
  for (int i = 0; i < ${WELLS}; i++) {
    vec4 w = uWells[i];
    vec2 d = p - w.xy;
    h -= w.z * exp(-dot(d, d) / (2.0 * w.w * w.w));
  }
  h += 0.035 * sin(3.0 * p.x + uTime * 0.5) * cos(3.0 * p.y - uTime * 0.4);
  return h;
}`;

const SURFACE_VS = /* glsl */ `#version 300 es
layout(location = 0) in vec2 aP;
uniform mat4 uViewProj;
uniform vec3 uEye;
${HEIGHT_GLSL}
out vec3 vN;
out vec2 vP;
out float vH;
out float vDist;
void main() {
  float h = height(aP);
  float e = 0.01;
  float dx = (height(aP + vec2(e, 0.0)) - height(aP - vec2(e, 0.0))) / (2.0 * e);
  float dy = (height(aP + vec2(0.0, e)) - height(aP - vec2(0.0, e))) / (2.0 * e);
  vN = normalize(vec3(-H * dx / S, 1.0, -H * dy / S));
  vec3 world = vec3(S * aP.x, H * h, S * aP.y);
  vP = aP;
  vH = h;
  vDist = distance(world, uEye);
  gl_Position = uViewProj * vec4(world, 1.0);
}`;

const SURFACE_FS = /* glsl */ `#version 300 es
precision highp float;
in vec3 vN;
in vec2 vP;
in float vH;
in float vDist;
uniform float uIso;
uniform vec2 uFog;
out vec4 o;
void main() {
  vec3 L = normalize(vec3(-0.55, 0.85, 0.4));
  float hl = dot(normalize(vN), L) * 0.5 + 0.5;
  float lum = 0.03 + 0.92 * pow(hl, 2.6);
  float band = abs(fract(vH * 6.0) - 0.5);
  float iso = smoothstep(0.38, 0.5, band);
  lum = mix(lum, lum * 0.5 + iso * 0.7, uIso);
  float fog = 1.0 - smoothstep(uFog.x, uFog.y, vDist);
  lum *= mix(0.22, 1.0, fog);
  lum *= 1.0 - smoothstep(0.52, 0.98, length(vP));
  o = vec4(lum, 0.0, 0.0, 1.0);
}`;

const POINT_VS = /* glsl */ `#version 300 es
layout(location = 0) in vec4 aQ; // x, y, kind (1 trail, 2 head), age
uniform mat4 uViewProj;
uniform float uHead;
${HEIGHT_GLSL}
out float vKind;
out float vAge;
void main() {
  float h = height(aQ.xy);
  vec3 world = vec3(S * aQ.x, H * h + 0.03, S * aQ.y);
  vKind = aQ.z;
  vAge = aQ.w;
  gl_Position = uViewProj * vec4(world, 1.0);
  gl_PointSize = aQ.z > 1.5 ? uHead : 1.0;
}`;

const POINT_FS = /* glsl */ `#version 300 es
precision highp float;
in float vKind;
in float vAge;
out vec4 o;
void main() {
  o = vec4(1.0, vKind > 1.5 ? 1.0 : 0.5, vAge, 1.0);
}`;

const smooth = (t: number) => t * t * (3 - 2 * t);

export class HeroEngine {
  static supported = webgl2Supported;

  private gl!: WebGL2RenderingContext;
  private pass!: AsciiPass;
  private surface!: Prog;
  private points!: Prog;
  private meshVao!: WebGLVertexArrayObject;
  private meshBufs: WebGLBuffer[] = [];
  private meshCount = 0;
  private pointVao!: WebGLVertexArrayObject;
  private pointBuf!: WebGLBuffer;
  private pointData = new Float32Array((TRAIL + 1) * 4);

  private opt = new Optimizer();
  private time = 0;
  private last = 0;
  private raf = 0;
  private running = false;
  private wanted = false;
  private ready = false;
  private destroyed = false;
  private lastReadout = 0;

  /** Camera framing; exposed so it can be tuned live in dev. */
  cam = { theta: 0.55, orbit: 0.035, phi0: 0.62, phi1: 1.36, r0: 4.1, r1: 3.4, y0: -0.12, y1: -0.2, fov: 34 };

  private scrollP = 0;
  private opacity = 1;
  private ptr = { tx: 0, ty: 0, x: 0, y: 0, vx: 0, vy: 0 };

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
      this.surface = program(gl, SURFACE_VS, SURFACE_FS);
      this.points = program(gl, POINT_VS, POINT_FS);
      this.pass = new AsciiPass(gl, (w) => (w < 640 ? [7, 11] : [8, 13]));
    } catch (err) {
      console.warn("[hero] WebGL setup failed, using fallback", err);
      return false;
    }
    this.buildMesh();
    this.buildPoints();
    this.resize();

    if (this.opts.reduced) {
      // Show a finished run: descend to convergence off-screen, then draw once.
      for (let i = 0; i < 3000 && this.opt.phase === "descend"; i++) this.opt.update(1 / 60, 0);
    }

    window.addEventListener("pointermove", this.onPointer, { passive: true });
    document.addEventListener("visibilitychange", this.onVisibility);
    this.canvas.addEventListener("webglcontextlost", this.onLost);

    this.ready = true;
    this.render();
    this.emitReadout(true);
    this.opts.onReady?.();
    if (this.wanted) this.start();
    return true;
  }

  private buildMesh() {
    const gl = this.gl;
    const n = GRID + 1;
    const verts = new Float32Array(n * n * 2);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const k = (j * n + i) * 2;
        verts[k] = (i / GRID) * 2 - 1;
        verts[k + 1] = (j / GRID) * 2 - 1;
      }
    }
    const idx = new Uint16Array(GRID * GRID * 6);
    let p = 0;
    for (let j = 0; j < GRID; j++) {
      for (let i = 0; i < GRID; i++) {
        const a = j * n + i;
        const b = a + 1;
        const c = a + n;
        const d = c + 1;
        idx[p++] = a;
        idx[p++] = c;
        idx[p++] = b;
        idx[p++] = b;
        idx[p++] = c;
        idx[p++] = d;
      }
    }
    this.meshCount = idx.length;
    this.meshVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.meshVao);
    const vb = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const ib = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    this.meshBufs = [vb, ib];
  }

  private buildPoints() {
    const gl = this.gl;
    this.pointVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.pointVao);
    this.pointBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pointBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.pointData.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }

  resize() {
    if (!this.pass) return;
    this.pass.resize(this.canvas);
    if (this.ready && !this.running) this.render();
  }

  /** 0 = hero framing, 1 = top-down contour view behind the statement. */
  setScroll(p: number) {
    if (this.opts.reduced) return;
    this.scrollP = p;
  }

  setOpacity(a: number) {
    if (a === this.opacity) return;
    this.opacity = a;
    if (this.ready && !this.running) this.render();
  }

  /** Whether the canvas is on screen and worth animating. */
  setActive(active: boolean) {
    this.wanted = active;
    if (active) this.start();
    else this.stop();
  }

  get isRunning() {
    return this.running;
  }

  private start() {
    if (this.running || !this.ready || this.opts.reduced || document.hidden) return;
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

  private onPointer = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    this.ptr.tx = (e.clientX / window.innerWidth) * 2 - 1;
    this.ptr.ty = (e.clientY / window.innerHeight) * 2 - 1;
  };

  private onLost = (e: Event) => {
    e.preventDefault();
    this.stop();
    this.ready = false;
  };

  private frame = (now: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    this.opt.update(dt, this.time);

    // Critically damped spring towards the pointer.
    const k = 28;
    const c = 2 * Math.sqrt(k);
    const p = this.ptr;
    p.vx += ((p.tx - p.x) * k - p.vx * c) * dt;
    p.vy += ((p.ty - p.y) * k - p.vy * c) * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    this.render();
    if (now - this.lastReadout > 100) {
      this.lastReadout = now;
      this.emitReadout(false);
    }
  };

  private emitReadout(force: boolean) {
    if (!this.opts.onReadout) return;
    if (!force && this.opt.phase === "morph") return;
    this.opts.onReadout({
      run: this.opt.run,
      epoch: this.opt.epoch,
      loss: this.opt.loss,
      converged: this.opt.phase !== "descend",
    });
  }

  private camera() {
    const aspect = this.pass.aspect;
    const sp = smooth(Math.min(1, Math.max(0, this.scrollP)));
    const c = this.cam;
    const theta = c.theta + this.time * c.orbit + this.ptr.x * 0.22;
    const phi = c.phi0 + (c.phi1 - c.phi0) * sp - this.ptr.y * 0.06;
    const fit = aspect < 1.2 ? 1 + (1.2 - aspect) * 0.75 : 1;
    const radius = (c.r0 + (c.r1 - c.r0) * sp) * fit;
    const target = [0, c.y0 + (c.y1 - c.y0) * sp, 0];
    const eye = [
      target[0] + radius * Math.cos(phi) * Math.sin(theta),
      target[1] + radius * Math.sin(phi),
      target[2] + radius * Math.cos(phi) * Math.cos(theta),
    ];
    const proj = perspective((c.fov * Math.PI) / 180, aspect, 0.1, 30);
    const view = lookAt(eye, target, [0, 1, 0]);
    return { viewProj: multiply(proj, view), eye, radius, sp };
  }

  private render() {
    if (!this.ready) return;
    const gl = this.gl;
    const { viewProj, eye, radius, sp } = this.camera();
    const wells = new Float32Array(WELLS * 4);
    this.opt.wells.forEach((w, i) => wells.set([w.x, w.y, w.depth, w.width], i * 4));

    this.pass.beginScene();

    gl.useProgram(this.surface.p);
    gl.uniformMatrix4fv(this.surface.u("uViewProj"), false, viewProj);
    gl.uniform4fv(this.surface.u("uWells"), wells);
    gl.uniform1f(this.surface.u("uTime"), this.time);
    gl.uniform3fv(this.surface.u("uEye"), eye);
    gl.uniform1f(this.surface.u("uIso"), 0.45 + 0.55 * sp);
    gl.uniform2f(this.surface.u("uFog"), radius - 1.4, radius + 1.9);
    gl.bindVertexArray(this.meshVao);
    gl.drawElements(gl.TRIANGLES, this.meshCount, gl.UNSIGNED_SHORT, 0);

    const showOpt = this.opt.phase !== "morph";
    if (showOpt) {
      let n = 0;
      this.opt.forEachTrail((x, y, age) => {
        this.pointData.set([x, y, 1, age], n * 4);
        n++;
      });
      this.pointData.set([this.opt.x, this.opt.y, 2, 0], n * 4);
      n++;
      gl.useProgram(this.points.p);
      gl.uniformMatrix4fv(this.points.u("uViewProj"), false, viewProj);
      gl.uniform4fv(this.points.u("uWells"), wells);
      gl.uniform1f(this.points.u("uTime"), this.time);
      gl.uniform1f(this.points.u("uHead"), this.pass.cols > 70 ? 2 : 1);
      gl.bindVertexArray(this.pointVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.pointBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.pointData, 0, n * 4);
      gl.drawArrays(gl.POINTS, 0, n);
    }

    this.pass.draw(this.canvas, this.opts.palette, this.opacity);
  }

  /** Frees GPU resources but keeps the context: the canvas may be reused by a remount. */
  destroy() {
    this.destroyed = true;
    this.stop();
    window.removeEventListener("pointermove", this.onPointer);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.canvas.removeEventListener("webglcontextlost", this.onLost);
    const gl = this.gl;
    if (!gl || !this.ready) return;
    this.ready = false;
    for (const p of [this.surface, this.points]) gl.deleteProgram(p.p);
    gl.deleteVertexArray(this.meshVao);
    gl.deleteVertexArray(this.pointVao);
    this.meshBufs.forEach((b) => gl.deleteBuffer(b));
    gl.deleteBuffer(this.pointBuf);
    this.pass.dispose();
  }
}
