/**
 * 0:38–0:48 — definition: subject is a runner; a mind without a body (time
 * echoes); leased to a printed shell (point-cloud mind behind a solid shell).
 */
import * as THREE from 'three/webgpu';
import type { ShotDef } from '../engine';
import { hash } from '../engine';
import { C, F, checker, microRows, rect, ring, text } from '../draw';
import { backdrop, PAL_BLUE } from '../backdrop';
import { makeBody, POSES, type Body } from '../models/body';
import { brainGeometry } from '../models/anatomy';
import { toonLit } from '../models/hard';
import { contourMaterial } from '../../three/materials';
import { glitchToon, screenDots, screenPixels } from '../mats';
import { addStickers } from '../models/stickers';
import { ANCHORS } from './cues';
import { barLabel, cutGlitch, easeInOutCubic, persp, pixelCluster, px, smooth, span, typeOn, vlabel } from './kit';

export const s4: ShotDef[] = [
  {
    id: 'S08',
    t0: ANCHORS.runner,
    t1: 41.1,
    title: 'Subject is a runner',
    note: 'Definition card on the strongest beat of the lift: a dithered brain and a pixel-shaded runner walking in place, the term knocked out of a lime bar.',
    build: async (k) => {
      const scene = new THREE.Scene();
      const cam = persp(26);
      const body = await makeBody('armor', screenPixels({ color: 0x1a24e0, cell: 6, thresh: 0.2, bg: 0x02031a }).mat);
      {
        const J = (n: string) => {
          const q = body.joint(n);
          return [q.x, q.y, q.z] as [number, number, number];
        };
        const sp2 = J('Spine2');
        const la = J('LeftArm');
        const lfa = J('LeftForeArm');
        const rul = J('RightUpLeg');
        const ll = J('LeftLeg');
        const hd = J('Head');
        addStickers(body, [
          { at: [sp2[0] + 0.06, sp2[1] + 0.02, sp2[2] + 0.2], w: 0.08, h: 0.05, kind: 'num', text: '07', color: '#cde404' },
          { at: [la[0] + 0.12, la[1] + 0.06, la[2]], w: 0.07, h: 0.04, kind: 'stripes', color: '#cde404' },
          { at: [lfa[0] + 0.12, lfa[1], lfa[2] + 0.05], w: 0.08, h: 0.03, kind: 'barcode', color: '#cde404' },
          { at: [rul[0] - 0.03, rul[1] - 0.2, rul[2] + 0.1], w: 0.05, h: 0.09, kind: 'label', text: 'RN', color: '#cde404', rot: Math.PI / 2 },
          { at: [ll[0], ll[1] + 0.02, ll[2] + 0.07], w: 0.045, h: 0.045, kind: 'cross', color: '#cde404' },
          { at: [hd[0], hd[1] + 0.1, hd[2] + 0.13], w: 0.08, h: 0.03, kind: 'chevron', color: '#2ee866' },
        ]);
      }
      body.root.position.set(1.35, 0, 0);
      scene.add(body.root);
      const brain = new THREE.Mesh(brainGeometry(40, 4), screenDots({ color: 0x3ae830, cell: 5, gain: 1.4, bg: 0x02031a }).mat);
      brain.scale.setScalar(0.42);
      brain.position.set(-1.25, 1.55, 0);
      scene.add(brain);
      return {
        draw(f) {
          const { bg, fg, t } = f;
          for (let i = 0; i < 40; i++) {
            const y = 40 + i * 26;
            if (hash(i, 2) < 0.45) continue;
            const x = (hash(i, 3) * 400 - t * (60 + hash(i, 9) * 120)) % 1920;
            rect(bg, x, y, 900 + hash(i, 4) * 900, 7 + (i % 3) * 3, i % 4 === 0 ? '#1a24e0' : '#0c14a0');
          }
          body.clip('walk', t * 0.9 + 0.3);
          body.root.rotation.y = -0.35 - t * 0.12;
          brain.rotation.y = t * 0.5;
          cam.position.set(0, 1.25, 5.3 - t * 0.12);
          cam.lookAt(0.15, 1.1, 0);
          cam.updateMatrixWorld();
          f.three = { scene, camera: cam };
          const w = Math.min(1, t / 0.18);
          fg.save();
          fg.beginPath();
          fg.rect(365, 520, 900 * w, 200);
          fg.clip();
          barLabel(fg, 'RUNNER', 365, 690, 150, '#2fd62a', C.white, 14);
          fg.restore();
          vlabel(fg, 'SUBJECT IS A', 330, 560, 26, '#2fd62a', { rot: -Math.PI / 2 });
          text(fg, 'V', 1640, 560, { size: 48, weight: 800, color: C.white });
          text(fg, 'V', 1855, 560, { size: 48, weight: 800, color: C.white });
          vlabel(fg, 'PASS', 1870, 760, 26, C.white, { weight: 500 });
          cutGlitch(f, t, 0.12, ['#000', '#2fd62a', C.blue], 12);
          void k;
        },
      };
    },
  },
  /* ---------------------------------------------------------------- */
  {
    id: 'S09',
    t0: 41.1,
    t1: 44.8,
    title: 'A mind without a body',
    note: 'A contour runner sprints while delayed copies trail behind it — the body as a sequence of time slices, the mind as the only constant.',
    build: async () => {
      const scene = new THREE.Scene();
      const cam = persp(28);
      const bodies: Body[] = [];
      for (let i = 0; i < 7; i++) {
        const c = contourMaterial({ line: i === 0 ? 0xdce6ff : 0x6a86ff, body: 0x020310, freq: 34, width: 0.85, rim: 0x2a3cff, rimWidth: 0.25, opacity: i === 0 ? 1 : 0.62 - i * 0.07 });
        const b = await makeBody('armor', c.mat);
        b.mesh.renderOrder = -i;
        scene.add(b.root);
        bodies.push(b);
      }
      return {
        draw(f) {
          const { bg, fg, t } = f;
          backdrop(bg, { seed: 81, dx: t * 260, alpha: 0.6, pal: PAL_BLUE });
          const speed = 3.6;
          bodies.forEach((b, i) => {
            const tt = t - i * 0.12;
            b.clip('run', tt + 0.2);
            b.root.position.set(-1.0 + tt * speed * 0.33, 0, 0);
            b.root.rotation.y = Math.PI / 2;
          });
          const x = -1.0 + t * speed * 0.33;
          cam.position.set(x + 0.5, 1.05, 4.2);
          cam.lookAt(x + 0.1, 0.95, 0);
          f.three = { scene, camera: cam };
          rect(fg, 120, 470, 290, 28, C.white);
          typeOn(fg, 'A MIND WITHOUT', 126, 492, t, 30, { size: 24, weight: 800, color: '#000' });
          if (t > 0.5) barLabel(fg, 'A BODY', 120, 590, 96, '#2ee866', '#000', 8);
          microRows(fg, 124, 680, ['92EE/S', ' WWW'], { size: 22, family: F.mono, weight: 400, color: '#2ee866', lh: 22 });
          text(fg, '0', 124, 772, { size: 64, weight: 600, color: '#2ee866' });
          checker(fg, 200, 714, 2, 2, 22, '#2ee866');
          microRows(fg, 1500, 820, ['023', '820', '320'], { size: 24, family: F.mono, weight: 400, color: '#2ee866', lh: 26 });
          ring(fg, 1520, 960, 32, '#2ee866', 5);
          ring(fg, 1520, 960, 18, '#2ee866', 5);
          [[0, 0], [24, 24], [48, 48], [72, 72], [48, 96], [24, 120], [0, 144]].forEach(([dx, dy]) => rect(fg, 1600 + dx, 790 + dy, 26, 26, '#2ee866'));
          vlabel(fg, 'QR  EXC  FF  ✦', 1780, 790, 28, '#2ee866', { weight: 500, family: F.mono });
          cutGlitch(f, t, 0.08, ['#000', '#2ee866'], 13);
        },
      };
    },
  },
  /* ---------------------------------------------------------------- */
  {
    id: 'S10',
    t0: 44.8,
    t1: ANCHORS.hush,
    title: 'Leased to a printed shell',
    note: 'Behind: the mind as a standing point-cloud human, twice life size. In front: the solid printed shell. Mapping lines connect each joint of the cloud to the same joint of the shell — the lease, made visible.',
    build: async () => {
      const scene = new THREE.Scene();
      const cam = persp(30);
      const shellBody = await makeBody('armor', toonLit({ lit: 0x1a2a3a, mid: 0x0c141e, shade: 0x03060a }).mat);
      shellBody.root.position.set(0.55, 0, 0.6);
      scene.add(shellBody.root);
      // the printed shell: dark world-lit surface with glitch bands + stencil decals on the armour
      const skin = glitchToon({ lit: 0x26364a, mid: 0x111a26, shade: 0x03060a, g0: 0x38f5d4, g1: 0xe8ecff, amount: 0.07 });
      shellBody.setMaterial(skin.mat);
      const J = (n: string) => {
        const v = shellBody.joint(n).sub(shellBody.root.position);
        return [v.x, v.y, v.z] as [number, number, number];
      };
      shellBody.pose({});
      const sp2 = J('Spine2');
      const lua = J('LeftArm');
      const lfa = J('LeftForeArm');
      const rul = J('RightUpLeg');
      const rl = J('RightLeg');
      addStickers(shellBody, [
        { at: [sp2[0] + 0.07, sp2[1] + 0.03, sp2[2] + 0.2], w: 0.09, h: 0.06, kind: 'num', text: '07', color: '#38f5d4' },
        { at: [sp2[0] - 0.08, sp2[1] + 0.01, sp2[2] + 0.2], w: 0.1, h: 0.03, kind: 'barcode', color: '#e8ecff' },
        { at: [lua[0] + 0.12, lua[1] + 0.06, lua[2]], w: 0.09, h: 0.05, kind: 'stripes', color: '#38f5d4' },
        { at: [lfa[0] + 0.14, lfa[1] - 0.01, lfa[2] + 0.06], w: 0.1, h: 0.035, kind: 'chevron', color: '#e8ecff' },
        { at: [rul[0] - 0.04, rul[1] - 0.2, rul[2] + 0.1], w: 0.06, h: 0.12, kind: 'label', text: 'S07', color: '#38f5d4', rot: Math.PI / 2 },
        { at: [rl[0], rl[1] + 0.02, rl[2] + 0.07], w: 0.05, h: 0.05, kind: 'cross', color: '#e8ecff' },
      ]);
      // the mind: point cloud of a second, larger body (sampled once from the bind pose)
      const mind = await makeBody('slim', toonLit({ lit: 0, shade: 0 }).mat);
      mind.pose(POSES.stand);
      mind.root.scale.setScalar(1.9);
      mind.root.position.set(-0.9, -0.15, -2.6);
      mind.root.updateMatrixWorld(true);
      const mpos = mind.mesh.geometry.getAttribute('position');
      const cloud: THREE.Vector3[] = [];
      for (let i = 0; i < 3200; i++) {
        const v = new THREE.Vector3();
        mind.mesh.getVertexPosition(Math.floor(hash(i, 17) * mpos.count), v);
        cloud.push(v.applyMatrix4(mind.mesh.matrixWorld));
      }
      const joints = ['Head', 'Spine2', 'LeftHand', 'RightHand', 'Hips', 'LeftLeg', 'RightLeg', 'LeftForeArm'];
      const v = new THREE.Vector3();
      return {
        draw(f) {
          const { bg, fg, t } = f;
          backdrop(bg, { seed: 91, dx: t * 12, alpha: 0.45, pal: PAL_BLUE });
          skin.time.value = f.T;
          skin.amount.value = 0.05 + (hash(Math.floor(f.T * 6)) > 0.8 ? 0.12 : 0);
          shellBody.clip('idle', t + 1.1);
          shellBody.root.rotation.y = -0.5 + t * 0.12;
          const u = easeInOutCubic(span(t, 0, 3.7));
          cam.position.set(0.9 - u * 0.4, 1.35, 4.6 - u * 0.5);
          cam.lookAt(0.0, 1.2, 0);
          cam.updateMatrixWorld();
          f.three = { scene, camera: cam };
          // point cloud (behind the 3D layer → bg canvas)
          for (let i = 0; i < cloud.length; i++) {
            const p = f.gl.project(cloud[i], cam);
            if (p.z > 1) continue;
            const flick = hash(i, Math.floor(t * 10)) > 0.12;
            if (!flick) continue;
            const c = i % 9 === 0 ? '#e8ecff' : i % 3 === 0 ? '#38f5d4' : '#1f7ac8';
            rect(bg, Math.round(p.x), Math.round(p.y), i % 9 === 0 ? 3 : 2, i % 9 === 0 ? 3 : 2, c);
          }
          // mapping lines: mind joint → shell joint
          const n = Math.min(joints.length, Math.floor(span(t, 0.3, 2.4) * joints.length) + 1);
          for (let i = 0; i < n; i++) {
            const a = px(f, cam, mind.joint(joints[i], v));
            const b = px(f, cam, shellBody.joint(joints[i], v));
            fg.strokeStyle = i % 2 ? '#e8ecff' : '#d8f040';
            fg.lineWidth = 1.3;
            fg.beginPath();
            fg.moveTo(a.x, a.y);
            fg.bezierCurveTo(a.x + 140, a.y, b.x - 140, b.y, b.x, b.y);
            fg.stroke();
            rect(fg, a.x - 3, a.y - 3, 6, 6, '#38f5d4');
            rect(fg, b.x - 4, b.y - 4, 8, 8, '#e8ff40');
          }
          // SHELL stacked
          'SHELL'.split('').forEach((ch, i) => text(fg, ch, 250, 245 + i * 168, { size: 190, weight: 800, color: C.white, align: 'center', stretch: 'semi-condensed' }));
          vlabel(fg, 'MIND · PSYCHE 0447', 420, 120, 14, '#38f5d4', { weight: 700, family: F.mono });
          vlabel(fg, 'SHELL 07 · PRINTED', 1820, 120, 14, C.white, { weight: 700, family: F.mono });
          pixelCluster(fg, 1700, 900, 12, '#38f5d4', 4);
          cutGlitch(f, t, 0.1, ['#000', '#38f5d4'], 14);
          void smooth;
        },
      };
    },
  },
];
