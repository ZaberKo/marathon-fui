/**
 * DROP ZONE — huge pixel-textured planet horizon (flat cobalt + dark plates),
 * latitude bands, white outline triangles marking targets; green arcs fall
 * from an orbital source cluster to each target, drawing in step by step.
 */
import * as THREE from 'three/webgpu';
import { createStage, makeTag } from '../core';
import { contourMaterial } from '../materials';
import { FillBatch, LineBatch } from '../overlay';
import { pixelSurfaceTexture } from '../procedural';
import { PAL, type SceneHandle, type SceneOpts } from './common';
import { rng } from '../../lib/util';

export async function mountDropzone(host: HTMLElement, { fps = 12, pixel = 1, labels = true }: SceneOpts = {}): Promise<SceneHandle> {
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  const stage = await createStage(host, { label: 'DROPZONE', fps, pixel, camera });
  const { scene } = stage;

  const R = 9;
  const planet = new THREE.Group();
  planet.position.set(0, -R, 0);
  scene.add(planet);
  const tex = pixelSurfaceTexture();
  tex.repeat.set(6, 3);
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 64), new THREE.MeshBasicMaterial({ map: tex }));
  planet.add(sphere);
  // latitude bands (cyan) — circles around the planet's y axis
  const band = (lat: number, color: number) => {
    const la = THREE.MathUtils.degToRad(lat);
    const pts = Array.from({ length: 256 }, (_, i) => {
      const a = (i / 256) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * Math.cos(la) * R * 1.001, Math.sin(la) * R * 1.001, Math.sin(a) * Math.cos(la) * R * 1.001);
    });
    pts.push(pts[0]);
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color }));
  };
  planet.add(band(72, PAL.cyan), band(62, 0x7fa0ff), band(50, PAL.cobaltHi));

  // moon (contour sphere)
  const moonMat = contourMaterial({ line: 0x3b4bff, body: 0x000000, freq: 26, width: 0.7, space: 'local' });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 24), moonMat.mat);
  moon.position.set(5.2, 3.6, -9);
  scene.add(moon);

  // targets on the surface (in planet-local coords)
  const r = rng(62);
  const targets = Array.from({ length: 14 }, () => {
    const lat = THREE.MathUtils.degToRad(68 + r() * 20);
    const lon = r() * Math.PI * 2;
    return new THREE.Vector3(Math.cos(lon) * Math.cos(lat) * R, Math.sin(lat) * R, Math.sin(lon) * Math.cos(lat) * R);
  });
  const source = Array.from({ length: 10 }, (_, i) => new THREE.Vector3(-0.9 + i * 0.2, 3.4, -3.2));

  const lines = new LineBatch(10000, { depthTest: true });
  const hud = new LineBatch(3000, { depthTest: false });
  const fills = new FillBatch(2000, { depthTest: false });
  scene.add(lines.object, hud.object, fills.object);

  const dz = labels ? makeTag(host, '<b>DZ</b><span>N 44\'54\'32 · E 70\'44\'21</span>', 'gl-tag--crimson') : null;
  const src = labels ? makeTag(host, '<b>ORBITAL SOURCE</b><span>10 PODS</span>') : null;
  const w = new THREE.Vector3();

  stage.start((t, frame) => {
    planet.rotation.y = t * 0.03;
    camera.position.set(0, 1.25, 6.2);
    camera.lookAt(0, 1.0, -2);
    scene.updateMatrixWorld(true);

    lines.begin(camera, stage.size.h);
    hud.begin(camera, stage.size.h);
    fills.begin(camera, stage.size.h);
    const cycle = frame % 96;
    const world = targets.map((p) => planet.localToWorld(w.copy(p)).clone());
    const visible = world.map((p, i) => ({ p, i })).filter(({ p }) => p.z > -9 && p.z < 4.5);

    visible.forEach(({ p, i }, k) => {
      hud.color(PAL.bone).tri(p.clone().add(new THREE.Vector3(0, 0.12, 0)), 14 + (i % 3) * 4, true);
      const s = source[i % source.length];
      const ctrl = new THREE.Vector3(s.x * 0.4 + p.x * 0.6, Math.max(s.y, p.y) + 1.2, (s.z + p.z) / 2);
      const start = k * 5;
      const grow = Math.max(0, Math.min(1, (cycle - start) / 10));
      if (grow > 0) {
        lines.color(k % 4 === 0 ? PAL.lime : PAL.acid).bezier(s, ctrl, p, 32, grow);
        if (grow >= 1) fills.color(PAL.acid).square(p, 5);
      }
    });
    source.forEach((s) => fills.color(PAL.cobaltHi).square(s, 4));
    const tgt = visible[Math.floor(frame / 24) % Math.max(1, visible.length)]?.p;
    if (tgt) {
      hud.color(PAL.crimson).brackets(tgt, 44, 30, 7).cross(tgt, 22, 8);
      dz?.at(stage, tgt, 26, -10);
    }
    lines.end();
    hud.end();
    fills.end();
    src?.at(stage, source[source.length - 1], 12, -18);
    moon.rotation.y = t * 0.2;
  });

  return {
    stage,
    dispose() {
      dz?.remove();
      src?.remove();
      stage.dispose();
    },
  };
}
