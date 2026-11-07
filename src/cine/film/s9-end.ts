/**
 * 1:48–2:21 — defragmentation complete; ORA introduces itself; the contract
 * (target: shell 06); consciousness transfer countdown; initiate; the last line.
 */
import * as THREE from 'three/webgpu';
import type { C2, Frame, ShotDef } from '../engine';
import { clamp01, hash } from '../engine';
import { C, F, checker, dataField, frameRect, glitchBlocks, line, microRows, rect, ring, text } from '../draw';
import { backdrop, PAL_BLUE, PAL_GREEN } from '../backdrop';
import { streakRing } from '../rings';
import { makeBody } from '../models/body';
import { brainGeometry } from '../models/anatomy';
import { flowMaterial } from '../models/flow';
import { connectome, connectomeMaterial } from '../models/connectome';
import { BRAIN_S, H2, head2Geometry, headWiring, opticPathway, wireEye } from '../models/head2';
import { HAZE } from '../models/hard';
import { buildColony } from '../models/colony';
import { contourMaterial } from '../../three/materials';
import { pixelSurfaceTexture } from '../../three/procedural';
import { ANCHORS, LINES } from './cues';
import { ST } from './times';
import { cutGlitch, easeInOutCubic, easeOutExpo, persp, px, smooth, span, vlabel } from './kit';

const LIME = '#77f600';
const at = (id: string) => LINES.find((l) => l.id === id)!.t;

/**
 * Geometric lowercase "ora" drawn from the ring stroke, letter by letter:
 * kr / ka are the growth of r and a (0..1). r grows its stem up from the
 * baseline, then its shoulder sweeps out; a draws its bowl as a sweeping arc,
 * then its stem drops in. Returns the current width so the word can recentre.
 */
function wordmarkWidth(R: number, kr: number, ka: number) {
  const s = R * 0.49;
  return R * 2 + (s * 0.45 + s + R * 0.75) * smoothK(kr) + R * 2 * smoothK(ka) - s * 0.0;
}
const smoothK = (k: number) => {
  const x = Math.max(0, Math.min(1, k));
  return x * x * (3 - 2 * x);
};
function wordmark(fg: C2, x: number, cy: number, R: number, kr: number, ka: number, color: string) {
  const s = R * 0.49;
  const ri = R - s;
  fg.fillStyle = color;
  // o
  fg.beginPath();
  fg.arc(x + R, cy, R, 0, Math.PI * 2);
  fg.arc(x + R, cy, ri, 0, Math.PI * 2, true);
  fg.fill();
  ring(fg, x + R, cy, ri * 0.75, '#0a2a00', 2);
  // r
  if (kr > 0) {
    const sx = x + R * 2 + s * 0.45;
    const stem = smoothK(kr / 0.5);
    rect(fg, sx, cy + R - R * 2 * stem, s, R * 2 * stem, color);
    const sh = smoothK((kr - 0.4) / 0.6);
    if (sh > 0) {
      const ccx = sx + s + ri * 0.6;
      const ccy = cy - R + R * 0.95;
      fg.beginPath();
      fg.arc(ccx, ccy, R * 0.95, Math.PI, Math.PI + Math.PI * 0.5 * sh);
      fg.arc(ccx, ccy, R * 0.95 - s, Math.PI + Math.PI * 0.5 * sh, Math.PI, true);
      fg.fill();
      // a round terminal leads the sweep
      const ea = Math.PI + Math.PI * 0.5 * sh;
      fg.beginPath();
      fg.arc(ccx + Math.cos(ea) * (R * 0.95 - s / 2), ccy + Math.sin(ea) * (R * 0.95 - s / 2), s / 2, 0, Math.PI * 2);
      fg.fill();
    }
  }
  // a
  if (ka > 0) {
    const ax = x + R * 2 + s * 0.45 + s + R * 0.75;
    const bowl = smoothK(ka / 0.6);
    const a0 = -Math.PI / 2;
    fg.beginPath();
    fg.arc(ax + R, cy, R, a0, a0 + Math.PI * 2 * bowl);
    fg.arc(ax + R, cy, ri, a0 + Math.PI * 2 * bowl, a0, true);
    fg.fill();
    if (bowl < 1) {
      const ea = a0 + Math.PI * 2 * bowl;
      fg.beginPath();
      fg.arc(ax + R + Math.cos(ea) * (R - s / 2), cy + Math.sin(ea) * (R - s / 2), s / 2, 0, Math.PI * 2);
      fg.fill();
    }
    const st = smoothK((ka - 0.5) / 0.5);
    if (st > 0) rect(fg, ax + R * 2 - s, cy - R * 0.2, s, R * 1.2 * st, color);
  }
}

export const s9: ShotDef[] = [
  {
    id: 'S21',
    t0: ST.S21[0],
    t1: ST.S21[1],
    title: 'Defragmentation complete',
    note: 'On the build the liminal buffer fills from 26 to 100; on the downbeat the completion ring bursts outward as hundreds of radial streaks, then everything collapses into one solid lime ring.',
    build: () => ({
      draw(f) {
        const { bg, fg, T } = f;
        const DB = ANCHORS.downbeat - ST.S21[0];
        const v21 = at('v21');
        if (f.t < DB) {
          // pre-roll: the buffer fills to 100 on the build, then bursts on the downbeat
          const pct = Math.floor(26 + 74 * smooth(span(T, v21 - 0.8, v21 + 2.0)));
          const k = pct / 100;
          ring(bg, 960, 540, 300, '#2a0408', 26);
          fg.save();
          fg.setLineDash([5, 3]);
          ring(fg, 960, 540, 300, C.red, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
          fg.restore();
          ring(fg, 960, 540, 250, 'rgba(255,40,60,0.5)', 1.5);
          vlabel(fg, String(pct).padStart(2, '0'), 1010, 400, 150, C.red, { weight: 600, stretch: 'semi-expanded' });
          vlabel(fg, 'LIMINAL BUFFER', 980, 400, 22, C.red, { weight: 800 });
          if (pct >= 100 && Math.floor(f.t * 10) % 2 === 0) text(fg, 'FULL', 960, 900, { size: 26, family: F.mono, weight: 700, color: C.red, align: 'center', tracking: 8 });
          cutGlitch(f, f.t, 0.1, ['#000', C.red], 26);
          f.post.tint = [1, 0.5, 0.55];
          return;
        }
        const t = f.t - DB;
        const grow = easeOutExpo(span(t, 0, 0.9));
        const end = ST.S21[1] - ANCHORS.downbeat;
        const shrink = easeInOutCubic(span(t, end - 2.0, end - 0.25));
        const r0 = 160 + grow * 380 - shrink * 410;
        const r1 = 330 + grow * 1000 - shrink * 1060;
        const solid = clamp01((t - (end - 0.3)) / 0.25);
        if (solid < 1) streakRing(bg, 960, 540, Math.max(118, r0), Math.max(270, r1), 55 + Math.floor(t * 15) * (solid > 0 ? 0 : 1), solid, { n: 320, rot: t * 0.35, colors: ['#e8e8e8', '#b0b0b0', '#6a6a6a', '#d8d8d8', '#f4f4f4', '#9aff40', '#8a8a8a', '#e0e0e0', '#cc40d0', '#c8c8c8'] });
        if (solid >= 1) {
          bg.fillStyle = LIME;
          bg.beginPath();
          bg.arc(960, 540, 270, 0, Math.PI * 2);
          bg.arc(960, 540, 140, 0, Math.PI * 2, true);
          bg.fill();
          ring(bg, 960, 540, 105, '#0a2a00', 2);
        }
        if (shrink < 0.05) {
          vlabel(fg, '100', 985, 470, 84, C.red, { weight: 600, stretch: 'semi-expanded' });
          vlabel(fg, 'BUFFER', 945, 470, 18, C.red, { weight: 800 });
        }
        if (T > at('v22') && shrink < 0.05) {
          vlabel(fg, 'DEFRAG', 860, 520, 34, LIME, { weight: 800 });
          ring(fg, 900, 470, 20, LIME, 10);
        }
        if (T > at('v22') + 0.8) text(fg, 'COMPLETE', 960, 900, { size: 26, family: F.mono, weight: 700, color: LIME, align: 'center', tracking: 8 });
        cutGlitch(f, t, 0.1, ['#000', C.white, LIME], 27);
        f.post.tint = [0.75, 0.9, 0.6];
      },
    }),
  },
  {
    id: 'S22',
    t0: ST.S22[0],
    t1: ST.S22[1],
    title: 'ORA',
    note: 'The completed ring becomes the first letter of the support AI’s wordmark. The other letters are not placed, they grow out of it: the r pushes its stem up and sweeps its shoulder, the a draws its bowl and drops its stem, the word recentring as it widens; then the mark shrinks onto a green data wall.',
    build: () => ({
      draw(f) {
        const { bg, fg, t } = f;
        for (let y = 30; y < 1080; y += 60) for (let x = 30; x < 1920; x += 60) rect(bg, x, y, 2, 2, '#10180a');
        // letters grow out of the ring on the beat (r, then a), the word recentring as it widens
        const kr = span(t, 0.95, 1.55);
        const ka = span(t, 1.6, 2.3);
        const small = smoothK(span(t, 3.5, 4.0));
        const R = (270 - 30 * smoothK(kr) - 35 * smoothK(ka)) * (1 - small) + 110 * small;
        const totalW = wordmarkWidth(R, kr, ka);
        const x = 960 - totalW / 2 - small * 120;
        if (small > 0.5) {
          backdrop(bg, { seed: 141, dx: t * 30, pal: PAL_GREEN, alpha: 0.9 });
          dataField(bg, 0, 0, 1920, 1080, 57, { palette: ['#0c2a06', '#16500c', '#2a8a18', '#06200a'], ox: Math.floor(t * 6) * 10, alpha: 0.5 });
          rect(bg, x - 30, 540 - R - 20, totalW + 200, R * 2 + 40, '#000');
          rect(fg, x - 40, 540 - R, 6, R * 2, LIME);
          const cx = x + totalW + 30;
          for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if ((i + j) % 2 === 0 && i <= 2 - Math.abs(j - 2) + 1) rect(fg, cx + i * 18, 540 - 45 + j * 18, 18, 18, C.white);
          text(fg, 'SUPPORT INTELLIGENCE · MANDATORY', x, 540 + R + 50, { size: 16, family: F.mono, weight: 700, color: LIME });
        }
        wordmark(fg, x, 540, R, kr, ka, LIME);
        if ([3.75].some((b) => Math.abs(t - b) < 0.05)) glitchBlocks(fg, Math.floor(t * 30), { n: 20, colors: ['#000', LIME], maxW: 300, maxH: 40 });
        f.post.tint = [0.6, 1, 0.5];
      },
    }),
  },
  {
    id: 'S23',
    t0: ST.S23[0],
    t1: ST.S23[1],
    title: 'Contract — target: shell 06',
    note: 'The contract card over the turning planet; then the payoff: in the ruins, the old shell stands in red lines, and the reticle locks.',
    build: async () => {
      const scene = new THREE.Scene();
      const cam = persp(36, 0.05, 1000);
      const tex = pixelSurfaceTexture({ w: 1024, h: 512, base: '#1620ff', dark: '#0a10b0', ink: '#03063a', seed: 21 });
      tex.repeat.set(3, 2);
      const planet = new THREE.Mesh(new THREE.SphereGeometry(4, 96, 64), new THREE.MeshBasicMaterial({ map: tex }));
      planet.position.set(0, 0, -30);
      scene.add(planet);
      // the colony ruins for the target reveal (same set as the descent)
      const ruins = buildColony({ seed: 4, haze: true, ruined: 0.5 });
      ruins.scale.setScalar(0.3);
      ruins.position.set(0, 0, -6);
      scene.add(ruins);
      const old = await makeBody('runner', contourMaterial({ line: 0xff2a3a, body: 0x080002, freq: 34, width: 0.9, rim: 0xff4a5a, rimWidth: 0.3 }).mat);
      old.root.position.set(0.8, 0, -3.2);
      scene.add(old.root);
      const v = new THREE.Vector3();
      return {
        draw(f) {
          const { fg, t, T } = f;
          const reveal = T >= at('v25') - 0.1;
          planet.visible = !reveal;
          ruins.visible = reveal;
          old.root.visible = reveal;
          if (!reveal) {
            planet.rotation.y = t * 0.2;
            cam.position.set(0, 0, 0);
            cam.lookAt(0, 0, -30);
            f.three = { scene, camera: cam };
            backdrop(f.bg, { seed: 151, dx: t * 15, pal: PAL_BLUE, alpha: 0.5 });
            const x = 1180;
            frameRect(fg, x, 260, 560, 300, C.white, 2);
            rect(fg, x, 260, 560, 40, C.white);
            text(fg, 'CONTRACT 0447', x + 14, 290, { size: 24, weight: 800, color: '#000' });
            microRows(fg, x + 16, 340, ['CLIENT ....... WITHHELD', 'SITE ......... PERIAPT IV / RUINS', 'TYPE ......... RECOVERY', 'SHELL ........ 07 (SUBOPT.)', 'PAYOUT ....... ON CONFIRMATION'], { size: 17, family: F.mono, weight: 700, color: C.white, lh: 30 });
            return;
          }
          const k = t - (at('v25') - 0.1 - (T - t));
          HAZE.near.value = 4;
          HAZE.far.value = 26;
          old.clip('idle', T);
          old.root.rotation.y = -0.3 + smooth(span(k, 0.8, 1.6)) * 0.3;
          cam.position.set(-0.5 + k * 0.08, 1.45, 0.7 - k * 0.25);
          cam.lookAt(0.7, 1.1, -3.2);
          cam.updateMatrixWorld();
          f.three = { scene, camera: cam };
          const c = px(f, cam, old.joint('Spine2', v));
          const lock = smooth(span(k, 0.2, 1.1));
          const r = 260 - lock * 180;
          fg.strokeStyle = C.red;
          fg.lineWidth = 3;
          for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
            fg.beginPath();
            fg.moveTo(c.x + sx * r, c.y + sy * (r - 26));
            fg.lineTo(c.x + sx * r, c.y + sy * r);
            fg.lineTo(c.x + sx * (r - 26), c.y + sy * r);
            fg.stroke();
          }
          line(fg, c.x - r - 60, c.y, c.x - r, c.y, C.red, 1);
          line(fg, c.x + r, c.y, c.x + r + 60, c.y, C.red, 1);
          if (lock > 0.95) {
            rect(fg, c.x + r + 20, c.y - r, 230, 30, C.red);
            text(fg, 'TARGET · SHELL 06', c.x + r + 28, c.y - r + 22, { size: 18, weight: 800, color: '#000' });
            text(fg, 'RANGE 0.84 KM · ACTIVE', c.x + r + 20, c.y - r + 52, { size: 14, family: F.mono, weight: 700, color: C.red });
          }
          cutGlitch(f, k, 0.12, ['#000', C.red], 28);
          f.post.tint = [1, 0.45, 0.5];
        },
      };
    },
  },
  /* ---------------------------------------------------------------- */
  {
    id: 'S24',
    t0: ST.S24[0],
    t1: ST.S24[1],
    title: 'Consciousness transfer',
    note: 'A sculpted head drawn as a lat/long wire grid. Inside: the brain outline full of short circuits, blue orthogonal wiring, wire eyes, and the visual pathway in its own colour — about seventy fibres per eye gathering into the optic nerves, crossing at the chiasm and fanning over the visual cortex, signals flowing toward the eyes. The camera orbits from the face to the back of the skull and pushes through the brain until it looks out through the eyes; green blocks fill the brain as the psyche is written; the countdown runs in the eyes.',
    build: async () => {
      const rig = await headRig();
      return { draw: (f) => rig.transfer(f) };
    },
  },
  {
    id: 'S25',
    t0: ST.S25[0],
    t1: ST.S25[1],
    title: 'Initiate',
    note: 'Straight out of the countdown: INIT lights in both eyes and at once the view rushes down the optic nerves and through the eyes, the two eyes’ rings slide together into one, the field floods blue — the mind is now behind these eyes — black, and only: Good luck.',
    build: async () => {
      const rig = await headRig();
      return { draw: (f) => rig.initiate(f) };
    },
  },
];

/* ------------------------------------------------------------------ */
/* the head rig shared by S24 and S25 (one scene, one camera path)      */
/* ------------------------------------------------------------------ */
let headP: ReturnType<typeof buildHeadRig> | null = null;
const headRig = () => (headP ??= buildHeadRig());

async function buildHeadRig() {
  const scene = new THREE.Scene();
  const cam = persp(34, 0.002, 20);
  const add = { blending: THREE.AdditiveBlending, transparent: true, depthWrite: false };
  const skin = contourMaterial({ line: 0x3a50ff, body: 0x000000, freq: 170, width: 1.0, axis: 'y', space: 'local', line2: 0xb4c858, freq2: 34, axis2: 'theta', width2: 0.9, rim: 0x3a2e8a, rimWidth: 0.1 });
  Object.assign(skin.mat, add, { side: THREE.FrontSide });
  const head = new THREE.Group();
  head.add(new THREE.Mesh(head2Geometry(), skin.mat));
  const bm = contourMaterial({ line: 0xff2a5a, body: 0x000000, freq: 26, width: 0.9, axis: 'y', space: 'local', rim: 0xff4a7a, rimWidth: 0.35 });
  Object.assign(bm.mat, add, { side: THREE.FrontSide });
  bm.u.lineMix.value = 0.35;
  const brain = new THREE.Mesh(brainGeometry(40, 3), bm.mat);
  const BS = BRAIN_S;
  brain.position.copy(H2.brain);
  brain.scale.copy(BS);
  head.add(brain);
  // tractography inside the brain: bundles running through it, signals flowing
  const cm = connectomeMaterial({ dim: 0.1, base: 0.36, speed: 1.6 });
  const tracts = new THREE.LineSegments(connectome({ seed: 11, scale: 1.1, timeOf: (r) => -20 + r }).fibres, cm.mat);
  tracts.position.copy(H2.brain);
  tracts.scale.copy(BS).multiplyScalar(0.98);
  head.add(tracts);
  const wiring = headWiring(9);
  const wires = new THREE.LineSegments(wiring.wires, new THREE.LineBasicMaterial({ color: 0x3a6aff, ...add, opacity: 0.8 }));
  head.add(wires);
  head.add(new THREE.LineSegments(wiring.nodes, new THREE.LineBasicMaterial({ color: 0xffffff, ...add })));
  // the visual pathway: many fibres, signals flowing toward the eyes
  const flow = flowMaterial({ base: 0.4, speed: -1.1, freq: 6 });
  head.add(new THREE.LineSegments(opticPathway(13, 72), flow.mat));
  const eyes = [-1, 1].map((sx) => {
    const e = wireEye(0x8aa0ff, 0x77f600);
    e.position.set(sx * H2.eyeX, H2.eyeY, H2.eyeZ - 0.003);
    head.add(e);
    return e;
  });
  for (let i = 0; i < 8; i++) {
    const vb = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.042 - i * 0.002, 0.014, 0.028)), new THREE.LineBasicMaterial({ color: 0x3ae830, ...add }));
    vb.position.set(0, -0.09 - i * 0.02, -0.036);
    head.add(vb);
  }
  scene.add(head);
  // write-progress blocks over the top of the brain (a 7 × 4 grid, in head space)
  const blocks: THREE.Vector3[] = [];
  // tiles laid over the top surface of the brain (ellipsoid approximation), written front to back
  for (let j = 0; j < 6; j++)
    for (let i = 0; i < 7; i++) {
      const x = (i - 3) * 0.0135;
      const z = 0.045 - j * 0.02;
      const q = 1 - (x / 0.062) ** 2 - (z / 0.084) ** 2;
      if (q <= 0.05) continue;
      blocks.push(new THREE.Vector3(x, H2.brain.y + 0.074 * Math.sqrt(q) + 0.005, H2.brain.z + z));
    }
  const v = new THREE.Vector3();
  const centre = new THREE.Vector3(0, 0.012, 0);
  const look = new THREE.Vector3();
  const T0 = ST.S24[0];
  const eyeStart: { x: number; y: number; R: number }[] = [];
  const camEnd = new THREE.Vector3(0, 0.008, -0.035);
  const lookEnd = new THREE.Vector3(0, 0.0, 0.08);
  const eyeLabel = (T: number) => (T >= ANCHORS.final ? 'INIT' : T >= at('v29') ? '1' : T >= at('v28') ? '2' : T >= at('v27') ? '3' : '');
  const drawEyes = (f: Frame, T: number, scale = 1) => {
    const label = eyeLabel(T);
    const out: { x: number; y: number; R: number }[] = [];
    eyes.forEach((e) => {
      e.getWorldPosition(v);
      const p = px(f, cam, v);
      if (p.z > 1) return;
      const d = cam.position.distanceTo(v);
      const R = Math.min(300, 9 / d) * scale;
      out.push({ x: p.x, y: p.y, R });
      ring(f.fg, p.x, p.y, R * 1.25, 'rgba(119,246,0,0.8)', 2, T * 2, T * 2 + 1.4);
      if (label) text(f.fg, label, p.x, p.y + R * (label.length > 1 ? 0.22 : 0.45), { size: R * (label.length > 1 ? 0.62 : 1.2), weight: 800, color: '#e8ecff', align: 'center', stretch: label.length > 1 ? 'condensed' : 'normal' });
    });
    return out;
  };
  const tick = (T: number) => {
    cm.time.value = T;
    flow.time.value = T;
    eyes.forEach((e) => (e.rotation.y = Math.sin(T * 0.7) * 0.05));
  };
  return {
    transfer(f: Frame) {
      const { bg, fg, t, T } = f;
      backdrop(bg, { seed: 161, dx: t * 8, pal: PAL_BLUE, alpha: 0.6 });
      tick(T);
      eyes.forEach((e) => (e.visible = true));
      const u = clamp01(t / (ST.S24[1] - ST.S24[0] - 0.3));
      // orbit face → back of the skull, then push in through the brain toward the eyes
      const o = smooth(clamp01(u / 0.58));
      const theta = Math.PI * o;
      const r = 0.62 - 0.4 * o;
      if (u < 0.58) {
        cam.position.set(Math.sin(theta) * r, 0.012 + Math.sin(theta) * 0.03, Math.cos(theta) * r);
        look.copy(centre);
      } else {
        const pIn = easeInOutCubic(clamp01((u - 0.58) / 0.42));
        cam.position.set(0, 0.04 - pIn * 0.032, -0.22 + pIn * 0.185);
        look.set(0, 0.012 - pIn * 0.012, 0.08);
      }
      cam.fov = 34;
      cam.updateProjectionMatrix();
      cam.lookAt(look);
      cam.updateMatrixWorld();
      // once the camera is inside the skull, the brain shell would smear across the lens: fade it out
      const inside = clamp01((u - 0.66) / 0.08);
      brain.visible = inside < 1;
      bm.u.lineMix.value = 0.35 * (1 - inside);
      cm.gain.value = 1 - 0.72 * clamp01((u - 0.6) / 0.15);
      bm.u.rimWidth.value = 0.35 * (1 - inside) + 0.001;
      f.three = { scene, camera: cam };
      // the psyche being written: green blocks fill the top of the brain
      const w = clamp01((T - T0) / (ST.S24[1] - ST.S24[0] - 0.3));
      if (inside < 1) {
        const nOn = Math.floor(w * blocks.length);
        for (let i = 0; i < nOn; i++) {
          v.copy(blocks[i]);
          head.localToWorld(v);
          const p = px(f, cam, v);
          if (p.z > 1) continue;
          const s = Math.max(4, Math.min(44, 12 / cam.position.distanceTo(v)));
          rect(fg, p.x - s / 2, p.y - s / 2, s * 0.86, s * 0.86, i === nOn - 1 ? '#e8ffe8' : 'rgba(46,232,102,0.78)');
        }
      }
      drawEyes(f, T);
      text(fg, 'CONSCIOUSNESS TRANSFER', 96, 1000, { size: 22, weight: 800, color: '#8aa0ff', stretch: 'semi-expanded' });
      text(fg, `SHELL 07 ← PSYCHE 0447 · WRITE ${String(Math.floor(w * 100)).padStart(3, '0')}%`, 96, 1028, { size: 15, family: F.mono, weight: 700, color: '#8aa0ff' });
      text(fg, u < 0.58 ? 'OPTIC ROUTE · EXTERNAL · 144 FIBRES' : 'OPTIC ROUTE · INTERNAL · 144 FIBRES', 1824, 1028, { size: 15, family: F.mono, weight: 700, color: '#ff8a1a', align: 'right' });
      vlabel(fg, 'QR  EXC  FF  +', 500, 220, 22, '#3a4aff', { family: F.mono, weight: 700 });
      checker(fg, 1300, 920, 3, 2, 12, '#2a3aff');
      for (const id of ['v27', 'v28', 'v29']) if (Math.abs(T - at(id)) < 0.06) glitchBlocks(fg, Math.floor(T * 60), { n: 14, colors: ['#0a1490', '#2a3aff', '#000'], maxW: 400, maxH: 30 });
      cutGlitch(f, t, 0.1, ['#000', C.blue], 29);
    },
    initiate(f: Frame) {
      const { bg, fg, t, T } = f;
      const CUT = 1.35; // fast: rush, fuse, black
      if (t >= CUT) {
        // the device is running; the screen stays dark for the last line
        f.post.lift = 0.1;
        f.post.vignette = 0.9;
        return;
      }
      tick(T);
      // rush forward from inside the skull, down the optic nerves, out through the eyes
      const go = smooth(span(t, 0.06, 0.72));
      const acc = go * go;
      cam.position.copy(camEnd).add(new THREE.Vector3(0, -0.01 * acc, 0.34 * acc));
      cam.fov = 34 + 46 * acc;
      cam.updateProjectionMatrix();
      cam.lookAt(lookEnd.x, lookEnd.y - 0.01 * acc, lookEnd.z + 0.34 * acc);
      cam.updateMatrixWorld();
      brain.visible = false;
      const flood = clamp01((t - 0.3) / 0.4);
      if (flood < 1) {
        backdrop(bg, { seed: 161, dx: 40 + t * 8, pal: PAL_BLUE, alpha: 0.6 * (1 - flood) });
        f.three = { scene, camera: cam };
      }
      // eyes: INIT in the 3D eyes until the rush starts; from then on they are 2D ring sets
      const rush = t >= 0.06;
      eyes.forEach((e) => (e.visible = !rush));
      if (!rush) drawEyes(f, T);
      else if (!eyeStart.length) {
        // where the eyes sat on screen at the start of the rush (from the end-of-countdown camera)
        const c0 = cam.clone();
        c0.position.copy(camEnd);
        c0.fov = 34;
        c0.updateProjectionMatrix();
        c0.lookAt(lookEnd);
        c0.updateMatrixWorld();
        for (const e of eyes) {
          e.getWorldPosition(v);
          const p = px(f, c0, v);
          eyeStart.push({ x: p.x, y: p.y, R: Math.min(300, 9 / c0.position.distanceTo(v)) });
        }
      }
      if (t < 0.06) rect(fg, 0, 0, 1920, 1080, '#ffffff');
      // blue flood over the 3D
      if (flood > 0) {
        const g = fg.createRadialGradient(960, 540, 60, 960, 540, 1150);
        g.addColorStop(0, `rgba(58,74,255,${flood})`);
        g.addColorStop(1, `rgba(10,20,192,${flood})`);
        fg.fillStyle = g;
        fg.fillRect(0, 0, 1920, 1080);
      }
      // speed lines streaming out from the centre
      const sp = clamp01((t - 0.05) / 0.15) * (1 - clamp01((t - 1.05) / 0.25));
      if (sp > 0) {
        fg.save();
        fg.lineCap = 'round';
        for (let i = 0; i < 220; i++) {
          const a = hash(i, 1) * Math.PI * 2;
          const ph = (hash(i, 2) + t * (0.9 + hash(i, 3) * 1.4)) % 1;
          const r0 = 40 + ph * ph * 1150;
          const len = 30 + r0 * (0.25 + acc * 0.5);
          fg.strokeStyle = i % 3 ? `rgba(160,190,255,${0.5 * sp})` : `rgba(255,255,255,${0.7 * sp})`;
          fg.lineWidth = 1 + (i % 4 === 0 ? 1.5 : 0);
          fg.beginPath();
          fg.moveTo(960 + Math.cos(a) * r0, 540 + Math.sin(a) * r0);
          fg.lineTo(960 + Math.cos(a) * (r0 + len), 540 + Math.sin(a) * (r0 + len));
          fg.stroke();
        }
        fg.restore();
      }
      // the two eyes' ring sets slide together into one (a single point of view)
      const conv = smooth(span(t, 0.22, 0.85));
      if (rush && eyeStart.length === 2) {
        const shrink = smooth(span(t, 0.95, CUT - 0.05));
        const grow = 1 + acc * 1.6;
        eyeStart.forEach((e) => {
          const x = e.x + (960 - e.x) * conv;
          const y = e.y + (540 - e.y) * conv;
          const R = e.R * grow * (1 - conv * 0.35);
          for (let k = 0; k < 9; k++) {
            const rr = (R * 0.25 + k * R * 0.17) * (1 - shrink * 0.92);
            ring(fg, x, y, rr, k % 3 === 0 ? 'rgba(255,255,255,0.95)' : 'rgba(160,190,255,0.85)', k === 0 ? 3 : 2);
          }
          // INIT stretches with the rush and fades as the rings fuse
          const ia = 1 - smooth(span(t, 0.4, 0.75));
          if (ia > 0) {
            fg.save();
            fg.globalAlpha = ia;
            for (let q = 0; q < 4; q++) text(fg, 'INIT', x + (x - 960) * q * 0.04 * acc, y + R * 0.22, { size: R * 0.62 * (1 + q * 0.08 * acc), weight: 800, color: q ? 'rgba(200,215,255,0.35)' : '#e8ecff', align: 'center', stretch: 'condensed' });
            fg.restore();
          }
        });
        if (conv > 0.95) {
          text(fg, 'LINK ESTABLISHED · SHELL 07', 960, 540 + 230 * (1 - shrink), { size: 18, family: F.mono, weight: 700, color: '#e8ecff', align: 'center', tracking: 4 });
          if (Math.floor(t * 10) % 2 === 0) rect(fg, 956, 536, 8, 8, '#77f600');
        }
      }
      // the last frames: the fused ring collapses to a point
      if (t > CUT - 0.1) rect(fg, 0, 0, 1920, 1080, `rgba(0,0,0,${clamp01((t - (CUT - 0.1)) / 0.1)})`);
      f.post.lift = 0.3;
      void bg;
    },
  };
}

