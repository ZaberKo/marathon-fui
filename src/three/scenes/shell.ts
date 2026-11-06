/**
 * SHELL — body rendered as an ordered-dither dot cloud (Bayer 4×4 on
 * facing ratio), joints as flat cyan plates, studded with outline
 * triangles that pop in/out in steps. A fan of curves arrives from the
 * left edge and terminates on the surface.
 */
import * as THREE from 'three/webgpu';
import { createStage } from '../core';
import { contourMaterial } from '../materials';
import { LineBatch, FillBatch } from '../overlay';
import { fitHeight, loadModel, meshesOf, sampleVerts, vertexWorld } from '../assets';
import { PAL, type SceneHandle, type SceneOpts } from './common';
import { rng } from '../../lib/util';

export async function mountShell(host: HTMLElement, { fps = 12, pixel = 1, labels = true }: SceneOpts = {}): Promise<SceneHandle> {
  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 100);
  const stage = await createStage(host, { label: 'SHELL', fps, pixel, camera });
  const { scene } = stage;

  const { root, clips } = await loadModel('xbot');
  fitHeight(root, 1.75);
  scene.add(root);

  const surf = contourMaterial({ body: 0x000000, dither: 0x2a2aff, ditherGain: 0.95, ditherScale: 2, line: 0x10127a, freq: 70, width: 0.5 });
  const joints = new THREE.MeshBasicMaterial({ color: PAL.cyan });
  const meshes = meshesOf(root);
  meshes.forEach((m) => {
    m.material = /joint/i.test(m.name) ? joints : surf.mat;
    m.frustumCulled = false;
  });
  const body = meshes.find((m) => /surface/i.test(m.name)) ?? meshes[0];

  const mixer = new THREE.AnimationMixer(root);
  const clip = clips.find((c) => /sneak/i.test(c.name)) ?? clips[0];
  mixer.clipAction(clip).play();
  mixer.update(0);
  root.updateMatrixWorld(true);

  const lines = new LineBatch(12000, { depthTest: false });
  const fills = new FillBatch(3000, { depthTest: false });
  scene.add(lines.object, fills.object);

  const r = rng(28);
  let tris = sampleVerts(body, 110, r);
  let triSize = tris.map(() => 7 + Math.floor(r() * 4) * 3);
  const fanEnds = sampleVerts(body, 11, r);

  let word: HTMLElement | null = null;
  if (labels) {
    word = document.createElement('div');
    word.className = 'gl-word';
    word.innerHTML = `<span class="gl-word__big">SHELL</span><span class="gl-word__tag t-micro">KL2 KL4</span><span class="gl-word__tag gl-word__tag--b t-micro">KL2 KL4</span>`;
    host.appendChild(word);
  }

  const v = new THREE.Vector3();
  const cam = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const center = new THREE.Vector3(0, 0.8, 0);

  stage.start((t, frame, dt) => {
    mixer.update(dt);
    const a = 0.9 + Math.floor(t * 1.2) * 0.05;
    camera.position.set(Math.sin(a) * 5.2, 1.3, Math.cos(a) * 5.2);
    camera.lookAt(0.15, 0.75, 0);
    camera.updateMatrixWorld();
    root.updateMatrixWorld(true);
    cam.copy(camera.position);
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    up.setFromMatrixColumn(camera.matrixWorld, 1);

    // re-seed a slice of the triangles every few steps (stepped pop-in)
    if (frame % 3 === 0) {
      for (let k = 0; k < 8; k++) {
        const j = Math.floor(r() * tris.length);
        tris[j] = sampleVerts(body, 1, r)[0];
        triSize[j] = 7 + Math.floor(r() * 4) * 3;
      }
    }
    if (frame % 120 === 0) {
      tris = sampleVerts(body, 110, r);
      triSize = tris.map(() => 7 + Math.floor(r() * 4) * 3);
    }

    lines.begin(camera, stage.size.h);
    fills.begin(camera, stage.size.h);
    const toCam = new THREE.Vector3();
    tris.forEach((i, k) => {
      vertexWorld(body, i, v);
      toCam.subVectors(cam, v).normalize();
      const out = v.clone().sub(center).normalize();
      if (out.dot(toCam) < -0.05) return;
      lines.color(k % 9 === 0 ? PAL.cyan : PAL.acid).tri(v, triSize[k], false);
    });

    // curve fan from the left edge
    const left = center.clone().addScaledVector(right, -2.4);
    fanEnds.forEach((i, k) => {
      vertexWorld(body, i, v);
      const start = left.clone().addScaledVector(up, 1.1 - k * 0.2);
      const ctrl = start.clone().addScaledVector(right, 1.3).addScaledVector(up, -0.1 * (k - 5));
      const grow = Math.min(1, ((frame + k * 3) % 48) / 12);
      lines.color(0x9cff6a, 0.85).bezier(start, ctrl, v, 28, grow);
      if (grow >= 1) fills.color(PAL.lime).square(v, 4);
      fills.color(PAL.lime).square(start, 3);
    });
    lines.end();
    fills.end();
  });

  return {
    stage,
    dispose() {
      word?.remove();
      mixer.stopAllAction();
      stage.dispose();
    },
  };
}
