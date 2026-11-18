/**
 * Decals on a body: small stencil plates (numbers, hazard stripes, barcodes,
 * chevrons, labels) laid flat on the surface at a vertex, oriented to its
 * normal, parented to the vertex's dominant bone so they ride the animation.
 * Replaces the floating "plates" that read as random rectangles.
 */
import * as THREE from 'three/webgpu';
import type { Body } from './body';
import { VectorPlate } from './vector-plate';

export type StickerKind = 'num' | 'stripes' | 'barcode' | 'chevron' | 'label' | 'cross';
export type Sticker = { at: [number, number, number]; w: number; h: number; kind: StickerKind; text?: string; color: string; bg?: string; rot?: number };

function clipStripe(points: [number, number][], edge: number, sign: number) {
  const clipped: [number, number][] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const inside = (a[0] - edge) * sign >= 0;
    if (inside) clipped.push(a);
    if (inside !== ((b[0] - edge) * sign >= 0)) {
      const t = (edge - a[0]) / (b[0] - a[0]);
      clipped.push([edge, a[1] + t * (b[1] - a[1])]);
    }
  }
  return clipped;
}

function stickerMesh(s: Sticker) {
  const W = 256;
  const H = Math.max(32, Math.round((W * s.h) / s.w));
  const plate = new VectorPlate(W, H, s.w, s.h);
  const ink = s.color;
  if (s.bg) plate.rect(0, 0, W, H, s.bg, -0.25);
  switch (s.kind) {
    case 'num':
      plate.text(s.text ?? '07', W * 0.04, H * 0.18, H * 0.71, ink, { maxWidth: W * 0.92 });
      break;
    case 'label':
      plate.text(s.text ?? 'ICAR', W * 0.05, H * 0.32, H * 0.45, ink, { maxWidth: W * 0.90, aspect: 0.88 });
      plate.rect(0, H * 0.88, W, H * 0.12, ink);
      break;
    case 'stripes':
      for (let x = -H; x < W; x += H * 0.6) {
        const stripe = clipStripe([[x, H], [x + 0.3 * H, H], [x + 1.3 * H, 0], [x + H, 0]], 0, 1);
        plate.polygon(clipStripe(stripe, W, -1), ink);
      }
      break;
    case 'barcode':
      for (let x = 0; x < W; x += 6) if (Math.sin(x * 12.9898) * 43758.5453 % 1 > -0.2) plate.rect(x, 0, 2, H, ink);
      break;
    case 'chevron':
      for (let i = 0; i < 3; i++) {
        const x = W * (0.1 + i * 0.28);
        const tip = x + W * 0.15;
        plate.segment(x, H * 0.15, tip, H * 0.5, H * 0.18, ink);
        plate.segment(tip, H * 0.5, x, H * 0.85, H * 0.18, ink);
      }
      break;
    case 'cross':
      plate.rect(W * 0.42, 0, W * 0.16, H, ink);
      plate.rect(0, H * 0.42, W, H * 0.16, ink);
      break;
  }
  const mesh = plate.mesh({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  mesh.name = `Stencil ${s.kind}`;
  return mesh;
}

/** `at` is a bind-pose world point near the surface; the nearest vertex anchors the decal. */
export function addStickers(body: Body, list: Sticker[]) {
  const g = body.mesh.geometry;
  const pos = g.getAttribute('position');
  const nrm = g.getAttribute('normal');
  const si = g.getAttribute('skinIndex');
  const sw = g.getAttribute('skinWeight');
  const skel = body.mesh.skeleton;
  const out: THREE.Mesh[] = [];
  for (const s of list) {
    let best = 0;
    let bd = Infinity;
    for (let i = 0; i < pos.count; i++) {
      const d = (pos.getX(i) - s.at[0]) ** 2 + (pos.getY(i) - s.at[1]) ** 2 + (pos.getZ(i) - s.at[2]) ** 2;
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    // dominant bone
    let bi = 0;
    let bw = -1;
    for (let k = 0; k < 4; k++) {
      const w = sw.getComponent(best, k);
      if (w > bw) {
        bw = w;
        bi = si.getComponent(best, k);
      }
    }
    const p = new THREE.Vector3(pos.getX(best), pos.getY(best), pos.getZ(best));
    const n = new THREE.Vector3(nrm.getX(best), nrm.getY(best), nrm.getZ(best)).normalize();
    const m = stickerMesh(s);
    // world (bind) transform: plane +Z → surface normal, keep "up" close to world Y
    const world = new THREE.Matrix4();
    const zAxis = n.clone();
    const up = Math.abs(zAxis.y) > 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
    const xAxis = new THREE.Vector3().crossVectors(up, zAxis).normalize();
    const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis);
    world.makeBasis(xAxis, yAxis, zAxis);
    if (s.rot) world.multiply(new THREE.Matrix4().makeRotationZ(s.rot));
    world.setPosition(p.addScaledVector(n, 0.004));
    // into bone-local space using the bind inverse
    const local = new THREE.Matrix4().multiplyMatrices(skel.boneInverses[bi], world);
    local.decompose(m.position, m.quaternion, m.scale);
    skel.bones[bi].add(m);
    out.push(m);
  }
  return out;
}
