/**
 * CONTOUR FIELD — a survey map of a drop zone.
 * Marching-squares isolines of a terrain field, each lifted to its height
 * and coloured by elevation (cobalt → cyan → acid), every fifth an index
 * contour. A survey level steps up through the elevations in bone white.
 * Ruins are map symbols, drop zones are rings draped on the ground; pods
 * fall in on vertical trails and land on their marks in sequence.
 * The camera circles in hard steps at an oblique survey angle.
 */
import * as THREE from 'three/webgpu';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';
import { createStage, makeTag } from '../core';
import { LineBatch } from '../overlay';
import { isoSegments } from '../procedural';
import { PAL, type SceneHandle, type SceneOpts } from './common';
import { rng } from '../../lib/util';

export async function mountTerrain(host: HTMLElement, { fps = 12, pixel = 1, labels = true }: SceneOpts = {}): Promise<SceneHandle> {
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 200);
  const stage = await createStage(host, { label: 'TERRAIN', fps, pixel, camera });
  const { scene } = stage;
  const r = rng(23);
  const noise = new SimplexNoise({ random: r });
  const field = (x: number, z: number) =>
    noise.noise(x * 0.13, z * 0.13) * 0.72 + noise.noise(x * 0.38 + 3, z * 0.38) * 0.2 - 0.15 * Math.exp(-((x - 1) ** 2 + (z + 0.5) ** 2) / 6);
  const NL = 24;
  const levels = Array.from({ length: NL }, (_, i) => -0.95 + i * 0.08);
  const HS = 0.6;
  const hAt = (x: number, z: number) => (field(x, z) + 1) * HS;

  /* terrain: one LineSegments per level so a level can be re-coloured */
  const lo = new THREE.Color(0x2a4cff);
  const mid = new THREE.Color(0x38d8ff);
  const hi = new THREE.Color(0x9dff3a);
  const base: THREE.Color[] = [];
  const mats: THREE.LineBasicMaterial[] = [];
  isoSegments(field, { nx: 170, ny: 130, levels, x0: -9, x1: 9, y0: -7, y1: 7 }).forEach(({ level, seg }, li) => {
    const y = (level + 1) * HS;
    const k = li / (NL - 1);
    const c = k < 0.5 ? lo.clone().lerp(mid, k * 2) : mid.clone().lerp(hi, (k - 0.5) * 2);
    if (li % 5 === 0) c.lerp(new THREE.Color(0xffffff), 0.5);
    else c.multiplyScalar(0.78);
    base.push(c);
    const pos = new Float32Array((seg.length / 4) * 6);
    for (let i = 0, o = 0; i < seg.length; i += 4, o += 6) {
      pos[o] = seg[i];
      pos[o + 1] = y;
      pos[o + 2] = seg[i + 1];
      pos[o + 3] = seg[i + 2];
      pos[o + 4] = y;
      pos[o + 5] = seg[i + 3];
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.LineBasicMaterial({ color: c });
    mats.push(m);
    scene.add(new THREE.LineSegments(g, m));
  });

  // ground grid (1 km) under the map
  const grid = new THREE.GridHelper(18, 18, 0x1a2a8a, 0x0e1650);
  grid.scale.z = 14 / 18;
  scene.add(grid);

  // ruins: square map symbols draped at terrain height (outer + inner square)
  const ruins: number[] = [];
  for (let i = 0; i < 12; i++) {
    const x = -1.6 + (r() - 0.5) * 3.8;
    const z = 1.2 + (r() - 0.5) * 2.6;
    const s = 0.12 + r() * 0.16;
    const y = hAt(x, z) + 0.02;
    for (const k of [1, 0.55]) {
      const q = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [x + a * s * k, z + b * s * k]);
      for (let e = 0; e < 4; e++) ruins.push(q[e][0], y, q[e][1], q[(e + 1) % 4][0], y, q[(e + 1) % 4][1]);
    }
  }
  const rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.Float32BufferAttribute(ruins, 3));
  scene.add(new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xcde404 })));

  // drop zones: rings that follow the ground
  const zones = [[-4.5, -2.5], [-2.2, 2.8], [0.6, -0.4], [3.6, 2.2], [5.4, -3.2], [-6.2, 3.6], [2.4, 4.6]].map(([x, z]) => new THREE.Vector3(x, hAt(x, z), z));
  const MAIN = 2;
  zones.forEach((zp, i) => {
    for (const rr of i === MAIN ? [0.35, 0.7, 1.05] : [0.3]) {
      const pts = Array.from({ length: 73 }, (_, k) => {
        const a = (k / 72) * Math.PI * 2;
        const x = zp.x + Math.cos(a) * rr;
        const z = zp.z + Math.sin(a) * rr;
        return new THREE.Vector3(x, hAt(x, z) + 0.03, z);
      });
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: i === MAIN ? 0xe8f0a0 : 0xffffff })));
    }
  });

  const hud = new LineBatch(4000, { depthTest: false });
  scene.add(hud.object);
  const shown = [MAIN, 0, 3];
  const tags = labels
    ? shown.map((i) => makeTag(host, `<b>DZ-${String(i + 1).padStart(2, '0')}</b><span>${Math.round(zones[i].y * 410)} M</span>`, i === MAIN ? 'gl-tag--hazard' : ''))
    : [];
  const survey = labels ? makeTag(host, '<b>SURVEY</b><span>+0000 M</span>') : null;

  const v = new THREE.Vector3();
  const w = new THREE.Vector3();
  const centre = new THREE.Vector3(0, 0.4, 0.6);
  const CYCLE = 96; // frames per drop cycle

  stage.start((t0, frame) => {
    const t = Math.max(0, t0);
    // camera: oblique survey, yaw advances one notch every 1.5 s
    const yaw = 0.35 + Math.floor(t / 1.5) * 0.09;
    camera.position.set(centre.x + Math.sin(yaw) * 12.5, 7.2, centre.z + Math.cos(yaw) * 12.5);
    camera.lookAt(centre);
    camera.updateMatrixWorld();

    // survey level climbs one contour every 2 frames
    const sl = Math.floor(frame / 2) % (NL + 6);
    // above the survey level the map is still unsurveyed: dim
    mats.forEach((m, i) => (i === sl ? m.color.setHex(PAL.bone) : i > sl ? m.color.copy(base[i]).multiplyScalar(0.22) : m.color.copy(base[i])));

    hud.begin(camera, stage.size.h);
    const cf = frame % CYCLE;
    zones.forEach((zp, i) => {
      const at = 6 + i * 9;
      const k = Math.min(1, Math.max(0, (cf - at) / 10));
      if (k <= 0) return;
      if (k < 1) {
        // falling pod: square + vertical trail
        v.copy(zp).setY(zp.y + 6 * (1 - k * k));
        w.copy(v).setY(v.y + 1.6);
        hud.color(PAL.bone, 0.7).line(v, w);
        hud.color(PAL.bone).square(v, 7);
      } else {
        // landed: triangle over the mark, a short stem
        v.copy(zp).setY(zp.y + 0.45);
        hud.color(i === MAIN ? 0xe8f0a0 : PAL.bone).tri(v, i === MAIN ? 18 : 12, true).line(v, zp);
      }
    });
    hud.color(PAL.hazard).brackets(zones[MAIN], 64, 64, 9);
    hud.end();

    tags.forEach((tag, j) => {
      const i = shown[j];
      const landed = cf >= 16 + i * 9;
      tag.el.style.display = landed ? '' : 'none';
      tag.at(stage, v.copy(zones[i]).setY(zones[i].y + 0.5), 12, -30);
    });
    if (survey && sl < NL) {
      survey.el.style.display = '';
      survey.el.innerHTML = `<b>SURVEY</b><span>+${String(Math.round((levels[sl] + 1) * HS * 410)).padStart(4, '0')} M</span>`;
      survey.el.style.transform = 'translate(14px, 14px)';
    } else if (survey) survey.el.style.display = 'none';
  });

  return {
    stage,
    dispose() {
      tags.forEach((t) => t.remove());
      survey?.remove();
      stage.dispose();
    },
  };
}
