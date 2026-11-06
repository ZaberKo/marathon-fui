/**
 * PSYCHE LINK — procedural brain drawn as dense topographic contours on a
 * grid plate; straight yellow connectors map cortex points to a contour
 * figure, drawing in one by one (stepped), endpoints marked with dots.
 */
import * as THREE from 'three/webgpu';
import { createStage, makeTag } from '../core';
import { contourMaterial } from '../materials';
import { FillBatch, LineBatch } from '../overlay';
import { fitHeight, loadModel, meshesOf, sampleVerts, vertexWorld } from '../assets';
import { brainGeometry, cerebellumGeometry } from '../procedural';
import { PAL, type SceneHandle, type SceneOpts } from './common';
import { rng } from '../../lib/util';

export async function mountPsyche(host: HTMLElement, { fps = 12, pixel = 1, labels = true }: SceneOpts = {}): Promise<SceneHandle> {
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const stage = await createStage(host, { label: 'PSYCHE', fps, pixel, camera });
  const { scene } = stage;

  /* brain ------------------------------------------------------------ */
  const brainMat = contourMaterial({ line: 0x3b4bff, body: 0x00010a, freq: 34, width: 0.75, rim: 0x5257ff, rimWidth: 0.18, space: 'local' });
  const brain = new THREE.Group();
  const cortex = new THREE.Mesh(brainGeometry(), brainMat.mat);
  brain.add(cortex);
  const cb = new THREE.Mesh(cerebellumGeometry(), brainMat.mat);
  cb.position.set(0, -0.36, -0.55);
  brain.add(cb);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.06, 0.45, 16, 8), brainMat.mat);
  stem.position.set(0, -0.55, -0.32);
  stem.rotation.x = 0.35;
  brain.add(stem);
  brain.scale.setScalar(0.62);
  brain.position.set(-1.05, 1.0, 0);
  brain.rotation.y = 0.9;
  scene.add(brain);

  // grid plate behind the brain
  const gp: number[] = [];
  const GX = 10;
  const GY = 8;
  const W = 1.9;
  const H = 1.5;
  for (let i = 0; i <= GX; i++) gp.push(-W / 2 + (i * W) / GX, -H / 2, 0, -W / 2 + (i * W) / GX, H / 2, 0);
  for (let j = 0; j <= GY; j++) gp.push(-W / 2, -H / 2 + (j * H) / GY, 0, W / 2, -H / 2 + (j * H) / GY, 0);
  const gg = new THREE.BufferGeometry();
  gg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
  const grid = new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: 0x8c90b0 }));
  grid.position.set(-1.05, 1.0, -0.75);
  scene.add(grid);

  /* figure ----------------------------------------------------------- */
  const { root, clips } = await loadModel('xbot');
  fitHeight(root, 1.9);
  root.position.x += 1.25;
  root.rotation.y = -0.6;
  scene.add(root);
  const figMat = contourMaterial({ line: 0x2a3bff, body: 0x00010a, freq: 32, width: 0.7 });
  const meshes = meshesOf(root);
  meshes.forEach((m) => {
    m.material = figMat.mat;
    m.frustumCulled = false;
  });
  const body = meshes.find((m) => /surface/i.test(m.name)) ?? meshes[0];
  const mixer = new THREE.AnimationMixer(root);
  const clip = clips.find((c) => /run/i.test(c.name)) ?? clips[0];
  mixer.clipAction(clip).play();
  mixer.timeScale = 0.35;
  mixer.update(0);
  root.updateMatrixWorld(true);

  /* connectors ------------------------------------------------------- */
  const lines = new LineBatch(6000, { depthTest: false });
  const fills = new FillBatch(1200, { depthTest: false });
  scene.add(lines.object, fills.object);
  const r = rng(30);
  const N = 7;
  // cortex points on the front half (local z>0.1, upper half)
  const cortexPts = sampleVerts(cortex, N, r, (p) => p.x > 0.05 && p.y > -0.1);
  let bodyPts = sampleVerts(body, N, r);

  const tag = labels ? makeTag(host, '<b>PSYCHE</b><span>MAP 07</span>', 'gl-tag--hazard') : null;
  const v = new THREE.Vector3();
  const b = new THREE.Vector3();

  stage.start((t, frame, dt) => {
    mixer.update(dt);
    brain.rotation.y = 0.9 + Math.sin(Math.floor(t * 2) * 0.25) * 0.25;
    camera.position.set(0.1, 1.25, 5.4);
    camera.lookAt(0.05, 0.95, 0);
    scene.updateMatrixWorld(true);

    const cycle = frame % 60;
    if (cycle === 0) bodyPts = sampleVerts(body, N, r);
    const shown = Math.min(N, Math.floor(cycle / 3));

    lines.begin(camera, stage.size.h);
    fills.begin(camera, stage.size.h);
    for (let k = 0; k < N; k++) {
      cortex.localToWorld(v.fromBufferAttribute(cortex.geometry.getAttribute('position'), cortexPts[k]));
      vertexWorld(body, bodyPts[k], b);
      fills.color(PAL.acid).square(v, 5);
      if (k < shown) {
        lines.color(PAL.hazard).line(v, b);
        fills.color(PAL.hazard).square(b, 6);
      } else if (k === shown) {
        // the line currently "drawing"
        const f = (cycle % 3) / 3 + 0.33;
        lines.color(PAL.hazard).line(v, v.clone().lerp(b, f));
      }
    }
    // head reticle on the figure
    lines.color(PAL.cobaltHi).circle(vertexWorld(body, bodyPts[0], b), 16);
    lines.end();
    fills.end();
    tag?.at(stage, new THREE.Vector3(-1.95, 1.75, -0.75));
  });

  return {
    stage,
    dispose() {
      tag?.remove();
      mixer.stopAllAction();
      stage.dispose();
    },
  };
}
