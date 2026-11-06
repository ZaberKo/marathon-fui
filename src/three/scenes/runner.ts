/**
 * CONTOUR RUNNER — armoured figure described only by 1px world-Y contour
 * lines on a black occluding body, silhouette rim, sweeping scan band.
 * Surface-attached vector marks (triangles / squares / crosses) ride on
 * skinned vertices; leader lines run out to DOM labels.
 */
import * as THREE from 'three/webgpu';
import { createStage, cornerBox, floorGrid, makeTag, ringLine } from '../core';
import { contourMaterial } from '../materials';
import { LineBatch } from '../overlay';
import { extremeVert, fitHeight, loadModel, meshesOf, sampleVerts, vertexWorld } from '../assets';
import { PAL, type SceneHandle } from './common';
import { rng } from '../../lib/util';

export async function mountRunner(host: HTMLElement, { fps = 12, pixel = 1, labels = true } = {}): Promise<SceneHandle> {
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  const stage = await createStage(host, { label: 'RUNNER', fps, pixel, camera });
  const { scene } = stage;

  const { root, clips } = await loadModel('soldier');
  fitHeight(root, 1.8);
  scene.add(root);
  const C = contourMaterial({ line: 0xc9d2ff, body: 0x01020a, freq: 24, width: 0.6, rim: PAL.cobalt, rimWidth: 0.3, scan: PAL.acid, scanWidth: 0.012 });
  const meshes = meshesOf(root);
  meshes.forEach((m) => {
    m.material = C.mat;
    m.frustumCulled = false;
  });
  const body = meshes.reduce((a, b) => (b.geometry.getAttribute('position').count > a.geometry.getAttribute('position').count ? b : a));

  const mixer = new THREE.AnimationMixer(root);
  const clip = clips.find((c) => /run/i.test(c.name)) ?? clips[0];
  mixer.clipAction(clip).play();

  // drafting environment
  scene.add(floorGrid(10, 40, PAL.cobaltDeep));
  const rings = new THREE.Group();
  [0.45, 0.7, 1.05].forEach((r, i) => rings.add(ringLine(r, i === 1 ? PAL.acid : PAL.cobaltLo, 96, 0.002)));
  scene.add(rings);
  const box = cornerBox(new THREE.Vector3(1.1, 1.95, 1.1), PAL.bone, 0.09);
  box.position.y = 0.975;
  scene.add(box);

  // overlay
  const marks = new LineBatch(8000, { depthTest: false });
  scene.add(marks.object);
  const r = rng(7);
  mixer.update(0);
  root.updateMatrixWorld(true);
  let pts = sampleVerts(body, 46, r);
  const kinds = pts.map(() => r());
  const leaders = [
    { i: extremeVert(body, r, (p) => p.y), label: 'OPTIC.ARRAY', code: 'L/R' },
    { i: extremeVert(body, r, (p) => -Math.abs(p.y - 1.25) * 4 + p.z), label: 'SHELL.INTEGRITY', code: '097%' },
    { i: extremeVert(body, r, (p) => -Math.abs(p.y - 0.5) * 4 + p.z), label: 'MOTOR.CORTEX', code: 'SYNC' },
  ];
  const tags = labels
    ? leaders.map((l) => makeTag(host, `<b>${l.label}</b><span>${l.code}</span>`))
    : [];

  const v = new THREE.Vector3();
  const cam = new THREE.Vector3();
  const out = new THREE.Vector3();
  const right = new THREE.Vector3();
  let speed = 1;
  let orbit = true;

  stage.start((t, frame, dt) => {
    mixer.update(dt * speed);
    root.updateMatrixWorld(true);

    // camera orbits in visible jumps
    const a = orbit ? Math.floor(t * 1.5) * 0.12 + 1.2 : 1.2;
    camera.position.set(Math.sin(a) * 5.6, 1.45, Math.cos(a) * 5.6);
    camera.lookAt(0, 0.92, 0);
    camera.updateMatrixWorld();
    cam.copy(camera.position);
    right.setFromMatrixColumn(camera.matrixWorld, 0);

    // scan sweep + periodic glitch offset
    C.u.scanY.value = ((frame * 0.035) % 1) * 2.1 - 0.1;
    C.u.offset.value = frame % 37 === 0 ? 0.5 : 0;

    if (frame % 40 === 0) {
      pts = sampleVerts(body, 46, r);
      kinds.forEach((_, i) => (kinds[i] = r()));
    }

    marks.begin(camera, stage.size.h);
    pts.forEach((i, k) => {
      vertexWorld(body, i, v);
      out.set(v.x, 0, v.z).normalize();
      const toCam = cam.clone().sub(v).setY(0).normalize();
      if (out.dot(toCam) < 0.15) return; // only marks on the visible side
      const kd = kinds[k];
      if (kd < 0.5) marks.color(PAL.acid).tri(v, 9 + (k % 3) * 3, k % 2 === 0);
      else if (kd < 0.7) marks.color(PAL.bone).square(v, 5);
      else if (kd < 0.85) marks.color(PAL.cyan).cross(v, 8);
      else marks.color(PAL.hazard).diamond(v, 8);
    });
    leaders.forEach((l, k) => {
      vertexWorld(body, l.i, v);
      const elbow = v.clone().addScaledVector(right, 0.35 + k * 0.08).add(new THREE.Vector3(0, 0.12, 0));
      const end = elbow.clone().addScaledVector(right, 0.45);
      marks.color(PAL.hazard).circle(v, 7).line(v, elbow).line(elbow, end);
      tags[k]?.at(stage, end, 4, -14);
    });
    marks.end();
  });

  return {
    stage,
    set(key, val) {
      if (key === 'freq') C.u.freq.value = Number(val);
      if (key === 'speed') speed = Number(val);
      if (key === 'orbit') orbit = Boolean(val);
      if (key === 'line') C.setColor('line', val as number);
    },
    dispose() {
      tags.forEach((t) => t.remove());
      mixer.stopAllAction();
      stage.dispose();
    },
  };
}
