/**
 * Decals on a body: small stencil plates (numbers, hazard stripes, barcodes,
 * chevrons, labels) laid flat on the surface at a vertex, oriented to its
 * normal, parented to the vertex's dominant bone so they ride the animation.
 * Replaces the floating "plates" that read as random rectangles.
 */
import * as THREE from 'three/webgpu';
import type { Body } from './body';
import { F } from '../draw';

export type StickerKind = 'num' | 'stripes' | 'barcode' | 'chevron' | 'label' | 'cross';
export type Sticker = { at: [number, number, number]; w: number; h: number; kind: StickerKind; text?: string; color: string; bg?: string; rot?: number };

function paint(s: Sticker) {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = Math.max(32, Math.round((256 * s.h) / s.w));
  const c = cv.getContext('2d')!;
  const W = cv.width;
  const H = cv.height;
  if (s.bg) {
    c.fillStyle = s.bg;
    c.fillRect(0, 0, W, H);
  }
  c.fillStyle = s.color;
  c.strokeStyle = s.color;
  switch (s.kind) {
    case 'num':
      c.font = `800 ${H * 0.95}px ${F.sans}`;
      c.textBaseline = 'middle';
      c.fillText(s.text ?? '07', W * 0.04, H * 0.54);
      break;
    case 'label':
      c.font = `800 ${H * 0.62}px ${F.sans}`;
      c.textBaseline = 'middle';
      c.fillText(s.text ?? 'ICAR', W * 0.05, H * 0.55);
      c.fillRect(0, H * 0.88, W, H * 0.12);
      break;
    case 'stripes':
      for (let x = -H; x < W + H; x += H * 0.6) {
        c.beginPath();
        c.moveTo(x, H);
        c.lineTo(x + H * 0.3, H);
        c.lineTo(x + H * 0.3 + H, 0);
        c.lineTo(x + H, 0);
        c.fill();
      }
      break;
    case 'barcode':
      for (let x = 0; x < W; x += 6) if (Math.sin(x * 12.9898) * 43758.5453 % 1 > -0.2) c.fillRect(x, 0, 2 + (x % 3), H);
      break;
    case 'chevron':
      c.lineWidth = H * 0.18;
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.moveTo(W * (0.1 + i * 0.28), H * 0.15);
        c.lineTo(W * (0.25 + i * 0.28), H * 0.5);
        c.lineTo(W * (0.1 + i * 0.28), H * 0.85);
        c.stroke();
      }
      break;
    case 'cross':
      c.fillRect(W * 0.42, 0, W * 0.16, H);
      c.fillRect(0, H * 0.42, W, H * 0.16);
      break;
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
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
    const mat = new THREE.MeshBasicMaterial({ map: paint(s), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.h), mat);
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
