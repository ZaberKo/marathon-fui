/**
 * 1:48–2:21 — defragmentation complete; ORA introduces itself; the contract
 * (target: shell 06); consciousness transfer countdown; initiate; the last line.
 */
import * as THREE from 'three/webgpu';
import type { C2, Frame, ShotDef } from '../engine';
import { H, W, clamp01, hash } from '../engine';
import { C, F, arc, clipped, frameRect, line, rect, ring, text } from '../draw';
import { backdrop, PAL_BLUE, PAL_GREEN } from '../backdrop';
import { COMPLETION_RADIUS, completionDial } from './completion-dial';
import { bodyHeadGeometry, makeBody } from '../models/body';
import { flowMaterial } from '../models/flow';
import { ascendingBundles, connectomeMaterial } from '../models/connectome';
import { opticPathway, wireEye, type HeadAnatomy } from '../models/head2';
import { HAZE } from '../models/hard';
import { buildColony } from '../models/colony';
import { contourMaterial } from '../../three/materials';
import { pixelSurfaceMaterial } from '../../three/procedural';
import { ORA_INK, oraBuildAt, oraWordmarkLayout, paintOraLetters, paintOraRing } from '../../lib/oraWordmark';
import { ANCHORS, LINES } from './cues';
import { ST } from './times';
import { easeInOutCubic, persp, px, smooth, span } from './kit';
import { BUFFER_RETURN_DURATION, BUFFER_RETURN_FLASH, createBufferDial } from './buffer-dial';
import { opticGlyph, transferMarks, type OpticGlyph } from './transfer-ui';

const at = (id: string) => LINES.find((l) => l.id === id)!.t;
const mix = THREE.MathUtils.lerp;
const ORBIT_FOV = 36;
const ORBIT_DISTANCE = 36;
const PLANET_RADIUS = 4;
const ORBIT_POSITION = new THREE.Vector3(-6.65, 0.38, -ORBIT_DISTANCE);
const ORBIT_FOCAL = H * 0.5 / Math.tan(ORBIT_FOV * Math.PI / 360);
const ORBIT_X = W * 0.5 + ORBIT_POSITION.x * ORBIT_FOCAL / ORBIT_DISTANCE;
const ORBIT_Y = H * 0.5 - ORBIT_POSITION.y * ORBIT_FOCAL / ORBIT_DISTANCE;
const ORBIT_R = PLANET_RADIUS * ORBIT_FOCAL / ORBIT_DISTANCE;
const ORBIT_INK = '#1427ca';

function orbitDisk(ctx: C2, x: number, y: number, radius: number, opacity = 1) {
  ctx.save();
  ctx.globalAlpha = opacity;
  arc(ctx, x, y, 0, radius, 0, Math.PI * 2, ORBIT_INK);
  ring(ctx, x, y, radius, '#5269ff', 2);
  ctx.restore();
}

function contractWipe(fg: C2, T: number, cut: number) {
  const cover = smooth(span(T, cut - 0.13, cut)) * (1 - smooth(span(T, cut, cut + 0.20)));
  if (cover <= 0) return;
  const h = H * cover;
  const y = T < cut ? 0 : H - h;
  rect(fg, 0, y, W, h, '#05091f');
  line(fg, 0, T < cut ? h : y, W, T < cut ? h : y, '#254bb3', 2);
}

export const s9: ShotDef[] = [
  {
    id: 'S21',
    t0: ST.S21[0],
    t1: ST.S21[1],
    title: 'Defragmentation complete',
    note: 'Two red tracks reach 100 percent. The readout changes ink before the track fragments fall away. A lime relay sheds its teeth into a macro radial print, then the compact COMPLETE wheel resolves into the ORA ring.',
    build: async () => {
      const buffer = await createBufferDial();
      const downbeat = BUFFER_RETURN_FLASH + BUFFER_RETURN_DURATION;
      return {
        draw(f) {
          if (f.t < BUFFER_RETURN_FLASH) {
            rect(f.bg, 0, 0, 1920, 1080, C.crimson);
            for (let i = 0; i < 11; i++) {
              const x = 1456 + (i % 3) * 103;
              const y = 315 + Math.floor(i / 3) * 113;
              ring(f.fg, x, y, 25, C.white, 6);
              ring(f.fg, x, y, 14, C.white, 16);
            }
          } else if (f.t < downbeat) {
            buffer.resume(f, f.t - BUFFER_RETURN_FLASH, BUFFER_RETURN_DURATION);
          } else {
            completionDial(f.fg, f.t - downbeat, f.dur - downbeat);
          }
        },
        dispose: buffer.dispose,
      };
    },
  },
  {
    id: 'S22',
    t0: ST.S22[0],
    t1: ST.S22[1],
    title: 'ORA',
    note: 'The completed ring grows into the ORA wordmark on the introduction. The mark docks with its support readout, then the O expands into the outline of Periapt IV.',
    build: () => ({
      draw(f) {
        const { bg, fg, t, T, dur } = f;
        const intro = T - at('v23');
        const [kr, ka] = oraBuildAt(intro);
        const dock = easeInOutCubic(span(intro, 2.75, 4.30));
        const orbit = smooth(span(t, dur - 0.53, dur));
        const reveal = smooth(span(intro, 3.56, 4.41));
        const hold = (1 - orbit) * reveal;
        const R = mix(COMPLETION_RADIUS - 14 * smooth(span(t, 0, 0.62)) - 20 * kr - 22 * ka, 108, dock);
        const layout = oraWordmarkLayout(R, kr, ka);
        const cy = mix(H * 0.5, 491, dock);
        const x = W * 0.5 - layout.width / 2 - dock * 130;

        bg.save();
        bg.fillStyle = '#253b12';
        const sweep = mix(0, W, span(t, 0.22, dur));
        const fieldAlpha = smooth(span(t, 0, 0.50)) * (1 - orbit);
        for (let dx = 30; dx < W; dx += 60) {
          const offset = (dx - sweep) / 260;
          bg.globalAlpha = fieldAlpha * (0.34 + 0.50 * Math.exp(-offset * offset));
          for (let y = 30; y < H; y += 60) bg.fillRect(dx, y, 2, 2);
        }
        bg.restore();

        if (hold > 0) {
          const fieldX = mix(1440, 1195, reveal) + 150 * orbit;
          backdrop(bg, { seed: 141, pal: PAL_GREEN, alpha: 0.72 * hold, rect: [fieldX, 275, 650, 430] });
          const barH = 2 * R * reveal;
          rect(fg, x - 36, cy + R - barH, 5, barH, ORA_INK, hold);
          const markerX = x + layout.width + 28;
          for (let j = 0; j < 5; j++) {
            for (let i = 0; i < 3; i++) {
              if ((i + j) % 2 !== 0 || i > 3 - Math.abs(j - 2)) continue;
              const settle = smooth(span(reveal, (i + j) * 0.07, 0.65 + (i + j) * 0.05));
              const cell = 16 * settle;
              rect(fg, markerX + i * 18 + (1 - settle) * 72, cy - 44 + j * 18, cell, cell, C.white, settle * (1 - orbit));
            }
          }
          clipped(fg, x, cy + R + 24, layout.width * reveal, 30, () => {
            text(fg, 'SUPPORT INTELLIGENCE · MANDATORY', x, cy + R + 47, { size: 16, family: F.mono, weight: 700, color: ORA_INK, alpha: 1 - orbit });
          });
        }
        const ox = mix(x + R, ORBIT_X, orbit);
        const oy = mix(cy, ORBIT_Y, orbit);
        const radius = mix(R, ORBIT_R, orbit);
        if (orbit > 0) orbitDisk(fg, ox, oy, radius, orbit);
        paintOraRing(fg, ox, oy, radius, { inner: mix(R * 0.51, ORBIT_R - 1.5, orbit), opacity: 1 - orbit });
        paintOraLetters(fg, x, cy, R, kr, ka, layout, 1 - orbit);
      },
    }),
  },
  {
    id: 'S23',
    t0: ST.S23[0],
    t1: ST.S23[1],
    title: 'Contract — target: shell 06',
    note: 'The orbital view picks up the ORA ring. A surface pointer traces into the contract readout as its fields resolve, then the view dives to the ruins and scans the moving target.',
    build: async () => {
      const scene = new THREE.Scene();
      const cam = persp(ORBIT_FOV, 0.05, 1000);
      const planetInk = pixelSurfaceMaterial({ cells: [1024, 512], repeat: [3, 2], base: 0x1620ff, dark: 0x0a10b0, ink: 0x03063a, seed: 21 });
      planetInk.transparent = true;
      const planet = new THREE.Mesh(new THREE.SphereGeometry(PLANET_RADIUS, 96, 64), planetInk);
      planet.position.copy(ORBIT_POSITION);
      scene.add(planet);
      const ruins = buildColony({ seed: 4, haze: true, ruined: 0.5 });
      ruins.scale.setScalar(0.3);
      ruins.position.set(0, 0, -6);
      scene.add(ruins);
      const targetInk = contourMaterial({ line: 0xff2a3a, body: 0x080002, freq: 34, width: 0.9, rim: 0xff4a5a, rimWidth: 0.3, scan: 0xffa358, scanWidth: 0.055 });
      const old = await makeBody('runner', targetInk.mat);
      old.root.position.set(0.8, 0, -3.2);
      scene.add(old.root);
      const v = new THREE.Vector3();
      const site = new THREE.Vector3(-0.27, 0.28, 0.92).normalize().multiplyScalar(PLANET_RADIUS * 1.012);
      const contractCue = at('v24');
      const targetCue = at('v25');
      const cut = targetCue - 0.10;
      const fields = [
        ['CLIENT ....... WITHHELD', 0.24],
        ['SITE ......... PERIAPT IV / RUINS', 0.97],
        ['TYPE ......... RECOVERY', 1.12],
        ['ISSUED TO .... SHELL 07', 1.30],
        ['PAYOUT ....... ON CONFIRMATION', 1.50],
      ] as const;
      return {
        draw(f) {
          const { bg, fg, t, T } = f;
          const reveal = T >= cut;
          planet.visible = !reveal;
          ruins.visible = reveal;
          old.root.visible = reveal;
          if (!reveal) {
            const track = smooth(span(t, 0.0, 2.32));
            const dive = easeInOutCubic(span(T, cut - 1.2, cut));
            const diskBlend = smooth(span(t, 0, 0.4));
            planetInk.opacity = diskBlend;
            planet.rotation.set(-0.07 + t * 0.12, -0.18 + t * 0.37, -0.14 + t * 0.027);
            cam.position.set(0.52 * track - 1.8 * dive, 0.18 * track + 0.68 * dive, -3.4 * track - 11.4 * dive);
            cam.lookAt(-0.53 * track - 2.57 * dive, -0.35 * track + 0.82 * dive, -ORBIT_DISTANCE);
            cam.updateMatrixWorld();
            f.three = { scene, camera: cam };
            if (diskBlend < 1) orbitDisk(bg, ORBIT_X, ORBIT_Y, ORBIT_R, 1 - diskBlend);

            const lead = T - contractCue;
            const open = smooth(span(lead, -0.08, 0.60));
            const close = smooth(span(T, cut - 0.58, cut - 0.10));
            const marker = smooth(span(lead, -0.18, 0.34));
            const pin = px(f, cam, planet.localToWorld(v.copy(site)));
            const cardW = 560;
            const cardH = 258;
            const x = mix(1272, 1115, open) + 138 * close;
            const y = mix(368, 300, open) + 35 * close + (pin.y - H * 0.5) * 0.12;
            const extent = cardW * open * (1 - close);

            if (marker > 0) {
              const pulse = (1 - smooth(span(lead, 0.35, 0.93))) * 14;
              ring(fg, pin.x, pin.y, mix(28, 11, marker) + pulse, C.lime, 2);
              rect(fg, pin.x - 2, pin.y - 2, 4, 4, C.white, marker);
              const trace = smooth(span(lead, 0.03, 0.76));
              const bendX = Math.min(x - 34, pin.x + 112);
              const bendY = y + 22;
              fg.save();
              fg.globalAlpha = 1 - close;
              line(fg, pin.x, pin.y, mix(pin.x, bendX, Math.min(1, trace * 2)), mix(pin.y, bendY, Math.min(1, trace * 2)), C.lime);
              if (trace > 0.5) line(fg, bendX, bendY, mix(bendX, x, trace * 2 - 1), bendY, C.lime);
              fg.restore();
            }
            if (extent > 0) {
              clipped(fg, x, y, extent, cardH, () => {
                rect(fg, x, y, cardW, cardH, '#02040d', 0.86);
                frameRect(fg, x, y, cardW, cardH, C.white, 2);
                rect(fg, x, y, cardW, 44, C.white);
                text(fg, 'CONTRACT 0447', x + 15, y + 30, { size: 24, weight: 800, color: C.black });
                fields.forEach(([row, delay], i) => {
                  const progress = smooth(span(lead, delay, delay + 0.44));
                  if (progress <= 0) return;
                  const yy = y + 83 + i * 33;
                  clipped(fg, x + 16, yy - 24, (cardW - 32) * progress, 31, () => {
                    text(fg, row, x + 16, yy, { size: 17, family: F.mono, weight: 700, color: i === 1 ? C.lime : C.white });
                  });
                });
              });
              line(fg, x + extent, y + 1, x + extent, y + cardH, C.lime);
            }
            contractWipe(fg, T, cut);
            return;
          }
          const k = T - cut;
          const track = smooth(span(k, 0, f.dur - (cut - ST.S23[0])));
          const survey = smooth(span(k, 0.08, 0.94));
          const lock = smooth(span(k, 0.26, 0.89));
          HAZE.near.value = 4;
          HAZE.far.value = 26;
          old.clip('idle', k + 0.22);
          old.root.rotation.y = mix(-0.50, 0.14, smooth(span(k, 0.16, 1.72)));
          targetInk.u.scanY.value = mix(-0.15, 2.13, survey);
          targetInk.u.lineMix.value = mix(0.52, 1, survey);
          cam.position.set(mix(-0.84, 0.31, track), mix(1.50, 1.19, track), mix(1.14, 0.26, track));
          cam.lookAt(mix(0.43, 0.70, track), mix(1.14, 1.23, track), -3.2);
          cam.updateMatrixWorld();
          f.three = { scene, camera: cam };
          const c = px(f, cam, old.joint('Spine2', v));
          const aim = smooth(span(k, 0.06, 0.66));
          const cx = mix(c.x - 156, c.x, aim);
          const cy = mix(c.y + 94, c.y, aim);
          const r = mix(242, 79 + 15 * track, lock);
          const tip = mix(34, 22, lock);
          fg.save();
          fg.globalAlpha = smooth(span(k, 0.08, 0.37));
          fg.strokeStyle = C.red;
          fg.lineWidth = 3;
          fg.beginPath();
          for (const sx of [-1, 1]) {
            for (const sy of [-1, 1]) {
              fg.moveTo(cx + sx * r, cy + sy * (r - tip));
              fg.lineTo(cx + sx * r, cy + sy * r);
              fg.lineTo(cx + sx * (r - tip), cy + sy * r);
            }
          }
          fg.stroke();
          const wing = mix(34, 68, lock);
          line(fg, cx - r - wing, cy, cx - r, cy, C.red);
          line(fg, cx + r, cy, cx + r + wing, cy, C.red);
          fg.restore();
          const confirm = smooth(span(T, targetCue + 0.64, targetCue + 1.02));
          if (confirm > 0) {
            const x = cx + r + 28;
            const y = cy - r - 6 * (1 - confirm);
            const distance = mix(0.91, 0.84, smooth(span(k, 0.74, 1.87)));
            line(fg, cx + r, cy - r, mix(cx + r, x, confirm), y, C.red);
            clipped(fg, x, y, 236 * confirm, 61, () => {
              rect(fg, x, y, 236, 31, C.red);
              text(fg, 'TARGET · SHELL 06', x + 8, y + 22, { size: 18, weight: 800, color: C.black });
              text(fg, `RANGE ${distance.toFixed(2)} KM · ACTIVE`, x, y + 53, { size: 14, family: F.mono, weight: 700, color: C.red });
            });
          }
          contractWipe(fg, T, cut);
        },
      };
    },
  },
  /* ---------------------------------------------------------------- */
  {
    id: 'S24',
    t0: ST.S24[0],
    t1: ST.S24[1],
    title: 'Consciousness transfer',
    note: 'The camera circles the shell, then keeps moving into the brain along the optic route throughout the countdown.',
    build: async () => {
      const rig = await headRig();
      return { draw: (f) => rig.transfer(f) };
    },
  },
  {
    id: 'S25',
    t0: ST.S25[0],
    t1: ST.S25[1],
    title: 'Initiate',
    note: 'INIT lights up in the internal optic view. The camera rushes toward the eyes, the two rings fuse into one and the field floods blue before the final blackout.',
    build: async () => {
      const rig = await headRig();
      return { draw: (f) => rig.initiate(f) };
    },
  },
];

/* ------------------------------------------------------------------ */
/* the head rig shared by S24 and S25 (one scene, one camera path)      */
/* ------------------------------------------------------------------ */
let headP: ReturnType<typeof buildHeadRig> | null = null;
const headRig = () => (headP ??= buildHeadRig());

async function buildHeadRig() {
  const scene = new THREE.Scene();
  const cam = persp(38, 0.002, 20);
  const add = { blending: THREE.AdditiveBlending, transparent: true, depthWrite: false };
  const skin = contourMaterial({ line: 0x3040cc, body: 0x000000, freq: 170, width: 1.0, axis: 'y', space: 'local', line2: 0x20286a, freq2: 34, axis2: 'theta', width2: 0.9, rim: 0x30247a, rimWidth: 0.1 });
  Object.assign(skin.mat, add, { side: THREE.FrontSide });
  const head = new THREE.Group();
  const shell = new THREE.Mesh((await bodyHeadGeometry('runner')).geometry, skin.mat);
  head.add(shell);
  const eyeX = 0.030;
  const eyeY = 0.014;
  const eyeR = 0.0105;
  const faceRay = new THREE.Raycaster(new THREE.Vector3(eyeX, eyeY, 0.2), new THREE.Vector3(0, 0, -1));
  const face = faceRay.intersectObject(shell, false)[0];
  const anatomy: HeadAnatomy = {
    eyeX, eyeY, eyeR, eyeZ: face.point.z - eyeR - 0.004,
    brain: new THREE.Vector3(0, 0.047, -0.012),
    brainScale: new THREE.Vector3(0.080, 0.093, 0.074),
  };
  const net = ascendingBundles((rank, readiness) => readiness ? 0.7 + rank * 1.3 : -0.9 + rank * 2.4);
  const cm = connectomeMaterial({ dim: 0.095, base: 0.43, flash: 0.22, pulse: 0.22, speed: 1.5 });
  const brain = new THREE.LineSegments(net.geometry, cm.mat);
  brain.position.copy(anatomy.brain);
  brain.scale.copy(anatomy.brainScale);
  head.add(brain);
  // the visual pathway: many fibres, signals flowing toward the eyes
  const flow = flowMaterial({ base: 0.26, speed: -1.1, freq: 6 });
  head.add(new THREE.LineSegments(opticPathway(13, 72, anatomy), flow.mat));
  const eyes = [-1, 1].map((sx) => {
    const e = wireEye(0x4f66c2, 0x92bd49, eyeR);
    e.position.set(sx * eyeX, eyeY, anatomy.eyeZ);
    head.add(e);
    return e;
  });
  for (let i = 0; i < 8; i++) {
    const vb = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.042 - i * 0.002, 0.014, 0.028)), new THREE.LineBasicMaterial({ color: 0x3ae830, ...add }));
    vb.position.set(0, -0.09 - i * 0.02, -0.036);
    head.add(vb);
  }
  scene.add(head);
  const v = new THREE.Vector3();
  const centre = new THREE.Vector3(0, 0.033, 0);
  const look = new THREE.Vector3();
  const camEnd = anatomy.brain.clone().add(new THREE.Vector3(0, -0.012, -0.038));
  const lookEnd = new THREE.Vector3(0, eyeY, anatomy.eyeZ);
  const orbitFov = cam.fov;
  const insideFov = 72;
  const insideNear = 0.009;
  const orbitEnd = 1.52;
  const transferEnd = ST.S24[1] - ST.S24[0];
  const rearStart = -0.442;
  const startDistance = anatomy.eyeZ - rearStart;
  const endDistance = anatomy.eyeZ - camEnd.z;
  const distanceRatio = endDistance / startDistance;
  const approachSpeed = -endDistance * Math.log(distanceRatio) / (transferEnd - orbitEnd);
  const startHalfAngle = Math.tan(THREE.MathUtils.degToRad(orbitFov / 2));
  const endHalfAngle = Math.tan(THREE.MathUtils.degToRad(insideFov / 2));
  const rearSurface = new THREE.Raycaster(new THREE.Vector3(0, camEnd.y, -0.48), new THREE.Vector3(0, 0, 1)).intersectObject(shell, false)[0].point.z;
  const cameraPoint = new THREE.Vector3();
  const projectEye = (f: Frame, camera: THREE.PerspectiveCamera, eye: THREE.Object3D) => {
    eye.getWorldPosition(v);
    const depth = -cameraPoint.copy(v).applyMatrix4(camera.matrixWorldInverse).z;
    if (depth <= camera.near) return;
    const p = px(f, camera, v);
    const R = H * 0.5 * camera.projectionMatrix.elements[5] * eyeR / depth;
    return { x: p.x, y: p.y, R };
  };
  const startCamera = cam.clone();
  startCamera.fov = insideFov;
  startCamera.near = insideNear;
  startCamera.updateProjectionMatrix();
  startCamera.position.copy(camEnd);
  startCamera.lookAt(lookEnd);
  startCamera.updateMatrixWorld();
  const opticCues: [number, OpticGlyph][] = [[ANCHORS.final, 'INIT'], [at('v29'), '1'], [at('v28'), '2'], [at('v27'), '3']];
  const drawEyes = (f: Frame, T: number) => {
    const cue = opticCues.find(([time]) => T >= time);
    for (const eye of eyes) {
      const p = projectEye(f, cam, eye);
      if (!p) continue;
      ring(f.fg, p.x, p.y, p.R * 1.17, '#2437b3', 2, T * 1.5, T * 1.5 + 3.9);
      ring(f.fg, p.x, p.y, p.R * 0.84, '#4261c8', 1, 1.1 - T, 5.2 - T);
      ring(f.fg, p.x, p.y, p.R * 0.39, '#a3bbdc', 1.2);
      if (cue) opticGlyph(f.fg, cue[1], p.x, p.y, p.R * (cue[1] === 'INIT' ? 0.87 : 1.70), T - cue[0]);
    }
  };
  const transferBackground = (bg: C2, t: number, alpha = 1) => {
    backdrop(bg, { seed: 161, dx: t * 13, pal: PAL_BLUE, alpha: alpha * 0.64, rect: [0, 70, 680, 920] });
    backdrop(bg, { seed: 166, dx: t * 10, pal: PAL_BLUE, alpha: alpha * 0.69, rect: [1240, 70, 680, 920] });
  };
  const tick = (T: number) => {
    flow.time.value = T;
    eyes.forEach((e) => (e.rotation.y = Math.sin(T * 0.7) * 0.05));
  };
  return {
    transfer(f: Frame) {
      const { bg, fg, t, T } = f;
      tick(T);
      eyes.forEach((e) => (e.visible = true));
      const o = smooth(span(t, 0, orbitEnd));
      const theta = Math.PI * o;
      const r = mix(0.48, -rearStart, o);
      const progress = span(t, orbitEnd, transferEnd);
      // Ease off the orbit with no jump in speed, then keep moving through INIT.
      const push = progress * progress * (2 - progress);
      if (t < orbitEnd) {
        cam.position.set(Math.sin(theta) * r, 0.033 + Math.sin(theta) * 0.02, Math.cos(theta) * r);
        look.copy(centre);
      } else {
        const z = anatomy.eyeZ - startDistance * Math.pow(distanceRatio, push);
        cam.position.set(camEnd.x, mix(centre.y, camEnd.y, push), z);
        look.copy(centre).lerp(lookEnd, push);
      }
      const inside = t < orbitEnd ? 0 : smooth(span(cam.position.z, rearSurface - 0.018, rearSurface + 0.018));
      const lensProgress = span(push, 0, 0.85);
      const lens = lensProgress * (1.5 - 0.5 * lensProgress * lensProgress);
      // Open the lens more slowly than the optic distance closes, so the eyes keep growing.
      cam.fov = THREE.MathUtils.radToDeg(2 * Math.atan(startHalfAngle * Math.pow(endHalfAngle / startHalfAngle, lens)));
      cam.near = THREE.MathUtils.lerp(0.002, insideNear, inside);
      cam.updateProjectionMatrix();
      cam.lookAt(look);
      cam.updateMatrixWorld();
      shell.visible = inside < 1;
      skin.mat.opacity = 1 - inside;
      brain.visible = true;
      cm.time.value = t;
      cm.gain.value = THREE.MathUtils.lerp(0.48, 0.22, inside);
      flow.gain.value = THREE.MathUtils.lerp(0.12, 0.23, inside);
      f.three = { scene, camera: cam };
      if (inside < 1) transferBackground(bg, t, 1 - inside);
      transferMarks(fg, 1 - 0.82 * inside);
      drawEyes(f, T);
      text(fg, 'CONSCIOUSNESS TRANSFER', 96, 1000, { size: 22, weight: 800, color: '#8aa0ff', stretch: 'semi-expanded' });
      text(fg, `SHELL 07 ← PSYCHE 0447 · WRITE ${String(Math.floor(span(t, 0, transferEnd) * 100)).padStart(3, '0')}%`, 96, 1028, { size: 15, family: F.mono, weight: 700, color: '#8aa0ff' });
      text(fg, inside >= 1 ? 'INTERNAL VIEW · OPTIC ROUTE' : 'OPTIC ROUTE · 144 FIBRES', 1824, 1028, { size: 15, family: F.mono, weight: 700, color: '#a0a4e5', align: 'right' });
    },
    initiate(f: Frame) {
      const { fg, t, T } = f;
      const CUT = 1.35; // fast: rush, fuse, black
      if (t >= CUT) return;
      tick(T);
      // Continue from inside the brain along the optic axis.
      const go = smooth(span(t, 0, 0.53));
      const acc = go * go;
      const travel = mix(approachSpeed * t, anatomy.eyeZ + 0.15 - camEnd.z, acc);
      cam.position.set(camEnd.x, camEnd.y - 0.01 * acc, camEnd.z + travel);
      cam.fov = insideFov + 14 * acc;
      cam.near = insideNear;
      cam.updateProjectionMatrix();
      cam.lookAt(lookEnd.x, lookEnd.y - 0.01 * acc, lookEnd.z + travel);
      cam.updateMatrixWorld();
      shell.visible = false;
      brain.visible = acc < 0.67;
      cm.time.value = transferEnd + t;
      cm.gain.value = 0.22 * (1 - smooth(span(acc, 0.07, 0.67)));
      flow.gain.value = 0.23 + acc * 0.42;
      const flood = t >= 0.52;
      if (!flood) {
        f.three = { scene, camera: cam };
        transferMarks(fg, 0.18 * (1 - acc));
      }
      // eyes: INIT in the 3D eyes until the rush starts; from then on they are 2D ring sets
      const rush = t >= 0.06;
      eyes.forEach((e) => (e.visible = !rush));
      if (!rush) drawEyes(f, T);
      if (flood) rect(fg, 0, 0, 1920, 1080, C.blue);
      // speed lines streaming out from the centre
      const sp = span(t, 0.12, 0.32) * (1 - span(t, 0.56, 0.9));
      if (sp > 0) {
        fg.save();
        fg.lineCap = 'round';
        for (let i = 0; i < 72; i++) {
          const a = hash(i, 1) * Math.PI * 2;
          const ph = (hash(i, 2) + t * (0.9 + hash(i, 3) * 1.4)) % 1;
          const r0 = 40 + ph * ph * 1150;
          const len = 30 + r0 * (0.25 + acc * 0.5);
          fg.strokeStyle = i % 3 ? `rgba(64,101,255,${0.35 * sp})` : `rgba(137,160,255,${0.55 * sp})`;
          fg.lineWidth = 1 + (i % 4 === 0 ? 1.5 : 0);
          fg.beginPath();
          fg.moveTo(960 + Math.cos(a) * r0, 540 + Math.sin(a) * r0);
          fg.lineTo(960 + Math.cos(a) * (r0 + len), 540 + Math.sin(a) * (r0 + len));
          fg.stroke();
        }
        fg.restore();
      }
      // the two eyes' ring sets slide together into one (a single point of view)
      const conv = smooth(span(t, 0.22, 0.85));
      if (rush) {
        const shrink = smooth(span(t, 0.95, CUT - 0.05));
        const grow = 1 + acc * 1.6;
        for (const eye of eyes) {
          const e = projectEye(f, startCamera, eye);
          if (!e) continue;
          const x = e.x + (960 - e.x) * conv;
          const y = e.y + (540 - e.y) * conv;
          const R = e.R * grow * (1 - conv * 0.35);
          for (let k = 0; k < 6; k++) {
            const rr = (R * 0.26 + k * R * 0.18) * (1 - shrink * 0.92);
            ring(fg, x, y, rr, k % 3 === 0 ? '#b8d9ff' : '#4866ff', k === 0 ? 2 : 1.5);
          }
          // INIT stretches with the rush and fades as the rings fuse
          const ia = 1 - smooth(span(t, 0.41, 0.54));
          if (ia > 0) {
            fg.save();
            fg.globalAlpha = ia;
            opticGlyph(fg, 'INIT', x, y, R * 0.87, t);
            fg.restore();
          }
        }
        if (conv > 0.95) {
          text(fg, 'LINK ESTABLISHED · SHELL 07', 960, 540 + 230 * (1 - shrink), { size: 18, family: F.mono, weight: 700, color: '#e8ecff', align: 'center', tracking: 4 });
          if (Math.floor(t * 10) % 2 === 0) rect(fg, 956, 536, 8, 8, '#77f600');
        }
      }
      // the last frames: the fused ring collapses to a point
      if (t > CUT - 0.1) rect(fg, 0, 0, 1920, 1080, `rgba(0,0,0,${clamp01((t - (CUT - 0.1)) / 0.1)})`);
    },
  };
}

