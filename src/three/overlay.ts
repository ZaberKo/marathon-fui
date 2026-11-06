/**
 * Vector overlay batches — the "graphic" layer that sits on 3D geometry.
 *
 * LineBatch: one dynamic LineSegments buffer you redraw every step:
 *   connectors, bezier arcs, and billboarded marks (triangles, squares,
 *   diamonds, circles, crosses, brackets) sized in *screen pixels*.
 * FillBatch: same idea for solid billboarded squares / triangles (dots).
 *
 *   batch.begin(camera, viewportH)
 *   batch.color(0x7dff1a).tri(p, 10).line(a, b)
 *   batch.end()
 */
import * as THREE from 'three/webgpu';

const _r = new THREE.Vector3();
const _u = new THREE.Vector3();
const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _c = new THREE.Color();

abstract class Batch {
  protected pos: Float32Array;
  protected col: Float32Array;
  protected geo = new THREE.BufferGeometry();
  protected n = 0;
  protected max: number;
  protected cr = 1;
  protected cg = 1;
  protected cb = 1;
  protected cam: THREE.Camera | null = null;
  protected vh = 1;

  constructor(maxVerts: number) {
    this.max = maxVerts;
    this.pos = new Float32Array(maxVerts * 3);
    this.col = new Float32Array(maxVerts * 3);
    const pa = new THREE.BufferAttribute(this.pos, 3);
    const ca = new THREE.BufferAttribute(this.col, 3);
    pa.setUsage(THREE.DynamicDrawUsage);
    ca.setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute('position', pa);
    this.geo.setAttribute('color', ca);
    this.geo.setDrawRange(0, 0);
  }

  begin(camera: THREE.Camera, viewportH: number) {
    this.n = 0;
    this.cam = camera;
    this.vh = viewportH;
    camera.updateMatrixWorld();
    const e = camera.matrixWorld.elements;
    _r.set(e[0], e[1], e[2]).normalize();
    _u.set(e[4], e[5], e[6]).normalize();
    return this;
  }

  color(c: THREE.ColorRepresentation, k = 1) {
    _c.set(c);
    this.cr = _c.r * k;
    this.cg = _c.g * k;
    this.cb = _c.b * k;
    return this;
  }

  protected vtx(x: number, y: number, z: number) {
    if (this.n >= this.max) return;
    const i = this.n * 3;
    this.pos[i] = x;
    this.pos[i + 1] = y;
    this.pos[i + 2] = z;
    this.col[i] = this.cr;
    this.col[i + 1] = this.cg;
    this.col[i + 2] = this.cb;
    this.n++;
  }

  /** world units per screen pixel at point p */
  px(p: THREE.Vector3, px: number) {
    const cam = this.cam as THREE.PerspectiveCamera & THREE.OrthographicCamera;
    if (cam.isOrthographicCamera) return ((cam.top - cam.bottom) / cam.zoom / this.vh) * px;
    _w.setFromMatrixPosition(cam.matrixWorld);
    const d = _w.distanceTo(p);
    return ((2 * d * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2)) / this.vh) * px;
  }

  /** billboard point: p + right*x + up*y (x,y in world units) */
  protected bb(p: THREE.Vector3, x: number, y: number) {
    return [p.x + _r.x * x + _u.x * y, p.y + _r.y * x + _u.y * y, p.z + _r.z * x + _u.z * y] as const;
  }

  end() {
    this.geo.setDrawRange(0, this.n);
    (this.geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    return this;
  }
}

export class LineBatch extends Batch {
  readonly object: THREE.LineSegments;

  constructor(maxVerts = 20000, { depthTest = true, opacity = 1 } = {}) {
    super(maxVerts);
    const mat = new THREE.LineBasicMaterial({ vertexColors: true, depthTest, transparent: opacity < 1, opacity });
    this.object = new THREE.LineSegments(this.geo, mat);
    this.object.frustumCulled = false;
    this.object.renderOrder = depthTest ? 1 : 10;
  }

  seg(ax: number, ay: number, az: number, bx: number, by: number, bz: number) {
    this.vtx(ax, ay, az);
    this.vtx(bx, by, bz);
    return this;
  }
  line(a: THREE.Vector3, b: THREE.Vector3) {
    return this.seg(a.x, a.y, a.z, b.x, b.y, b.z);
  }
  polyline(pts: THREE.Vector3[], closed = false) {
    for (let i = 0; i < pts.length - 1; i++) this.line(pts[i], pts[i + 1]);
    if (closed && pts.length > 2) this.line(pts[pts.length - 1], pts[0]);
    return this;
  }
  /** dashed straight line (dash/gap in world units) */
  dashed(a: THREE.Vector3, b: THREE.Vector3, dash: number, gap: number, phase = 0) {
    _v.subVectors(b, a);
    const len = _v.length();
    _v.normalize();
    for (let s = -((phase % (dash + gap)) + dash + gap); s < len; s += dash + gap) {
      const s0 = Math.max(0, s);
      const s1 = Math.min(len, s + dash);
      if (s1 <= s0) continue;
      this.seg(a.x + _v.x * s0, a.y + _v.y * s0, a.z + _v.z * s0, a.x + _v.x * s1, a.y + _v.y * s1, a.z + _v.z * s1);
    }
    return this;
  }
  /** billboarded regular polygon outline; size in screen px */
  private poly(p: THREE.Vector3, sizePx: number, sides: number, rot: number) {
    const s = this.px(p, sizePx) / 2;
    let prev = this.bb(p, Math.cos(rot) * s, Math.sin(rot) * s);
    for (let i = 1; i <= sides; i++) {
      const a = rot + (i / sides) * Math.PI * 2;
      const cur = this.bb(p, Math.cos(a) * s, Math.sin(a) * s);
      this.seg(prev[0], prev[1], prev[2], cur[0], cur[1], cur[2]);
      prev = cur;
    }
    return this;
  }
  tri(p: THREE.Vector3, sizePx: number, down = false, rot = 0) {
    return this.poly(p, sizePx, 3, (down ? -Math.PI / 2 : Math.PI / 2) + rot);
  }
  square(p: THREE.Vector3, sizePx: number) {
    return this.poly(p, sizePx * Math.SQRT2, 4, Math.PI / 4);
  }
  diamond(p: THREE.Vector3, sizePx: number) {
    return this.poly(p, sizePx, 4, 0);
  }
  circle(p: THREE.Vector3, sizePx: number, segs = 14) {
    return this.poly(p, sizePx, segs, 0);
  }
  cross(p: THREE.Vector3, sizePx: number, gapPx = 0) {
    const s = this.px(p, sizePx) / 2;
    const g = this.px(p, gapPx) / 2;
    for (const [x0, y0, x1, y1] of [
      [-s, 0, -g, 0],
      [g, 0, s, 0],
      [0, -s, 0, -g],
      [0, g, 0, s],
    ]) {
      const a = this.bb(p, x0, y0);
      const b = this.bb(p, x1, y1);
      this.seg(a[0], a[1], a[2], b[0], b[1], b[2]);
    }
    return this;
  }
  /** screen-space corner brackets around p */
  brackets(p: THREE.Vector3, wPx: number, hPx: number, lenPx = 6) {
    const w = this.px(p, wPx) / 2;
    const h = this.px(p, hPx) / 2;
    const l = this.px(p, lenPx);
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      const c = this.bb(p, sx * w, sy * h);
      const a = this.bb(p, sx * w - sx * l, sy * h);
      const b = this.bb(p, sx * w, sy * h - sy * l);
      this.seg(c[0], c[1], c[2], a[0], a[1], a[2]);
      this.seg(c[0], c[1], c[2], b[0], b[1], b[2]);
    }
    return this;
  }
  /** quadratic bezier a→b via control c; draw fraction t (0..1) */
  bezier(a: THREE.Vector3, c: THREE.Vector3, b: THREE.Vector3, segs = 24, t = 1) {
    const n = Math.max(1, Math.round(segs * t));
    let px = a.x;
    let py = a.y;
    let pz = a.z;
    for (let i = 1; i <= n; i++) {
      const u = (i / segs) * 1;
      const m = 1 - u;
      const x = m * m * a.x + 2 * m * u * c.x + u * u * b.x;
      const y = m * m * a.y + 2 * m * u * c.y + u * u * b.y;
      const z = m * m * a.z + 2 * m * u * c.z + u * u * b.z;
      this.seg(px, py, pz, x, y, z);
      px = x;
      py = y;
      pz = z;
    }
    return this;
  }
  /** world-space circle on plane with normal nrm */
  ring(center: THREE.Vector3, nrm: THREE.Vector3, radius: number, segs = 48, dashEvery = 0) {
    const t1 = new THREE.Vector3(1, 0, 0);
    if (Math.abs(nrm.x) > 0.9) t1.set(0, 1, 0);
    const a1 = new THREE.Vector3().crossVectors(nrm, t1).normalize();
    const a2 = new THREE.Vector3().crossVectors(nrm, a1).normalize();
    let prev: number[] | null = null;
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const x = center.x + (a1.x * Math.cos(a) + a2.x * Math.sin(a)) * radius;
      const y = center.y + (a1.y * Math.cos(a) + a2.y * Math.sin(a)) * radius;
      const z = center.z + (a1.z * Math.cos(a) + a2.z * Math.sin(a)) * radius;
      if (prev && (!dashEvery || i % dashEvery !== 0)) this.seg(prev[0], prev[1], prev[2], x, y, z);
      prev = [x, y, z];
    }
    return this;
  }
}

export class FillBatch extends Batch {
  readonly object: THREE.Mesh;

  constructor(maxVerts = 12000, { depthTest = true } = {}) {
    super(maxVerts);
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, depthTest, side: THREE.DoubleSide });
    this.object = new THREE.Mesh(this.geo, mat);
    this.object.frustumCulled = false;
    this.object.renderOrder = depthTest ? 2 : 11;
  }

  private tri3(a: readonly number[], b: readonly number[], c: readonly number[]) {
    this.vtx(a[0], a[1], a[2]);
    this.vtx(b[0], b[1], b[2]);
    this.vtx(c[0], c[1], c[2]);
  }
  square(p: THREE.Vector3, sizePx: number) {
    const s = this.px(p, sizePx) / 2;
    const a = this.bb(p, -s, -s);
    const b = this.bb(p, s, -s);
    const c = this.bb(p, s, s);
    const d = this.bb(p, -s, s);
    this.tri3(a, b, c);
    this.tri3(a, c, d);
    return this;
  }
  tri(p: THREE.Vector3, sizePx: number, down = false) {
    const s = this.px(p, sizePx) / 2;
    const k = down ? -1 : 1;
    this.tri3(this.bb(p, 0, s * k), this.bb(p, -s * 0.87, -s * 0.5 * k), this.bb(p, s * 0.87, -s * 0.5 * k));
    return this;
  }
}
