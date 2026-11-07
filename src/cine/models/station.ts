/**
 * The orbital station that drops runners: a hub with docking collars, a
 * rotating habitat ring on four spokes, a long truss with radiator and solar
 * wings, drop bays under the hub. Dark toon plates with bright edge lines.
 * Units ≈ 1 = 20 m; the station is ~10 long.
 */
import * as THREE from 'three/webgpu';
import { Hard, toonLit } from './hard';

export function stationModel() {
  const g = new THREE.Group();
  const mats = {
    hull: toonLit({ lit: 0x2a3456, mid: 0x161c34, shade: 0x05070f }).mat,
    trim: toonLit({ lit: 0xc8d0ff, mid: 0x6a78c8, shade: 0x1a2050 }).mat,
    panel: toonLit({ lit: 0x1a2cff, mid: 0x0e18a0, shade: 0x050a40 }).mat,
    bay: toonLit({ lit: 0xcde404, mid: 0x8a9a00, shade: 0x3a4200 }).mat,
  } as Record<string, THREE.Material>;
  const edges = { hull: 0x8aa0ff, trim: 0xe8ecff, panel: 0x6a8aff, bay: 0x000000 };
  const h = new Hard();
  const cyl = (r: number, len: number, seg = 24) => new THREE.CylinderGeometry(r, r, len, seg, 1);
  // hub + collars (axis along z)
  h.geo('hull', cyl(0.62, 2.6, 24), 0, 0, 0, Math.PI / 2);
  for (const z of [-1.45, 1.45]) h.geo('trim', cyl(0.42, 0.3, 20), 0, 0, z, Math.PI / 2);
  for (const z of [-0.7, 0, 0.7]) h.geo('trim', cyl(0.66, 0.08, 24), 0, 0, z, Math.PI / 2);
  // habitat ring on four spokes (ring in the x-y plane)
  const ring = new THREE.TorusGeometry(2.3, 0.2, 10, 64);
  h.geo('hull', ring, 0, 0, 0.2);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    h.geo('trim', cyl(0.07, 1.7, 8), Math.cos(a) * 1.45, Math.sin(a) * 1.45, 0.2, 0, 0, a - Math.PI / 2);
  }
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    h.geo('trim', new THREE.BoxGeometry(0.12, 0.46, 0.46), Math.cos(a) * 2.3, Math.sin(a) * 2.3, 0.2, 0, 0, a);
  }
  // truss (along z) with solar / radiator wings
  h.geo('trim', new THREE.BoxGeometry(0.16, 0.16, 9.5), 0, 0, 0);
  for (let i = 0; i < 18; i++) h.geo('trim', new THREE.BoxGeometry(0.34, 0.03, 0.03), 0, 0, -4.6 + i * 0.54);
  for (const z of [-4.1, -3.0, 3.0, 4.1])
    for (const sx of [-1, 1]) {
      h.geo('panel', new THREE.BoxGeometry(2.6, 0.03, 0.9), sx * 1.5, 0, z);
      for (let k = 1; k < 5; k++) h.geo('trim', new THREE.BoxGeometry(0.015, 0.04, 0.9), sx * (0.2 + k * 0.52), 0, z);
    }
  // drop bays under the hub
  for (let i = 0; i < 4; i++) h.geo('bay', new THREE.BoxGeometry(0.26, 0.24, 0.34), -0.45 + i * 0.3, -0.7, 0.2);
  h.geo('hull', new THREE.BoxGeometry(1.4, 0.18, 0.6), 0, -0.56, 0.2);
  g.add(h.build(mats, edges, 30));
  return g;
}
