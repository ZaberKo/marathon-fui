/**
 * 1:00–1:20 — the new shell is printed slice by slice while the psyche waits
 * in the buffer; then PLEASE STAND BY over a full cobalt field (in silence).
 */
import * as THREE from 'three/webgpu';
import { abs, float, fract, mix, positionWorld, smoothstep, step, uniform, vec3 } from 'three/tsl';
import type { ShotDef } from '../engine';
import { clamp01, hash } from '../engine';
import { C, F, checker, frameRect, line, microRows, rect, ring, stripes, text } from '../draw';
import { backdrop, PAL_BLUE } from '../backdrop';
import { makeBody, POSES } from '../models/body';
import { brainGeometry } from '../models/anatomy';
import { segmentsToLines, skinnedPositions, sliceAxis } from '../models/slices';
import { contourMaterial } from '../../three/materials';
import { ANCHORS } from './cues';
import { canvasPlane, cutGlitch, easeInOutCubic, persp, pixelCluster, px, smooth, span } from './kit';


export const s6: ShotDef[] = [
  {
    id: 'S13',
    t0: ANCHORS.print,
    t1: 73.0,
    title: 'A new shell is printed',
    note: 'No machine, just the work. The body lies on its back, long axis up the frame, arms resting at its sides, divided into eight segments by cross-section frames. Every segment prints at once — layer lines behind a moving front with its real cross-section contour — and every frame is wired back to the psyche: the brain on its grid at left, feeding all fronts through one bus.',
    build: async () => {
      const scene = new THREE.Scene();
      const cam = persp(30, 0.05, 60);
      const NSEG = 8;
      const kU = uniform(0);
      const segLenU = uniform(0.25);
      const zminU = uniform(-1);
      const shellMat = contourMaterial({ line: 0xff3a5a, body: 0x0a0310, freq: 90, width: 0.85, axis: 'z', line2: 0x5a2a8a, freq2: 14, axis2: 'x', width2: 0.6, rim: 0xff6a8a, rimWidth: 0.32 });
      const lz = positionWorld.z.sub(zminU).div(segLenU);
      const fr = fract(lz);
      shellMat.mat.opacityNode = step(fr, kU);
      shellMat.mat.alphaTest = 0.5;
      const band = float(1).sub(smoothstep(float(0.0), float(0.03), abs(fr.sub(kU))));
      shellMat.mat.colorNode = mix(shellMat.mat.colorNode as never, vec3(1.0, 0.95, 0.75), band);
      const body = await makeBody('runner', shellMat.mat);
      body.pose(POSES.lying);
      body.root.rotation.x = -Math.PI / 2;
      body.root.position.set(0.42, 0.135, 0.9);
      scene.add(body.root);
      scene.updateMatrixWorld(true);
      const wp = skinnedPositions(body.mesh);
      let zmin = Infinity;
      let zmax = -Infinity;
      for (let i = 2; i < wp.length; i += 3) {
        zmin = Math.min(zmin, wp[i]);
        zmax = Math.max(zmax, wp[i]);
      }
      zmin -= 0.01;
      zmax += 0.01;
      const segLen = (zmax - zmin) / NSEG;
      segLenU.value = segLen;
      zminU.value = zmin;
      const idx = body.mesh.geometry.getIndex()!.array;
      // cross-section frames (perpendicular to the body axis) + a node on each
      const FW = 0.7;
      const FH = 0.4;
      const frameMat = new THREE.LineBasicMaterial({ color: 0x2a6cff });
      const nodes: THREE.Vector3[] = [];
      for (let i = 0; i <= NSEG; i++) {
        const z = zmin + i * segLen;
        const w = FW * (i === 0 || i === NSEG ? 0.8 : 1) * (1 - Math.abs(i - 3) * 0.035);
        const fr2 = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, FH)), frameMat);
        fr2.position.set(0.42, FH / 2, z);
        scene.add(fr2);
        if (i < NSEG) nodes.push(new THREE.Vector3(0.42 - w / 2, FH * 0.8, z));
      }
      // floor registration grid
      const grid = new THREE.GridHelper(4, 40, 0x0e1650, 0x0a1040);
      scene.add(grid);
      // precomputed front contours: 18 positions per segment
      const STEPS = 18;
      const fronts: THREE.LineSegments[][] = [];
      for (let sgi = 0; sgi < NSEG; sgi++) {
        const list: THREE.LineSegments[] = [];
        for (let k = 0; k < STEPS; k++) {
          const z = zmin + sgi * segLen + ((k + 0.5) / STEPS) * segLen;
          const ln = segmentsToLines(sliceAxis(wp, idx, 2, z), 0xffffff);
          ln.visible = false;
          scene.add(ln);
          list.push(ln);
        }
        fronts.push(list);
      }
      // the psyche: a brain on a grid platform over a blue panel, left of the body
      const BRAIN = new THREE.Vector3(-0.92, 0.3, -0.42);
      const panel = canvasPlane(1.3, 1.05, 1024, { transparent: false });
      {
        const c = panel.ctx;
        c.fillStyle = '#0a1ad8';
        c.fillRect(0, 0, panel.cv.width, panel.cv.height);
        c.fillStyle = '#000';
        for (let i = 0; i < 9; i++) c.fillRect(40 + i * 104, 60, 52, 34);
        c.fillRect(0, panel.cv.height - 120, panel.cv.width, 40);
        c.fillRect(panel.cv.width - 260, 200, 220, 18);
        c.fillStyle = '#3a5aff';
        c.font = `700 40px ${F.mono}`;
        c.fillText('PSYCHE 0447 · BUFFER', 40, 170);
        c.fillStyle = '#e8d805';
        for (let i = 0; i < 4; i++) c.fillRect(860, 330 + i * 70, 24, 40);
        panel.tex.needsUpdate = true;
      }
      panel.mesh.rotation.x = -Math.PI / 2;
      panel.mesh.position.set(BRAIN.x + 0.12, 0.002, BRAIN.z + 0.05);
      scene.add(panel.mesh);
      const pgrid = new THREE.GridHelper(0.62, 10, 0x9ab0ff, 0x6a80ff);
      pgrid.position.set(BRAIN.x, 0.012, BRAIN.z);
      scene.add(pgrid);
      const psy = new THREE.Mesh(brainGeometry(24, 6), contourMaterial({ line: 0x38f5d4, body: 0x02101a, freq: 30, width: 0.9, axis: 'y', space: 'local', rim: 0x5cff8a, rimWidth: 0.4 }).mat);
      psy.scale.setScalar(0.2);
      psy.position.copy(BRAIN);
      scene.add(psy);
      const v = new THREE.Vector3();
      const anchor = new THREE.Vector3(BRAIN.x + 0.16, 0.2, BRAIN.z + 0.02);
      const end = ANCHORS.printEnd - ANCHORS.print; // 12.05
      const GLITCH = ['#77f600', '#ff40c0', '#38f5d4', '#ffffff', '#2a40ff', '#e8d805'];
      const YEL = '#e8d805';
      return {
        draw(f) {
          const { bg, fg, t } = f;
          backdrop(bg, { seed: 131, dx: t * 10, alpha: 0.4, pal: PAL_BLUE });
          // parallel progress with mechanical steps near the end (the score's hits)
          let k = smooth(span(t, 0.5, end - 0.6)) * 0.93;
          if (t > end - 3.9) k = Math.max(k, 0.93 + Math.floor((t - (end - 3.9)) / 0.8) * 0.0175);
          if (t >= end) k = 1.01;
          kU.value = k;
          fronts.forEach((list) => list.forEach((ln, j) => (ln.visible = k < 1 && j === Math.min(STEPS - 1, Math.floor(k * STEPS)))));
          psy.rotation.y = t * 0.5;
          // high camera from the feet end: the body reads vertically, head at the top
          const u = easeInOutCubic(span(t, 0, 13));
          cam.position.set(0.0 + u * 0.1, 3.55 - u * 0.3, 2.05 - u * 0.1);
          cam.lookAt(-0.14 + u * 0.06, 0.1, 0.02);
          cam.updateMatrixWorld();
          f.three = { scene, camera: cam };
          // wires: brain → bus → every segment's node; a lead from the node to its front
          const a = px(f, cam, anchor);
          const J = { x: a.x + 70, y: a.y };
          fg.strokeStyle = YEL;
          fg.lineWidth = 1.4;
          fg.beginPath();
          fg.moveTo(a.x, a.y);
          fg.lineTo(J.x, J.y);
          fg.stroke();
          for (let i = 0; i < 5; i++) rect(fg, a.x + 10 + i * 14 - 3, a.y - 3, 6, 6, YEL);
          const st = Math.floor(t * 14);
          for (let sgi = 0; sgi < NSEG; sgi++) {
            const nd = px(f, cam, nodes[sgi]);
            fg.strokeStyle = YEL;
            fg.lineWidth = 1.2;
            fg.beginPath();
            fg.moveTo(J.x, J.y);
            const c1x = J.x + 110;
            const c2x = nd.x - 140;
            fg.bezierCurveTo(c1x, J.y + (sgi - 3.5) * 8, c2x, nd.y, nd.x, nd.y);
            fg.stroke();
            // signal packets running to the segment
            const ph = (t * 0.7 + sgi * 0.13) % 1;
            const bx = (1 - ph) ** 3 * J.x + 3 * (1 - ph) ** 2 * ph * c1x + 3 * (1 - ph) * ph * ph * c2x + ph ** 3 * nd.x;
            const by = (1 - ph) ** 3 * J.y + 3 * (1 - ph) ** 2 * ph * (J.y + (sgi - 3.5) * 8) + 3 * (1 - ph) * ph * ph * nd.y + ph ** 3 * nd.y;
            if (k < 1) rect(fg, bx - 2.5, by - 2.5, 5, 5, '#ffffff');
            // node: ring + crosshair
            ring(fg, nd.x, nd.y, 7, '#e8ecff', 1.5);
            line(fg, nd.x - 10, nd.y, nd.x + 10, nd.y, '#e8ecff', 1);
            line(fg, nd.x, nd.y - 10, nd.x, nd.y + 10, '#e8ecff', 1);
            text(fg, `S${sgi + 1}`, nd.x - 34, nd.y - 8, { size: 12, family: F.mono, weight: 700, color: YEL });
            if (k < 1) {
              // lead to the moving front + glitch blocks on it
              v.set(0.42, 0.24, zmin + sgi * segLen + k * segLen);
              const b = px(f, cam, v);
              fg.strokeStyle = 'rgba(232,236,255,0.8)';
              fg.lineWidth = 1;
              fg.beginPath();
              fg.moveTo(nd.x, nd.y);
              fg.lineTo(b.x, b.y);
              fg.stroke();
              for (let q = 0; q < 5; q++) {
                if (hash(sgi, q, st) < 0.4) continue;
                const w = 5 + hash(sgi, q, st, 1) * 22;
                const h = 3 + hash(sgi, q, st, 2) * 7;
                rect(fg, b.x - 30 + hash(sgi, q, st, 3) * 60, b.y - 6 + (hash(sgi, q, st, 4) - 0.5) * 16, w, h, GLITCH[Math.floor(hash(sgi, q, st, 5) * GLITCH.length)]);
              }
            }
          }
          const pb = px(f, cam, BRAIN);
          text(fg, 'PSYCHE 0447', pb.x - 70, pb.y + 104, { size: 14, family: F.mono, weight: 700, color: '#38f5d4' });
          text(fg, 'BUFFER → 8 FRONTS', pb.x - 70, pb.y + 122, { size: 12, family: F.mono, weight: 700, color: YEL });
          const pct = Math.floor(Math.min(1, k) * 100);
          text(fg, 'PRINTING SHELL 07', 96, 110, { size: 30, weight: 800, color: C.white, stretch: 'semi-expanded' });
          text(fg, `8 SEGMENTS · PARALLEL · ${String(pct).padStart(3, '0')}%`, 96, 140, { size: 16, family: F.mono, weight: 700, color: '#8aa0ff' });
          for (let sgi = 0; sgi < NSEG; sgi++) {
            rect(fg, 96 + sgi * 54, 156, 48, 6, '#0a1460');
            rect(fg, 96 + sgi * 54, 156, 48 * Math.min(1, k), 6, C.lemon);
          }
          if (t > end) {
            const fl = clamp01(1 - (t - end) / 0.4);
            rect(fg, 0, 0, 1920, 1080, `rgba(232,236,255,${0.35 * fl})`);
            text(fg, 'SHELL 07 · PRINTED', 960, 1010, { size: 40, weight: 800, color: C.lemon, align: 'center', stretch: 'semi-expanded' });
          }
          cutGlitch(f, t, 0.1, ['#000', '#8a7aff'], 16);
          f.post.lift = 0.85;
        },
      };
    },
  },
  /* ---------------------------------------------------------------- */
  {
    id: 'S14',
    t0: 73.0,
    t1: ANCHORS.swell,
    title: 'Please stand by',
    note: 'Hold frame. A full cobalt field — no black at all — the new shell idling in white contour lines; the lockup alternates PLEASE / STAND BY. The score drops out; the picture waits with you.',
    build: async () => {
      const scene = new THREE.Scene();
      const cam = persp(28);
      const body = await makeBody('runner', contourMaterial({ line: 0xa8baff, body: 0x0716f8, freq: 32, width: 0.95, rim: 0xd0dcff, rimWidth: 0.25 }).mat);
      scene.add(body.root);
      return {
        draw(f) {
          const { bg, fg, t, T } = f;
          rect(bg, 0, 0, 1920, 1080, '#0716f8');
          body.clip('idle', t + 0.5);
          const a = -0.6 + t * 0.12;
          cam.position.set(Math.sin(a) * 3.4, 1.25, Math.cos(a) * 3.4);
          cam.lookAt(0, 1.0, 0);
          f.three = { scene, camera: cam };
          const y = 540;
          checker(fg, 390, y - 100, 2, 2, 100, C.white);
          checker(fg, 1335, y - 100, 2, 2, 100, C.white);
          for (const [x, yy] of [[390, 320], [390, 760], [1520, 320], [1520, 760]] as const) frameRect(fg, x, yy, 30, 30, C.white, 2);
          rect(fg, 610, y - 100, 160, 200, '#0716f8');
          pixelCluster(fg, 620, y - 80, 18, C.white, 17);
          const silent = T > ANCHORS.silence;
          const word = Math.floor(t / (silent ? 1.0 : 0.5)) % 2 === 0 ? 'PLEASE' : 'STAND BY';
          rect(fg, 790, y - 100, 520, 200, '#0716f8');
          microRows(fg, 800, y - 65, ['LNKTL  ■■  LATCH  LINK', 'PULL ●  KL2 KL4'], { size: 15, family: F.mono, weight: 700, color: C.white, lh: 17 });
          text(fg, word, 800, y + 60, { size: 98, weight: 800, color: '#2ee866', stretch: word.length > 6 ? 'condensed' : 'normal' });
          stripes(fg, 1180, y + 70, 120, 22, { period: 10, color: '#2ee866', angle: 45 });
          const cure = clamp01(t / 7.4);
          rect(fg, 800, y + 82, 380, 4, '#0a12a0');
          rect(fg, 800, y + 82, 380 * cure, 4, '#2ee866');
          text(fg, `CURING ${String(Math.floor(cure * 100)).padStart(3, '0')}%`, 1190, y + 90, { size: 12, family: F.mono, weight: 700, color: C.white });
          line(fg, 0, 1040, 1920, 1040, 'rgba(255,255,255,0.25)', 1);
          cutGlitch(f, t, 0.1, [C.blue, C.white], 17);
          f.post.lift = 0.2;
          f.post.mottle = 0.9;
          f.post.scan = 0.6;
          void hash;
        },
      };
    },
  },
];
