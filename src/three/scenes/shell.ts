/**
 * SHELL — the body as flat colour. Three world-lit tones with hard steps
 * (no gradients, no dither) and a hard black edge at grazing angles; stencil
 * decals ride the bones. On the beat the field floods cobalt and the shell
 * inverts to a black silhouette. A fan of connector curves arrives
 * from the left and terminates on the surface; outline triangles pop in
 * small stepped groups.
 */
import * as THREE from 'three/webgpu';
import { abs, dot, float, mix, normalView, normalWorld, step, uniform, vec3 } from 'three/tsl';
import { createStage } from '../core';
import { LineBatch, FillBatch } from '../overlay';
import { fitHeight, sampleVerts, vertexWorld } from '../assets';
import { PAL, type SceneHandle, type SceneOpts } from './common';
import { rng } from '../../lib/util';
import { makeBody } from '../../cine/models/body';
import { addStickers } from '../../cine/models/stickers';

const v3 = (hex: number) => {
  const c = new THREE.Color(hex);
  return new THREE.Vector3(c.r, c.g, c.b);
};

/** three flat tones by a world key light + a hard edge by facing ratio */
function celShell() {
  const L = uniform(new THREE.Vector3(-0.45, 0.7, 0.55).normalize());
  const u = { lit: uniform(v3(0x5a60ff)), mid: uniform(v3(0x2424ff)), shade: uniform(v3(0x0c0e5a)) };
  const d = dot(normalWorld, L);
  let c = mix(vec3(u.shade), vec3(u.mid), step(float(0.0), d));
  c = mix(c, vec3(u.lit), step(float(0.55), d));
  c = mix(vec3(0), c, step(float(0.26), abs(normalView.z)));
  const mat = new THREE.MeshBasicNodeMaterial();
  mat.colorNode = c;
  const set = (p: { lit: number; mid: number; shade: number }) => {
    u.lit.value.copy(v3(p.lit));
    u.mid.value.copy(v3(p.mid));
    u.shade.value.copy(v3(p.shade));
  };
  return { mat, set };
}

const NORMAL = { lit: 0x5a60ff, mid: 0x2424ff, shade: 0x0c0e5a };
const FLOOD = { lit: 0x16163a, mid: 0x07071c, shade: 0x000000 };

export async function mountShell(host: HTMLElement, { fps = 12, pixel = 1, labels = true }: SceneOpts = {}): Promise<SceneHandle> {
  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 100);
  const stage = await createStage(host, { label: 'SHELL', fps, pixel, camera });
  const { scene, renderer } = stage;

  const cel = celShell();
  const body = await makeBody('armor', cel.mat);
  body.mesh.name = 'surface';
  {
    const J = (n: string) => body.joint(n).toArray() as [number, number, number];
    const sp = J('Spine2');
    const ra = J('RightArm');
    const la = J('LeftArm');
    const lul = J('LeftUpLeg');
    const rl = J('RightLeg');
    const hd = J('Head');
    addStickers(body, [
      { at: [sp[0], sp[1] + 0.03, sp[2] + 0.2], w: 0.13, h: 0.05, kind: 'label', text: 'SHELL 07', color: '#ececec' },
      { at: [sp[0] + 0.1, sp[1] - 0.1, sp[2] + 0.18], w: 0.08, h: 0.04, kind: 'stripes', color: '#ffe000' },
      { at: [ra[0] - 0.12, ra[1] + 0.06, ra[2]], w: 0.08, h: 0.06, kind: 'num', text: '07', color: '#7dff1a' },
      { at: [la[0] + 0.12, la[1] + 0.06, la[2]], w: 0.07, h: 0.05, kind: 'chevron', color: '#ececec' },
      { at: [lul[0] + 0.03, lul[1] - 0.22, lul[2] + 0.1], w: 0.05, h: 0.1, kind: 'barcode', color: '#ececec', rot: Math.PI / 2 },
      { at: [rl[0], rl[1] + 0.12, rl[2] + 0.08], w: 0.05, h: 0.05, kind: 'cross', color: '#7dff1a' },
      { at: [hd[0], hd[1] + 0.1, hd[2] + 0.13], w: 0.07, h: 0.025, kind: 'chevron', color: '#38f5d4' },
    ]);
  }
  fitHeight(body.root, 1.75);
  scene.add(body.root);
  const clip = body.clips.find((c) => c.name === 'walk') ?? body.clips[0];
  body.mixer.clipAction(clip).play();
  body.mixer.update(0);
  body.root.updateMatrixWorld(true);
  const mesh = body.mesh;

  const lines = new LineBatch(8000, { depthTest: false });
  const fills = new FillBatch(2000, { depthTest: false });
  scene.add(lines.object, fills.object);

  const r = rng(28);
  // triangles live in small groups that pop in/out together
  const groups = Array.from({ length: 4 }, () => ({ v: sampleVerts(mesh, 5, r), born: 0 }));
  const fanEnds = sampleVerts(mesh, 9, r);

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
  const toCam = new THREE.Vector3();
  const center = new THREE.Vector3(0, 0.85, 0);
  let flooded = false;

  stage.start((t0, frame, dt) => {
    const t = Math.max(0, t0);
    body.mixer.update(dt);
    const a = 0.35 + (Math.floor(t * 1.2) % 24) * 0.05;
    camera.position.set(Math.sin(a) * 5.2, 1.3, Math.cos(a) * 5.2);
    camera.lookAt(0.15, 0.8, 0);
    camera.updateMatrixWorld();
    body.root.updateMatrixWorld(true);
    cam.copy(camera.position);
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    up.setFromMatrixColumn(camera.matrixWorld, 1);

    // flood beat: 1.2 s of cobalt field every 5 s, cut in and out
    const flood = t % 5 > 3.8;
    if (flood !== flooded) {
      flooded = flood;
      cel.set(flood ? FLOOD : NORMAL);
      renderer.setClearColor(flood ? PAL.cobalt : 0x000000, 1);
      word?.classList.toggle('is-ink', flood);
    }

    // one triangle group re-seeds every 9 frames
    if (frame % 9 === 0) {
      const g = groups[(frame / 9) % groups.length];
      g.v = sampleVerts(mesh, 5, r);
      g.born = frame;
    }

    lines.begin(camera, stage.size.h);
    fills.begin(camera, stage.size.h);
    groups.forEach((g, gi) => {
      if (frame - g.born < 2 && frame > 2) return; // a 2-frame gap before a group appears
      g.v.forEach((i, k) => {
        vertexWorld(mesh, i, v);
        toCam.subVectors(cam, v).normalize();
        if (v.clone().sub(center).setY(0).normalize().dot(toCam) < -0.05) return;
        lines.color(flood ? PAL.bone : gi === 0 ? PAL.cyan : PAL.acid).tri(v, 10 + ((k + gi) % 3) * 4, k % 2 === 0);
      });
    });

    // connector fan from the left edge
    const left = center.clone().addScaledVector(right, -2.4);
    fanEnds.forEach((i, k) => {
      vertexWorld(mesh, i, v);
      const start = left.clone().addScaledVector(up, 1.0 - k * 0.22);
      const ctrl = start.clone().addScaledVector(right, 1.3).addScaledVector(up, -0.1 * (k - 4));
      const grow = Math.min(1, ((frame + k * 3) % 48) / 12);
      lines.color(flood ? PAL.bone : 0x9cff6a, 0.9).bezier(start, ctrl, v, 28, grow);
      if (grow >= 1) fills.color(flood ? PAL.bone : PAL.lime).square(v, 4);
      fills.color(flood ? PAL.bone : PAL.lime).square(start, 3);
    });
    lines.end();
    fills.end();
  });

  return {
    stage,
    dispose() {
      word?.remove();
      body.mixer.stopAllAction();
      stage.dispose();
    },
  };
}
