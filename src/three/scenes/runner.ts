/**
 * CONTOUR RUNNER — armoured figure described only by 1px world-Y contour
 * lines on a black occluding body (every fifth an index contour), a
 * silhouette rim and a sweeping scan band. Machine vision rides on top:
 * a tracked pose skeleton (joints + bones from the rig) and leader lines
 * to DOM labels. A floor dial with a precision scale turns with the stride.
 */
import * as THREE from 'three/webgpu';
import { createStage, cornerBox, makeTag, ringLine } from '../core';
import { contourMaterial } from '../materials';
import { FillBatch, LineBatch } from '../overlay';
import { fitHeight } from '../assets';
import { PAL, type SceneHandle } from './common';
import { makeBody } from '../../cine/models/body';

const BONES: [string, string][] = [
  ['Head', 'Neck'], ['Neck', 'Spine2'], ['Spine2', 'Spine'], ['Spine', 'Hips'],
  ['Neck', 'LeftArm'], ['LeftArm', 'LeftForeArm'], ['LeftForeArm', 'LeftHand'],
  ['Neck', 'RightArm'], ['RightArm', 'RightForeArm'], ['RightForeArm', 'RightHand'],
  ['Hips', 'LeftUpLeg'], ['LeftUpLeg', 'LeftLeg'], ['LeftLeg', 'LeftFoot'],
  ['Hips', 'RightUpLeg'], ['RightUpLeg', 'RightLeg'], ['RightLeg', 'RightFoot'],
];
const JOINTS = [...new Set(BONES.flat())];

export async function mountRunner(host: HTMLElement, { fps = 12, pixel = 1, labels = true } = {}): Promise<SceneHandle> {
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  const stage = await createStage(host, { label: 'RUNNER', fps, pixel, camera });
  const { scene } = stage;

  // contours: fine lines + index contours (5×) in cobalt-hi, rim, scan band
  const C = contourMaterial({
    line: 0x5a66b8, body: 0x01020a, freq: 30, width: 0.6,
    line2: 0xececec, axis2: 'y', freq2: 6, width2: 0.9,
    rim: PAL.cobalt, rimWidth: 0.3, scan: PAL.acid, scanWidth: 0.012,
  });
  const body = await makeBody('armor', C.mat);
  fitHeight(body.root, 1.8);
  scene.add(body.root);
  const clip = body.clips.find((c) => c.name === 'run') ?? body.clips[0];
  body.mixer.clipAction(clip).play();

  // drafting environment: sparse grid, floor dial, corner box
  const grid = new THREE.GridHelper(10, 20, 0x0a0c3a, 0x0a0c3a);
  scene.add(grid);
  const dial = new THREE.Group();
  dial.add(ringLine(1.05, PAL.cobaltLo, 128, 0.002), ringLine(0.7, PAL.acid, 128, 0.002), ringLine(0.45, PAL.cobaltLo, 96, 0.002));
  {
    // precision scale: 120 ticks, every 10th long
    const p: number[] = [];
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * Math.PI * 2;
      const r0 = 1.05;
      const r1 = i % 10 === 0 ? 1.16 : 1.1;
      p.push(Math.cos(a) * r0, 0.002, Math.sin(a) * r0, Math.cos(a) * r1, 0.002, Math.sin(a) * r1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    dial.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x5257ff })));
  }
  scene.add(dial);
  const box = cornerBox(new THREE.Vector3(1.1, 1.95, 1.1), PAL.bone, 0.09);
  box.position.y = 0.975;
  scene.add(box);

  // overlay
  const marks = new LineBatch(8000, { depthTest: false });
  const fills = new FillBatch(2000, { depthTest: false });
  scene.add(marks.object, fills.object);

  const leaders = [
    { j: 'Head', dy: 0.16, label: 'OPTIC.ARRAY', code: 'L/R' },
    { j: 'Spine2', dy: 0.1, label: 'SHELL.INTEGRITY', code: '097%' },
    { j: 'LeftLeg', dy: 0.12, label: 'MOTOR.CORTEX', code: 'SYNC' },
  ];
  const tags = labels ? leaders.map((l) => makeTag(host, `<b>${l.label}</b><span>${l.code}</span>`)) : [];

  const J = new Map<string, THREE.Vector3>(JOINTS.map((n) => [n, new THREE.Vector3()]));
  const w = new THREE.Vector3();
  const right = new THREE.Vector3();
  let speed = 1;
  let orbit = true;

  stage.start((t0, frame, dt) => {
    const t = Math.max(0, t0);
    body.mixer.update(dt * speed);
    body.root.updateMatrixWorld(true);

    // camera orbits in visible jumps
    const a = orbit ? Math.floor(t * 1.5) * 0.12 + 1.2 : 1.2;
    camera.position.set(Math.sin(a) * 5.6, 1.45, Math.cos(a) * 5.6);
    camera.lookAt(0, 0.98, 0);
    camera.updateMatrixWorld();
    right.setFromMatrixColumn(camera.matrixWorld, 0);

    C.u.scanY.value = ((frame * 0.035) % 1) * 2.1 - 0.1;
    C.u.offset.value = frame % 37 === 0 ? 0.5 : 0;
    dial.rotation.y = -Math.floor(t * 4) * ((Math.PI * 2) / 120) * 2;

    JOINTS.forEach((n) => body.joint(n, J.get(n)!));
    // the Head bone sits at the skull base: move the tracked point to the face centre
    const hd = J.get('Head')!;
    hd.addScaledVector(w.subVectors(hd, J.get('Neck')!).normalize(), 0.09);

    marks.begin(camera, stage.size.h);
    fills.begin(camera, stage.size.h);
    // pose skeleton: bones as hairlines, joints as squares, head as a ring
    marks.color(PAL.hazard, 0.85);
    BONES.forEach(([a2, b2]) => marks.line(J.get(a2)!, J.get(b2)!));
    JOINTS.forEach((n, i) => {
      const p = J.get(n)!;
      if (n === 'Head') marks.color(PAL.hazard).circle(p, 11, 18);
      else if (/Hand|Foot/.test(n)) fills.color(PAL.hazard).square(p, 5);
      else marks.color(i % 4 === 0 ? PAL.bone : PAL.hazard).square(p, 6);
    });

    // leaders to labels
    leaders.forEach((l, k) => {
      const p = J.get(l.j)!;
      const elbow = p.clone().addScaledVector(right, 0.38 + k * 0.08).add(new THREE.Vector3(0, l.dy, 0));
      const end = elbow.clone().addScaledVector(right, 0.42);
      marks.color(PAL.bone).circle(p, 7).line(p, elbow).line(elbow, end);
      tags[k]?.at(stage, end, 4, -14);
    });
    marks.end();
    fills.end();
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
      body.mixer.stopAllAction();
      stage.dispose();
    },
  };
}
