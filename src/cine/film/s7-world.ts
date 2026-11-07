/**
 * 1:20–1:35 — the world: one continuous 3D zoom from the star system to the
 * planet to the colony ruins (no hard cuts), then an Authority hostile.
 *
 * Scale handoff: scene A holds the system (planet radius 1). At the handoff the
 * camera's offset from the planet is scaled ×100 into scene B (planet radius
 * 100, same direction, same FOV) — the frame is identical, so the switch is
 * invisible except for the planet changing from schematic to sensor imagery.
 */
import * as THREE from 'three/webgpu';
import type { Frame, ShotDef } from '../engine';
import { clamp01, hash } from '../engine';
import { C, F, line, plus, rect, sigil, text, tri } from '../draw';
import { makeBody } from '../models/body';
import { HAZE, Hard, toonLit } from '../models/hard';
import { buildColony } from '../models/colony';
import { satellite, terrainTexture } from '../../three/procedural';
import { glitchToon, lineMat, screenDots, xray } from '../mats';
import { addStickers } from '../models/stickers';
import { WireCubes, voxelPositions, voxelize } from '../models/voxels';
import { ANCHORS } from './cues';
import { cutGlitch, easeInOutCubic, persp, px, smooth, span, vlabel } from './kit';

const G = '#2fd62a';
const GD = '#0d7a0a';

function circle(r: number, color: number, y = 0, segs = 256, opacity = 1) {
  const pts = Array.from({ length: segs + 1 }, (_, i) => new THREE.Vector3(Math.cos((i / segs) * Math.PI * 2) * r, y, Math.sin((i / segs) * Math.PI * 2) * r));
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat(color, opacity));
}

const HANDOFF = 85.0;
const T0 = ANCHORS.swell;
const T1 = ANCHORS.hostile;

export const s7: ShotDef[] = [
  {
    id: 'S15',
    t0: T0,
    t1: T1,
    title: 'Periapt IV — continuous descent',
    note: 'One camera move across three orders of magnitude: a drafted system chart (orbits with ticks and lanes, a corona star, a ringed giant) → the planet, passing its relay satellite → a low glide over the silent colony (domes, habitat tubes, stepped towers, landing pad, solar rows). The planet turns from dithered schematic to pixel sensor feed at an exactly matched scale handoff.',
    build: () => {
      /* ---------------- scene A: system chart ---------------- */
      const A = new THREE.Scene();
      const camA = persp(36, 0.05, 600);
      const star = new THREE.Mesh(new THREE.SphereGeometry(0.7, 32, 16), new THREE.MeshBasicMaterial({ color: 0xe8ecff }));
      A.add(star);
      const corona: number[] = [];
      for (let i = 0; i < 72; i++) {
        const a = (i / 72) * Math.PI * 2;
        const l = 1.0 + hash(i, 1) * (i % 6 === 0 ? 2.6 : 0.9);
        corona.push(Math.cos(a) * 0.9, 0, Math.sin(a) * 0.9, Math.cos(a) * l, 0, Math.sin(a) * l);
      }
      const cg = new THREE.BufferGeometry();
      cg.setAttribute('position', new THREE.Float32BufferAttribute(corona, 3));
      A.add(new THREE.LineSegments(cg, lineMat(0xe8ecff, 0.7)));
      const orbits = [6, 10, 16, 23, 31];
      orbits.forEach((r, i) => {
        A.add(circle(r, i === 2 ? 0x2fd62a : 0x0d6a0a, 0, 360, i === 2 ? 1 : 0.8));
        // ticks every 5° (longer every 30°) + a direction chevron
        const tk: number[] = [];
        for (let k = 0; k < 72; k++) {
          const a = (k / 72) * Math.PI * 2;
          const l = k % 6 === 0 ? 0.45 : 0.18;
          tk.push(Math.cos(a) * (r - l), 0, Math.sin(a) * (r - l), Math.cos(a) * (r + l), 0, Math.sin(a) * (r + l));
        }
        for (const a0 of [0.3, 2.4, 4.4]) {
          const a = a0 + i;
          const p = new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
          const t = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
          const n = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
          const tip = p.clone().addScaledVector(t, 0.6);
          for (const s2 of [-1, 1]) {
            const q = p.clone().addScaledVector(n, s2 * 0.35);
            tk.push(q.x, 0, q.z, tip.x, 0, tip.z);
          }
        }
        const tg = new THREE.BufferGeometry();
        tg.setAttribute('position', new THREE.Float32BufferAttribute(tk, 3));
        A.add(new THREE.LineSegments(tg, lineMat(i === 2 ? 0x2fd62a : 0x0d6a0a, 0.9)));
      });
      const thP = 0.9;
      const Pp = new THREE.Vector3(Math.cos(thP) * 16, 0, Math.sin(thP) * 16);
      const planetA = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), screenDots({ color: 0x2fd62a, cell: 7, gain: 1.05, bg: 0x010a02 }).mat);
      planetA.position.copy(Pp);
      A.add(planetA);
      // wire graticule on the target
      const grat = new THREE.Group();
      for (let i = -3; i <= 3; i++) {
        const lat = (i / 8) * Math.PI;
        grat.add(circle(Math.cos(lat) * 1.012, 0x5aff4a, Math.sin(lat) * 1.012, 96, 0.8));
      }
      for (let k = 0; k < 8; k++) {
        const m = circle(1.012, 0x5aff4a, 0, 96, 0.6);
        m.rotation.set(Math.PI / 2, 0, (k / 8) * Math.PI);
        grat.add(m);
      }
      grat.position.copy(Pp);
      A.add(grat);
      // other bodies: a ringed giant, two small rocks
      [[1, 0.6, false], [3, 1.4, true], [4, 0.45, false], [0, 0.35, false]].forEach(([oi, rad, ringed]) => {
        const r = orbits[oi as number];
        const a = hash(oi as number, 3) * Math.PI * 2;
        const p = new THREE.Mesh(new THREE.SphereGeometry(rad as number, 32, 24), screenDots({ color: 0x2fd62a, cell: 5, gain: 1.2, bg: 0x010a02 }).mat);
        p.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
        A.add(p);
        if (ringed)
          for (let k = 0; k < 4; k++) {
            const rr = circle((rad as number) * (1.5 + k * 0.18), 0x2fd62a, 0, 120, 0.7);
            rr.position.copy(p.position);
            rr.rotation.set(0.35, 0, 0.2);
            A.add(rr);
          }
      });
      const moon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshBasicMaterial({ color: 0x8aff5a }));
      A.add(moon);
      const ringP = circle(2.1, 0x2fd62a, 0, 128);
      ringP.position.copy(Pp);
      A.add(ringP);
      const satA = satellite({ body: 0xe8ecff, panel: 0x1a2cff, panelLine: 0x8aa0ff, accent: 0xcde404 });
      satA.scale.setScalar(0.9);
      A.add(satA);
      const satOrbit = (T: number, center: THREE.Vector3, R: number) => {
        const a = 2.1 + (T - T0) * 0.12;
        return new THREE.Vector3(center.x + Math.cos(a) * R, center.y + Math.sin(a * 0.7) * R * 0.18 + R * 0.25, center.z + Math.sin(a) * R);
      };
      /* ---------------- scene B: planet ×100 + colony ---------------- */
      const B = new THREE.Scene();
      const camB = persp(36, 0.02, 3000);
      const R = 100;
      const tex = terrainTexture({ w: 2048, h: 1024, seed: 21 });
      const planetB = new THREE.Mesh(new THREE.SphereGeometry(R, 192, 128), new THREE.MeshBasicMaterial({ map: tex }));
      B.add(planetB);
      for (let i = -5; i <= 5; i++) {
        const lat = (i / 12) * Math.PI;
        B.add(circle(Math.cos(lat) * R * 1.0015, 0x38c8e8, Math.sin(lat) * R * 1.0015, 512, 0.7));
      }
      for (let k = 0; k < 12; k++) {
        const m = circle(R * 1.0015, 0x38c8e8, 0, 512, 0.45);
        m.rotation.set(Math.PI / 2, 0, (k / 12) * Math.PI);
        B.add(m);
      }
      const atm = new THREE.Mesh(new THREE.SphereGeometry(R * 1.025, 96, 64), xray({ inner: 0x000000, rim: 0x3a52ff, power: 3, gain: 0.9 }).mat);
      atm.material.side = THREE.BackSide;
      B.add(atm);
      const satB = satellite({ body: 0xe8ecff, panel: 0x1a2cff, panelLine: 0x8aa0ff, accent: 0xcde404 });
      satB.scale.setScalar(90);
      B.add(satB);
      const dirA = new THREE.Vector3(0.35, 0.42, 1).normalize();
      const nT = new THREE.Vector3(0.22, 0.62, 0.75).normalize();
      const site = nT.clone().multiplyScalar(R);
      const east = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), nT).normalize();
      const north = new THREE.Vector3().crossVectors(nT, east).normalize();
      const fwd = dirA.clone().negate().projectOnPlane(nT).normalize();
      const colony = buildColony({ seed: 4, haze: true, ruined: 0.35 });
      colony.scale.setScalar(0.1);
      const basis = new THREE.Matrix4().makeBasis(east, nT, north.clone().negate());
      colony.quaternion.setFromRotationMatrix(basis);
      colony.position.copy(site).addScaledVector(nT, -0.005);
      B.add(colony);
      const Cf = site.clone().addScaledVector(nT, 2.1).addScaledVector(fwd, -4.6);
      const altF = Cf.length() - R;
      const nF = Cf.clone().normalize();
      const ahead = site.clone().addScaledVector(fwd, 0.8);
      const drops = [[-0.2, -0.2], [0.4, 0.2], [-1.2, 0.9], [1.6, -1.4], [0.6, 1.4], [-1.8, -1.2], [2.0, 0.8]].map(([x, z]) => site.clone().addScaledVector(east, x).addScaledVector(north, z).addScaledVector(nT, 0.05));
      const up = new THREE.Vector3();
      return {
        draw(f: Frame) {
          const { fg, T, t } = f;
          if (T < HANDOFF) {
            const u = span(T, T0, HANDOFF);
            const e = easeInOutCubic(u);
            const d = 70 * Math.pow(3.0 / 70, e);
            const look = new THREE.Vector3().lerpVectors(new THREE.Vector3(4, 0, 4), Pp, smooth(clamp01(u * 1.4)));
            const dir0 = new THREE.Vector3(-0.2, 0.75, 1).normalize();
            const dir = new THREE.Vector3().lerpVectors(dir0, dirA, smooth(u)).normalize();
            camA.position.copy(Pp).addScaledVector(dir, d);
            camA.position.lerp(new THREE.Vector3(10, 52, 60), (1 - smooth(clamp01(u * 1.6))) * 0.8);
            camA.lookAt(look);
            camA.updateMatrixWorld();
            moon.position.set(Pp.x + Math.cos(T * 0.6) * 2.1, 0, Pp.z + Math.sin(T * 0.6) * 2.1);
            satA.position.copy(satOrbit(T, Pp, 1.6));
            satA.lookAt(Pp);
            planetA.rotation.y = T * 0.08;
            grat.rotation.y = T * 0.08;
            f.three = { scene: A, camera: camA };
            // chart frame
            for (const [x, y, sx, sy] of [[60, 60, 1, 1], [1860, 60, -1, 1], [60, 1020, 1, -1], [1860, 1020, -1, -1]] as const) {
              rect(fg, x, y, sx * 40, 2 * sy, G);
              rect(fg, x, y, 2 * sx, sy * 40, G);
            }
            for (let k = 0; k < 24; k++) rect(fg, 120 + k * 70, 1022, 1, k % 4 === 0 ? 14 : 7, GD);
            text(fg, '1 AU', 120 + 4 * 70, 1050, { size: 12, family: F.mono, weight: 700, color: GD });
            const pp = px(f, camA, Pp);
            const sp = px(f, camA, satA.position);
            if (u < 0.55) {
              text(fg, 'SYSTEM', 1150, 470, { size: 26, weight: 800, color: C.blue });
              text(fg, 'PERIAPT (4)', 1150, 540, { size: 68, weight: 800, color: C.blue, stretch: 'semi-condensed' });
              text(fg, 'APPROACH ›', 335, 520, { size: 34, weight: 800, color: C.blue });
              for (const [x, y] of [[620, 95], [1540, 95], [620, 815], [1540, 815]] as const) {
                sigil(fg, 3, x, y, 5, 3, 7, C.blue);
                sigil(fg, 4, x + 42, y, 5, 3, 7, C.blue);
              }
            }
            const br = 60 + (1 - u) * 40 + Math.max(0, u - 0.6) * 500;
            fg.strokeStyle = G;
            fg.lineWidth = 2;
            for (const [sx2, sy2] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
              fg.beginPath();
              fg.moveTo(pp.x + sx2 * br, pp.y + sy2 * (br - 16));
              fg.lineTo(pp.x + sx2 * br, pp.y + sy2 * br);
              fg.lineTo(pp.x + sx2 * (br - 16), pp.y + sy2 * br);
              fg.stroke();
            }
            text(fg, 'PERIAPT IV', pp.x + br + 14, pp.y - br + 14, { size: 20, weight: 800, color: G });
            text(fg, 'COLONY · SIGNAL LOST 9Y 04M', pp.x + br + 14, pp.y - br + 36, { size: 13, family: F.mono, weight: 700, color: G });
            if (sp.z < 1 && u > 0.25) {
              line(fg, sp.x, sp.y, sp.x + 70, sp.y - 50, '#cde404', 1);
              text(fg, 'RELAY 3 · DARK', sp.x + 74, sp.y - 54, { size: 12, family: F.mono, weight: 700, color: '#cde404' });
            }
            const gx = pp.x + br + 14;
            const gy = pp.y - br + 60;
            fg.strokeStyle = GD;
            fg.lineWidth = 1.5;
            fg.beginPath();
            for (let x = 0; x <= 200; x += 4) {
              const y = x < 60 ? Math.sin(x * 0.6 + T * 8) * 9 * hash(x, 2) : 0;
              if (x === 0) fg.moveTo(gx + x, gy + y);
              else fg.lineTo(gx + x, gy + y);
            }
            fg.stroke();
            for (const [x, y] of [[480, 70], [1440, 70], [500, 160], [1500, 300]] as const) plus(fg, x, y, 10, GD, 2);
            cutGlitch(f, t, 0.12, ['#000', G], 18);
            f.post.tint = [0.45, 1, 0.45];
            return;
          }
          /* ---- scene B ---- */
          const u = span(T, HANDOFF, T1 - 0.3);
          const s2 = smooth(u);
          const e = easeInOutCubic(u);
          const alt = 200 * Math.pow(altF / 200, e);
          const n = new THREE.Vector3().copy(dirA).lerp(nF, s2).normalize();
          camB.position.copy(n).multiplyScalar(R + alt);
          up.set(0, 1, 0).lerp(nT, s2 ** 2).normalize();
          camB.up.copy(up);
          camB.lookAt(new THREE.Vector3().lerpVectors(new THREE.Vector3(0, 0, 0), ahead, smooth(clamp01(u * 1.45))));
          camB.near = Math.max(0.02, alt * 0.02);
          camB.updateProjectionMatrix();
          camB.updateMatrixWorld();
          // haze only near the ground
          HAZE.near.value = alt < 20 ? 3 : 1e6;
          HAZE.far.value = alt < 20 ? 16 : 2e6;
          satB.position.copy(satOrbit(T, new THREE.Vector3(0, 0, 0), 160));
          satB.lookAt(0, 0, 0);
          f.three = { scene: B, camera: camB };
          const km = Math.floor(alt * 9.2);
          text(fg, `LAT 37.4  LON 211.0  ALT ${km.toLocaleString('en-US')} KM`, 96, 110, { size: 16, family: F.mono, weight: 700, color: '#8aa0ff' });
          text(fg, 'PERIAPT IV · SENSOR FEED', 96, 82, { size: 22, weight: 800, color: C.white, stretch: 'semi-expanded' });
          const sp = px(f, camB, satB.position);
          if (sp.z < 1 && u < 0.45) {
            line(fg, sp.x, sp.y, sp.x + 90, sp.y - 70, '#cde404', 1);
            text(fg, 'RELAY 3 · NO CARRIER', sp.x + 94, sp.y - 74, { size: 13, family: F.mono, weight: 700, color: '#cde404' });
          }
          if (T < HANDOFF + 0.25) {
            const k = (T - HANDOFF) / 0.25;
            rect(fg, 0, 1080 * k - 4, 1920, 8, '#e8ecff');
            cutGlitch(f, T - HANDOFF, 0.16, ['#000', G, C.blue], 19);
          }
          if (u > 0.6) {
            const k = span(u, 0.6, 1);
            const top = { x: 960, y: 120 };
            sigil(fg, 41, 900, 70, 7, 6, 8, G);
            sigil(fg, 42, 966, 70, 7, 6, 8, G);
            text(fg, 'SALVAGE ZONE · COLONY 04 · SILENT 9Y', 960, 180, { size: 18, family: F.mono, weight: 700, color: G, align: 'center' });
            drops.forEach((d2, i) => {
              if (k < i / drops.length) return;
              const p = px(f, camB, d2);
              if (p.z > 1) return;
              fg.strokeStyle = i % 2 ? '#b8e040' : '#e8f0a0';
              fg.lineWidth = 1.4;
              fg.beginPath();
              fg.moveTo(top.x - 40 + i * 12, top.y + 70);
              fg.quadraticCurveTo((top.x + p.x) / 2 + (p.x - top.x) * 0.4, top.y + 40, p.x, p.y);
              fg.stroke();
              tri(fg, p.x, p.y - 14, 24, '#e8f0a0', true, 2);
              text(fg, `R${String(i + 1).padStart(2, '0')}`, p.x + 14, p.y - 20, { size: 12, family: F.mono, weight: 700, color: '#e8f0a0' });
            });
          }
          f.post.tint = [0.55, 0.6, 1];
        },
      };
    },
  },
  /* ---------------------------------------------------------------- */
  {
    id: 'S16',
    t0: T1,
    t1: ANCHORS.error,
    title: 'The Authority',
    note: 'An Authority soldier runs the ruins, its body broken into red outline voxels with cyan plates; at the end it turns and locks on the camera — on us.',
    build: async (k) => {
      const scene = new THREE.Scene();
      const cam = persp(32, 0.05, 200);
      const skin = glitchToon({ lit: 0x1a1d2c, mid: 0x0b0d16, shade: 0x020205, g0: 0xff1a2a, g1: 0x40f0d0, amount: 0.06 });
      const body = await makeBody('armor', skin.mat);
      scene.add(body.root);
      {
        const J = (n: string) => {
          const q2 = body.joint(n);
          return [q2.x, q2.y, q2.z] as [number, number, number];
        };
        const sp2 = J('Spine2');
        const ra = J('RightArm');
        const lul = J('LeftUpLeg');
        const hd = J('Head');
        addStickers(body, [
          { at: [sp2[0], sp2[1] + 0.03, sp2[2] + 0.2], w: 0.12, h: 0.05, kind: 'label', text: 'AUTH', color: '#ff2a3a' },
          { at: [sp2[0] + 0.1, sp2[1] - 0.08, sp2[2] + 0.18], w: 0.08, h: 0.04, kind: 'stripes', color: '#e8ecff' },
          { at: [ra[0] - 0.12, ra[1] + 0.06, ra[2]], w: 0.08, h: 0.06, kind: 'num', text: '03', color: '#ff2a3a' },
          { at: [lul[0] + 0.03, lul[1] - 0.22, lul[2] + 0.1], w: 0.05, h: 0.1, kind: 'barcode', color: '#e8ecff', rot: Math.PI / 2 },
          { at: [hd[0], hd[1] + 0.1, hd[2] + 0.13], w: 0.07, h: 0.025, kind: 'chevron', color: '#40f0d0' },
        ]);
      }
      const vs = voxelize(body, 0.055);
      const cubes = new WireCubes(vs.count);
      scene.add(cubes.lines);
      const P: THREE.Vector3[] = [];
      const red = new THREE.Color(0xff1a2a);
      const red2 = new THREE.Color(0xff6a6a);
      // corridor of the ruins: floor, two walls with panels, pillars, vents
      const h = new Hard();
      h.box('floor', 60, 0.2, 7, 10, -0.1, 0);
      for (let i = 0; i < 30; i++) h.box('floor2', 1.9, 0.04, 6.6, -18 + i * 2, 0.01, 0);
      for (let i = 0; i < 26; i++) {
        const x = -16 + i * 2.2;
        h.box('wall', 2.1, 3.6 + hash(i, 1) * 1.6, 0.4, x, 1.9, -3.3);
        if (hash(i, 2) > 0.5) h.box('panel', 1.2, 0.8, 0.08, x, 1.2 + hash(i, 3), -3.07);
        if (hash(i, 4) > 0.6) h.bars('vent', 6, 0.06, 0.6, 0.06, 0.07, x, 2.6, -3.06);
        if (i % 3 === 0) h.box('pillar', 0.5, 5.2, 0.6, x + 1.05, 2.6, -2.9);
      }
      for (let i = 0; i < 14; i++) h.box('pillar', 0.5, 4.5, 0.5, -15 + i * 3.6, 2.25, 3.4);
      scene.add(h.build({
        floor: toonLit({ lit: 0x10162e, shade: 0x05070e }).mat,
        floor2: toonLit({ lit: 0x161e3c, shade: 0x070a16 }).mat,
        wall: toonLit({ lit: 0x1a2350, mid: 0x0e1430, shade: 0x05070f }).mat,
        panel: toonLit({ lit: 0x26306a, shade: 0x0a0e24 }).mat,
        vent: toonLit({ lit: 0x05070f, shade: 0x000000 }).mat,
        pillar: toonLit({ lit: 0x1c2550, mid: 0x0c1028, shade: 0x03040a }).mat,
      }, { wall: 0x2a3ab0, pillar: 0x2a3ab0 }));
      // stencil on the wall (3D)
      const cv = document.createElement('canvas');
      cv.width = 2048;
      cv.height = 512;
      const c2 = cv.getContext('2d')!;
      c2.strokeStyle = '#3a52ff';
      c2.lineWidth = 6;
      c2.font = `600 150px ${F.sans}`;
      c2.fontStretch = 'expanded';
      ['ICAR', 'COLONIAL', 'AUTHORITY'].forEach((w, i) => {
        c2.strokeText(w, 120, 150 + i * 160);
        c2.strokeRect(20, 30 + i * 160, 80, 130);
      });
      const st = new THREE.CanvasTexture(cv);
      st.colorSpace = THREE.SRGBColorSpace;
      const stencil = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), new THREE.MeshBasicMaterial({ map: st, transparent: true, depthWrite: false }));
      stencil.position.set(2, 2.1, -3.08);
      scene.add(stencil);
      const lag = new THREE.Vector3();
      return {
        draw(f) {
          const { fg, t } = f;
          const runEnd = 4.1;
          const x = -3 + Math.min(t, runEnd) * 2.4;
          body.root.position.set(x, 0, 0.2);
          if (t < runEnd) {
            body.clip('run', t);
            body.root.rotation.y = Math.PI / 2;
          } else {
            const k2 = smooth(span(t, runEnd, runEnd + 0.6));
            body.clip('idle', t);
            body.root.rotation.y = Math.PI / 2 - k2 * (Math.PI / 2 - 0.3);
            body.blendPose({ RightArm: [0, 40, 60], RightForeArm: [0, 95, 0], LeftArm: [0, -55, -10], LeftForeArm: [0, -35, 0], Head: [6, 14, 0] }, k2);
          }
          const camX = Math.min(x, -3 + runEnd * 2.4) + 0.6;
          cam.position.set(camX + 0.4, 1.0, 3.6);
          cam.lookAt(camX - 0.1, 1.05, 0);
          cam.updateMatrixWorld();
          body.root.updateMatrixWorld(true);
          f.three = { scene, camera: cam };
          // uniform red wire voxels riding the body; glitch rows lag behind the run
          skin.time.value = f.T;
          voxelPositions(body, vs, P);
          const step = Math.floor(t * 12);
          for (let i = 0; i < vs.count; i++) {
            const row = Math.floor(P[i].y / 0.11);
            const g = hash(row, step) > 0.86 && t < runEnd;
            if (hash(i, step, 3) < 0.12) {
              cubes.hide(i);
              continue;
            }
            lag.copy(P[i]);
            if (g) lag.x -= 0.15 + hash(row, step, 2) * 0.45;
            cubes.set(i, lag, vs.cell * 0.36, g ? red2 : red);
          }
          cubes.commit(vs.count);
          if (t > runEnd + 0.5) {
            const c = { x: 960, y: 540 };
            const kk = smooth(span(t, runEnd + 0.5, runEnd + 1.1));
            const r = 300 - kk * 220;
            fg.strokeStyle = C.red;
            fg.lineWidth = 3;
            for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
              fg.beginPath();
              fg.moveTo(c.x + sx * r, c.y + sy * (r - 30));
              fg.lineTo(c.x + sx * r, c.y + sy * r);
              fg.lineTo(c.x + sx * (r - 30), c.y + sy * r);
              fg.stroke();
            }
            if (kk > 0.9) text(fg, 'CONTACT', c.x + r + 14, c.y - r + 20, { size: 22, weight: 800, color: C.red });
          }
          vlabel(fg, 'AUTH · PATROL 3', 1860, 90, 16, '#3a52ff', { family: F.mono, weight: 700 });
          cutGlitch(f, t, 0.1, ['#000', C.red, '#3a52ff'], 20);
          f.post.tint = [0.7, 0.45, 0.6];
          void k;
        },
      };
    },
  },
];
