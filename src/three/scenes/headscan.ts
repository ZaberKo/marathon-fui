/**
 * HEAD SCAN — the visual pathway.
 * A head at real proportions (SDF, eyes on the mid line) drawn as two
 * contour families — cobalt horizontal slices, orange meridians — in
 * additive x-ray so the inside reads through: wire eyeballs, the brain as
 * local contours, and ~70 optic fibres per eye running eye → chiasm →
 * LGN → occipital cortex with signals flowing back from the retina.
 * A stepped scan slice climbs the skull; the camera yaws in hard steps.
 */
import * as THREE from 'three/webgpu';
import { createStage, makeTag } from '../core';
import { contourMaterial } from '../materials';
import { LineBatch } from '../overlay';
import { brainGeometry } from '../procedural';
import { PAL, type SceneHandle, type SceneOpts } from './common';
import { BRAIN_S, H2, head2Geometry, opticPathway, wireEye } from '../../cine/models/head2';
import { flowMaterial } from '../../cine/models/flow';

export async function mountHeadscan(host: HTMLElement, { fps = 12, pixel = 1, labels = true }: SceneOpts = {}): Promise<SceneHandle> {
  const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 10);
  const stage = await createStage(host, { label: 'HEADSCAN', fps, pixel, camera });
  const { scene } = stage;
  const add = { blending: THREE.AdditiveBlending, transparent: true, depthWrite: false };

  const head = new THREE.Group();
  scene.add(head);

  // skin: horizontal slices + meridians, additive so the pathway shows through
  const skin = contourMaterial({
    space: 'local', axis: 'y', line: 0x1e2cb0, freq: 150, width: 0.8,
    line2: 0x9a4410, axis2: 'theta', freq2: 22, width2: 0.7,
    body: 0x000000, rim: 0x3a3ad0, rimWidth: 0.12, scan: PAL.acid, scanWidth: 0.0016,
  });
  Object.assign(skin.mat, add, { side: THREE.FrontSide });
  head.add(new THREE.Mesh(head2Geometry(), skin.mat));

  // brain: local contours, dim
  const bm = contourMaterial({ space: 'local', axis: 'y', line: 0x5257ff, freq: 30, width: 0.9, body: 0x000000, rim: 0x3a40d0, rimWidth: 0.3 });
  Object.assign(bm.mat, add, { side: THREE.FrontSide });
  bm.u.lineMix.value = 0.45;
  const brain = new THREE.Mesh(brainGeometry(40, 3), bm.mat);
  brain.position.copy(H2.brain);
  brain.scale.copy(BRAIN_S);
  head.add(brain);

  // the visual pathway with signals flowing from the retina back to the cortex
  const flow = flowMaterial({ base: 0.38, speed: 0.9, freq: 5 });
  head.add(new THREE.LineSegments(opticPathway(13, 70), flow.mat));
  const eyes = [-1, 1].map((sx) => {
    const e = wireEye(0xc8d0ff, PAL.acid);
    e.position.set(sx * H2.eyeX, H2.eyeY, H2.eyeZ - 0.003);
    head.add(e);
    return e;
  });

  // landmarks along the pathway (head space)
  const P = {
    eyeL: new THREE.Vector3(-H2.eyeX, H2.eyeY, H2.eyeZ),
    eyeR: new THREE.Vector3(H2.eyeX, H2.eyeY, H2.eyeZ),
    chiasm: new THREE.Vector3(0, 0.004, 0.026),
    lgnL: new THREE.Vector3(-0.027, 0.004, -0.024),
    lgnR: new THREE.Vector3(0.027, 0.004, -0.024),
    v1: new THREE.Vector3(0, 0.025, -0.084),
  };
  const callouts = [
    { p: P.eyeR, label: 'OPTIC.R', code: 'RETINA 1.2M', dx: 0.07, dy: 0.05 },
    { p: P.chiasm, label: 'CHIASM', code: 'X-OVER 53%', dx: 0.085, dy: -0.06 },
    { p: P.lgnL, label: 'LGN.L', code: 'RELAY', dx: -0.1, dy: -0.07 },
    { p: P.v1, label: 'V1', code: 'OCCIPITAL', dx: -0.09, dy: 0.08 },
  ];
  const tags = labels ? callouts.map((c) => makeTag(host, `<b>${c.label}</b><span>${c.code}</span>`)) : [];

  const hud = new LineBatch(6000, { depthTest: false });
  scene.add(hud.object);

  // camera stations (yaw, pitch) — the head turns in hard cuts between them
  const stations = [
    [0.62, 0.12],
    [1.25, 0.05],
    [2.35, 0.22],
    [-0.55, 0.1],
    [0.0, 0.32],
  ];
  const look = new THREE.Vector3(0, -0.01, 0);
  const v = new THREE.Vector3();
  const w = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  let sweep = true;

  stage.start((t0, frame) => {
    const t = Math.max(0, t0); // the first rAF can precede the stage clock
    flow.time.value = t;
    // hold each station ~3.5 s, step 3 frames of yaw into the next one (no glide)
    const hold = 3.5;
    const si = Math.floor(t / hold) % stations.length;
    const nx = stations[(si + 1) % stations.length];
    const cur = stations[si];
    const local = (t % hold) / hold;
    const k = local > 0.9 ? Math.floor(((local - 0.9) / 0.1) * 3) / 3 : 0;
    const yaw = cur[0] + (nx[0] - cur[0]) * k;
    const pitch = cur[1] + (nx[1] - cur[1]) * k;
    const R = 0.66;
    camera.position.set(Math.sin(yaw) * Math.cos(pitch) * R, look.y + Math.sin(pitch) * R, Math.cos(yaw) * Math.cos(pitch) * R);
    camera.lookAt(look);
    camera.updateMatrixWorld();
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    up.setFromMatrixColumn(camera.matrixWorld, 1);
    eyes.forEach((e) => (e.rotation.y = ((Math.floor(t * 2) % 5) - 2) * 0.04));

    // scan slice climbs in steps from chin to vertex
    skin.u.scanY.value = sweep ? -0.13 + ((frame % 60) / 60) * 0.26 : -999;

    hud.begin(camera, stage.size.h);
    // optic rings at both eyes (stepped)
    [P.eyeL, P.eyeR].forEach((e, i) => {
      const n = 3 + ((frame + i * 2) % 4);
      for (let j = 0; j < n; j++) hud.color(j === n - 1 ? PAL.acid : 0x8aa0ff, j === n - 1 ? 1 : 0.6).circle(e, 10 + j * 7, 28);
    });
    hud.color(PAL.hazard).diamond(P.chiasm, 9);
    hud.color(PAL.bone).square(P.lgnL, 6).square(P.lgnR, 6);
    hud.color(PAL.orange).brackets(P.v1, 70, 46, 8);
    // callout leaders: point → elbow → label
    callouts.forEach((c, i) => {
      w.copy(c.p).addScaledVector(right, c.dx).addScaledVector(up, c.dy);
      v.copy(w).addScaledVector(right, Math.sign(c.dx) * 0.035);
      hud.color(PAL.hazard, 0.9).line(c.p, w).line(w, v);
      tags[i]?.at(stage, v, c.dx > 0 ? 4 : -4 - (tags[i].el.offsetWidth || 0), -14);
    });
    // vertical datum through the skull
    hud.color(0x3a3f6b).dashed(v.set(0, -0.2, 0), w.set(0, 0.16, 0), 0.006, 0.006);
    hud.end();
  });

  return {
    stage,
    set(key, val) {
      if (key === 'sweep') sweep = Boolean(val);
    },
    dispose() {
      tags.forEach((t) => t.remove());
      stage.dispose();
    },
  };
}
