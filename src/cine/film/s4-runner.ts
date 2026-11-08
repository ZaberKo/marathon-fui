/**
 * 0:38–0:48 — definition: subject is a runner; a mind without a body (time
 * echoes); leased to a printed shell (point-cloud mind behind a solid shell).
 */
import * as THREE from 'three/webgpu';
import type { ShotDef } from '../engine';
import { hash, q } from '../engine';
import { C, F, checker, microRows, rect, ring, text } from '../draw';
import { backdrop, PAL_BLUE } from '../backdrop';
import { makeBody, POSES, type Body } from '../models/body';
import { toonLit } from '../models/hard';
import { contourMaterial } from '../../three/materials';
import { glitchToon } from '../mats';
import { createSubject } from '../../three/scenes/subject';
import { ASSERT_DURATION, assertionDial } from '../rings';
import { addStickers } from '../models/stickers';
import { ST } from './times';
import { barLabel, easeInOutCubic, persp, pixelCluster, px, smooth, span, typeOn, vlabel } from './kit';

export const s4: ShotDef[] = [
  {
    id: 'S07',
    t0: ST.S07[0],
    t1: ST.S07[1],
    title: 'Subject is a runner',
    note: 'The red and cobalt assertion dial cuts to a large pixel profile and a second silhouette. Green contours and lime fragments identify the subject as the definition types in.',
    build: async (k) => {
      const cam = persp(26);
      const subject = await createSubject(k.gl.renderer, cam, { film: true });
      return {
        draw(f) {
          const { fg, t } = f;
          const cut = ASSERT_DURATION.subject;
          if (t < cut) {
            assertionDial(fg, 'subject', t);
            return;
          }
          const frame = Math.floor((t - cut) * 12);
          subject.update(frame / 12, frame, 1080);
          f.three = { scene: subject.scene, camera: cam, render: subject.render };

          const label = 'RUNNER'.slice(0, Math.max(0, frame - 2));
          if (label) barLabel(fg, label, 285, 730, 128, C.grass, C.white, 12);
          vlabel(fg, 'SUBJECT IS A', 254, 744, 26, C.grass, { rot: -Math.PI / 2 });
          text(fg, 'V', 1640, 560, { size: 48, weight: 800, color: C.white });
          text(fg, 'V', 1855, 560, { size: 48, weight: 800, color: C.white });
          vlabel(fg, 'PASS', 1870, 760, 26, C.white, { weight: 500 });
        },
        dispose: subject.dispose,
      };
    },
  },
  /* ---------------------------------------------------------------- */
  {
    id: 'S08',
    t0: ST.S08[0],
    t1: ST.S08[1],
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
          backdrop(bg, { seed: 81, dx: q(t, 12) * 260, alpha: 0.5, pal: PAL_BLUE, rect: [0, 0, 610, 350] });
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
        },
      };
    },
  },
  /* ---------------------------------------------------------------- */
  {
    id: 'S09',
    t0: ST.S09[0],
    t1: ST.S09[1],
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
        { at: [rul[0] - 0.04, rul[1] - 0.2, rul[2] + 0.1], w: 0.06, h: 0.12, kind: 'label', text: 'S06', color: '#38f5d4', rot: Math.PI / 2 },
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
          void smooth;
        },
      };
    },
  },
];
