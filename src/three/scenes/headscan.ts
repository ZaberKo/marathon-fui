/**
 * HEAD SCAN — scanned head as a two-family contour grid (orange horizontal,
 * cobalt vertical) on a black occluder. Cranium covered with node circles,
 * diamonds at landmarks, Manhattan "circuit" traces inside, concentric
 * optic rings at the eyes, stepped yaw sweeps.
 */
import * as THREE from 'three/webgpu';
import { createStage, makeTag } from '../core';
import { contourMaterial } from '../materials';
import { FillBatch, LineBatch } from '../overlay';
import { loadModel, meshesOf, sampleVerts } from '../assets';
import { PAL, type SceneHandle, type SceneOpts } from './common';
import { rng } from '../../lib/util';

export async function mountHeadscan(host: HTMLElement, { fps = 12, pixel = 1, labels = true }: SceneOpts = {}): Promise<SceneHandle> {
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const stage = await createStage(host, { label: 'HEADSCAN', fps, pixel, camera });
  const { scene } = stage;

  const { root } = await loadModel('head');
  const mesh = meshesOf(root)[0];
  // normalise: centre + unit-ish height, work in the mesh's local space
  mesh.geometry = mesh.geometry.clone();
  mesh.geometry.computeBoundingBox();
  const bb0 = mesh.geometry.boundingBox!;
  const c0 = bb0.getCenter(new THREE.Vector3());
  const s0 = 2 / (bb0.max.y - bb0.min.y);
  mesh.geometry.translate(-c0.x, -c0.y, -c0.z);
  mesh.geometry.scale(s0, s0, s0);
  mesh.geometry.computeBoundingBox();
  mesh.geometry.computeVertexNormals();
  const bb = mesh.geometry.boundingBox!;
  const head = new THREE.Group();
  mesh.position.set(0, 0, 0);
  mesh.rotation.set(0, 0, 0);
  mesh.scale.set(1, 1, 1);
  head.add(mesh);
  scene.add(head);

  const C = contourMaterial({
    space: 'local',
    line: PAL.orange, freq: 13, width: 0.6, axis: 'y',
    line2: 0x3344ff, freq2: 11, width2: 0.6, axis2: 'x',
    body: 0x00000a, rim: 0x5257ff, rimWidth: 0.2,
  });
  mesh.material = C.mat;

  const r = rng(95);
  const pos = mesh.geometry.getAttribute('position');
  const nrm = mesh.geometry.getAttribute('normal');
  const topY = bb.max.y;
  const nodes = sampleVerts(mesh, 80, r, (p) => p.y > topY - 0.32 && p.z > -0.05);
  const diamonds = sampleVerts(mesh, 14, r, (p) => p.z > 0.1 && p.y > topY - 0.95);

  // eyes: measured from the mesh at eye height (bbox includes shoulders)
  const eyeY = topY - 0.57;
  let half = 0;
  for (let i = 0; i < pos.count; i++) if (Math.abs(pos.getY(i) - eyeY) < 0.03) half = Math.max(half, Math.abs(pos.getX(i)));
  const eyeX = half * 0.42;
  let front = -Infinity;
  for (let i = 0; i < pos.count; i++)
    if (Math.abs(pos.getY(i) - eyeY) < 0.04 && Math.abs(Math.abs(pos.getX(i)) - eyeX) < 0.04) front = Math.max(front, pos.getZ(i));
  const eyes = [new THREE.Vector3(-eyeX, eyeY, front - 0.03), new THREE.Vector3(eyeX, eyeY, front - 0.03)];

  // internal Manhattan traces (head-local)
  const traces: THREE.Vector3[][] = [];
  for (let k = 0; k < 18; k++) {
    let x = (r() - 0.5) * 0.5;
    let y = topY - 0.12;
    const z = (r() - 0.3) * 0.5;
    const path = [new THREE.Vector3(x, y, z)];
    const steps = 2 + Math.floor(r() * 3);
    for (let s = 0; s < steps; s++) {
      y -= 0.05 + r() * 0.12;
      path.push(new THREE.Vector3(x, y, z));
      x = Math.max(-0.3, Math.min(0.3, x + (r() - 0.5) * 0.2));
      path.push(new THREE.Vector3(x, y, z));
    }
    traces.push(path);
  }

  const lines = new LineBatch(14000, { depthTest: false });
  const fills = new FillBatch(2000, { depthTest: false });
  scene.add(lines.object, fills.object);

  const tagL = labels ? makeTag(host, '<b>OPTIC L</b><span>03</span>') : null;
  const tagR = labels ? makeTag(host, '<b>OPTIC R</b><span>03</span>') : null;
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  const toCam = new THREE.Vector3();
  const nm = new THREE.Matrix3();
  const center = new THREE.Vector3(0, bb.max.y - 0.62, 0);

  stage.start((t, frame) => {
    // stepped yaw: hold, jump, hold
    const seq = [0, 0, -0.5, -0.5, -0.85, 0, 0.45, 0.45];
    head.rotation.y = seq[Math.floor(t / 1.2) % seq.length];
    camera.position.set(0, center.y + 0.15, 4.1);
    camera.lookAt(center);
    scene.updateMatrixWorld(true);
    nm.getNormalMatrix(mesh.matrixWorld);

    lines.begin(camera, stage.size.h);
    fills.begin(camera, stage.size.h);
    const vis = (i: number) => {
      mesh.localToWorld(v.fromBufferAttribute(pos, i));
      n.fromBufferAttribute(nrm, i).applyMatrix3(nm).normalize();
      toCam.subVectors(camera.position, v).normalize();
      return n.dot(toCam) > 0.05;
    };
    // circuit traces (inside, faint)
    traces.forEach((path, k) => {
      const pts = path.map((p) => mesh.localToWorld(p.clone()));
      lines.color(k % 5 === 0 ? PAL.crimson : PAL.cobalt, k % 5 === 0 ? 0.55 : 0.7).polyline(pts);
    });
    // cranium nodes
    nodes.forEach((i, k) => {
      if (!vis(i)) return;
      const blink = (frame + k * 7) % 23 === 0;
      lines.color(blink ? PAL.bone : 0xffd28a).circle(v, k % 4 === 0 ? 9 : 6, 10);
      if (k % 3 === 0) fills.color(0xffd28a).square(v, 2);
    });
    diamonds.forEach((i) => {
      if (!vis(i)) return;
      lines.color(PAL.hazard).diamond(v, 9);
    });
    // optic rings (rotate in steps)
    eyes.forEach((e, k) => {
      const w = mesh.localToWorld(e.clone());
      lines.color(PAL.cobaltHi).circle(w, 34, 24).circle(w, 24, 20);
      lines.color(PAL.bone).circle(w, 14, 16).circle(w, 7, 12);
      const a = Math.floor(t * 6) * 0.6 * (k ? -1 : 1);
      const p1 = w.clone().add(new THREE.Vector3(Math.cos(a), Math.sin(a), 0).multiplyScalar(lines.px(w, 17)));
      fills.color(PAL.acid).square(p1, 4);
      (k ? tagR : tagL)?.at(stage, w, k ? 26 : -86, -30);
    });
    // chin triangle
    const chin = mesh.localToWorld(new THREE.Vector3(0, bb.min.y + 0.12, bb.max.z * 0.4));
    lines.color(PAL.bone).tri(chin, 20, false);
    lines.end();
    fills.end();
  });

  return {
    stage,
    dispose() {
      tagL?.remove();
      tagR?.remove();
      stage.dispose();
    },
  };
}
