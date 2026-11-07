/**
 * SUBJECT — models rendered as flat-colour noise.
 * The body is rendered to a low-resolution mask and shown as solid cobalt
 * blocks (5 px cells) that re-roll in steps: some cells drop out, some flip to
 * a second tone, so the figure fizzes but never blurs. Behind it a huge head
 * is drawn only as horizontal dash rows of the same mask technique. A green
 * contour brain floats over the crown; outline triangles shed off the back,
 * lime shards flake from the shoulder; a SUBJECT IS A / RUNNER lockup types in.
 * Everything is a pure colour — the noise is in *which* cells are on.
 */
import * as THREE from 'three/webgpu';
import { float, floor, fract, hash, max, mix, pass, screenSize, screenUV, step, uniform, vec2, vec3, vec4 } from 'three/tsl';
import { createStage } from '../core';
import { contourMaterial } from '../materials';
import { FillBatch, LineBatch } from '../overlay';
import { brainGeometry } from '../procedural';
import { fitHeight, sampleVerts, vertexWorld } from '../assets';
import { PAL, type SceneHandle, type SceneOpts } from './common';
import { rng } from '../../lib/util';
import { makeBody } from '../../cine/models/body';
import { head2Geometry } from '../../cine/models/head2';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type N = any;
const col3 = (hex: number) => {
  const c = new THREE.Color(hex);
  return vec3(c.r, c.g, c.b);
};

export async function mountSubject(host: HTMLElement, { fps = 12, pixel = 1, labels = true }: SceneOpts = {}): Promise<SceneHandle> {
  const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 100);
  const stage = await createStage(host, { label: 'SUBJECT', fps, pixel, camera });
  const { scene, renderer } = stage;
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // mask scenes: plain white silhouettes on black
  const bodyScene = new THREE.Scene();
  const body = await makeBody('armor', white);
  fitHeight(body.root, 1.8);
  body.root.position.x = 0.75;
  body.root.rotation.y = -0.55;
  bodyScene.add(body.root);
  const clip = body.clips.find((c) => c.name === 'walk') ?? body.clips[0];
  body.mixer.clipAction(clip).play();

  const headScene = new THREE.Scene();
  const bigHead = new THREE.Mesh(head2Geometry(), white);
  bigHead.scale.setScalar(13);
  bigHead.position.set(-1.0, 1.55, -3.2);
  bigHead.rotation.y = 0.5;
  headScene.add(bigHead);

  // crisp layer: brain contour over the crown + vector marks
  const bm = contourMaterial({ space: 'local', axis: 'y', line: 0x3cff5a, freq: 22, width: 0.9, body: 0x000000, line2: 0x2a9a3a, axis2: 'x', freq2: 14, width2: 0.7 });
  const brain = new THREE.Mesh(brainGeometry(36, 3), bm.mat);
  brain.scale.set(0.16, 0.13, 0.19);
  scene.add(brain);
  const lines = new LineBatch(6000, { depthTest: false });
  const fills = new FillBatch(3000, { depthTest: false });
  scene.add(lines.object, fills.object);

  /* composite: noise blocks for the body, dash rows for the head, crisp layer on top */
  const seed = uniform(0);
  const seedSlow = uniform(0);
  const pBody = pass(bodyScene, camera);
  const pHead = pass(headScene, camera);
  const pMain = pass(scene, camera);
  pBody.setResolutionScale(1 / 5);
  pHead.setResolutionScale(1 / 3);
  const tBody: N = pBody.getTextureNode();
  const tHead: N = pHead.getTextureNode();
  const tMain: N = pMain.getTextureNode();

  // body: 5 px cells, sampled at the cell centre (nearest), re-rolled per step
  const resB: N = screenSize.mul(1 / 5);
  const cB: N = floor(screenUV.mul(resB));
  const mB: N = tBody.sample(cB.add(0.5).div(resB)).r;
  const nB: N = hash(cB.x.add(cB.y.mul(157.0)).add(seed.mul(13.7)));
  const nB2: N = hash(cB.x.mul(3.1).add(cB.y.mul(71.0)).add(seedSlow.mul(5.3)));
  const onB: N = step(float(0.5), mB).mul(step(float(0.16), nB));
  const toneB: N = mix(col3(0x2424ff), col3(0x5a60ff), step(float(0.82), nB2));

  // head: 3 px wide × 6 px tall cells, drawn as dashes 2 px high, broken into runs
  const resH: N = screenSize.mul(vec2(1 / 3, 1 / 6));
  const cH: N = floor(screenUV.mul(resH));
  const mH: N = tHead.sample(cH.add(0.5).div(resH)).r;
  const row: N = step(fract(screenUV.y.mul(resH.y)), float(0.34));
  const run: N = step(float(0.3), hash(floor(cH.x.div(4)).add(cH.y.mul(91.0)).add(seedSlow.mul(3.0))));
  const onH: N = step(float(0.5), mH).mul(row).mul(run);

  let c: N = mix(vec3(0, 0, 0), col3(0x1414b8), onH);
  c = mix(c, toneB, onB);
  c = max(c, tMain.rgb);
  const pipe = new THREE.RenderPipeline(renderer, vec4(c, 1));
  stage.setRender(() => pipe.render());

  /* vector layer state */
  const r = rng(41);
  type Shed = { i: number; born: number; dir: THREE.Vector3; size: number };
  let shed: Shed[] = [];
  const shards = Array.from({ length: 6 }, () => ({ off: new THREE.Vector3(r() * 0.5, r() * 0.4 - 0.1, r() * 0.3), size: 10 + r() * 14, rot: r() * 6 }));
  const crosses = Array.from({ length: 7 }, () => new THREE.Vector3(-2 + r() * 4, 0.3 + r() * 1.8, -0.5 + r()));

  let word: HTMLElement | null = null;
  if (labels) {
    word = document.createElement('div');
    word.className = 'gl-subject';
    word.innerHTML = '<span class="gl-subject__pre">Subject is a</span><b class="gl-subject__word"></b>';
    host.appendChild(word);
  }
  const wordEl = word?.querySelector<HTMLElement>('.gl-subject__word');

  const v = new THREE.Vector3();
  const w = new THREE.Vector3();
  const head = new THREE.Vector3();
  const shoulder = new THREE.Vector3();
  const right = new THREE.Vector3();

  stage.start((t0, frame, dt) => {
    const t = Math.max(0, t0);
    body.mixer.update(dt);
    body.root.updateMatrixWorld(true);
    seed.value = frame;
    seedSlow.value = Math.floor(frame / 3);

    const a = 0.25 + (Math.floor(t / 2.5) % 4) * 0.06;
    camera.position.set(Math.sin(a) * 6.2, 1.25, Math.cos(a) * 6.2);
    camera.lookAt(0, 1.0, 0);
    camera.updateMatrixWorld();
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    bigHead.rotation.y = 0.5 + (Math.floor(t / 2.5) % 2) * 0.04;

    body.joint('Head', head);
    body.joint('RightArm', shoulder);
    brain.position.copy(head).add(new THREE.Vector3(0, 0.27, 0));
    brain.rotation.y = Math.floor(t * 2) * 0.15;
    brain.visible = frame % 23 !== 0;

    // shed triangles: born on the surface, drift back and out in steps
    if (frame % 2 === 0) {
      for (const i of sampleVerts(body.mesh, 3, r)) shed.push({ i, born: frame, dir: new THREE.Vector3(0.5 + r() * 0.8, (r() - 0.4) * 0.5, -0.3 - r() * 0.4), size: 6 + Math.floor(r() * 3) * 3 });
    }
    shed = shed.filter((s) => frame - s.born < 20);

    lines.begin(camera, stage.size.h);
    fills.begin(camera, stage.size.h);
    shed.forEach((s, k) => {
      vertexWorld(body.mesh, s.i, v);
      v.addScaledVector(s.dir, ((frame - s.born) >> 1) * 0.06);
      lines.color(k % 7 === 0 ? PAL.bone : 0x5a60ff).tri(v, s.size, k % 2 === 0, (k % 3) * 0.6);
    });
    shards.forEach((s, k) => {
      if ((frame + k * 3) % 13 < 2) return;
      v.copy(shoulder).add(s.off);
      fills.color(PAL.lime).tri(v, s.size, k % 2 === 0);
    });
    crosses.forEach((p) => lines.color(0x8a90c8).cross(p, 9));
    lines.end();
    fills.end();

    // lockup: RUNNER types in over 6 steps, holds, clears
    if (wordEl) {
      const cyc = frame % 96;
      const n = cyc < 8 ? 0 : Math.min(6, cyc - 8);
      const txt = 'RUNNER'.slice(0, n);
      if (wordEl.textContent !== txt) wordEl.textContent = txt;
      wordEl.style.visibility = n ? 'visible' : 'hidden';
    }
    w.set(0, 0, 0);
  });

  return {
    stage,
    dispose() {
      word?.remove();
      body.mixer.stopAllAction();
      stage.setRender(null);
      pipe.dispose();
      stage.dispose();
    },
  };
}
