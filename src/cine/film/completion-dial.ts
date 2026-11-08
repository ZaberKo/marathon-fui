import type { C2 } from '../engine';
import { H, W, clamp01, easeOut, hash, lerp } from '../engine';
import { C, F, arc, microRows, plus, ring, text } from '../draw';
import { dialField } from '../rings';
import { bufferField, yellowBufferGuide } from './buffer-dial';

const TAU = Math.PI * 2;
const RAD = Math.PI / 180;
const CX = W / 2;
const CY = H / 2;
const at = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const COMPLETION_RADIUS = 270;

const RELAY_MARK = new Path2D('M0 0H23V24H0Z M0 51H23V74H0Z M51 0H74V23H51Z M51 51H74V74H51Z M37 5A32 32 0 1 1 36.99 5Z M37 24A13 13 0 1 0 37.01 24Z');

function relayReadout(ctx: C2, frame: number, compact: boolean) {
  const scale = compact ? .43 : 1;
  ctx.save();
  ctx.translate(CX + 205 * scale, CY - 62 * scale);
  ctx.rotate(Math.PI / 2);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#82ff1b';
  ctx.fill(RELAY_MARK);
  const name = compact ? 'COMPLETE' : 'DEFRAG'.slice(0, Math.floor(at(frame, 84, 99) * 6));
  text(ctx, name, -13, 118, { size: 54, weight: 540, tracking: 1, color: '#7dff0c' });
  microRows(ctx, -134, -24, ['3S K  3S K  3S K', '3S UV  3S UV  3S UV'], { size: 11, family: F.mono, color: '#688e28', lh: 12 });
  microRows(ctx, 207, -24, ['3S K  3S K  3S K', '3S UV  3S UV  3S UV'], { size: 11, family: F.mono, color: '#688e28', lh: 12 });
  text(ctx, 'CORE–86', -80, 48, { size: 12, family: F.mono, color: '#8aba29' });
  text(ctx, 'CORE–86', 174, 48, { size: 12, family: F.mono, color: '#8aba29' });
  ctx.restore();
}

const RELAY_CUTS = Array.from({ length: 192 }, (_, i) => ({
  angle: i * TAU / 192,
  radius: 180 + hash(i, 23) * 32,
  size: 2 + hash(i, 31) * 9,
  block: hash(i, 79) > .83,
}));

function relay(ctx: C2, frame: number) {
  bufferField(ctx);
  const shed = at(frame, 13, 34);
  const radius = 464 - 57 * easeOut(shed);
  const turn = .036 * frame;
  const yellow = frame < 2;
  const ink = yellow ? '#ebff39' : '#99ff19';
  ring(ctx, CX, CY, radius, ink, 2.25, lerp(.84, TAU - 2.13, shed), TAU + .39);
  ring(ctx, CX, CY, 145, '#62771d', 1.75);
  ctx.save();
  ctx.translate(CX, CY);
  ctx.rotate(turn);
  const outer = 220 - 20 * at(frame, 14, 31);
  if (frame < 33) {
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      arc(ctx, 0, 0, outer - 42, outer, a + .038, a + 1.425 - .26 * shed, ink);
    }
    ctx.fillStyle = '#0c2003';
    for (const cut of RELAY_CUTS) {
      const r = cut.radius + outer - 220;
      ctx.save();
      ctx.rotate(cut.angle);
      ctx.fillRect(r, -cut.size * .5, cut.size, cut.size);
      if (cut.block) {
        ctx.translate(r - 8, 0);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-7, -13, 14, 26);
      } else {
        ctx.fillRect(r - 6, cut.size, 3, 3);
      }
      ctx.restore();
    }
  }
  ctx.restore();

  if (frame < 23) {
    const retract = at(frame, 12, 23);
    const inner = 100 - 30 * retract;
    const outer = 166 - 88 * retract;
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(-.064 * frame);
    arc(ctx, 0, 0, inner, outer, retract * 2.4, TAU, '#98ff12');
    ring(ctx, 0, 0, outer - 5, '#244008', 1.8, retract * 2.4, TAU);
    for (let i = 0; i < 30; i++) {
      const a = i * TAU / 30;
      const key = hash(i, 93);
      if (key < retract) continue;
      arc(ctx, 0, 0, 54 + key * 8, inner - 6, a, a + .176 * (1 - retract), i % 5 ? '#96e82a' : '#385b0e');
      const r = lerp(inner, outer, hash(i, 68));
      ring(ctx, 0, 0, r, '#36531e', 1.3, a, a + .018 + hash(i, 24) * .12);
    }
    ctx.restore();
  }
}

const CHIPS = Array.from({ length: 120 }, (_, i) => ({
  angle: (37 + i * 1.97) * RAD,
  birth: 13 + i / 5.5 + hash(i, 43) * 2.6,
  depth: hash(i, 83),
  length: 12 + hash(i, 73) * 113,
  width: 2 + hash(i, 15) * 13,
  color: ['#c8ccc6', '#778275', '#404740', '#b9c4b2', '#8cff19', '#264922'][Math.floor(hash(i, 18) * 6)],
}));

/** The small relay sheds its teeth clockwise before the macro shot cuts in. */
function looseRadials(ctx: C2, frame: number) {
  ctx.save();
  ctx.translate(CX, CY);
  for (const chip of CHIPS) {
    if (frame < chip.birth) continue;
    const travel = easeOut(at(frame, chip.birth, chip.birth + 13));
    const r = 178 + chip.depth * 86 + 68 * travel;
    ctx.save();
    ctx.rotate(chip.angle + .16 * travel);
    ctx.fillStyle = chip.color;
    ctx.fillRect(r, -chip.width * .5, chip.length * (.18 + .82 * travel), chip.width);
    if (chip.width > 11) {
      ctx.fillStyle = '#a7c2a4';
      ctx.fillRect(r + 4, chip.width * .1, chip.length * .48 * travel, 1.5);
    }
    ctx.restore();
  }
  ctx.restore();
  const disperse = easeOut(at(frame, 12, 33));
  const bits = 8 + Math.floor(disperse * 19);
  for (let i = 0; i < bits; i++) {
    const x = 1048 + 270 * hash(i, 31) + 29 * disperse;
    const y = 727 + 191 * hash(i, 57) + 26 * disperse;
    const wide = hash(i, 32);
    ctx.fillStyle = wide > .8 ? '#c9ccc3' : wide > .65 ? '#82e11d' : '#565d56';
    ctx.fillRect(x, y, (7 + wide * 28) * disperse, wide > .8 ? 19 : 3 + 13 * wide);
  }
}

// Major sectors carry broad silver areas, with local families of gray and
// colored stripes. Radii and arrival times differ between neighboring tracks.
type MetalSector = readonly [from: number, to: number, inside: number, outside: number, cue: number, fill: string, streak: string];
const METAL: readonly MetalSector[] = [
  [-174, -151, .81, .995, 14, '#d1d4ce', '#666f67'],
  [-170, -156, .67, .81, 31, '#d7dcd6', '#b1b8af'],
  [-158, -137, .708, .984, 3, '#242a26', '#adb7af'],
  [-135, -108, .685, 1.0, 10, '#c9cec9', '#3d493f'],
  [-111, -83, .795, .981, 28, '#c3c9c2', '#59625a'],
  [-83, -62, .671, .987, 55, '#d6d9d4', '#2b302f'],
  [-60, -50, .738, .976, 26, '#1f401e', '#497745'],
  [-51, -34, .692, 1.00, 11, '#718072', '#dadcd7'],
  [-35, 15, .587, 1.007, 8, '#dadcd7', '#8d9690'],
  [16, 27, .606, 1.004, 2, '#c8cec7', '#626d64'],
  [26, 36, .676, 1.006, 17, '#999898', '#c181b5'],
  [35, 48, .716, 1.002, 5, '#72bb2f', '#a8ff5c'],
  [48, 59, .674, .997, 6, '#1d4016', '#649f2c'],
  [58, 74, .699, .976, 45, '#bdc4b6', '#5c6458'],
  [75, 109, .683, .990, 52, '#d8dbd4', '#9aa49a'],
  [106, 126, .697, 1.002, 46, '#80c037', '#d6e6b9'],
  [125, 138, .672, .989, 35, '#d4d7d1', '#2a362d'],
  [136, 155, .694, .990, 48, '#687267', '#a5afa3'],
  [152, 174, .681, 1.009, 57, '#d2d6ce', '#47574a'],
  [170, 187, .692, .994, 49, '#223f23', '#77a477'],
];

const COMB = Array.from({ length: 352 }, (_, i) => ({
  angle: i * TAU / 352,
  length: .035 + hash(i, 71) * .092,
  inset: .004 + hash(i, 28) * .025,
  strength: hash(i, 23),
}));

function metalTracks(ctx: C2, frame: number, radius: number, compact: boolean) {
  const rate = compact ? 1.14 : 1;
  const turn = .0035 * frame + .085 * easeOut(at(frame, 0, 30));
  const innerTurn = .32 - .009 * frame;
  ctx.save();
  ctx.translate(CX, CY);
  if (!compact && frame < 29) {
    ctx.globalAlpha = 1 - at(frame, 11, 29);
    arc(ctx, 0, 0, radius * .809, radius * 1.015, -.71 + turn, -.46 + turn, '#d3d9d3');
    arc(ctx, 0, 0, radius * .802, radius * 1.013, -.31 + turn, -.09 + turn, '#8abe42');
    arc(ctx, 0, 0, radius * .784, radius * .991, -2.70 + turn, -2.41 + turn, '#94bf6a');
    ctx.globalAlpha = 1;
  }
  for (const [index, [start, end, r0, r1, cue, fill, streak]] of METAL.entries()) {
    const life = compact ? 1 : easeOut(at(frame, cue, cue + 18));
    if (life === 0) continue;
    const width = (end - start) * RAD * life;
    const angle = start * RAD + turn * (r0 < .72 ? .54 : 1) - (1 - life) * .19;
    const inner = radius * (compact ? Math.max(.56, r0 - .105) : r0);
    const outer = radius * r1;
    arc(ctx, 0, 0, inner, outer, angle, angle + width, fill);
    const dense = index % 3 === 2 || index === 11;
    const stripeCount = dense ? 37 : 16;
    for (let i = 0; i < stripeCount; i++) {
      const key = hash(i, index, 49);
      if (key < .22) continue;
      const a = angle + width * hash(i, index, 17);
      const ri = lerp(inner, outer, hash(i, index, 38) * .62);
      const ro = lerp(ri, outer, .52 + hash(i, index, 26) * .48);
      const shade = key > .91 ? '#2b342d' : key > .76 ? '#aeb7ac' : streak;
      arc(ctx, 0, 0, ri, ro, a, Math.min(angle + width, a + (.0011 + key * (dense ? .012 : .006)) * rate), shade);
    }
    if (dense) {
      const cursor = angle + width * ((frame * .021 + hash(index, 6)) % 1);
      arc(ctx, 0, 0, lerp(inner, outer, .44), outer, cursor, Math.min(angle + width, cursor + .014), '#e5ece0');
    }
  }
  const sweep = at(frame, 1, 65);
  const edgeLead = compact ? 0 : 1 - at(frame, 3, 49);
  if (!compact) arc(ctx, 0, 0, radius * .564, radius * .667, -.76 + innerTurn * .45, -.01 + innerTurn * .45, '#050705');
  const open = compact ? 1 - at(frame, 94, 132) : 0;
  if (open > 0) {
    const begin = -1.21 + turn;
    arc(ctx, 0, 0, radius * .622, radius * 1.027, begin, begin + .47 * open, '#000');
    for (let i = 0; i < 21; i++) {
      const a = begin + i * .022;
      if (i * .022 > .47 * open || i % 3 === 1) continue;
      arc(ctx, 0, 0, radius * (.63 + .11 * hash(i, 79)), radius * (.75 + .24 * hash(i, 89)), a, a + .009, i % 4 ? '#7a8279' : '#dce0db');
    }
  }
  for (const [lane, color] of ['#d6ded6', '#768178', '#414b44'].entries()) {
    ctx.beginPath();
    for (const tick of COMB) {
      if (Math.floor(tick.strength * 3) !== lane) continue;
      const a = (tick.angle + innerTurn + TAU) % TAU;
      const open = (tick.angle + .24) % TAU;
      const cluster = Math.sin(a * 2.6) + .31 * Math.sin(a * 6.2);
      const side = a > 2.45 && a < 4.04 ? -1 : a < .77 || a > 5.61 ? 1 : 0;
      if (side === 0 && (cluster < -.39 || (!compact && open > sweep * TAU + .4 && tick.strength < .91))) continue;
      const x = Math.cos(a);
      const y = Math.sin(a);
      const r0 = radius * ((compact ? .549 : .571) + tick.inset + .036 * Math.sin(a * 3) + (side > 0 ? .097 * edgeLead : 0));
      const r1 = r0 + radius * tick.length * (compact ? .63 : 1.15 + (side < 0 ? 1.34 * edgeLead : 0));
      ctx.moveTo(x * r0, y * r0);
      ctx.lineTo(x * r1, y * r1);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = compact ? 1.35 : lane === 0 ? 2.7 : 1.6;
    ctx.stroke();
  }
  const head = -1.54 + frame * .035;
  ring(ctx, 0, 0, radius * .525, '#92bc78', compact ? 2.1 : 3.2, head - .33, head);
  ctx.restore();
}

function macroRadials(ctx: C2, frame: number) {
  const local = frame - 38;
  const radius = 970 + 15 * Math.sin(local * .035);
  metalTracks(ctx, local, radius, false);
  ctx.save();
  ctx.translate(CX, CY);
  for (const [i, chip] of CHIPS.entries()) {
    if (i % 3 === 0 || chip.birth > local + 23) continue;
    const travel = easeOut(at(local, chip.birth - 24, chip.birth - 7));
    const r = radius * (.75 + chip.depth * .17) - travel * 280 * (1 - chip.depth);
    ctx.save();
    ctx.rotate(chip.angle - .15 + local * (.0018 + chip.depth * .0019));
    ctx.globalAlpha = (1 - .92 * at(local, 25, 62)) * (.54 + chip.depth * .46);
    ctx.fillStyle = chip.color;
    ctx.fillRect(r, -chip.width * .67, chip.length * (1.3 - travel * .51), chip.width * 1.34);
    ctx.restore();
  }
  ctx.restore();
  for (const [x, y] of [[367, 248], [649, 339], [1543, 259], [1269, 334], [371, 833], [649, 755], [1541, 831], [1269, 755]]) {
    plus(ctx, x, y, x % 3 === 1 ? 17 : 25, '#168657', 2);
  }
  if (frame >= 84) relayReadout(ctx, frame, false);
}

function compactRadials(ctx: C2, frame: number) {
  const lock = .70 * easeOut(at(frame, 126, 161)) + .30 * at(frame, 138, 194);
  const radius = lerp(306, COMPLETION_RADIUS, lock);
  if (frame < 138) {
    metalTracks(ctx, 71 + (frame - 110) * 2.24, radius, true);
    ring(ctx, CX, CY, 108, '#7e8d23', 1.65);
    if (frame < 136) relayReadout(ctx, frame, true);
    return;
  }

  arc(ctx, CX, CY, radius * .51, radius, 0, TAU, C.lime);
  ring(ctx, CX, CY, radius * .3825, '#0a2a00', 2);
  const tail = 1 - at(frame, 138, 194);
  if (tail <= 0) return;
  const angle = (89 + (1 - tail) * 132) * RAD;
  ctx.save();
  ctx.globalAlpha = .77 * tail;
  for (let i = 0; i < 64; i++) {
    const a = angle + i * .024 * tail;
    const key = hash(i, 86);
    const r = radius * (.51 + key * .13);
    arc(ctx, CX, CY, r, radius - radius * .18 * hash(i, 61), a, a + .018 * tail, key > .57 ? '#e6eccc' : '#799357');
  }
  ring(ctx, CX, CY, radius * .55, '#bdff79', 2, .9, 4.77);
  ring(ctx, CX, CY, radius * 1.02, '#5d9629', 3, .53, 2.55);
  ctx.restore();
}

export function completionDial(ctx: C2, elapsed: number, duration: number) {
  // Reference-frame cue positions, sampled continuously on the film clock.
  const frame = elapsed / duration * 197;
  dialField(ctx, () => {
    if (frame < 1) {
      yellowBufferGuide(ctx);
    } else if (frame < 38) {
      relay(ctx, frame);
      if (frame > 12) looseRadials(ctx, frame);
    } else if (frame < 110) {
      macroRadials(ctx, frame);
    } else {
      compactRadials(ctx, frame);
    }
  });
}
