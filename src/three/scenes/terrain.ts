/**
 * CONTOUR FIELD — marching-squares topography of a drifting noise field,
 * each level lifted to its height (3D plotter terrain). A convoy of pods
 * (contour rings around their axis) on cobalt rails; red outline
 * triangles hover and blink in steps.
 */
import * as THREE from 'three/webgpu';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';
import { createStage, makeTag } from '../core';
import { contourMaterial } from '../materials';
import { LineBatch } from '../overlay';
import { isoSegments } from '../procedural';
import { PAL, type SceneHandle, type SceneOpts } from './common';
import { rng } from '../../lib/util';

export async function mountTerrain(host: HTMLElement, { fps = 12, pixel = 1, labels = true }: SceneOpts = {}): Promise<SceneHandle> {
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  const stage = await createStage(host, { label: 'TERRAIN', fps, pixel, camera });
  const { scene } = stage;
  const noise = new SimplexNoise({ random: rng(15) });

  const terrain = new LineBatch(60000, { depthTest: true });
  scene.add(terrain.object);
  const levels = Array.from({ length: 13 }, (_, i) => -0.9 + i * 0.15);
  const H = 0.55; // height per unit level

  /* pods ------------------------------------------------------------- */
  const podMat = contourMaterial({ line: 0xff2a4a, body: 0x14000a, freq: 22, width: 0.7, space: 'local', axis: 'y', rim: 0xff2a4a, rimWidth: 0.35 });
  const capMat = contourMaterial({ line: PAL.acid, body: 0x021400, freq: 40, width: 0.7, space: 'local', axis: 'z' });
  const dir = new THREE.Vector3(1, 0, -0.62).normalize();
  const start = new THREE.Vector3(-4.2, 0, 2.4);
  const pods = new THREE.Group();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const podPos: THREE.Vector3[] = [];
  for (let i = 0; i < 11; i++) {
    const p = start.clone().addScaledVector(dir, i * 0.78);
    p.y = 0.75;
    const pod = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.42, 6, 18), podMat.mat);
    pod.position.copy(p);
    pod.quaternion.copy(q);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), capMat.mat);
    cap.position.set(0, -0.36, 0);
    cap.rotation.x = Math.PI;
    pod.add(cap);
    pods.add(pod);
    podPos.push(p);
  }
  scene.add(pods);

  // rails
  const rails: number[] = [];
  const side = new THREE.Vector3(-dir.z, 0, dir.x);
  for (let k = 0; k < 9; k++) {
    const o = side.clone().multiplyScalar(-0.9 + k * 0.22);
    const a = start.clone().addScaledVector(dir, -2).add(o);
    const b = start.clone().addScaledVector(dir, 11).add(o);
    rails.push(a.x, 0.42, a.z, b.x, 0.42, b.z);
  }
  const rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.Float32BufferAttribute(rails, 3));
  scene.add(new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: PAL.cobalt })));

  const hud = new LineBatch(3000, { depthTest: false });
  scene.add(hud.object);
  const r = rng(16);
  const hovers = Array.from({ length: 14 }, () => new THREE.Vector3(-4 + r() * 8, 1.2 + r() * 1.2, -4 + r() * 6));
  const tags = labels ? [3, 7].map((i) => ({ i, t: makeTag(host, `<b>T1635</b><span>POD ${String(i).padStart(2, '0')}</span>`, 'gl-tag--crimson') })) : [];

  const rebuild = (t: number) => {
    const iso = isoSegments(
      (x, z) => noise.noise(x * 0.32 + t * 0.06, z * 0.32) * 0.75 + noise.noise(x * 0.9, z * 0.9 - t * 0.04) * 0.25,
      { nx: 110, ny: 90, levels, x0: -7, x1: 7, y0: -7, y1: 4 },
    );
    terrain.begin(camera, stage.size.h);
    iso.forEach(({ level, seg }, li) => {
      const y = (level + 0.9) * H * 0.35;
      const k = 0.35 + 0.65 * (li / levels.length);
      terrain.color(li === 6 ? PAL.acid : 0xc8dcd0, li === 6 ? 0.9 : k);
      for (let i = 0; i < seg.length; i += 4) terrain.seg(seg[i], y, seg[i + 1], seg[i + 2], y, seg[i + 3]);
    });
    terrain.end();
  };

  stage.start((t, frame) => {
    camera.position.set(5.2, 2.9, 4.6);
    camera.lookAt(-0.6, 0.3, -0.8);
    scene.updateMatrixWorld(true);
    if (frame % 3 === 0) rebuild(Math.floor(t * 4) / 4);

    pods.children.forEach((p, i) => {
      (p as THREE.Mesh).position.y = 0.75 + ((Math.floor(t * 4) + i) % 4 === 0 ? 0.03 : 0);
    });
    hud.begin(camera, stage.size.h);
    hovers.forEach((h, i) => {
      if ((frame + i * 5) % 31 < 3) return; // stepped blink-out
      const bob = ((Math.floor(t * 3) + i) % 2) * 0.05;
      hud.color(PAL.crimson).tri(h.clone().setY(h.y + bob), 14 + (i % 3) * 5, false);
    });
    const sel = podPos[Math.floor(frame / 18) % podPos.length];
    hud.color(PAL.hazard).brackets(sel, 46, 46, 8);
    hud.end();
    tags.forEach(({ i, t: tag }) => tag.at(stage, podPos[i].clone().setY(1.05), -20, -26));
  });

  return {
    stage,
    dispose() {
      tags.forEach(({ t }) => t.remove());
      stage.dispose();
    },
  };
}
