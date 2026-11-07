/**
 * A high-detail mechanical prosthetic forearm and hand (hard surface).
 * Every phalanx is an assembly — hinge barrel, core, chamfered dorsal armour,
 * side rails, a yellow palm pad, screws — and the palm, wrist and forearm carry
 * tendon plates, knuckle bar, bearings, armour shells with gaps, actuators with
 * chrome rods, label plates and cable runs. Units are metres; the wrist is at
 * the origin, fingers point +Y, the palm faces +Z (curl bends toward +Z).
 * The forearm runs 0.55 m down −Y so it can leave the frame.
 */
import * as THREE from 'three/webgpu';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Hard, toonLit } from './hard';
import { basic } from '../mats';
import { F } from '../draw';

export type MechArm = {
  root: THREE.Group;
  wrist: THREE.Object3D;
  joints: THREE.Object3D[][];
  tips: THREE.Object3D[];
  pads: THREE.Mesh[];
  curl: (k: number[], spread?: number) => void;
};

const rb = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, 1, Math.min(r, w / 2.01, h / 2.01, d / 2.01));
const cyl = (r: number, len: number, seg = 18) => new THREE.CylinderGeometry(r, r, len, seg, 1);

function labelTex(text: string, sub: string, bg: string, ink: string) {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 512;
  const c = cv.getContext('2d')!;
  c.fillStyle = bg;
  c.fillRect(0, 0, 256, 512);
  c.fillStyle = ink;
  c.font = `800 150px ${F.sans}`;
  c.textBaseline = 'top';
  c.save();
  c.translate(220, 20);
  c.rotate(Math.PI / 2);
  c.fillText(text, 0, 0);
  c.restore();
  c.font = `700 30px ${F.mono}`;
  c.save();
  c.translate(40, 20);
  c.rotate(Math.PI / 2);
  c.fillText(sub, 0, 0);
  c.restore();
  for (let i = 0; i < 18; i++) c.fillRect(30 + (i % 2) * 6, 300 + i * 10, 40 + ((i * 37) % 50), 5);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function makeMechArm(): MechArm {
  const mats = {
    shell: toonLit({ lit: 0x262e40, mid: 0x131925, shade: 0x05070c }).mat,
    frame: toonLit({ lit: 0x41537a, mid: 0x212b42, shade: 0x090c16 }).mat,
    yellow: toonLit({ lit: 0xffe600, mid: 0xd4bc00, shade: 0x6a5c00 }).mat,
    chrome: toonLit({ lit: 0xe4eaff, mid: 0x7c88ae, shade: 0x262c44 }).mat,
    black: basic(0x040404),
    glow: basic(0x38f5d4),
  } as Record<string, THREE.Material>;
  const edges = { shell: 0x38f5d4, frame: 0x4a66ff, yellow: 0x000000, chrome: 0x8a96c8 };
  const root = new THREE.Group();
  const wrist = new THREE.Object3D();
  root.add(wrist);
  const pads: THREE.Mesh[] = [];

  /* ---------------- palm ---------------- */
  const fx = [-0.0295, -0.0098, 0.0102, 0.0296];
  const fy = [0.097, 0.1, 0.097, 0.09];
  {
    const h = new Hard();
    h.geo('frame', rb(0.08, 0.084, 0.022, 0.005), 0, 0.052, 0);
    h.geo('shell', rb(0.086, 0.05, 0.007, 0.003), 0, 0.03, -0.014); // back plate (lower)
    fx.forEach((x, i) => {
      h.geo('shell', rb(0.0175, 0.066 - i * 0.004, 0.008, 0.0025), x, 0.06, -0.0165, 0, 0, -x * 0.6); // metacarpal armour
      h.geo('chrome', cyl(0.0012, 0.003, 8), x, 0.04, -0.021, Math.PI / 2); // screws
      h.geo('chrome', cyl(0.0012, 0.003, 8), x, 0.08, -0.021, Math.PI / 2);
      h.geo('yellow', rb(0.0115, 0.064 - i * 0.004, 0.0038, 0.0012), x, 0.058, 0.0128); // tendon plates
      h.geo('black', new THREE.BoxGeometry(0.005, 0.011, 0.0042), x, 0.048, 0.0131);
      h.geo('black', new THREE.BoxGeometry(0.005, 0.006, 0.0042), x, 0.072, 0.0131);
      h.geo('chrome', cyl(0.0085, 0.017, 16), x, fy[i] - 0.003, 0.0, 0, 0, Math.PI / 2); // knuckle barrels
      h.geo('glow', new THREE.BoxGeometry(0.0011, 0.07, 0.001), x + 0.0075, 0.052, 0.0152);
      h.geo('glow', new THREE.BoxGeometry(0.0011, 0.05, 0.001), x - 0.0075, 0.05, 0.0152);
    });
    // palm heel: vent bars + thenar housing
    for (let i = 0; i < 6; i++) h.geo('black', new THREE.BoxGeometry(0.03, 0.0018, 0.003), 0.018, 0.013 + i * 0.004, 0.0122);
    h.geo('shell', rb(0.032, 0.05, 0.026, 0.006), -0.034, 0.03, 0.002, 0, 0, 0.32);
    h.geo('frame', rb(0.02, 0.05, 0.03, 0.004), 0.037, 0.04, 0.0, 0, 0, -0.08); // hypothenar block
    h.geo('yellow', rb(0.012, 0.03, 0.004, 0.0012), 0.037, 0.04, 0.0155, 0, 0, -0.08);
    wrist.add(h.build(mats, edges, 28));
  }

  /* ---------------- wrist + forearm ---------------- */
  {
    const h = new Hard();
    h.geo('frame', cyl(0.019, 0.066, 24), 0, -0.004, 0, 0, 0, Math.PI / 2); // wrist hinge barrel
    for (const sx of [-1, 1]) {
      h.geo('chrome', cyl(0.024, 0.007, 24), sx * 0.036, -0.004, 0, 0, 0, Math.PI / 2); // bearings
      h.geo('black', cyl(0.009, 0.0075, 12), sx * 0.0372, -0.004, 0, 0, 0, Math.PI / 2);
      h.geo('chrome', cyl(0.0068, 0.53, 12), sx * 0.02, -0.29, -0.002); // radius / ulna rods
    }
    // armour shells in segments (gaps show the rods and actuators)
    for (let k = 0; k < 6; k++) {
      const y = -0.06 - k * 0.088;
      const w = 0.07 + k * 0.006;
      const tz = 0.018 + k * 0.0022;
      h.geo('shell', rb(w, 0.08, 0.012, 0.004), 0, y, -tz - 0.004); // dorsal
      h.geo('shell', rb(w * 0.82, 0.074, 0.009, 0.003), 0, y, tz + 0.012); // ventral
      h.geo('frame', rb(0.012, 0.07, w * 0.5, 0.003), -w / 2 - 0.002, y, 0.004); // side rails
      h.geo('frame', rb(0.012, 0.07, w * 0.5, 0.003), w / 2 + 0.002, y, 0.004);
      h.geo('chrome', cyl(0.0016, 0.004, 8), -w * 0.36, y + 0.03, -tz - 0.011, Math.PI / 2);
      h.geo('chrome', cyl(0.0016, 0.004, 8), w * 0.36, y + 0.03, -tz - 0.011, Math.PI / 2);
      h.geo('black', new THREE.BoxGeometry(w * 0.5, 0.003, 0.004), 0, y - 0.032, tz + 0.0175);
    }
    // actuators on the palm side: cylinders + chrome rods into the palm heel
    for (const [x, len] of [[-0.022, 0.2], [0, 0.23], [0.022, 0.21]] as const) {
      h.geo('frame', cyl(0.0058, len, 14), x, -0.08 - len / 2, 0.026);
      h.geo('chrome', cyl(0.0032, 0.085, 10), x, -0.04, 0.024);
      h.geo('chrome', cyl(0.0068, 0.008, 14), x, -0.083, 0.026);
    }
    h.geo('yellow', rb(0.026, 0.13, 0.004, 0.0015), 0.0, -0.2, -0.033); // dorsal stripe plate
    wrist.add(h.build(mats, edges, 28));
    // label plates
    const lab = (t: THREE.Texture, w: number, hh: number, x: number, y: number, z: number, ry: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
      m.position.set(x, y, z);
      m.rotation.y = ry;
      wrist.add(m);
    };
    lab(labelTex('W2', 'SHELL 07 · R-ARM', '#ffe600', '#000'), 0.028, 0.056, 0.024, -0.13, 0.0345, 0);
    lab(labelTex('07', 'MK.IV · 2445566', '#ffe600', '#000'), 0.026, 0.052, -0.022, -0.31, 0.0375, 0);
    // cable runs (bright lines) along the side into the palm
    const cab = (x0: number, z0: number, color: number, i: number) => {
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 14; k++) {
        const y = -0.55 + (k / 14) * 0.56;
        pts.push(new THREE.Vector3(x0 + Math.sin(k * 0.9 + i) * 0.002 - (k > 11 ? (k - 11) * 0.004 * Math.sign(x0) : 0), y, z0 + Math.cos(k * 0.7 + i) * 0.0015));
      }
      const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.0014, 5, false);
      wrist.add(new THREE.Mesh(g, basic(color)));
    };
    for (let i = 0; i < 5; i++) cab(0.043 + i * 0.0022, 0.012 - i * 0.004, i % 2 ? 0x38f5d4 : 0x22e0b0, i);
    for (let i = 0; i < 3; i++) cab(-0.043 - i * 0.0022, 0.01 - i * 0.004, 0x4a66ff, i + 7);
  }

  /* ---------------- fingers ---------------- */
  const joints: THREE.Object3D[][] = [];
  const tips: THREE.Object3D[] = [];
  const phalanx = (parent: THREE.Object3D, L: number, w: number, distal: boolean, proximal: boolean) => {
    const t = w * 0.86;
    const h = new Hard();
    h.geo('frame', cyl(t * 0.42, w * 0.96, 16), 0, 0, 0, 0, 0, Math.PI / 2); // hinge barrel
    h.geo('chrome', cyl(t * 0.2, w * 1.04, 10), 0, 0, 0, 0, 0, Math.PI / 2); // pin
    h.geo('frame', rb(w * 0.6, L * 0.8, t * 0.6, w * 0.08), 0, L * 0.5, 0);
    h.geo('shell', rb(w, L * (distal ? 0.5 : 0.78), t * 0.42, t * 0.12), 0, L * (distal ? 0.36 : 0.52), -t * 0.25); // dorsal armour
    for (const sx of [-1, 1]) h.geo('frame', rb(w * 0.09, L * 0.66, t * 0.52, w * 0.03), sx * w * 0.47, L * 0.5, 0);
    h.geo('chrome', cyl(w * 0.07, t * 0.05, 8), 0, L * 0.3, -t * 0.47, Math.PI / 2);
    if (!distal) h.geo('chrome', cyl(w * 0.07, t * 0.05, 8), 0, L * 0.72, -t * 0.47, Math.PI / 2);
    h.geo('yellow', rb(w * 0.66, L * 0.5, t * 0.17, t * 0.05), 0, L * 0.5, t * 0.36); // palm pad
    for (const sx of [-1, 1]) h.geo('glow', new THREE.BoxGeometry(w * 0.035, L * 0.74, t * 0.035), sx * w * 0.53, L * 0.48, t * 0.22);
    h.geo('black', new THREE.BoxGeometry(w * 0.3, L * 0.09, t * 0.06), 0, L * 0.38, t * 0.45);
    if (proximal) h.geo('chrome', cyl(w * 0.075, L * 0.62, 8), w * 0.22, L * 0.44, t * 0.2); // piston
    if (distal) {
      h.geo('shell', rb(w * 0.96, L * 0.42, t * 0.92, w * 0.3), 0, L * 0.8, 0); // tip cap
      h.geo('frame', rb(w * 0.5, L * 0.08, t * 0.94, w * 0.02), 0, L * 0.6, 0);
    }
    const g = h.build(mats, edges, 28);
    parent.add(g);
    if (distal) {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.46, L * 0.22, t * 0.05), basic(0x38f5d4));
      pad.position.set(0, L * 0.78, t * 0.47);
      parent.add(pad);
      pads.push(pad);
    }
  };
  const fingers = [
    { x: -0.04, y: 0.034, z: 0.008, len: [0.036, 0.029, 0.024], w: 0.021, rz: 0.56, ry: -0.6, rx: 0.2 }, // thumb
    { x: fx[0], y: fy[0], z: 0, len: [0.045, 0.027, 0.022], w: 0.0188, rz: 0.06, ry: 0, rx: 0 },
    { x: fx[1], y: fy[1], z: 0, len: [0.05, 0.03, 0.023], w: 0.0195, rz: 0.0, ry: 0, rx: 0 },
    { x: fx[2], y: fy[2], z: 0, len: [0.047, 0.028, 0.022], w: 0.0188, rz: -0.05, ry: 0, rx: 0 },
    { x: fx[3], y: fy[3], z: 0, len: [0.037, 0.022, 0.019], w: 0.0162, rz: -0.12, ry: 0, rx: 0 },
  ];
  fingers.forEach((fd, fi) => {
    let parent: THREE.Object3D = wrist;
    const chain: THREE.Object3D[] = [];
    fd.len.forEach((L, i) => {
      const j = new THREE.Object3D();
      if (i === 0) {
        j.position.set(fd.x, fd.y, fd.z);
        j.rotation.set(fd.rx, fd.ry, fd.rz, 'ZYX');
      } else j.position.y = fd.len[i - 1];
      phalanx(j, L, fd.w * (1 - i * 0.07), i === fd.len.length - 1, i === 0 && fi > 0);
      parent.add(j);
      chain.push(j);
      parent = j;
    });
    const tip = new THREE.Object3D();
    tip.position.y = fd.len[fd.len.length - 1] * 0.95;
    parent.add(tip);
    tips.push(tip);
    joints.push(chain);
  });
  return {
    root,
    wrist,
    joints,
    tips,
    pads,
    curl(k, spread = 0) {
      joints.forEach((ch, fi) => {
        ch.forEach((j, i) => {
          const base = fi === 0 ? 0.55 : 1.1;
          j.rotation.x = (fi === 0 && i === 0 ? fingers[0].rx : 0) + (k[fi] ?? 0) * base * (i === 0 ? 0.8 : 1);
          if (i === 0) j.rotation.z = fingers[fi].rz * (1 + spread);
        });
      });
    },
  };
}
