/**
 * The silent colony on Periapt IV — a designed layout, not random blocks:
 * a plated ground with a road grid, habitat domes (with lat/long wire), lying
 * habitat tubes with ribs, stepped towers with masts and dishes (two broken),
 * a landing pad with stencil, solar array rows, a broken perimeter wall,
 * rubble, and a few lit windows. Local units ≈ metres/2; ground at y = 0.
 */
import * as THREE from 'three/webgpu';
import { hash } from '../engine';
import { Hard, toonLit } from './hard';
import { F } from '../draw';

export type ColonyOpts = { seed?: number; haze?: boolean; ruined?: number };

function wireDome(r: number, color: number) {
  const pos: number[] = [];
  for (let i = 1; i < 7; i++) {
    const a = (i / 7) * (Math.PI / 2);
    const rr = Math.cos(a) * r * 1.004;
    const y = Math.sin(a) * r * 1.004;
    for (let k = 0; k < 48; k++) {
      const t0 = (k / 48) * Math.PI * 2;
      const t1 = ((k + 1) / 48) * Math.PI * 2;
      pos.push(Math.cos(t0) * rr, y, Math.sin(t0) * rr, Math.cos(t1) * rr, y, Math.sin(t1) * rr);
    }
  }
  for (let k = 0; k < 16; k++) {
    const t = (k / 16) * Math.PI * 2;
    for (let i = 0; i < 12; i++) {
      const a0 = (i / 12) * (Math.PI / 2);
      const a1 = ((i + 1) / 12) * (Math.PI / 2);
      pos.push(Math.cos(t) * Math.cos(a0) * r * 1.004, Math.sin(a0) * r * 1.004, Math.sin(t) * Math.cos(a0) * r * 1.004, Math.cos(t) * Math.cos(a1) * r * 1.004, Math.sin(a1) * r * 1.004, Math.sin(t) * Math.cos(a1) * r * 1.004);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color }));
}

export function buildColony(o: ColonyOpts = {}) {
  const seed = o.seed ?? 4;
  const ruin = o.ruined ?? 0.35;
  const haze = o.haze ?? true;
  const r = (...k: number[]) => hash(seed, ...k);
  const group = new THREE.Group();
  const h = new Hard();
  // ground: plated slab with a road grid (grooves) and a central plaza
  const S = 60;
  for (let i = 0; i < 12; i++)
    for (let k = 0; k < 12; k++) {
      const x = -S / 2 + (i + 0.5) * 5;
      const z = -S / 2 + (k + 0.5) * 5;
      // round settlement footprint with a ragged edge
      const rr = Math.hypot(x, z);
      if (rr > 30 || (rr > 22 && r(i, k, 9) < (rr - 22) / 9)) continue;
      const road = i % 4 === 1 || k % 4 === 1;
      if (road) h.box('road', 5, 0.08, 5, x, -0.04, z);
      else h.box(r(i, k, 1) > 0.85 ? 'plate2' : 'plate', 4.7, 0.2, 4.7, x, -0.1 + r(i, k, 2) * 0.06, z);
    }
  // domes
  const domes: [number, number, number][] = [[-12, -8, 4.2], [10, -14, 3.2], [-4, 12, 3.6], [16, 8, 2.6], [-20, 14, 2.4]];
  const domeMat = toonLit({ lit: 0x2a3a8a, mid: 0x18245a, shade: 0x060a20, haze });
  for (const [x, z, rr] of domes) {
    const broken = r(x, z) < ruin;
    const d = new THREE.Mesh(new THREE.SphereGeometry(rr, 32, 12, 0, Math.PI * 2, 0, broken ? Math.PI * 0.32 : Math.PI / 2), domeMat.mat);
    d.position.set(x, 0, z);
    group.add(d);
    const w = wireDome(rr, 0x5a72ff);
    w.position.set(x, 0, z);
    group.add(w);
    h.box('trim', rr * 2.2, 0.3, rr * 2.2, x, 0.15, z);
  }
  // habitat tubes with ribs
  for (let i = 0; i < 5; i++) {
    const x = -18 + i * 9 + r(i, 3) * 3;
    const z = 2 + r(i, 4) * 6;
    const len = 6 + r(i, 5) * 5;
    const ry = (r(i, 6) - 0.5) * 0.6;
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, len, 18, 1), toonLit({ lit: 0x34468e, mid: 0x1c2858, shade: 0x070b22, haze }).mat);
    tube.rotation.set(0, ry, Math.PI / 2);
    tube.position.set(x, 1.1, z);
    group.add(tube);
    for (let k = 0; k <= 4; k++) {
      const off = -len / 2 + (k / 4) * len;
      h.box('rib', 0.3, 2.5, 2.5, x + Math.cos(ry) * off, 1.1, z - Math.sin(ry) * off, ry);
    }
  }
  // towers: stacked setbacks, masts, dishes; some broken
  const towers: [number, number][] = [[2, -4], [-8, -18], [20, -4], [6, 20], [-24, -2], [14, -22]];
  towers.forEach(([x, z], i) => {
    const broken = r(i, 7) < ruin;
    let y = 0;
    let w = 3.2 + r(i, 8) * 1.6;
    const levels = 3 + Math.floor(r(i, 9) * 3);
    for (let k = 0; k < levels; k++) {
      const hh = 2.4 + r(i, k, 10) * 2;
      const tilt = broken && k === levels - 1 ? 0.35 : 0;
      h.box('tower', w, hh, w * 0.85, x + (tilt ? 0.6 : 0), y + hh / 2, z, r(i, 11) * 0.4, 0, tilt);
      // lit windows on the front face
      for (let q = 0; q < 6; q++) if (r(i, k, q, 12) > 0.72) h.box('lit', 0.35, 0.22, 0.05, x - w / 2 + 0.5 + (q % 3) * (w / 3), y + 0.6 + Math.floor(q / 3) * 0.8, z + (w * 0.85) / 2 + 0.03, r(i, 11) * 0.4);
      y += hh;
      w *= 0.72;
    }
    if (!broken) {
      h.box('mast', 0.18, 4 + r(i, 13) * 3, 0.18, x, y + 2, z);
      h.box('mast', 1.2, 0.08, 0.08, x, y + 3.2, z);
      const dish = new THREE.Mesh(new THREE.ConeGeometry(1.0, 0.5, 16, 1, true), toonLit({ lit: 0xc8d0ff, mid: 0x6a78c8, shade: 0x1a2050, haze }).mat);
      dish.position.set(x + 0.8, y + 1.0, z);
      dish.rotation.set(0.9, 0, -0.6);
      group.add(dish);
    }
  });
  // landing pad (octagon) with stencil
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 0.3, 8), toonLit({ lit: 0x1c2450, mid: 0x10163a, shade: 0x05081a, haze }).mat);
  pad.position.set(-2, 0.15, -2);
  group.add(pad);
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 512;
  const c2 = cv.getContext('2d')!;
  c2.strokeStyle = '#cde404';
  c2.lineWidth = 14;
  c2.beginPath();
  c2.arc(256, 256, 200, 0, Math.PI * 2);
  c2.stroke();
  c2.fillStyle = '#cde404';
  c2.font = `800 220px ${F.sans}`;
  c2.textAlign = 'center';
  c2.textBaseline = 'middle';
  c2.fillText('04', 256, 266);
  for (let k = 0; k < 8; k++) c2.fillRect(40 + k * 56, 470, 30, 20);
  const pt = new THREE.CanvasTexture(cv);
  pt.colorSpace = THREE.SRGBColorSpace;
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: pt, transparent: true, depthWrite: false }));
  decal.rotation.x = -Math.PI / 2;
  decal.position.set(-2, 0.31, -2);
  group.add(decal);
  // solar array rows
  for (let row = 0; row < 4; row++)
    for (let k = 0; k < 7; k++) {
      if (r(row, k, 14) < ruin * 0.6) continue;
      h.box('solar', 1.7, 0.08, 1.2, 12 + k * 2, 0.9, 12 + row * 2.2, 0, 0.5, 0);
      h.box('mast', 0.1, 0.9, 0.1, 12 + k * 2, 0.45, 12 + row * 2.2);
    }
  // perimeter wall, broken in places
  for (let k = 0; k < 24; k++) {
    if (r(k, 15) < ruin) continue;
    const a = (k / 24) * Math.PI * 2;
    const R = 28;
    h.box('wall', 7, 1.6 + r(k, 16) * 0.8, 0.6, Math.cos(a) * R, 0.9, Math.sin(a) * R, -a + Math.PI / 2);
  }
  // rubble
  for (let k = 0; k < 90; k++) {
    const x = (r(k, 17) - 0.5) * 50;
    const z = (r(k, 18) - 0.5) * 50;
    const s = 0.3 + r(k, 19) * 1.1;
    h.box('rubble', s, s * 0.6, s * 0.8, x, s * 0.3, z, r(k, 20) * 3, r(k, 21) * 0.5, r(k, 22) * 0.5);
  }
  group.add(
    h.build(
      {
        plate: toonLit({ lit: 0x121a44, mid: 0x0a1030, shade: 0x03050f, haze }).mat,
        plate2: toonLit({ lit: 0x1a2458, mid: 0x0e1438, shade: 0x04061a, haze }).mat,
        road: toonLit({ lit: 0x060a20, shade: 0x020410, haze }).mat,
        trim: toonLit({ lit: 0x3a4ab0, shade: 0x0a1040, haze }).mat,
        rib: toonLit({ lit: 0x4a5cc8, mid: 0x2a3480, shade: 0x0a1030, haze }).mat,
        tower: toonLit({ lit: 0x26347a, mid: 0x141c4c, shade: 0x050818, haze }).mat,
        lit: toonLit({ lit: 0xf4ff6a, mid: 0xcde404, shade: 0x8a9a00 }).mat,
        mast: toonLit({ lit: 0x8a9ae8, shade: 0x2a3480, haze }).mat,
        solar: toonLit({ lit: 0x3a5aff, mid: 0x1a2ab0, shade: 0x060a40, haze }).mat,
        wall: toonLit({ lit: 0x1e2a68, mid: 0x111840, shade: 0x04061a, haze }).mat,
        rubble: toonLit({ lit: 0x1a2458, shade: 0x05081e, haze }).mat,
      },
      { tower: 0x3a4cc8, trim: 0x5a72ff, wall: 0x2a3ab0, plate: 0x141e60, rib: 0x6a7aff },
    ),
  );
  return group;
}
