import type { C2 } from './engine';
import { FPS, H, W, clamp01, easeOut, hash, lerp } from './engine';
import { C, F, arc, checker, clipped, line, microRows, plus, rect, ring, text } from './draw';

const TAU = Math.PI * 2;
const RAD = Math.PI / 180;
const BLUE = '#0719f4';
const GREEN = '#29cc45';
const RED = '#ef000c';
const ASSERT_BLUE = '#1128df';
const FIELD_INSET = 60;
const at = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

export function dialField(ctx: C2, draw: () => void) {
  clipped(ctx, 0, FIELD_INSET, W, H - 2 * FIELD_INSET, draw);
}

// Angles in degrees, radii relative to the wheel, and solid ink.
type Plate = readonly [start: number, end: number, inner: number, outer: number, ink: string];
type CuePlate = readonly [...Plate, enter: number, settle: number];

// These plates have three independently moving radii. The detached green
// ribbon and the hole near one o'clock are landmarks of the protocol wheel.
const PROTOCOL: readonly CuePlate[] = [
  [-158, -129, 1.00, 1.086, GREEN, 0, 1],
  [11, 80, .767, 1.00, GREEN, 0, 1],
  [47, 82, .472, .697, GREEN, 0, 1],
  [-126, -111, .427, .755, BLUE, 0, 1],
  [-109, -91, .427, .753, BLUE, 0, 1],
  [137, 168, .535, .758, BLUE, 0, 1],
  [101, 137, .432, .547, BLUE, 0, 2],
  [86, 101, .490, .761, BLUE, 0, 2],
  [101, 137, .539, .763, BLUE, 1, 4],
  [-135, -123, .426, .775, BLUE, 5, 3],
  [-92, -66, .421, .507, GREEN, 5, 4],
  [-66, -39, .420, .521, BLUE, 6, 5],
  [-57, -6, .536, .671, GREEN, 8, 6],
  [1, 15, .461, .679, GREEN, 9, 5],
  [15, 51, .466, .765, BLUE, 9, 6],
  [77, 111, .442, .778, BLUE, 12, 6],
  [151, 181, .537, .772, BLUE, 13, 7],
  [138, 204, .418, .539, GREEN, 13, 12],
  [-53, -36, .730, .997, BLUE, 15, 5],
  [-34, -4, .679, .998, BLUE, 16, 6],
  [-1, 16, .680, 1.004, BLUE, 17, 6],
  [-178, -134, .482, .678, GREEN, 19, 8],
  [-92, -76, .495, .759, GREEN, 24, 5],
  [71, 89, .649, 1.005, BLUE, 33, 5],
  [-94, -74, .429, .526, BLUE, 34, 5],
  [-76, -8, .428, .527, BLUE, 37, 5],
  [19, 75, .432, .775, BLUE, 38, 8],
  [142, 177, 1.013, 1.083, BLUE, 41, 4],
  [-2, 20, .500, 1.009, BLUE, 47, 4],
  [17, 67, .764, .997, BLUE, 47, 7],
];

function plate(ctx: C2, spec: Plate, radius: number, phase: number, seed: number, amount = 1) {
  const [start, end, inner, outer, ink] = spec;
  const a = (start + phase) * RAD;
  const width = (end - start) * RAD * amount;
  const ri = inner * radius;
  const ro = outer * radius;
  const atAngle = (k: number) => a + width * k;
  arc(ctx, 0, 0, ri, ro, a, a + width, ink);
  arc(ctx, 0, 0, ri - radius * .022, ri + 1, atAngle(.12), atAngle(.46), ink);
  arc(ctx, 0, 0, ro - 1, ro + radius * .012, atAngle(.19), atAngle(.62), ink);
  arc(ctx, 0, 0, ro - radius * .027, ro + 2, atAngle(.70), atAngle(.84), '#000');
  arc(ctx, 0, 0, ri - 2, ri + radius * .022, atAngle(.88), atAngle(.95), '#000');
  const stamp = atAngle(.25 + hash(seed, 23) * .44);
  ctx.save();
  ctx.rotate(stamp);
  ctx.fillStyle = '#03041a';
  ctx.fillRect(ro - radius * .078, -radius * .003, radius * .036, radius * .009);
  ctx.fillRect(ro - radius * .053, -radius * .008, radius * .021, radius * .008);
  ctx.restore();
}

const METAL_RADIUS = 482;
const PROTOCOL_AXIS = W / 2 + 2;
const METAL_PLATES: readonly (readonly [plate: Plate, seed: number])[] = [
  [[-159, 8, .925, 1, '#a6afb5'], 22],
  [[12, 128, .925, .995, '#adb0b0'], 11],
  [[131, 197, .926, .98, '#2c414a'], 17],
  [[147, 246, .72, .84, '#88af37'], 17],
  [[29, 153, .70, .78, '#99b46a'], 26],
  [[-30, 104, .46, .56, '#647cd3'], 12],
  [[104, 222, .41, .56, '#3646b1'], 42],
  [[62, 90, .36, .53, '#b3d68d'], 27],
  [[-142, -120, .36, .48, '#a8d9a9'], 27],
];

/** Fine concentric lanes with a second, independent rotation. */
function trackPrint(ctx: C2, radius: number, start: number, end: number, inner: number, outer: number, ink: readonly string[], seed: number, rows: number) {
  const width = (end - start) * RAD;
  for (let i = 0; i < rows; i++) {
    const key = hash(i, seed);
    const a = start * RAD + width * key * .48;
    const b = Math.min(end * RAD, a + width * (.18 + .73 * hash(i, seed, 11)));
    const r = radius * lerp(inner, outer, i / rows);
    ring(ctx, 0, 0, r, ink[i % ink.length], i % 7 === 0 ? 3.1 : 1.25, a, b);
  }
}

function reticles(ctx: C2, spread: number, x = 0) {
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const xx = 960 + sx * spread + x;
    const y = 540 + sy * spread * .51 + (sx > 0 ? -6 : 4);
    line(ctx, xx - 36, y, xx - 7, y, '#ac0059', 3);
    line(ctx, xx + 7, y, xx + 36, y, '#ac0059', 3);
    rect(ctx, xx - 4, y - 9, 8, 5, '#c61069');
    rect(ctx, xx - 4, y + 4, 8, 5, '#c61069');
    plus(ctx, 960 + sx * spread * .53 + x, 540 + sy * spread * .34, 17, '#92054e', 2);
  }
}

const REGISTER_MARK = new Path2D('M1 14H18V30H1Z M24 1H43V16H24Z M50 1H72V17H50Z M72 20H82V32H72Z M8 34H30L17 23 28 12 56 39V50H8Z M42 35 63 17 76 28 55 49Z');

function registerReadout(ctx: C2, x: number, y: number, scale: number, ink: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = ink;
  ctx.fill(REGISTER_MARK);
  microRows(ctx, -8, -49, ['188  B91', '939  849', '939  02B'], { size: 13, family: F.mono, color: ink, lh: 15 });
  microRows(ctx, 86, -41, ['RN', 'CL X22', 'RN'], { size: 9, family: F.mono, color: ink, lh: 11 });
  ring(ctx, 104, -29, 25, ink, 1);
  rect(ctx, 130, -38, 8, 18, ink);
  text(ctx, 'R/C', 149, -35, { size: 22, weight: 800, color: ink, rot: 90 });
  text(ctx, '7R', -35, 62, { size: 12, family: F.mono, color: ink });
  ctx.restore();
}

// The open P and R share a bowl. The proportions stay the same at flash scale.
const PROTOCOL_TYPE = new Path2D([
  'M0 100V0H43Q74 0 74 28V48Q74 77 43 77H24V61H42Q58 61 58 46V30Q58 16 42 16H16V100Z',
  'M92 18V0H135Q166 0 166 27V42Q166 54 152 60Q166 68 166 100H150Q150 72 130 72H92V55H132Q150 55 150 41V29Q150 16 134 16H108V34H92Z',
  'M222 0Q258 0 258 35V65Q258 100 222 100Q186 100 186 65V35Q186 0 222 0Z M222 16Q202 16 202 36V64Q202 84 222 84Q242 84 242 64V36Q242 16 222 16Z',
  'M278 0H350V16H322V100H306V16H278Z',
  'M407 0Q443 0 443 35V65Q443 100 407 100Q371 100 371 65V35Q371 0 407 0Z M407 16Q387 16 387 36V64Q387 84 407 84Q427 84 427 64V36Q427 16 407 16Z',
  'M0 204H74V220H0Z',
  'M165 120V136H128Q109 136 109 156V184Q109 204 128 204H165V220H128Q93 220 93 185V155Q93 120 128 120Z',
  'M222 120Q258 120 258 155V185Q258 220 222 220Q186 220 186 185V155Q186 120 222 120Z M222 136Q202 136 202 156V184Q202 204 222 204Q242 204 242 184V156Q242 136 222 136Z',
  'M278 120H294V204H350V220H278Z',
].join(' '));

export function protocolFlash(ctx: C2) {
  dialField(ctx, () => {
    ctx.save();
    ctx.translate(958, 538);
    arc(ctx, 0, 0, 119, 450, 0, TAU, '#0735f3');
    ring(ctx, 0, 0, 268, '#000', 33, 1.65, 5.65);
    arc(ctx, 0, 0, 135, 226, -.72, .87, '#030818');
    trackPrint(ctx, 450, -38, 54, .29, .53, ['#0d34c5', '#1947ef', '#07155a'], 52, 43);
    trackPrint(ctx, 450, 28, 356, .86, .984, ['#102aaf', '#1735d6', '#1c4cfa'], 21, 15);
    ctx.restore();
  });
}

function metalDisc(ctx: C2) {
  ctx.save();
  ctx.translate(PROTOCOL_AXIS, 538);
  for (const [spec, seed] of METAL_PLATES) plate(ctx, spec, METAL_RADIUS, 0, seed);
  trackPrint(ctx, METAL_RADIUS, -195, 166, .87, 1.03, ['#263138', '#607781', '#a8b0ab', '#415061'], 27, 38);
  trackPrint(ctx, METAL_RADIUS, 15, 320, .33, .76, ['#283a59', '#667c87', '#3d4e24', '#546973'], 40, 55);
  trackPrint(ctx, METAL_RADIUS, -157, 233, .13, .35, ['#1c292e', '#30363a', '#3d4747'], 43, 26);
  ctx.restore();
  reticles(ctx, 616);
}

export function protocolDial(ctx: C2, elapsed: number, duration: number) {
  const playback = elapsed * FPS;
  const frames = Math.ceil(duration * FPS);
  const remaining = frames - playback;
  const source = remaining <= 9 ? 59 - remaining : lerp(1, 50, at(playback, 1, frames - 9));
  dialField(ctx, () => {
    if (playback < 1) {
      metalDisc(ctx);
      return;
    }
    const slide = at(source, 49.65, 53.15);
    const radius = 645 + 102 * easeOut(at(source, 2, 34)) + 26 * at(source, 42, 52);
    const centerX = lerp(W / 2 + 36 * at(source, 14, 24), 701, slide);
    const travel = at(source, 1, 59);
    const innerTurn = 31 * travel;
    const middleTurn = -24 * travel;
    const outerTurn = 18 * travel - 9 * easeOut(at(source, 43, 59));
    ctx.save();
    ctx.translate(centerX, 538);
    trackPrint(ctx, radius, 38 + middleTurn, 84 + middleTurn, .68, .795, ['#062c15', '#164f27', '#217b3e'], 22, 26);
    if (source > 10) trackPrint(ctx, radius, -58 + innerTurn, 6 + innerTurn, .618, .759, ['#082c15', '#1e5324', '#198940'], 10, 30);
    if (source > 21) trackPrint(ctx, radius, 151 + middleTurn, 225 + middleTurn, .61, .753, ['#0b361d', '#1b5d38', '#16512c'], 32, 29);
    PROTOCOL.forEach(([a, b, ri, ro, ink, enter, settle], i) => {
      const motion = easeOut(at(source, enter, enter + settle));
      if (motion === 0) return;
      const turn = ri >= .98 ? -1.5 * outerTurn : ro >= .90 ? outerTurn : ri < .48 ? innerTurn : middleTurn;
      const direction = ink === GREEN ? -1 : 1;
      const phase = turn + (1 - motion) * 23 * direction;
      plate(ctx, [a, b, ri, ro, ink], radius, phase, i, motion);
    });
    trackPrint(ctx, radius, 56 + middleTurn, 77 + middleTurn, .665, .791, ['#164a24', '#248946', '#0b311c'], 38, 24);
    if (source > 35) trackPrint(ctx, radius, -53 + outerTurn, -9 + outerTurn, .666, .96, ['#172abf', '#1c2bc2', '#1126bd'], 28, 21);
    // The inspection marks travel on their own paths as each plate seats.
    const lead = -1.55 + travel * 4.3;
    ring(ctx, 0, 0, radius * .748, '#4964ff', 3.2, lead - .27, lead);
    ring(ctx, 0, 0, radius * .422, '#4bb854', 2.4, -lead * .73 - .3, -lead * .73);
    if (source > 10) arc(ctx, 0, 0, radius * .77, radius * .815, lead - .027, lead, '#4964ff');
    ctx.restore();
    reticles(ctx, 617 + 98 * at(source, 15, 36) - 38 * at(source, 37, 59), -234 * slide);

    if (source >= 2) {
      const grow = at(source, 2, 18);
      ctx.save();
      ctx.translate(lerp(1035, 1019, grow) + 39 * travel - 52 * slide, lerp(352, 529, grow) - 32 * travel);
      ctx.rotate(lerp(-.84, -.055, easeOut(grow)) + .115 * at(source, 19, 48));
      registerReadout(ctx, -2, -26, 1, '#122ba9');
      if (source > 22) registerReadout(ctx, 216, -71, .93, '#173ce1');
      const label = 'DEFRAGMENTATION'.slice(0, Math.floor(at(source, 12, 38) * 15));
      text(ctx, label, 94, 1, { size: 47, weight: 750, color: '#91ff32', tracking: 2.4 });
      ctx.restore();
    }
    if (source >= 43 && source < 58) {
      const giant = source >= 56;
      ctx.save();
      ctx.translate(giant ? 951 : lerp(1113, 1068, slide), giant ? -21 : 565);
      ctx.scale(giant ? 5.76 : 1.405, giant ? 5.76 : 1.405);
      ctx.fillStyle = ctx.strokeStyle = '#59ff34';
      if (source >= 54) ctx.fill(PROTOCOL_TYPE, 'evenodd');
      else {
        ctx.lineWidth = 1.55;
        ctx.stroke(PROTOCOL_TYPE);
      }
      ctx.restore();
    }
    if (source >= 58) registerReadout(ctx, 1746, 381, 2.7, '#102bdc');
  });
}

const ASSERT_FRONT: readonly Plate[] = [
  [-12, 203, .534, 1, RED],
  [-160, -94, .533, 1.006, ASSERT_BLUE],
  [-152, -122, .537, .666, RED],
  [-120, -109, .538, .639, RED],
  [-94, -75, .532, .999, RED],
  [-72, -46, .534, .714, RED],
  [-17, 12, .698, 1.056, RED],
  [164, 206, 1.23, 1.325, RED],
  [91, 101, .534, .676, ASSERT_BLUE],
];

const ASSERT_RETURN: readonly Plate[] = [
  [-96, -61, .37, .676, RED],
  [-94, -66, .895, .989, ASSERT_BLUE],
  [-67, -49, .48, .635, ASSERT_BLUE],
  [1, 38, .455, .724, ASSERT_BLUE],
  [12, 36, .745, 1.006, RED],
  [37, 115, .759, .981, ASSERT_BLUE],
  [38, 69, .446, .758, RED],
  [69, 85, .447, .748, ASSERT_BLUE],
  [85, 139, .445, .765, RED],
  [96, 119, .975, 1.014, RED],
];

const ASSERT_CROP: readonly Plate[] = [
  [-58, -32, .421, .769, RED],
  [-45, -35, .593, .769, ASSERT_BLUE],
  [-55, -29, .972, 1.016, ASSERT_BLUE],
  [31, 65, .743, 1.011, RED],
];

type Assertion = 'subject' | 'loss' | 'print';
export const ASSERT_DURATION = { subject: 1.65, loss: 2.14, print: 2.23 } as const;
const REGISTER_WIPE = 0.44;
export const ASSERT_REVEAL = {
  loss: ASSERT_DURATION.loss - REGISTER_WIPE,
  print: ASSERT_DURATION.print - REGISTER_WIPE,
} as const;

type Diagnostic = 'blue' | 'red' | 'upright';
const diagnostics = new Map<Diagnostic, { width: number; height: number; layers: { path: Path2D; color: string }[] }>();
function diagnosticInk(kind: Diagnostic) {
  const cached = diagnostics.get(kind);
  if (cached) return cached;
  const vertical = kind !== 'red';
  const width = kind === 'upright' ? 320 : 960;
  const height = kind === 'blue' ? 335 : kind === 'red' ? 693 : 496;
  const layers = (kind === 'blue' ? ['#08184b', '#1c3dbf'] : ['#54091a', '#a00a21']).map((color) => ({ path: new Path2D(), color }));
  const stepX = vertical ? 5 : 7;
  const stepY = vertical ? 6 : 4;
  for (let y = 0; y < height; y += stepY) {
    for (let x = 0; x < width; x += stepX) {
      const groupX = Math.floor(x / (vertical ? 24 : 43));
      const groupY = Math.floor(y / (vertical ? 57 : 29));
      const lane = hash(vertical ? groupX : groupY, 11);
      const block = hash(groupX, groupY, 33);
      if (lane < .13 || block < .30 || hash(x, y, 79) > .24 + block * .52) continue;
      const bright = lane > .78 && block > .71;
      const w = bright ? stepX - 1 : 2 + Math.floor(block * 3);
      layers[Number(bright)].path.rect(x, y, Math.min(w, width - x), Math.min(bright ? 2 : 1, height - y));
    }
  }
  const ink = { width, height, layers };
  diagnostics.set(kind, ink);
  return ink;
}

function diagnosticFeed(ctx: C2, kind: Diagnostic, x: number, y: number, elapsed: number) {
  const ink = diagnosticInk(kind);
  const horizontal = kind === 'red';
  const span = horizontal ? ink.width : ink.height;
  const shift = (Math.floor(elapsed * 18) * (horizontal ? 9 : 6)) % span;
  clipped(ctx, x, y, ink.width, ink.height, () => {
    ctx.translate(x - (horizontal ? shift : 0), y - (horizontal ? 0 : shift));
    for (let copy = 0; copy < (shift ? 2 : 1); copy++) {
      for (const { color, path } of ink.layers) {
        ctx.fillStyle = color;
        ctx.fill(path);
      }
      ctx.translate(horizontal ? span : 0, horizontal ? 0 : span);
    }
  });
}

function assertionWheel(ctx: C2, radius: number, phase: number, frame: number, variant: Assertion) {
  const front = variant === 'subject';
  const mature = easeOut(at(frame, 2, 7));
  (front ? ASSERT_FRONT : ASSERT_RETURN).forEach((p, i) => {
    const drift = (p[3] >= .96 ? .68 : p[3] >= .74 ? -.87 : 1.38) * phase;
    plate(ctx, p, radius, drift, i + 36);
  });
  if (variant === 'loss') {
    ASSERT_CROP.forEach((p, i) => plate(ctx, p, radius, phase * -.61, 94 + i));
  }
  if (mature > 0) {
    const a = front ? -9 : 1;
    const b = lerp(a + 12, front ? 207 : 145, mature);
    const drift = phase * -.95 + 16 * easeOut(at(frame, 5, 23));
    if (front) {
      ctx.globalAlpha = .55 * mature;
      plate(ctx, [8, 52, .538, .71, '#4022a3'], radius, drift, 61);
      plate(ctx, [48, 89, .552, .756, '#5d189e'], radius, drift, 47);
      plate(ctx, [92, 137, .747, .932, '#52198d'], radius, drift, 58);
      plate(ctx, [137, 162, .575, .779, '#3420a5'], radius, drift, 32);
    }
    ctx.globalAlpha = .78;
    trackPrint(ctx, radius, a + drift, b + drift, .526, .837, ['#180d6e', '#231cc5', '#551da9', '#4032da', '#2b258a'], 27, 69);
    trackPrint(ctx, radius, a + drift, b + drift, .838, 1.018, ['#561d62', '#24279f', '#c51a32', '#160d58'], 17, 37);
    if (variant !== 'print') trackPrint(ctx, radius, 134 + drift, 206 + drift, .929, 1.267, ['#090f44', '#101971', '#1227a4'], 71, 38);
    ctx.globalAlpha = 1;
  }
  ctx.save();
  ctx.rotate((22 - phase * 1.17) * RAD);
  microRows(ctx, radius * .75, -30, ['188  B91', '939  02B'], { size: radius * .019, family: F.mono, color: '#3027a4', lh: radius * .021 });
  text(ctx, 'NU ○', radius * .755, -42, { size: radius * .023, weight: 800, color: '#1a32b6' });
  ctx.restore();
}

export function assertionDial(ctx: C2, variant: Assertion, elapsed: number) {
  const frame = elapsed * FPS;
  const front = variant === 'subject';
  const pair = variant === 'print';
  const duration = ASSERT_DURATION[variant];
  const exit = front ? 0 : easeOut(at(elapsed, ASSERT_REVEAL[variant], duration));
  const rise = (H - FIELD_INSET * 2) * exit;
  const scan = at(elapsed, 0, duration);
  const jump = at(frame, pair ? 14.8 : 16, pair ? 16 : 18);
  const phase = 7 * easeOut(at(elapsed, 0, .21)) + (pair ? 47 : 37) * scan;
  const outlined = variant === 'loss' ? (frame < 4 || (frame >= 6 && frame < 7)) : frame < (front ? 6 : 3.2);
  if (rise > 0) {
    const matte = FIELD_INSET * (1 - exit);
    rect(ctx, 0, 0, W, matte, C.black);
  }
  dialField(ctx, () => {
    clipped(ctx, 0, 0, W, H - FIELD_INSET - rise, () => {
      rect(ctx, 0, 0, W, H, C.black);
      ctx.save();
      ctx.translate(0, -rise);
      const cropX = 1048 - 98 * easeOut(at(frame, 2.6, 7.0)) - 46 * jump;
      const positions = pair ? [445 - jump * 16 - scan * 13, 1211 + jump * 2 + scan * 15] : [front ? 938 - scan * 24 : cropX];
      for (const [i, x] of positions.entries()) {
        const y = pair ? 533 + 29 * jump + (i === 0 ? -18 : 14) * scan : front ? 522 + scan * 17 : 12 - 21 * jump;
        const radius = pair ? 500 + 49 * jump : front ? 680 + frame * .73 : 1015 + 27 * jump;
        ctx.save();
        ctx.translate(x, y);
        if (pair) {
          ctx.beginPath();
          ctx.rect(-radius * .08, -radius * 1.12, radius * .385, radius * 1.06);
          ctx.rect(-radius * .86, radius * .08, radius * 1.92, radius * 1.12);
          ctx.clip();
        }
        ctx.rotate((front ? -1 : pair ? -6 : 59 - 4 * jump) * RAD);
        const turn = i === 0 ? phase : -phase * .76;
        assertionWheel(ctx, radius, turn, pair ? frame + 4 - i * 1.5 : frame, variant);
        if (pair) {
          // The upper register stays legible through the narrow stencil as the lower wheel turns.
          const gate = -1.55 + (i === 0 ? scan : 1 - scan) * .13;
          arc(ctx, 0, 0, radius * .54, radius * .79, gate, gate + .23, RED);
          arc(ctx, 0, 0, radius * .94, radius * 1.005, gate - .13, gate + .22, ASSERT_BLUE);
        }
        if (front && elapsed >= duration - 0.12) plate(ctx, [148, 203, 1.12, 1.55, RED], radius, phase - 9, 83);
        const lead = -0.6 + scan * (i === 0 ? 4.8 : -4.2);
        ring(ctx, 0, 0, radius * .968, '#4162ff', 4.2, lead - .38, lead);
        ring(ctx, 0, 0, radius * .508, '#b82970', 2.8, -.32 - lead * .74, -lead * .74);
        ctx.restore();
      }

      if (front && frame >= 4) {
        ctx.save();
        ctx.translate(1092 - scan * 41, 508 + scan * 34);
        ctx.rotate(-.157 + .068 * scan);
        rect(ctx, 145, -375, 780, 330, C.black);
        diagnosticFeed(ctx, 'blue', 142, -386, elapsed);
        registerReadout(ctx, 4, -70, 1.76, '#1732ca');
        registerReadout(ctx, 550, -190, 1.62, '#1a38d6');
        rect(ctx, 207, -84, 626, 112, '#020008');
        text(ctx, 'ASSERT', 211, 3, { size: 99, weight: 690, tracking: 8.3, color: outlined ? '#3e64a0' : RED, stroke: outlined ? 1.65 : 0 });
        ctx.restore();
      }

      if (variant === 'loss') {
        const x = positions[0] - 17;
        rect(ctx, x, 313, W - x, 730, C.black);
        if (frame >= 1) diagnosticFeed(ctx, 'red', x + 18, 341, elapsed);
        if (frame >= 1.8) {
          ctx.save();
          ctx.translate(x + 37, 140 - scan * 40);
          ctx.rotate(Math.PI / 2);
          registerReadout(ctx, 0, -81, 2.05, '#1838d5');
          registerReadout(ctx, 562, -199, 2, '#1b33cd');
          rect(ctx, 208, -18, 457, 102, '#050005');
          text(ctx, 'ASSERT', 216, 1, { size: 97, weight: 690, tracking: 6.4, color: outlined ? '#427cb0' : RED, stroke: outlined ? 1.55 : 0 });
          ctx.restore();
        }
      }

      if (pair) positions.forEach((x, i) => {
        const top = 60;
        diagnosticFeed(ctx, 'upright', x + 157, top, elapsed + i * .19);
        if (frame < 1) return;
        microRows(ctx, x + 13, 471 + 31 * jump, i === 0 ? ['PSYCHE 0447', 'BUFFER · OCCUPIED', 'LINK  LINK  LINK'] : ['SHELL 07', 'PRINT · STAGED', '8 FRONTS · READY'], { size: 12, family: F.mono, color: '#6779ef', lh: 14 });
        checker(ctx, x + 8, 523 + 31 * jump, 22, 5, 8, '#1632bf');
        rect(ctx, x + 270, 320 + 35 * jump, 66, 225, '#02000a');
        text(ctx, i === 0 ? 'HOLD' : 'QUEUE', x + 319, 549 + 35 * jump, { size: 54, weight: 700, color: outlined ? '#40529a' : RED, stroke: outlined ? 1.4 : 0, rot: -90, tracking: 3 });
        rect(ctx, x + 13, 569 + 31 * jump, 174 * easeOut(at(elapsed, 0.28 + i * 0.22, duration - 0.38)), 4, '#4562ec');
        ring(ctx, x + 408, 403 + 35 * jump, 12, '#1832dc', 23);
        rect(ctx, x + 375, 439 + 35 * jump, 30, 41, '#1329c0');
        ring(ctx, x + 436, 465 + 35 * jump, 18, '#1431d2', 16);
        plus(ctx, x + 545, 377, 4, '#2243d7', 4);
      });
      ctx.restore();
    });
  });
}
