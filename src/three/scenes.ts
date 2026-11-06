/**
 * Graphic-realism 3D scenes.
 * No PBR, no lights: geometry is translated into flat drafting language —
 * slice lines, pixel point clouds, extruded bar fields, 1px wireframes.
 */
import * as THREE from 'three/webgpu';
import { abs, float, fract, normalView, positionWorld, step, uniform } from 'three/tsl';
import { closedLine, cornerBox, createStage, floorGrid, toScreen, wireBox, type Stage } from './core';
import { rng } from '../lib/util';

export const PAL = {
  cobalt: 0x2424ff,
  cobaltLo: 0x10127a,
  cobaltDeep: 0x06073a,
  acid: 0x7dff1a,
  lime: 0xd4ff00,
  hazard: 0xffe000,
  crimson: 0xff2a17,
  bone: 0xececec,
  cyan: 0x38f5d4,
};

export type SceneHandle = {
  stage: Stage;
  dispose(): void;
  set?(key: string, value: unknown): void;
};

/* ================================================================== */
/* Slice material — horizontal contour lines in world space            */
/* ================================================================== */
export function sliceMaterial({ color = PAL.cobalt, rim = PAL.cyan, freq = 34, fill = 0.42 } = {}) {
  // colours as vec3 uniforms (set with setColor below)
  const toV = (hex: number) => {
    const c = new THREE.Color(hex);
    return new THREE.Vector3(c.r, c.g, c.b);
  };
  const uColor = uniform(toV(color));
  const uRim = uniform(toV(rim));
  const uFreq = uniform(freq);
  const uFill = uniform(fill);
  const uOffset = uniform(0);
  const mat = new THREE.MeshBasicNodeMaterial();
  const band = fract(positionWorld.y.mul(uFreq).add(uOffset));
  const line = step(float(1).sub(uFill), band); // 1 on the slice, 0 in the gap
  const rimF = float(1).sub(abs(normalView.z)).pow(1.6);
  mat.colorNode = uColor.add(uRim.mul(rimF.mul(0.9))).mul(line); // black in the gaps
  const setColor = (u: typeof uColor, hex: number) => u.value.copy(toV(hex));
  return { mat, uColor, uRim, uFreq, uFill, uOffset, setColor };
}

/* ================================================================== */
/* 1. SLICE RUNNER — capsule mannequin with stop-motion run cycle      */
/* ================================================================== */
type Limb = { pivot: THREE.Group; child?: Limb };

export async function mountSliceRunner(host: HTMLElement, { fps = 12, pixel = 1, color = PAL.cobalt, rim = PAL.cyan, labels = true } = {}): Promise<SceneHandle> {
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  const stage = await createStage(host, { fps, pixel, camera });
  const { scene } = stage;
  const S = sliceMaterial({ color, rim, freq: 38, fill: 0.45 });

  const cap = (r: number, len: number) => new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 16), S.mat);

  const root = new THREE.Group();
  scene.add(root);
  const pelvis = new THREE.Group();
  pelvis.position.y = 1.02;
  root.add(pelvis);

  const hip = cap(0.13, 0.12);
  hip.rotation.z = Math.PI / 2;
  pelvis.add(hip);

  const spine = new THREE.Group();
  spine.position.y = 0.08;
  pelvis.add(spine);
  const torso = cap(0.15, 0.3);
  torso.position.y = 0.26;
  torso.scale.set(1.25, 1, 0.85);
  spine.add(torso);
  const neck = cap(0.045, 0.06);
  neck.position.y = 0.56;
  spine.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 20, 16), S.mat);
  head.position.y = 0.7;
  head.scale.set(0.9, 1.1, 1);
  spine.add(head);

  const mkLimb = (parent: THREE.Object3D, at: THREE.Vector3, r1: number, l1: number, r2: number, l2: number): Limb => {
    const p = new THREE.Group();
    p.position.copy(at);
    parent.add(p);
    const u = cap(r1, l1);
    u.position.y = -(l1 / 2 + r1 * 0.6);
    p.add(u);
    const j = new THREE.Group();
    j.position.y = -(l1 + r1 * 1.1);
    p.add(j);
    const d = cap(r2, l2);
    d.position.y = -(l2 / 2 + r2 * 0.6);
    j.add(d);
    return { pivot: p, child: { pivot: j } };
  };
  const armL = mkLimb(spine, new THREE.Vector3(0.24, 0.46, 0), 0.05, 0.22, 0.042, 0.22);
  const armR = mkLimb(spine, new THREE.Vector3(-0.24, 0.46, 0), 0.05, 0.22, 0.042, 0.22);
  const legL = mkLimb(pelvis, new THREE.Vector3(0.1, -0.04, 0), 0.075, 0.34, 0.058, 0.34);
  const legR = mkLimb(pelvis, new THREE.Vector3(-0.1, -0.04, 0), 0.075, 0.34, 0.058, 0.34);
  for (const leg of [legL, legR]) {
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.2), S.mat);
    foot.position.set(0, -0.44, 0.05);
    leg.child!.pivot.add(foot);
  }

  // drafting environment
  const grid = floorGrid(8, 32, PAL.cobaltDeep);
  scene.add(grid);
  const bbox = cornerBox(new THREE.Vector3(1.0, 1.9, 1.0), PAL.bone, 0.1);
  bbox.position.y = 0.95;
  scene.add(bbox);
  const ring = closedLine(
    Array.from({ length: 64 }, (_, i) => new THREE.Vector3(Math.cos((i / 64) * Math.PI * 2) * 0.9, 0.002, Math.sin((i / 64) * Math.PI * 2) * 0.9)),
    new THREE.LineBasicMaterial({ color: PAL.acid }),
  );
  scene.add(ring);

  // scan plane
  const scanEdge = wireBox(new THREE.Vector3(1.4, 0.001, 1.4), PAL.acid);
  scene.add(scanEdge);

  // labels
  const tag = document.createElement('div');
  tag.className = 'gl-tag';
  tag.innerHTML = '<b>SHELL.07</b><span>Y 0.000</span>';
  if (labels) host.appendChild(tag);
  const tagY = tag.querySelector('span')!;

  let speed = 1;
  let orbit = true;
  stage.start((t, frame) => {
    const p = t * 8 * speed;
    const s = Math.sin(p);
    legL.pivot.rotation.x = -s * 0.85;
    legR.pivot.rotation.x = s * 0.85;
    legL.child!.pivot.rotation.x = 0.2 + 1.1 * Math.max(0, Math.sin(p + 2.2));
    legR.child!.pivot.rotation.x = 0.2 + 1.1 * Math.max(0, Math.sin(p + 2.2 + Math.PI));
    armL.pivot.rotation.x = s * 0.75;
    armR.pivot.rotation.x = -s * 0.75;
    armL.child!.pivot.rotation.x = -1.2;
    armR.child!.pivot.rotation.x = -1.2;
    armL.pivot.rotation.z = 0.12;
    armR.pivot.rotation.z = -0.12;
    pelvis.position.y = 0.96 + Math.abs(Math.cos(p)) * 0.06;
    pelvis.rotation.y = s * 0.12;
    spine.rotation.y = -s * 0.22;
    spine.rotation.x = 0.16;
    S.uOffset.value = -t * 1.5;

    const a = orbit ? Math.floor(t * 2) * 0.08 + 0.6 : 0.6; // camera orbits in visible jumps
    camera.position.set(Math.sin(a) * 5.4, 1.5, Math.cos(a) * 5.4);
    camera.lookAt(0, 0.9, 0);

    const sy = ((frame * 0.05) % 1) * 1.9;
    scanEdge.position.y = sy;

    if (labels) {
      const sp = toScreen(new THREE.Vector3(0.5, 1.9, 0.5), stage);
      tag.style.transform = `translate(${Math.round(sp.x)}px, ${Math.round(sp.y)}px)`;
      tagY.textContent = `Y ${sy.toFixed(3)}`;
    }
  });

  return {
    stage,
    set(key, v) {
      if (key === 'freq') S.uFreq.value = Number(v);
      if (key === 'fill') S.uFill.value = Number(v);
      if (key === 'speed') speed = Number(v);
      if (key === 'orbit') orbit = Boolean(v);
      if (key === 'color') S.setColor(S.uColor, v as number);
      if (key === 'rim') S.setColor(S.uRim, v as number);
    },
    dispose() {
      tag.remove();
      stage.dispose();
    },
  };
}

/* ================================================================== */
/* 2. NEURAL CLOUD — pixel voxels on a folded ellipsoid + synapse lines */
/* ================================================================== */
export async function mountNeuralCloud(host: HTMLElement, { fps = 12, pixel = 1, count = 1400 } = {}): Promise<SceneHandle> {
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const stage = await createStage(host, { fps, pixel, camera });
  const { scene } = stage;
  const r = rng(21);

  const pts: THREE.Vector3[] = [];
  while (pts.length < count) {
    const u = r() * 2 - 1;
    const th = r() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const dir = new THREE.Vector3(s * Math.cos(th), u, s * Math.sin(th));
    // two hemispheres separated by a fissure
    if (Math.abs(dir.x) < 0.06) continue;
    const fold = 1 + 0.07 * Math.sin(dir.y * 14 + dir.z * 9) * Math.cos(dir.x * 11);
    const shell = r() < 0.85 ? 1 : 0.4 + r() * 0.5;
    const v = dir.multiplyScalar(fold * shell);
    v.multiply(new THREE.Vector3(0.82, 0.72, 1.08));
    if (v.y < -0.35 && Math.abs(v.z) > 0.3) continue; // flatten underside
    pts.push(v);
  }

  const vox = new THREE.InstancedMesh(new THREE.BoxGeometry(0.022, 0.022, 0.022), new THREE.MeshBasicMaterial({ color: 0xffffff }), pts.length);
  const m = new THREE.Matrix4();
  const baseCol = new THREE.Color();
  const cols: THREE.Color[] = [];
  pts.forEach((p, i) => {
    m.makeTranslation(p.x, p.y, p.z);
    vox.setMatrixAt(i, m);
    const roll = r();
    baseCol.set(roll < 0.68 ? PAL.acid : roll < 0.93 ? PAL.cobalt : PAL.crimson);
    cols.push(baseCol.clone());
    vox.setColorAt(i, baseCol);
  });
  const brain = new THREE.Group();
  brain.add(vox);
  scene.add(brain);

  // synapse lines — nearest neighbours on a subset
  const lp: number[] = [];
  const lc: number[] = [];
  const cA = new THREE.Color(PAL.acid);
  const cB = new THREE.Color(PAL.cobalt);
  for (let i = 0; i < pts.length; i += 5) {
    let best = -1;
    let bd = 1e9;
    for (let j = 0; j < pts.length; j += 3) {
      if (i === j) continue;
      const d = pts[i].distanceToSquared(pts[j]);
      if (d > 0.01 && d < bd) {
        bd = d;
        best = j;
      }
    }
    if (best < 0) continue;
    lp.push(pts[i].x, pts[i].y, pts[i].z, pts[best].x, pts[best].y, pts[best].z);
    const c = r() < 0.7 ? cA : cB;
    lc.push(c.r, c.g, c.b, c.r, c.g, c.b);
  }
  // long-range "tracts"
  for (let k = 0; k < 40; k++) {
    const a = pts[(r() * pts.length) | 0];
    const b = pts[(r() * pts.length) | 0];
    lp.push(a.x, a.y, a.z, b.x, b.y, b.z);
    lc.push(1, 0.16, 0.09, 0.14, 0.14, 1);
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
  lg.setAttribute('color', new THREE.Float32BufferAttribute(lc, 3));
  const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55 }));
  brain.add(lines);

  // orbital contour rings around the head volume
  for (let i = 0; i < 6; i++) {
    const ry = -0.5 + i * 0.22;
    const rad = Math.sqrt(Math.max(0.05, 1 - (ry / 0.9) ** 2)) * 1.25;
    const ring = closedLine((Array.from({ length: 72 }, (_, k) => new THREE.Vector3(Math.cos((k / 72) * Math.PI * 2) * rad, ry, Math.sin((k / 72) * Math.PI * 2) * rad * 1.15))),
      new THREE.LineBasicMaterial({ color: i % 2 ? PAL.cobalt : PAL.cobaltLo }),
    );
    scene.add(ring);
  }
  const box = cornerBox(new THREE.Vector3(1.9, 1.7, 2.4), PAL.bone, 0.14);
  scene.add(box);
  const sel = wireBox(new THREE.Vector3(0.5, 0.4, 0.5), PAL.hazard);
  scene.add(sel);

  const tag = document.createElement('div');
  tag.className = 'gl-tag gl-tag--hazard';
  tag.innerHTML = '<b>REGION</b><span>—</span>';
  host.appendChild(tag);
  const tagS = tag.querySelector('span')!;

  const fire = new THREE.Color(PAL.bone);
  let lit: number[] = [];
  let selIdx = 0;
  stage.start((t, frame) => {
    brain.rotation.y = Math.floor(t * 3) * 0.06;
    // reset & fire random neurons
    lit.forEach((i) => vox.setColorAt(i, cols[i]));
    lit = Array.from({ length: 60 }, () => (Math.random() * pts.length) | 0);
    lit.forEach((i) => vox.setColorAt(i, fire));
    vox.instanceColor!.needsUpdate = true;

    if (frame % 18 === 0) selIdx = (Math.random() * pts.length) | 0;
    const sp = pts[selIdx].clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), brain.rotation.y);
    sel.position.copy(sp);
    const s = toScreen(sp.clone().add(new THREE.Vector3(0.25, 0.2, 0)), stage);
    tag.style.transform = `translate(${Math.round(s.x)}px, ${Math.round(s.y)}px)`;
    tagS.textContent = `N-${String(selIdx).padStart(4, '0')}`;

    camera.position.set(3.2, 1.3, 3.6);
    camera.lookAt(0, 0, 0);
  });

  return {
    stage,
    dispose() {
      tag.remove();
      stage.dispose();
    },
  };
}

/* ================================================================== */
/* 3. PIXEL PLANET — horizon of extruded bar columns                    */
/* ================================================================== */
export async function mountPixelPlanet(host: HTMLElement, { fps = 10, pixel = 2, color = PAL.acid } = {}): Promise<SceneHandle> {
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  const stage = await createStage(host, { fps, pixel, camera });
  const { scene } = stage;
  const R = 3;
  const r = rng(5);

  const items: { pos: THREE.Vector3; q: THREE.Quaternion; seed: number }[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const lat = 40;
  for (let i = 0; i < lat; i++) {
    const phi = (i / lat) * 1.5; // upper cap down past the visible limb
    const ring = Math.max(1, Math.round(Math.sin(phi) * 120));
    for (let k = 0; k < ring; k++) {
      if (r() < 0.25) continue;
      const th = (k / ring) * Math.PI * 2 + r() * 0.02;
      const n = new THREE.Vector3(Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th));
      items.push({ pos: n.clone().multiplyScalar(R), q: new THREE.Quaternion().setFromUnitVectors(up, n), seed: r() * 100 });
    }
  }
  const geo = new THREE.BoxGeometry(0.03, 1, 0.03);
  geo.translate(0, 0.5, 0);
  const bars = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }), items.length);
  const c = new THREE.Color();
  items.forEach((_, i) => {
    c.set(r() < 0.82 ? color : r() < 0.5 ? PAL.lime : PAL.bone);
    bars.setColorAt(i, c);
  });
  const planet = new THREE.Group();
  planet.add(bars);
  const core = new THREE.Mesh(new THREE.SphereGeometry(R * 0.995, 48, 32), new THREE.MeshBasicMaterial({ color: 0x020414 }));
  planet.add(core);
  // latitude lines
  for (let i = 1; i < 10; i++) {
    const phi = (i / 10) * 1.3;
    const rr = Math.sin(phi) * R * 1.001;
    const y = Math.cos(phi) * R * 1.001;
    const loop = closedLine((Array.from({ length: 96 }, (_, k) => new THREE.Vector3(Math.cos((k / 96) * Math.PI * 2) * rr, y, Math.sin((k / 96) * Math.PI * 2) * rr))),
      new THREE.LineBasicMaterial({ color: PAL.cobaltLo }),
    );
    planet.add(loop);
  }
  scene.add(planet);

  // orbits
  const orbits = new THREE.Group();
  [4.2, 5.2, 7.0].forEach((rad, i) => {
    const loop = closedLine((Array.from({ length: 128 }, (_, k) => new THREE.Vector3(Math.cos((k / 128) * Math.PI * 2) * rad, 0, Math.sin((k / 128) * Math.PI * 2) * rad))),
      new THREE.LineBasicMaterial({ color: i === 1 ? PAL.acid : PAL.cobalt }),
    );
    orbits.add(loop);
  });
  orbits.rotation.set(0.25, 0, 0.12);
  orbits.position.y = 3.4;
  scene.add(orbits);
  const moon = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), new THREE.MeshBasicMaterial({ color: PAL.acid, wireframe: true }));
  orbits.add(moon);

  const m = new THREE.Matrix4();
  const sc = new THREE.Vector3();
  stage.start((t) => {
    items.forEach((it, i) => {
      const h = 0.03 + Math.max(0, Math.sin(it.seed + t * 3.1) * Math.sin(it.seed * 1.7 + t * 1.3)) * 0.42 + (Math.random() < 0.008 ? 0.5 : 0);
      sc.set(1, h, 1);
      m.compose(it.pos, it.q, sc);
      bars.setMatrixAt(i, m);
    });
    bars.instanceMatrix.needsUpdate = true;
    planet.rotation.y = t * 0.08;
    const a = t * 0.5;
    moon.position.set(Math.cos(a) * 5.2, 0, Math.sin(a) * 5.2);
    camera.position.set(0, 3.7, 5.3);
    camera.lookAt(0, 3.05, 0);
  });

  return {
    stage,
    set(key, v) {
      if (key === 'pixel') stage.setPixel(Number(v));
    },
    dispose: () => stage.dispose(),
  };
}

/* ================================================================== */
/* 4. CAD BAY — isometric wireframes with stepped selection             */
/* ================================================================== */
export async function mountCadBay(host: HTMLElement, { fps = 12, pixel = 1 } = {}): Promise<SceneHandle> {
  const camera = new THREE.OrthographicCamera(-3, 3, 2.2, -2.2, 0.1, 100);
  const stage = await createStage(host, { fps, pixel, camera });
  const { scene } = stage;

  scene.add(floorGrid(12, 24, PAL.cobaltLo));

  const S = sliceMaterial({ color: PAL.acid, rim: PAL.lime, freq: 22, fill: 0.5 });
  const items: { obj: THREE.Object3D; box: THREE.LineSegments; label: string; size: THREE.Vector3 }[] = [];
  const add = (obj: THREE.Object3D, x: number, z: number, size: THREE.Vector3, label: string) => {
    obj.position.set(x, size.y / 2, z);
    scene.add(obj);
    const box = wireBox(size, PAL.cobalt);
    box.position.copy(obj.position);
    scene.add(box);
    items.push({ obj, box, label, size });
  };

  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.42, 0.14, 140, 18), S.mat);
  add(knot, -1.6, 0, new THREE.Vector3(1.3, 1.3, 1.3), 'CORE.KNOT');

  const ico = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(0.6, 1)), new THREE.LineBasicMaterial({ color: PAL.bone }));
  add(ico, 0.2, -0.4, new THREE.Vector3(1.3, 1.3, 1.3), 'NODE.ICO');

  const cyl = new THREE.Group();
  const cg = new THREE.EdgesGeometry(new THREE.CylinderGeometry(0.4, 0.4, 1.4, 12, 6), 1);
  cyl.add(new THREE.LineSegments(cg, new THREE.LineBasicMaterial({ color: PAL.cyan })));
  for (let i = 0; i < 6; i++) {
    const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.04, 12), new THREE.MeshBasicMaterial({ color: i === 2 ? PAL.hazard : PAL.cobalt }));
    pl.position.y = -0.6 + i * 0.24;
    cyl.add(pl);
  }
  add(cyl, 1.8, 0.4, new THREE.Vector3(1.1, 1.5, 1.1), 'CELL.07');

  const sel = cornerBox(new THREE.Vector3(1, 1, 1), PAL.hazard, 0.16);
  scene.add(sel);
  const tag = document.createElement('div');
  tag.className = 'gl-tag gl-tag--hazard';
  tag.innerHTML = '<b>—</b><span>SELECT</span>';
  host.appendChild(tag);
  const tagB = tag.querySelector('b')!;

  let cur = 0;
  stage.start((t, frame) => {
    knot.rotation.y = Math.floor(t * 4) * 0.2;
    ico.rotation.y = -Math.floor(t * 2) * 0.25;
    ico.rotation.x = Math.floor(t * 2) * 0.1;
    cyl.rotation.y = Math.floor(t * 6) * (Math.PI / 6);
    if (frame % 24 === 0) cur = (cur + 1) % items.length;
    const it = items[cur];
    sel.position.copy(it.obj.position);
    sel.scale.copy(it.size).multiplyScalar(1.12);
    items.forEach((x, i) => ((x.box.material as THREE.LineBasicMaterial).color.set(i === cur ? PAL.hazard : PAL.cobaltLo)));
    const s = toScreen(it.obj.position.clone().add(new THREE.Vector3(it.size.x * 0.6, it.size.y * 0.6, 0)), stage);
    tag.style.transform = `translate(${Math.round(s.x)}px, ${Math.round(s.y)}px)`;
    tagB.textContent = it.label;

    camera.position.set(6, 5, 6);
    camera.lookAt(0, 0.5, 0);
  });

  return {
    stage,
    dispose() {
      tag.remove();
      stage.dispose();
    },
  };
}
