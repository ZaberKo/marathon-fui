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
import { C, F, line, plus, rect, text, tri } from '../draw';
import { makeBody } from '../models/body';
import { Hard, toonLit } from '../models/hard';
import { stationModel } from '../models/station';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';
import { isoSegments, terrainMaterial } from '../../three/procedural';
import { glitchToon, lineMat, screenDots, xray } from '../mats';
import { addStickers } from '../models/stickers';
import { VectorPlate } from '../models/vector-plate';
import { WireCubes, voxelPositions, voxelize } from '../models/voxels';
import { ANCHORS, cue } from './cues';
import { ST } from './times';
import { easeInOutCubic, persp, px, smooth, span, vlabel } from './kit';

const G = '#2fd62a';
const lerpHex = (a: number, b: number, k: number) => `#${new THREE.Color(a).lerp(new THREE.Color(b), k).getHexString()}`;
/** small deterministic PRNG for SimplexNoise */
const mulberry = (a: number) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const GD = '#0d7a0a';

function circle(r: number, color: number, y = 0, segs = 256, opacity = 1) {
  const pts = Array.from({ length: segs + 1 }, (_, i) => new THREE.Vector3(Math.cos((i / segs) * Math.PI * 2) * r, y, Math.sin((i / segs) * Math.PI * 2) * r));
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat(color, opacity));
}

const T0 = ANCHORS.swell;
const HANDOFF = T0 + 3.0;
const DROP = ANCHORS.drop;
const DIVE = ANCHORS.survey - 1.0;
const T1 = ANCHORS.survey;

/** a label block with a dark backing plate (never sits on top of a bright planet unreadably) */
function plate(fg: CanvasRenderingContext2D, x: number, y: number, lines: [string, number, string, boolean][], w: number) {
  const h = lines.reduce((a, l) => a + l[1] + 8, 10);
  rect(fg, x - 10, y - lines[0][1] - 6, w, h, 'rgba(0,0,0,0.78)');
  let yy = y;
  for (const [s, size, color, mono] of lines) {
    text(fg, s, x, yy, { size, weight: 800, color, family: mono ? F.mono : undefined });
    yy += size + 8;
  }
}

export const s7: ShotDef[] = [
  {
    id: 'S14',
    t0: ST.S14[0],
    t1: ST.S14[1],
    title: 'Periapt IV — from the system to the drop',
    note: 'One camera move: a drafted system chart (a corona star that dwarfs its planets, orbits with ticks and lanes, a ringed giant) → the planet, at an exactly matched scale handoff from dithered schematic to sensor imagery → high orbit behind the station, shown as an angular ring and two wing outlines. It drops runners down arcs onto every remaining signal; the camera follows one drop down toward its zone. Labels sit on dark plates beside the planet and move to a side panel once the planet fills the view.',
    build: () => {
      /* ---------------- scene A: system chart ---------------- */
      const A = new THREE.Scene();
      const camA = persp(36, 0.05, 800);
      const STAR_R = 3.0;
      const star = new THREE.Mesh(new THREE.SphereGeometry(STAR_R, 48, 24), new THREE.MeshBasicMaterial({ color: 0xe8ecff }));
      A.add(star);
      const corona: number[] = [];
      for (let i = 0; i < 120; i++) {
        const a = (i / 120) * Math.PI * 2;
        const l = STAR_R * (1.12 + hash(i, 1) * (i % 6 === 0 ? 0.95 : 0.35));
        corona.push(Math.cos(a) * STAR_R * 1.05, 0, Math.sin(a) * STAR_R * 1.05, Math.cos(a) * l, 0, Math.sin(a) * l);
      }
      const cg = new THREE.BufferGeometry();
      cg.setAttribute('position', new THREE.Float32BufferAttribute(corona, 3));
      A.add(new THREE.LineSegments(cg, lineMat(0xe8ecff, 0.7)));
      for (const k of [1.25, 1.5]) A.add(circle(STAR_R * k, 0xe8ecff, 0, 180, 0.35));
      const orbits = [9, 13, 18, 25, 33];
      orbits.forEach((r, i) => {
        A.add(circle(r, i === 2 ? 0x2fd62a : 0x0d6a0a, 0, 360, i === 2 ? 1 : 0.8));
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
      const Pp = new THREE.Vector3(Math.cos(thP) * orbits[2], 0, Math.sin(thP) * orbits[2]);
      const planetA = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), screenDots({ color: 0x2fd62a, cell: 7, gain: 1.05, bg: 0x010a02 }).mat);
      planetA.position.copy(Pp);
      A.add(planetA);
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
      [[1, 0.6, false], [3, 1.5, true], [4, 0.5, false], [0, 0.35, false]].forEach(([oi, rad, ringed]) => {
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
      const moon = new THREE.Group();
      moon.add(circle(0.22, 0x8aff5a, 0, 32));
      const moonMeridian = circle(0.22, 0x8aff5a, 0, 32);
      moonMeridian.rotation.x = Math.PI / 2;
      moon.add(moonMeridian);
      A.add(moon);
      const ringP = circle(2.1, 0x2fd62a, 0, 128);
      ringP.position.copy(Pp);
      A.add(ringP);
      /* ---------------- scene B: planet ×100, the station, the drop ---------------- */
      const B = new THREE.Scene();
      const camB = persp(36, 0.02, 3000);
      const R = 100;
      const planetB = new THREE.Mesh(new THREE.SphereGeometry(R, 192, 128), terrainMaterial());
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
      const dirA = new THREE.Vector3(0.35, 0.42, 1).normalize();
      const nT = new THREE.Vector3(0.22, 0.62, 0.75).normalize();
      const site = nT.clone().multiplyScalar(R);
      const east = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), nT).normalize();
      const north = new THREE.Vector3().crossVectors(nT, east).normalize();
      const onSphere = (x: number, z: number, lift = 0) => site.clone().addScaledVector(east, x).addScaledVector(north, z).normalize().multiplyScalar(R + lift);
      // the station, high over the site
      const station = stationModel();
      station.scale.setScalar(1.4);
      const SP = onSphere(-7, -10, 15);
      station.position.copy(SP);
      station.lookAt(onSphere(0, 30, 15));
      B.add(station);
      // Keep the station silhouette inside the frame above the drop sites.
      const camOrbit = onSphere(0, -42, 21);
      const lookOrbit = onSphere(1, 14, 2).lerp(SP, 0.47);
      // targets and drop arcs (3D lines revealed in steps)
      const targets = [[-9, 6], [-3, 12], [4, 9], [10, 16], [1, 22], [-7, 20], [13, 7]].map(([x, z]) => onSphere(x, z, 0.05));
      const DIVE_I = 2;
      const arcs = targets.map((tp, i) => {
        const a = SP.clone().add(new THREE.Vector3().subVectors(onSphere(-7, -10, 13), SP));
        const up2 = SP.clone().normalize();
        const c1 = a.clone().addScaledVector(up2, 4).addScaledVector(north, 6 + i);
        const c2 = tp.clone().addScaledVector(tp.clone().normalize(), 10);
        const pts = Array.from({ length: 65 }, (_, k) => {
          const t = k / 64;
          const it = 1 - t;
          return new THREE.Vector3().addScaledVector(a, it * it * it).addScaledVector(c1, 3 * it * it * t).addScaledVector(c2, 3 * it * t * t).addScaledVector(tp, t * t * t);
        });
        const line2 = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat(i === DIVE_I ? 0xe8f0a0 : 0x9dff3a, 0.9));
        line2.geometry.setDrawRange(0, 0);
        B.add(line2);
        return { pts, line: line2, at: DROP + 0.25 + i * 0.42 };
      });
      const up = new THREE.Vector3();
      const tmp = new THREE.Vector3();
      const fpx = (cam: THREE.PerspectiveCamera) => 540 / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
      return {
        draw(f: Frame) {
          const { fg, T } = f;
          if (T < HANDOFF) {
            const u = span(T, T0, HANDOFF);
            const e = easeInOutCubic(u);
            const d = 90 * Math.pow(3.0 / 90, e);
            const look = new THREE.Vector3().lerpVectors(new THREE.Vector3(4, 0, 4), Pp, smooth(clamp01(u * 1.4)));
            const dir0 = new THREE.Vector3(-0.2, 0.75, 1).normalize();
            const dir = new THREE.Vector3().lerpVectors(dir0, dirA, smooth(u)).normalize();
            camA.position.copy(Pp).addScaledVector(dir, d);
            camA.position.lerp(new THREE.Vector3(12, 66, 76), (1 - smooth(clamp01(u * 1.6))) * 0.8);
            camA.lookAt(look);
            camA.updateMatrixWorld();
            moon.position.set(Pp.x + Math.cos(T * 0.6) * 2.1, 0, Pp.z + Math.sin(T * 0.6) * 2.1);
            planetA.rotation.y = T * 0.08;
            grat.rotation.y = T * 0.08;
            f.three = { scene: A, camera: camA };
            for (const [x, y, sx, sy] of [[60, 60, 1, 1], [1860, 60, -1, 1], [60, 1020, 1, -1], [1860, 1020, -1, -1]] as const) {
              rect(fg, x, y, sx * 40, 2 * sy, G);
              rect(fg, x, y, 2 * sx, sy * 40, G);
            }
            for (let k = 0; k < 24; k++) rect(fg, 120 + k * 70, 1022, 1, k % 4 === 0 ? 14 : 7, GD);
            text(fg, '1 AU', 120 + 4 * 70, 1050, { size: 12, family: F.mono, weight: 700, color: GD });
            const pp = px(f, camA, Pp);
            const rp = (1 / camA.position.distanceTo(Pp)) * fpx(camA);
            const big = clamp01((rp - 120) / 80);
            if (big < 1) {
              fg.save();
              fg.globalAlpha = 1 - big;
              text(fg, 'SYSTEM', 96, 150, { size: 26, weight: 800, color: C.blue });
              text(fg, 'PERIAPT (4)', 96, 220, { size: 68, weight: 800, color: C.blue, stretch: 'semi-condensed' });
              text(fg, 'APPROACH ›', 96, 280, { size: 30, weight: 800, color: C.blue });
              fg.restore();
            }
            if (T >= cue('v13') && T < cue('v13') + 0.76) {
              text(fg, 'ASSERT', 96, 116, { size: 24, weight: 800, color: C.red, tracking: 3 });
            }
            const br = Math.max(46, rp * 1.25);
            fg.strokeStyle = G;
            fg.lineWidth = 2;
            for (const [sx2, sy2] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
              fg.beginPath();
              fg.moveTo(pp.x + sx2 * br, pp.y + sy2 * (br - 16));
              fg.lineTo(pp.x + sx2 * br, pp.y + sy2 * br);
              fg.lineTo(pp.x + sx2 * (br - 16), pp.y + sy2 * br);
              fg.stroke();
            }
            // planet facts: beside the bracket while it fits, then docked to the side panel
            const lines: [string, number, string, boolean][] = [
              ['PERIAPT IV', 22, G, false],
              ['COLONY · SIGNAL LOST 9Y 04M', 13, G, true],
              ['R 0.94 ⊕ · 1.06 g · ATM THIN', 13, GD, true],
            ];
            let lx = pp.x + br + 22;
            let ly = pp.y - br + 22;
            if (lx + 300 > 1880 || ly < 70) {
              lx = 1540;
              ly = 150;
              line(fg, lx - 12, ly + 20, Math.min(pp.x + rp * 0.7, lx - 12), Math.max(pp.y - rp * 0.7, ly + 20), GD, 1);
            }
            plate(fg, lx, ly, lines, 310);
            for (const [x, y] of [[480, 70], [1440, 70], [500, 160], [1500, 300]] as const) plus(fg, x, y, 10, GD, 2);
            return;
          }
          /* ---- scene B ---- */
          const handPos = dirA.clone().multiplyScalar(R + 200);
          const uA = smooth(span(T, HANDOFF, DROP));
          const lookA = new THREE.Vector3().lerpVectors(new THREE.Vector3(0, 0, 0), lookOrbit, smooth(clamp01(span(T, HANDOFF, DROP) * 1.3)));
          if (T < DROP) {
            // fall from the handoff distance into orbit behind the station (log-ish distance)
            const alt0 = 200;
            const alt1 = camOrbit.length() - R;
            const alt = alt0 * Math.pow(alt1 / alt0, uA);
            const n = handPos.clone().normalize().lerp(camOrbit.clone().normalize(), uA).normalize();
            camB.position.copy(n).multiplyScalar(R + alt);
            camB.lookAt(lookA);
          } else if (T < DIVE) {
            const u = span(T, DROP, DIVE);
            camB.position.copy(camOrbit).addScaledVector(north, u * 3).addScaledVector(east, u * 1.5);
            camB.lookAt(lookOrbit);
          } else {
            // follow one drop down toward its zone
            const u = smooth(span(T, DIVE, T1));
            const tgt = targets[DIVE_I];
            const from = camOrbit.clone().addScaledVector(north, 3).addScaledVector(east, 1.5);
            camB.position.copy(from).lerp(tgt.clone().add(tgt.clone().normalize().multiplyScalar(2.2)), u * u);
            camB.lookAt(tmp.copy(lookOrbit).lerp(tgt, smooth(clamp01(u * 2))));
          }
          up.set(0, 1, 0).lerp(nT, uA ** 2).normalize();
          camB.up.copy(up);
          camB.near = Math.max(0.02, (camB.position.length() - R) * 0.02);
          camB.updateProjectionMatrix();
          camB.updateMatrixWorld();
          station.rotation.z = 0;
          f.three = { scene: B, camera: camB };
          // drop arcs and pods
          const k = T - DROP;
          arcs.forEach((a, i) => {
            const kk = clamp01((T - a.at) / 0.9);
            a.line.geometry.setDrawRange(0, Math.floor(kk * 64) + 1);
            if (kk <= 0) return;
            const head = a.pts[Math.min(64, Math.floor(kk * 64))];
            const hp = px(f, camB, head);
            if (hp.z < 1 && kk < 1) rect(fg, hp.x - 3, hp.y - 3, 6, 6, '#ffffff');
            if (kk >= 1) {
              const p = px(f, camB, targets[i]);
              if (p.z > 1) return;
              const hot = i === DIVE_I;
              tri(fg, p.x, p.y - 14, hot ? 30 : 22, hot ? '#e8f0a0' : '#ffffff', true, 2);
              text(fg, `DZ-${String(i + 1).padStart(2, '0')}`, p.x + 16, p.y - 20, { size: 12, family: F.mono, weight: 700, color: hot ? '#e8f0a0' : '#ffffff' });
            }
          });
          const alt = camB.position.length() - R;
          text(fg, 'PERIAPT IV · SENSOR FEED', 96, 82, { size: 22, weight: 800, color: C.white, stretch: 'semi-expanded' });
          text(fg, `LAT 37.4  LON 211.0  ALT ${Math.floor(alt * 9.2).toLocaleString('en-US')} KM`, 96, 110, { size: 16, family: F.mono, weight: 700, color: '#8aa0ff' });
          if (T < cue('v14')) text(fg, 'COLONY · SIGNAL LOST 9Y 04M', 96, 137, { size: 15, family: F.mono, weight: 700, color: G });
          const sp = px(f, camB, station.position);
          if (sp.z < 1 && sp.y > 0 && sp.y < 1080 && T > DROP - 1.2) {
            const x = Math.min(1610, sp.x + 385);
            const y = Math.max(112, sp.y - 51);
            line(fg, sp.x + 56, sp.y - 22, x - 12, y + 13, '#cde404', 1);
            plate(fg, x, y, [['STATION KESTREL', 16, '#cde404', false], [k > 0 ? `DROPS ${Math.min(7, Math.max(0, Math.floor((k - 0.25) / 0.42) + 1))}/7` : 'HOLDING ORBIT', 12, '#cde404', true]], 220);
          }
          if (T < HANDOFF + 0.25) {
            const kq = (T - HANDOFF) / 0.25;
            rect(fg, 0, 1080 * kq - 4, 1920, 8, '#e8ecff');
          }
          if (T > T1 - 0.12) rect(fg, 0, 0, 1920, 1080, `rgba(232,240,160,${clamp01((T - (T1 - 0.12)) / 0.12) * 0.9})`);
        },
      };
    },
  },
  /* ---------------------------------------------------------------- */
  {
    id: 'S15',
    t0: ST.S15[0],
    t1: ST.S15[1],
    title: 'Drop zone survey',
    note: 'A contour map of the drop zone: marching-squares isolines of the terrain, each lifted to its height and coloured by elevation, index contours brighter, a ground grid with coordinates; the colony ruins are map symbols, not models. Pods fall in on their trails and land on their marks; the camera tilts from straight down (the dive) to an oblique survey view.',
    build: () => {
      const scene = new THREE.Scene();
      const cam = persp(32, 0.05, 200);
      const noise = new SimplexNoise({ random: mulberry(23) });
      const field = (x: number, z: number) => noise.noise(x * 0.13, z * 0.13) * 0.72 + noise.noise(x * 0.38 + 3, z * 0.38) * 0.2 - 0.15 * Math.exp(-((x - 1) ** 2 + (z + 0.5) ** 2) / 6);
      const levels = Array.from({ length: 24 }, (_, i) => -0.95 + i * 0.08);
      const HSCALE = 0.6;
      const hAt = (x: number, z: number) => (field(x, z) + 1) * HSCALE;
      const iso = isoSegments(field, { nx: 180, ny: 140, levels, x0: -9, x1: 9, y0: -7, y1: 7 });
      const pos: number[] = [];
      const col: number[] = [];
      const c = new THREE.Color();
      const lo = new THREE.Color(0x2a4cff);
      const mid = new THREE.Color(0x38d8ff);
      const hi = new THREE.Color(0x9dff3a);
      iso.forEach(({ level, seg }, li) => {
        const y = (level + 1) * HSCALE;
        const k = li / (levels.length - 1);
        c.copy(k < 0.5 ? lo.clone().lerp(mid, k * 2) : mid.clone().lerp(hi, (k - 0.5) * 2));
        if (li % 5 === 0) c.lerp(new THREE.Color(0xffffff), 0.55);
        for (let i = 0; i < seg.length; i += 4) {
          pos.push(seg[i], y, seg[i + 1], seg[i + 2], y, seg[i + 3]);
          col.push(c.r, c.g, c.b, c.r, c.g, c.b);
        }
      });
      const tg = new THREE.BufferGeometry();
      tg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      tg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      scene.add(new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ vertexColors: true })));
      const grid = new THREE.GridHelper(18, 18, 0x1a2a8a, 0x0e1650);
      grid.scale.z = 14 / 18;
      scene.add(grid);
      // ruins: hatched map squares draped at terrain height
      const ruins: number[] = [];
      for (let i = 0; i < 11; i++) {
        const x = -1.5 + (hash(i, 1) - 0.5) * 3.6;
        const z = 1.2 + (hash(i, 2) - 0.5) * 2.4;
        const s2 = 0.12 + hash(i, 3) * 0.16;
        const y = hAt(x, z) + 0.02;
        const q = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [x + a * s2, z + b * s2]);
        for (let k = 0; k < 4; k++) ruins.push(q[k][0], y, q[k][1], q[(k + 1) % 4][0], y, q[(k + 1) % 4][1]);
        const qi = q.map(([a, b]) => [x + (a - x) * 0.55, z + (b - z) * 0.55]);
        for (let k = 0; k < 4; k++) ruins.push(qi[k][0], y, qi[k][1], qi[(k + 1) % 4][0], y, qi[(k + 1) % 4][1]);
      }
      const rg = new THREE.BufferGeometry();
      rg.setAttribute('position', new THREE.Float32BufferAttribute(ruins, 3));
      scene.add(new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xcde404 })));
      // drop marks + landing pods
      const zones = [[-4.5, -2.5], [-2.2, 2.8], [0.6, -0.4], [3.6, 2.2], [5.4, -3.2], [-6.2, 3.6], [2.4, 4.6]].map(([x, z]) => new THREE.Vector3(x, hAt(x, z), z));
      const MAIN = 2;
      const rings: THREE.Line[] = [];
      zones.forEach((zp, i) => {
        for (const rr of i === MAIN ? [0.35, 0.7, 1.05] : [0.3]) {
          const ptsR = Array.from({ length: 65 }, (_, k) => {
            const a = (k / 64) * Math.PI * 2;
            const x = zp.x + Math.cos(a) * rr;
            const z = zp.z + Math.sin(a) * rr;
            return new THREE.Vector3(x, hAt(x, z) + 0.03, z);
          });
          const l2 = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ptsR), lineMat(i === MAIN ? 0xe8f0a0 : 0xffffff, 0.9));
          scene.add(l2);
          rings.push(l2);
        }
      });
      const v = new THREE.Vector3();
      return {
        draw(f) {
          const { fg, t } = f;
          // from straight down over the main zone (the dive) to an oblique survey
          const u = smooth(span(t, 0.0, 1.6));
          const drift = t * 0.05;
          const mz = zones[MAIN];
          cam.position.set(mz.x + (2 + Math.sin(drift) * 3) * u + 0.001, mz.y + 13 - u * 4.5, mz.z + 0.01 + u * 7.5);
          cam.up.set(0, 1, 0);
          if (u < 0.02) cam.up.set(0, 0, -1);
          cam.lookAt(mz.x, mz.y, mz.z - u * 0.8);
          cam.updateMatrixWorld();
          f.three = { scene, camera: cam };
          // pods fall in on their trails
          zones.forEach((zp, i) => {
            const at = 0.5 + i * 0.32;
            const k = clamp01((t - at) / 0.7);
            if (k <= 0) return;
            v.copy(zp).setY(zp.y + 7 * (1 - k * k));
            const p = px(f, cam, v);
            const g = px(f, cam, zp);
            if (g.z > 1) return;
            if (k < 1) {
              fg.strokeStyle = 'rgba(255,255,255,0.55)';
              fg.lineWidth = 1.5;
              fg.beginPath();
              fg.moveTo(p.x, p.y - 80);
              fg.lineTo(p.x, p.y);
              fg.stroke();
              rect(fg, p.x - 4, p.y - 4, 8, 8, '#ffffff');
            } else {
              const hot = i === MAIN;
              tri(fg, g.x, g.y - 16, hot ? 30 : 20, hot ? '#e8f0a0' : '#ffffff', true, 2);
              text(fg, `DZ-${String(i + 1).padStart(2, '0')}  ${(zp.y * 410).toFixed(0)} M`, g.x + 18, g.y - 22, { size: 12, family: F.mono, weight: 700, color: hot ? '#e8f0a0' : '#ffffff' });
            }
          });
          // ruins label
          v.set(-1.5, hAt(-1.5, 1.2) + 0.1, 1.2);
          const rp = px(f, cam, v);
          if (rp.z < 1) {
            line(fg, rp.x, rp.y, rp.x - 90, rp.y + 70, '#cde404', 1);
            text(fg, 'COLONY 04 · RUINS · SALVAGE OPEN', rp.x - 92, rp.y + 88, { size: 13, family: F.mono, weight: 700, color: '#cde404', align: 'right' });
          }
          // map furniture
          text(fg, 'DROP ZONE 04 · SURVEY', 96, 92, { size: 26, weight: 800, color: C.white, stretch: 'semi-expanded' });
          text(fg, 'CONTOUR 40 M · INDEX 200 M · GRID 1 KM', 96, 120, { size: 14, family: F.mono, weight: 700, color: '#8aa0ff' });
          for (let i = 0; i < 12; i++) {
            const k = i / 11;
            const cc = k < 0.5 ? lerpHex(0x2a4cff, 0x38d8ff, k * 2) : lerpHex(0x38d8ff, 0x9dff3a, (k - 0.5) * 2);
            rect(fg, 1700, 760 - i * 18, 28, 16, cc);
          }
          text(fg, '+0820 M', 1738, 566, { size: 12, family: F.mono, weight: 700, color: '#9dff3a' });
          text(fg, '+0020 M', 1738, 772, { size: 12, family: F.mono, weight: 700, color: '#2a4cff' });
          // survey sweep
          const sx = ((t * 520) % 2400) - 240;
          rect(fg, sx, 0, 2, 1080, 'rgba(157,255,58,0.35)');
          if (t < 0.15) rect(fg, 0, 0, 1920, 1080, `rgba(232,240,160,${0.9 * (1 - t / 0.15)})`);
        },
      };
    },
  },
  /* ---------------------------------------------------------------- */
  {
    id: 'S16',
    t0: ST.S16[0],
    t1: ST.S16[1],
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
        h.box('wall', 2.1, 4.0 + hash(i, 1) * 1.6, 0.4, x, 2.1, -3.3);
        const clear = x > -5.5 && x < 10.5; // the stencil band stays unobstructed
        if (!clear && hash(i, 2) > 0.5) h.box('panel', 1.2, 0.8, 0.08, x, 1.2 + hash(i, 3), -3.07);
        if (!clear && hash(i, 4) > 0.6) h.bars('vent', 6, 0.06, 0.6, 0.06, 0.07, x, 2.6, -3.06);
        if (i % 3 === 0) h.box('pillar', 0.5, 5.2, 0.6, x + 1.05, 2.6, -3.4);
      }
      scene.add(h.build({
        floor: toonLit({ lit: 0x10162e, shade: 0x05070e }).mat,
        floor2: toonLit({ lit: 0x161e3c, shade: 0x070a16 }).mat,
        wall: toonLit({ lit: 0x1a2350, mid: 0x0e1430, shade: 0x05070f }).mat,
        panel: toonLit({ lit: 0x26306a, shade: 0x0a0e24 }).mat,
        vent: toonLit({ lit: 0x05070f, shade: 0x000000 }).mat,
        pillar: toonLit({ lit: 0x1c2550, mid: 0x0c1028, shade: 0x03040a }).mat,
      }, { wall: 0x2a3ab0, pillar: 0x2a3ab0 }));
      // One geometric stencil band on the wall, low enough to stay in frame.
      const sign = new VectorPlate(4096, 512, 14, 1.75);
      const ink = 0x3a52ff;
      // Chamfered contours keep the large lettering connected at a close range.
      const contours: Record<string, [number, number][][]> = {
        A: [[[0, 6], [0, 1.4], [1.2, 0], [2.8, 0], [4, 1.4], [4, 6], [2.8, 6], [2.8, 4.2], [1.2, 4.2], [1.2, 6]],
          [[1.2, 3.1], [2.8, 3.1], [2.8, 1.7], [2.4, 1.1], [1.6, 1.1], [1.2, 1.7]]],
        C: [[[1, 0], [4, 0], [4, 1.1], [1.55, 1.1], [1.2, 1.45], [1.2, 4.55], [1.55, 4.9], [4, 4.9], [4, 6], [1, 6], [0, 5], [0, 1]]],
        H: [[[0, 0], [1.2, 0], [1.2, 2.45], [2.8, 2.45], [2.8, 0], [4, 0], [4, 6], [2.8, 6], [2.8, 3.55], [1.2, 3.55], [1.2, 6], [0, 6]]],
        I: [[[0, 0], [4, 0], [4, 1.1], [2.6, 1.1], [2.6, 4.9], [4, 4.9], [4, 6], [0, 6], [0, 4.9], [1.4, 4.9], [1.4, 1.1], [0, 1.1]]],
        L: [[[0, 0], [1.2, 0], [1.2, 4.9], [4, 4.9], [4, 6], [0, 6]]],
        N: [[[0, 0], [1.15, 0], [2.85, 3.45], [2.85, 0], [4, 0], [4, 6], [2.85, 6], [1.15, 2.55], [1.15, 6], [0, 6]]],
        O: [[[1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [1, 6], [0, 5], [0, 1]],
          [[1.55, 1.1], [2.45, 1.1], [2.8, 1.45], [2.8, 4.55], [2.45, 4.9], [1.55, 4.9], [1.2, 4.55], [1.2, 1.45]]],
        R: [[[0, 0], [3, 0], [4, 1], [4, 2.65], [3.15, 3.5], [4, 6], [2.75, 6], [1.8, 3.65], [1.2, 3.65], [1.2, 6], [0, 6]],
          [[1.2, 1.1], [2.45, 1.1], [2.8, 1.45], [2.8, 2.2], [2.45, 2.55], [1.2, 2.55]]],
        T: [[[0, 0], [4, 0], [4, 1.1], [2.6, 1.1], [2.6, 6], [1.4, 6], [1.4, 1.1], [0, 1.1]]],
        U: [[[0, 0], [1.2, 0], [1.2, 4.55], [1.55, 4.9], [2.45, 4.9], [2.8, 4.55], [2.8, 0], [4, 0], [4, 5], [3, 6], [1, 6], [0, 5]]],
        Y: [[[0, 0], [1.25, 0], [2, 2.25], [2.75, 0], [4, 0], [2.6, 3.55], [2.6, 6], [1.4, 6], [1.4, 3.55]]],
      };
      for (const [i, letter] of [...'ICAR COLONIAL AUTHORITY'].entries()) {
        for (const contour of contours[letter] ?? []) {
          for (const [k, [x, y]] of contour.entries()) {
            const [nx, ny] = contour[(k + 1) % contour.length];
            const left = 150 + i * 160;
            const X = left + 32 * x;
            const Y = 100 + 170 * y / 6;
            sign.segment(X, Y, left + 32 * nx, 100 + 170 * ny / 6, 7, ink);
            sign.rect(X - 3.5, Y - 3.5, 7, 7, ink);
          }
        }
      }
      sign.rect(20, 60, 90, 230, ink);
      sign.text('SECTOR 04 · PATROL ROUTE 3 · LETHAL FORCE AUTHORISED', 150, 363, 47, ink, { maxWidth: 3780 });
      for (let i = 0; i < 40; i++) sign.rect(150 + i * 96, 450, 60, 22, ink);
      const stencil = sign.mesh();
      stencil.name = 'Authority wall stencil';
      stencil.position.set(2.5, 1.75, -3.0);
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
          void k;
        },
      };
    },
  },
];
