/**
 * 0:48–1:00 — the previous shell dies. The runner is drawn as a uniform cloud
 * of green wireframe voxels (one per surface cell of its mesh). On the impact
 * of the score it is hit: red spreads from the wound, the body falls backwards,
 * and on the ground the voxels burst outward, scatter and settle — all red.
 * The psyche, ejected at the moment of death, is caught and held above.
 */
import * as THREE from 'three/webgpu';
import type { Frame, ShotDef } from '../engine';
import { clamp01, hash } from '../engine';
import { C, F, frameRect, line, microRows, rect, ring, text } from '../draw';
import { makeBody, POSES, type Body } from '../models/body';
import { brainGeometry } from '../models/anatomy';
import { Hard, deck, toonLit } from '../models/hard';
import { WireCubes, burst, voxelPositions, voxelize, type VoxelSet } from '../models/voxels';
import { ANCHORS } from './cues';
import { ST } from './times';
import { cutGlitch, easeInOutCubic, persp, px, smooth, span, vlabel } from './kit';

const HIT = ANCHORS.impact; // 50.05
const FALL = 0.85;
const BREAK = HIT + FALL + 0.04;
const GREEN = new THREE.Color(0x3ae830);
const RED = new THREE.Color(0xff1a2a);

type DeathSet = {
  scene: THREE.Scene;
  body: Body;
  vs: VoxelSet;
  cubes: WireCubes;
  p0: THREE.Vector3[];
  hitAt: THREE.Vector3;
  psyche: THREE.Vector3[];
  cur: THREE.Vector3[];
};

function poseBody(body: Body, T: number) {
  const walkT = Math.min(T, HIT) - ANCHORS.hush;
  const z0 = -2.2 + walkT * 0.55;
  body.clip('walk', walkT + 0.4);
  const u = clamp01((T - HIT) / FALL);
  if (T >= HIT) {
    body.blendPose(POSES.hit, smooth(clamp01((T - HIT) / 0.25)) * (1 - u));
    body.blendPose(POSES.supine, smooth(u));
  }
  const theta = -(Math.PI / 2) * u * u;
  body.root.rotation.set(theta, 0.15 * u, 0);
  body.root.position.set(0, 0.12 * Math.sin(-theta), z0 + (T >= HIT ? -0.25 * smooth(clamp01((T - HIT) / 0.3)) : 0));
}

let setP: Promise<DeathSet> | null = null;
function deathSet() {
  if (setP) return setP;
  setP = (async () => {
    const scene = new THREE.Scene();
    const h = new Hard();
    deck(h, { w: 30, d: 30, tile: 1.4, seed: 51, plate: 'plate', groove: 'groove' });
    for (let i = 0; i < 16; i++) {
      const x = -12 + hash(i, 1) * 24;
      const z = -14 + hash(i, 2) * 10;
      const hh = 0.6 + hash(i, 3) * 4.5;
      h.box('ruin', 0.6 + hash(i, 4) * 1.8, hh, 0.6 + hash(i, 5) * 1.6, x, hh / 2, z, hash(i, 6) * 0.6);
    }
    for (let i = 0; i < 30; i++) h.box('ruin', 0.15 + hash(i, 7) * 0.4, 0.1 + hash(i, 8) * 0.3, 0.15 + hash(i, 9) * 0.4, -6 + hash(i, 10) * 12, 0.08, -4 + hash(i, 11) * 8, hash(i, 12) * 3);
    scene.add(
      h.build(
        { plate: toonLit({ lit: 0x141c3a, mid: 0x0c1128, shade: 0x05070f }).mat, groove: toonLit({ lit: 0x020308, shade: 0x000000 }).mat, ruin: toonLit({ lit: 0x1c2648, mid: 0x0e1430, shade: 0x05070f }).mat },
        { plate: 0x1a2a8a, ruin: 0x2a3ab0 },
      ),
    );
    const body = await makeBody('armor', toonLit({ lit: 0, shade: 0 }).mat);
    body.mesh.visible = false; // the shell is shown only through its voxels
    scene.add(body.root);
    const vs = voxelize(body, 0.05);
    const cubes = new WireCubes(vs.count);
    scene.add(cubes.lines);
    // the exact pose at the break → burst origins
    poseBody(body, BREAK - 1e-3);
    const p0 = voxelPositions(body, vs, []).map((v) => v.clone());
    const hitAt = body.joint('Spine2').clone();
    const bg = brainGeometry(24, 6);
    const bp = bg.getAttribute('position');
    const psyche: THREE.Vector3[] = [];
    for (let i = 0; i < bp.count; i += 3) psyche.push(new THREE.Vector3(bp.getX(i), bp.getY(i), bp.getZ(i)).multiplyScalar(0.16));
    return { scene, body, vs, cubes, p0, hitAt, psyche, cur: [] };
  })();
  return setP;
}

const col = new THREE.Color();
const tmp = new THREE.Vector3();
const axis = new THREE.Vector3();
const q = new THREE.Quaternion();

/** stage the voxel body for global time T */
function stage(set: DeathSet, T: number) {
  const { body, vs, cubes } = set;
  const half = vs.cell * 0.38;
  if (T < BREAK) {
    poseBody(body, T);
    const P = voxelPositions(body, vs, set.cur);
    const wound = T >= HIT ? body.joint('Spine2', tmp).clone() : null;
    for (let k = 0; k < vs.count; k++) {
      let red = 0;
      if (wound) red = clamp01((T - HIT - P[k].distanceTo(wound) * 0.45) / 0.18);
      col.copy(GREEN).lerp(RED, red);
      cubes.set(k, P[k], half, col);
    }
  } else {
    const t = T - BREAK;
    for (let k = 0; k < vs.count; k++) {
      const b = burst(set.p0[k], k, t, { from: set.hitAt, ground: 0, half, power: 1.7, seed: 9 }, tmp);
      axis.set(hash(k, 1) - 0.5, hash(k, 2) - 0.5, hash(k, 3) - 0.5).normalize();
      q.setFromAxisAngle(axis, b.spin);
      if (b.settled) q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), hash(k, 4) * Math.PI);
      cubes.set(k, tmp, half, RED, q);
    }
  }
  cubes.commit(vs.count);
}

function psycheDraw(f: Frame, set: DeathSet, cam: THREE.Camera, centre: THREE.Vector3, scale: number, alpha: number) {
  const v = new THREE.Vector3();
  const { fg, T } = f;
  fg.save();
  fg.globalCompositeOperation = 'lighter';
  set.psyche.forEach((p, i) => {
    v.set(p.x * scale, p.y * scale, p.z * scale).applyAxisAngle(new THREE.Vector3(0, 1, 0), T * 0.8).add(centre);
    const s = px(f, cam, v);
    if (s.z > 1) return;
    fg.globalAlpha = alpha * (hash(i, Math.floor(T * 12)) > 0.15 ? 1 : 0.3);
    fg.fillStyle = i % 7 === 0 ? '#ffffff' : i % 3 === 0 ? '#b49aff' : '#6a5aff';
    fg.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 1, i % 7 === 0 ? 3 : 2, i % 7 === 0 ? 3 : 2);
  });
  fg.restore();
}

export const s5: ShotDef[] = [
  {
    id: 'S10',
    t0: ST.S10[0],
    t1: ST.S10[1],
    title: 'Terminated in the field',
    note: 'The previous shell is a uniform cloud of green wireframe voxels walking the ruins. A reticle closes; on the impact it is hit — red spreads from the wound, it falls backwards, and the voxels burst and scatter across the deck.',
    build: async () => {
      const set = await deathSet();
      const cam = persp(32, 0.05, 200);
      const v = new THREE.Vector3();
      return {
        draw(f) {
          const { fg, T, t } = f;
          stage(set, T);
          const shake = T > HIT && T < HIT + 0.35 ? (hash(Math.floor(T * 60)) - 0.5) * 0.08 * (1 - (T - HIT) / 0.35) : 0;
          const u = easeInOutCubic(span(T, ANCHORS.hush, ANCHORS.impact + 0.5));
          cam.position.set(2.4 - u * 1.1 + shake, 1.2 - u * 0.2, 3.9 - u * 1.2);
          cam.lookAt(-0.2, 0.6 - u * 0.3, -1.4);
          cam.updateMatrixWorld();
          f.three = { scene: set.scene, camera: cam };
          if (T < HIT) {
            poseBody(set.body, T);
            const c = px(f, cam, set.body.joint('Spine2', v));
            const k = smooth(span(T, ANCHORS.hush + 0.2, HIT));
            const r = 140 - k * 100;
            fg.strokeStyle = C.red;
            fg.lineWidth = 2;
            for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
              fg.beginPath();
              fg.moveTo(c.x + sx * r, c.y + sy * (r - 18));
              fg.lineTo(c.x + sx * r, c.y + sy * r);
              fg.lineTo(c.x + sx * (r - 18), c.y + sy * r);
              fg.stroke();
            }
            if (k > 0.6) text(fg, 'AUTH · LOCK', c.x + r + 10, c.y - r, { size: 13, family: F.mono, weight: 700, color: C.red });
            text(fg, 'SHELL 06 · RUNNER 0447', 96, 110, { size: 18, family: F.mono, weight: 700, color: '#3ae830' });
          }
          if (T >= HIT && T < HIT + 0.5) {
            const k = (T - HIT) / 0.5;
            const c = px(f, cam, set.hitAt);
            fg.save();
            fg.globalCompositeOperation = 'lighter';
            fg.globalAlpha = 1 - k;
            fg.fillStyle = '#ffd8d8';
            fg.beginPath();
            fg.arc(c.x, c.y, 20 + k * 140, 0, Math.PI * 2);
            fg.fill();
            fg.restore();
            if (T < HIT + 0.07) rect(fg, 0, 0, 1920, 1080, 'rgba(255,230,230,0.5)');
            const hp = px(f, cam, set.body.joint('Head', v));
            const top = hp.y - 1400 * k;
            fg.fillStyle = '#c8baff';
            fg.fillRect(hp.x - 2, top, 4, hp.y - top);
          }
          if (T > BREAK) {
            const x = 1360;
            frameRect(fg, x, 120, 440, 150, C.red, 2);
            rect(fg, x, 120, 440, 30, C.red);
            text(fg, 'DEATH LOG', x + 10, 142, { size: 18, weight: 800, color: '#000' });
            microRows(fg, x + 12, 180, ['SHELL ........ 06', 'T ............ 04:12:33', 'CAUSE ........ KINETIC / AUTH', 'PSYCHE ....... EJECTED'], { size: 15, family: F.mono, weight: 700, color: C.red, lh: 21 });
            const n = Math.floor(clamp01((T - BREAK) / 2.5) * set.vs.count);
            text(fg, `VOXEL LOSS ${String(n).padStart(4, '0')}/${set.vs.count}`, x, 300, { size: 14, family: F.mono, weight: 700, color: '#ff6a6a' });
          }
          cutGlitch(f, t, 0.1, ['#000', C.blue], 15);
          f.post.lift = 0.85;
          f.post.tint = T > HIT ? [1, 0.5, 0.55] : [0.5, 1, 0.55];
        },
      };
    },
  },
  {
    id: 'S11',
    t0: ST.S11[0],
    t1: ST.S11[1],
    title: 'Psyche ejected',
    note: 'Above the red voxel debris the psyche hangs as a slow cloud of points, caught in a containment bracket — the only part of the runner that survived.',
    build: async () => {
      const set = await deathSet();
      const cam = persp(34, 0.05, 200);
      return {
        draw(f) {
          const { fg, T, t } = f;
          stage(set, T);
          const u = easeInOutCubic(span(t, 0, 4.8));
          cam.position.set(1.4 - u * 0.6, 0.6 + u * 1.5, 2.6 + u * 0.6);
          cam.lookAt(0, 1.0 + u * 1.0, -1.6);
          cam.updateMatrixWorld();
          f.three = { scene: set.scene, camera: cam };
          const centre = new THREE.Vector3(0, 1.6 + smooth(span(t, 0, 2.2)) * 0.6, -1.6);
          psycheDraw(f, set, cam, centre, 1.4, 1);
          const c = px(f, cam, centre);
          const R = 150;
          fg.strokeStyle = '#b49aff';
          fg.lineWidth = 2;
          for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
            fg.beginPath();
            fg.moveTo(c.x + sx * R, c.y + sy * (R - 30));
            fg.lineTo(c.x + sx * R, c.y + sy * R);
            fg.lineTo(c.x + sx * (R - 30), c.y + sy * R);
            fg.stroke();
          }
          ring(fg, c.x, c.y, R * 0.8, 'rgba(180,154,255,0.5)', 1, T, T + 4);
          text(fg, 'PSYCHE · HELD', c.x + R + 12, c.y - R + 12, { size: 16, family: F.mono, weight: 700, color: '#b49aff' });
          text(fg, 'BUFFER 0447', c.x + R + 12, c.y - R + 32, { size: 14, family: F.mono, weight: 400, color: '#8a7aff' });
          vlabel(fg, 'PSYCHE', 300, 860, 120, '#3a2aff', { rot: -Math.PI / 2, stretch: 'expanded' });
          line(fg, c.x, c.y + R, c.x, 1080, 'rgba(180,154,255,0.35)', 1);
          f.post.tint = [0.7, 0.55, 1];
        },
      };
    },
  },
];
