import * as THREE from 'three/webgpu';
import type { C2, Frame } from '../engine';
import { FPS, H, W, clamp01, easeOut, hash, lerp } from '../engine';
import { F, arc, bitmap, clipped, measure, microRows, ring, text } from '../draw';
import { dialField } from '../rings';
import { makeBody, POSES } from '../models/body';
import { fitHeight } from '../../three/assets';
import { contourMaterial } from '../../three/materials';
import { ANCHORS, cue } from './cues';
import { pxOrtho } from './figure';
import { ST } from './times';

const TAU = Math.PI * 2;
const CX = W / 2;
const CY = H / 2;
const RED = '#e90038';
const LOCK_RED = '#f3000e';
const LEMON = '#ecfa42';
const PERCENT_CELL = ['.###.', '#...#', '#.#.#', '#...#', '.###.'];
const at = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const EARLY_COUNTS = [[0, 0], [.167, 4], [.367, 10], [.567, 15], [.766, 21], [.967, 26]] as const;
const RETURN_COUNTS = [[0, null], [9, 78], [14, 85], [19, 91], [24, 98], [28, 99], [38, 100]] as const;
export const BUFFER_LOAD_DURATION = 4.02;
export const BUFFER_LOCK_DURATION = 1.68;
export const BUFFER_RETURN_FLASH = 3 / FPS;
export const BUFFER_RETURN_DURATION = ANCHORS.downbeat - ST.S21[0] - BUFFER_RETURN_FLASH;
const COUNT_AT = cue('v06') + 1.12 - ST.S06[0];
type BufferFrame = Pick<Frame, 'bg' | 'fg' | 't' | 'three'>;
type PaintPortrait = (f: BufferFrame, scale: number, phase: number, echo: number) => void;

export function bufferField(ctx: C2, red = false) {
  ctx.fillStyle = red ? '#420817' : '#454416';
  for (let y = 87; y < 1030; y += 126) {
    for (let x = 77; x < W; x += 126) {
      ctx.fillRect(x, y, 1.6, 1.6);
      if (hash(x, y, 41) > .24) ctx.fillRect(x + 4, y, 1.6, 1.6);
      if (hash(x, y, 25) > .32) ctx.fillRect(x, y + 4, 1.6, 1.6);
      ctx.fillRect(x + 4, y + 4, 1.6, 1.6);
    }
  }
}

function bufferReadout(ctx: C2, value: number | null, color: string, { onlyType = false, wide = false, yellow = false } = {}) {
  ctx.save();
  ctx.translate(CX + (wide ? 44 : 41), CY - 133);
  ctx.rotate(Math.PI / 2);
  const digits = value == null ? '' : String(value);
  const options = { size: wide ? 95 : 105, weight: 690, color, tracking: 3 };
  text(ctx, digits, 0, 0, options);
  text(ctx, 'BUFFER', 40, 48, { size: 29, weight: 730, tracking: 3.6, color });
  if (!onlyType) {
    const typeEnd = value == null ? 135 : Math.max(60, measure(ctx, digits, options)) + 6;
    if (!yellow) {
      const glyphInk = wide ? '#1b27c9' : color;
      bitmap(ctx, PERCENT_CELL, typeEnd, -65, 6.1, glyphInk);
      bitmap(ctx, PERCENT_CELL, typeEnd, -27, 6.1, glyphInk);
    }
    microRows(ctx, 56, 72, ['3S K   3S K   3S K', '3S UV  3S UV  3S UV'], { size: 10, family: F.mono, weight: 700, color: yellow ? '#d1de51' : wide ? '#a42d51' : '#8f9b36', lh: 13 });
    ctx.fillStyle = yellow ? '#e6ed74' : wide ? '#c91435' : '#f0ff5a';
    for (let i = 0; i < 8; i++) {
      const height = 7 + (i % 3) * 4;
      ctx.fillRect(171 + i * 5, 61 + (i % 2 ? 1 : 0), 2, height);
    }
  }
  ctx.restore();
}

export function yellowBufferGuide(ctx: C2) {
  bufferField(ctx);
  ring(ctx, CX, CY, 475, '#c0bd35', 2.5);
  ring(ctx, CX, CY, 168, '#747227', 1.8);
  bufferReadout(ctx, 100, LEMON, { wide: true, yellow: true });
}

function activeTrack(ctx: C2, radius: number, width: number, start: number, end: number, tick = true) {
  if (end <= start) return;
  ring(ctx, CX, CY, radius, RED, width, start, end);
  if (!tick) return;
  const count = Math.ceil((end - start) * radius / 3.5);
  const r0 = radius - width * .5;
  const r1 = radius + width * .31;
  ctx.strokeStyle = '#9f0c2c';
  ctx.lineWidth = .8;
  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    const a = lerp(start, end, i / count);
    const x = Math.cos(a);
    const y = Math.sin(a);
    ctx.moveTo(CX + r0 * x, CY + r0 * y);
    ctx.lineTo(CX + r1 * x, CY + r1 * y);
  }
  ctx.stroke();
}

function trackPacket(ctx: C2, radius: number, lead: number, ink: string) {
  ring(ctx, CX, CY, radius, ink, 4.2, lead - .38, lead);
  arc(ctx, CX, CY, radius - 6, radius + 9, lead - .046, lead, ink);
  ring(ctx, CX, CY, radius - 7, ink, 1.4, lead - .58, lead - .43);
}

function lockPrint(ctx: C2, frame: number, insert: number, seal: number) {
  const shift = frame * .036;
  const seat = easeOut(at(frame, 0, 9));
  ctx.save();
  ctx.translate(CX, CY);
  ctx.rotate(shift);
  for (let i = 0; i < 4; i++) {
    const start = i * TAU / 4;
    const reach = lerp(1.08, 1.552, seat);
    arc(ctx, 0, 0, 202 + 21 * (1 - seat), 339, start, start + reach, LOCK_RED);
  }
  for (let i = 0; i < 135; i++) {
    const a = i * TAU / 135;
    const key = hash(i, 11);
    const outer = 345 + hash(i, 12) * 27;
    if (key > 1 - .86 * seat) arc(ctx, 0, 0, 330 + key * 10, outer, a, a + .025 + .061 * key, key > .48 ? LOCK_RED : '#71091a');
    if (key > .46) arc(ctx, 0, 0, 302 + 38 * key, 305 + 46 * key, a, a + .026 + .066 * key, '#45050f');
    if (key < .26) {
      const tooth = a - shift * 1.9;
      const r = 214 + 78 * hash(i, 41);
      arc(ctx, 0, 0, r, r + 3 + key * 16, tooth, tooth + .021 + .26 * key, '#6c0514');
    }
  }
  for (let i = 0; i < 15; i++) {
    const a = hash(i, 73) * 2 - shift * 1.64;
    ring(ctx, 0, 0, 343 + 2.47 * i, i % 3 === 0 ? '#b61a21' : '#480c15', 1.1, a, a + 1.7 + hash(i, 23) * 4.1);
  }
  ctx.restore();
  if (insert > 0) {
    const yellow = '#f6ff38';
    arc(ctx, CX, CY, 130, 192, Math.PI * .5, Math.PI * (.5 + insert), yellow);
    if (seal > 0) clipped(ctx, CX + 131, CY - 196, 65 * seal, 392, () => arc(ctx, CX, CY, 130, 192, 0, TAU, yellow));
    const head = Math.PI * (.5 + insert) - .20 - seal * 1.94;
    ring(ctx, CX, CY, 185, '#a5b41a', 1.8, Math.max(Math.PI * .5, head - .4), Math.max(Math.PI * .5, head));
  }
}

function releasePrint(ctx: C2, radius: number, inner: number, fracture: number) {
  ring(ctx, CX, CY, lerp(radius, 475, fracture), fracture > .78 ? '#98531c' : '#701320', 2);
  ring(ctx, CX, CY, lerp(inner, 168, fracture), fracture > .78 ? '#777224' : '#550c21', 2);
  const fall = at(fracture, .12, 1);
  for (let i = 0; i < 270; i++) {
    const key = hash(i, 92);
    if (key < fall * .95) continue;
    const a = TAU * i / 270;
    const drift = (hash(i, 10) - .45) * fall * 115;
    const r = lerp(radius, 499, fall * .69) + drift;
    const angle = a + (hash(i, 53) - .5) * fall * .085;
    const width = 17 + 9 * key - 12 * fall;
    arc(ctx, CX, CY, r - width * .5, r + width * .5, angle, angle + .022 - .011 * fall, fracture >= .75 ? '#ae221f' : RED);
    if (i % 3 === 0 && key > .48) {
      const ri = lerp(inner, 169, fall) + drift * .11;
      arc(ctx, CX, CY, ri - 2, ri + 2, angle, angle + .038, '#9e1737');
    }
  }
}

export function bufferTracks(paintPortrait?: PaintPortrait) {
  function load(f: BufferFrame) {
    const { bg, fg, t } = f;
    if (t < 1 / FPS) {
      bufferReadout(fg, 0, RED, { onlyType: true });
      return;
    }
    const value = EARLY_COUNTS.reduce((n, [when, count]) => t >= when / .967 * COUNT_AT ? count : n, 0);
    const reveal = at(t, .1, .38);
    const sweep = at(t, .22, BUFFER_LOAD_DURATION);
    const radius = 435 - 40 * easeOut(at(t, .032, .18)) + 39 * at(t, .25, 2.0) + 7 * sweep;
    const start = lerp(-1.92, -1.71, at(t, .2, 1.25)) + .20 * sweep;
    const end = start + TAU * .26 * easeOut(at(t, .038, COUNT_AT));
    bufferField(bg);
    ring(bg, CX, CY, radius - 29, '#550e21', 1.8);
    ring(bg, CX, CY, 149, '#330913', 1.7, .62, 4.9);
    activeTrack(bg, radius, 10 + 11 * reveal, start, end);
    if (value > 0) {
      activeTrack(bg, 149, 4.5, start - sweep * 4.2, start + .38 - sweep * 4.2, false);
      paintPortrait?.(f, 338 + 23 * at(t, .2, 1.45) + 12 * sweep, t * FPS, 4 * reveal);
      trackPacket(bg, radius - 17, start + TAU * sweep, '#cb2652');
    }
    bufferReadout(fg, value, RED);
  }

  function lock(f: BufferFrame, elapsed: number) {
    const frame = elapsed * FPS;
    const { bg, fg } = f;
    const insert = easeOut(at(elapsed, .26, 1.08));
    const seal = at(elapsed, .78, 1.42);
    bufferField(bg);
    ring(bg, CX, CY, 398, '#530d20', 1.8);
    activeTrack(bg, 434, 21, -1.71, .018);
    lockPrint(bg, frame, insert, seal);
    trackPacket(bg, 400, .7 - elapsed * 3.5, '#cf234d');
    paintPortrait?.(f, 364 - elapsed * 8, 73 + frame, 10);
    bufferReadout(fg, 26, RED);
  }

  function resume(f: BufferFrame, elapsed: number, duration: number) {
    const release = 6 / FPS;
    const paintTime = duration - release;
    const source = 44 * at(elapsed, 0, paintTime);
    const fracture = at(elapsed, paintTime, duration);
    const value = RETURN_COUNTS.reduce<number | null>((n, [when, count]) => source >= when ? count : n, null);
    const travel = source / 44;
    const shrink = lerp(travel, easeOut(travel), .62);
    const radius = lerp(891, 610, shrink);
    const inner = lerp(350, 218, shrink);
    const turn = .36 * travel;
    const start = -1.94 + turn;
    const innerStart = -1.94 - turn * 1.4;
    const outerEnd = start + TAU * lerp(.59, 1, easeOut(at(source, 0, 27)));
    const innerEnd = innerStart + TAU * lerp(.66, 1, at(source, 0, 28));
    const yellow = elapsed >= paintTime;
    bufferField(f.bg, !yellow);
    dialField(f.bg, () => {
      if (fracture > .13) {
        releasePrint(f.bg, radius, inner, fracture);
      } else {
        ring(f.bg, CX, CY, radius, '#5c1027', 2);
        ring(f.bg, CX, CY, inner, '#440e24', 2);
        activeTrack(f.bg, radius, 23, start, outerEnd);
        activeTrack(f.bg, inner, 8, innerStart, innerEnd, false);
        trackPacket(f.bg, radius - 18, .34 + travel * 4.8, '#bd174a');
        trackPacket(f.bg, inner + 12, 1.2 - travel * 5.8, '#db2451');
      }
    });
    paintPortrait?.(f, 336 - 14 * at(source, 4, 40), source + fracture * 9, 4 + 15 * fracture);
    bufferReadout(f.fg, value, yellow ? LEMON : RED, { wide: true, yellow });
  }

  return { load, lock, resume };
}

export async function createBufferDial() {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera();
  const anchor = new THREE.Vector3(0, .9, 0);
  const material = contourMaterial({
    line: 0x2428c9, body: 0x070a39, freq: 81, width: .74, line2: 0x171ba4,
    freq2: 38, axis2: 'theta', width2: .5, opacity: .81,
  });
  const body = await makeBody('armor', material.mat).catch((error) => {
    material.mat.dispose();
    throw error;
  });
  fitHeight(body.root, 1.8);
  body.pose(POSES.stand);
  scene.add(body.root);

  const tracks = bufferTracks((f, scale, phase, echo) => {
    material.u.offset.value = phase * .052;
    material.u.offset2.value = phase * -.032;
    body.root.rotation.y = .07 * Math.sin(phase * .14) + .08;
    pxOrtho(camera, CX - 19, CY - 4, scale, anchor);
    f.three = { scene, camera };
    text(f.fg, 'VR–X097', CX + 190, CY - 70, { size: 29, family: F.mono, weight: 700, rot: 90, color: '#101362', alpha: .6 });
    for (let i = 0; i < 11; i++) {
      const strength = hash(i, 29);
      const y = CY - 213 + i * 43;
      const flicker = Math.sin(phase * .18 + i * 1.22);
      f.fg.fillStyle = strength > .69 ? '#0e135e' : '#060a30';
      f.fg.fillRect(CX - 114 + flicker * 9 - echo, y, 20 + strength * 44 + echo, i % 4 === 0 ? 2 : 1);
      f.fg.fillRect(CX + 106 + flicker * 6, y + 3, 7 + strength * 28, 1);
    }
  });
  return {
    ...tracks,
    dispose() {
      body.mesh.skeleton.dispose();
      material.mat.dispose();
    },
  };
}
