/**
 * ORBITAL UPLINK — Earth as horizontal contour slices that only exist over
 * land (Natural Earth mask), graticule in cobalt, black occluder core.
 * Wireframe satellites on inclined orbits; the selected one gets corner
 * brackets, a nadir line, a surface footprint ring and uplinks to ground
 * stations that are above its horizon.
 */
import * as THREE from 'three/webgpu';
import { closedLine, createStage, makeTag } from '../core';
import { occluder } from '../materials';
import { FillBatch, LineBatch } from '../overlay';
import { latLon, loadLandMask } from '../assets';
import { satellite } from '../procedural';
import { PAL, type SceneHandle, type SceneOpts } from './common';
import { rng } from '../../lib/util';

const STATIONS: [string, number, number][] = [
  ['GS-01', 37.4, -122.1],
  ['GS-02', 51.5, -0.1],
  ['GS-03', -33.9, 18.4],
  ['GS-04', 35.7, 139.7],
  ['GS-05', -23.5, -46.6],
  ['GS-06', 1.3, 103.8],
];

export async function mountOrbital(host: HTMLElement, { fps = 12, pixel = 1, labels = true }: SceneOpts = {}): Promise<SceneHandle> {
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  const stage = await createStage(host, { label: 'ORBITAL', fps, pixel, camera });
  const { scene } = stage;
  const isLand = await loadLandMask();

  /* earth ------------------------------------------------------------ */
  const earth = new THREE.Group();
  scene.add(earth);
  earth.add(new THREE.Mesh(new THREE.SphereGeometry(0.985, 48, 32), occluder()));

  // contour slices over land: green; ocean: sparse cobalt dashes
  const land: number[] = [];
  const sea: number[] = [];
  const RINGS = 64;
  const STEPS = 360;
  for (let k = 1; k < RINGS; k++) {
    const lat = -90 + (k / RINGS) * 180;
    for (let s = 0; s < STEPS; s++) {
      const lon0 = -180 + (s / STEPS) * 360;
      const lon1 = lon0 + 360 / STEPS;
      const a = latLon(lat, lon0, 1.0);
      const b = latLon(lat, lon1, 1.0);
      if (isLand(lat, lon0 + 0.5)) land.push(a.x, a.y, a.z, b.x, b.y, b.z);
      else if (k % 4 === 0 && s % 6 === 0) sea.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }
  const mk = (arr: number[], color: number) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color }));
  };
  earth.add(mk(land, PAL.acid));
  earth.add(mk(sea, PAL.cobaltLo));
  // graticule
  for (let m = 0; m < 12; m++) {
    const pts = Array.from({ length: 64 }, (_, i) => latLon(-90 + (i / 63) * 180, m * 30, 1.002));
    earth.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: PAL.cobaltDeep })));
  }
  earth.add(closedLine(Array.from({ length: 128 }, (_, i) => latLon(0, (i / 128) * 360, 1.003)), new THREE.LineBasicMaterial({ color: PAL.cobalt })));
  earth.rotation.z = 0.41; // axial tilt

  /* orbits + satellites --------------------------------------------- */
  const sats = [
    { r: 1.55, inc: 0.35, raan: 0.2, sp: 0.42, ph: 0.0, name: 'RELAY-07' },
    { r: 1.95, inc: 1.05, raan: 1.4, sp: 0.3, ph: 2.1, name: 'SURVEY-12' },
    { r: 2.5, inc: -0.6, raan: 2.6, sp: 0.21, ph: 4.0, name: 'BEACON-03' },
  ].map((o) => {
    const plane = new THREE.Group();
    plane.rotation.set(o.inc, o.raan, 0);
    const orbit = closedLine(
      Array.from({ length: 160 }, (_, i) => new THREE.Vector3(Math.cos((i / 160) * Math.PI * 2) * o.r, 0, Math.sin((i / 160) * Math.PI * 2) * o.r)),
      new THREE.LineBasicMaterial({ color: PAL.cobalt }),
    );
    plane.add(orbit);
    const sat = satellite();
    sat.scale.setScalar(0.9);
    plane.add(sat);
    scene.add(plane);
    return { ...o, plane, sat, orbit };
  });

  /* overlay ---------------------------------------------------------- */
  const lines = new LineBatch(14000, { depthTest: true });
  const hud = new LineBatch(4000, { depthTest: false });
  const fills = new FillBatch(2000, { depthTest: true });
  scene.add(lines.object, hud.object, fills.object);

  const stars = (() => {
    const r = rng(5);
    return Array.from({ length: 40 }, () => new THREE.Vector3((r() - 0.5) * 30, (r() - 0.5) * 18, -12 - r() * 6));
  })();
  const tag = labels ? makeTag(host, '<b>RELAY-07</b><span>ALT 0000 KM</span>', 'gl-tag--hazard') : null;
  const tagSpan = tag?.el.querySelector('span');

  const v = new THREE.Vector3();
  const nadir = new THREE.Vector3();
  const sp = new THREE.Vector3();
  let sel = 0;

  stage.start((t, frame) => {
    earth.rotation.y = t * 0.12;
    sats.forEach((s) => {
      const a = s.ph + t * s.sp;
      s.sat.position.set(Math.cos(a) * s.r, 0, Math.sin(a) * s.r);
      s.sat.rotation.y = -a; // panels across-track
      (s.orbit.material as THREE.LineBasicMaterial).color.set(s === sats[sel] ? PAL.hazard : PAL.cobaltLo);
    });
    if (frame % 72 === 0 && frame > 0) sel = (sel + 1) % sats.length;

    const ca = 0.5 + Math.floor(t * 1.5) * 0.03;
    camera.position.set(Math.sin(ca) * 6.4, 1.8, Math.cos(ca) * 6.4);
    camera.lookAt(0.2, 0, 0);
    scene.updateMatrixWorld(true);

    lines.begin(camera, stage.size.h);
    hud.begin(camera, stage.size.h);
    fills.begin(camera, stage.size.h);

    // stars
    stars.forEach((p, i) => hud.color(i % 7 === 0 ? PAL.acid : PAL.cobaltLo).cross(p, i % 7 === 0 ? 9 : 5));
    // atmosphere limb rings (camera-facing, world radius)
    const toCam = camera.position.clone().normalize();
    lines.color(PAL.cobalt).ring(new THREE.Vector3(), toCam, 1.07, 128, 0);
    lines.color(PAL.cobaltLo).ring(new THREE.Vector3(), toCam, 1.13, 128, 3);

    const s = sats[sel];
    s.sat.getWorldPosition(sp);
    nadir.copy(sp).normalize();
    const surf = nadir.clone().multiplyScalar(1.0);
    // nadir line + footprint
    lines.color(PAL.hazard).dashed(sp, surf, 0.05, 0.035, frame * 0.02);
    lines.color(PAL.hazard).ring(surf.clone().multiplyScalar(0.985), nadir, 0.28, 48, 4);
    lines.color(PAL.hazard, 0.6).ring(surf.clone().multiplyScalar(0.96), nadir, 0.42, 48, 3);
    hud.color(PAL.hazard).brackets(sp, 34, 34, 7);
    hud.color(PAL.hazard).tri(surf, 10, true);

    // ground stations + uplinks
    STATIONS.forEach(([, la, lo], i) => {
      latLon(la, lo, 1.0, v);
      earth.localToWorld(v);
      fills.color(PAL.bone).square(v, 4);
      const up = v.clone().normalize();
      const toSat = sp.clone().sub(v).normalize();
      if (up.dot(toSat) > 0.15) {
        const ctrl = v.clone().add(sp).multiplyScalar(0.5).addScaledVector(up, 0.35);
        const grow = Math.min(1, ((frame + i * 5) % 30) / 8);
        lines.color(PAL.acid).bezier(v, ctrl, sp, 20, grow);
        // travelling packet
        const u = ((frame * 0.08 + i * 0.3) % 1) * grow;
        const m = 1 - u;
        const pk = new THREE.Vector3(
          m * m * v.x + 2 * m * u * ctrl.x + u * u * sp.x,
          m * m * v.y + 2 * m * u * ctrl.y + u * u * sp.y,
          m * m * v.z + 2 * m * u * ctrl.z + u * u * sp.z,
        );
        fills.color(PAL.lime).square(pk, 4);
      }
    });
    lines.end();
    hud.end();
    fills.end();

    if (tag && tagSpan) {
      tag.el.querySelector('b')!.textContent = s.name;
      tagSpan.textContent = `ALT ${String(Math.round((s.r - 1) * 6371)).padStart(5, '0')} KM · INC ${Math.round(THREE.MathUtils.radToDeg(Math.abs(s.inc)))}°`;
      tag.at(stage, sp, 22, -24);
    }
  });

  return {
    stage,
    dispose() {
      tag?.remove();
      stage.dispose();
    },
  };
}
