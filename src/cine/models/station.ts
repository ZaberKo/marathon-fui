/** Kestrel station, reduced to the outlines of a hub, a ring, and two wings. */
import * as THREE from 'three/webgpu';
import { lineMat } from '../mats';

export function stationModel() {
  const g = new THREE.Group();
  const hull = lineMat(0xb5c7ff);
  const wings = lineMat(0x9eb6ff);
  const point = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const loop = (points: THREE.Vector3[], material: THREE.LineBasicMaterial) => {
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([...points, points[0]]), material));
  };
  const polygon = (sides: number, radius: number, z: number) =>
    Array.from({ length: sides }, (_, i) => {
      const angle = (i + 0.5) / sides * Math.PI * 2;
      return point(Math.cos(angle) * radius, Math.sin(angle) * radius, z);
    });

  const ring = polygon(12, 2.36, 0.2);
  const hub = polygon(6, 0.63, -0.6);
  loop(ring, hull);
  loop(hub, hull);
  const frame = [point(0, 0, -4.1), point(0, 0, 2.8)];
  for (const i of [1, 4, 7, 10]) {
    const rim = ring[i];
    frame.push(point(rim.x * 0.28, rim.y * 0.28, -0.6), rim);
  }
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(frame), hull));

  for (const side of [-1, 1]) {
    loop([
      point(side * 1.8, 0.12, -0.4), point(side * 3.45, 0.42, -1.25),
      point(side * 3.45, -0.26, 0.1), point(side * 1.8, -0.12, 0.3),
    ], wings);
  }

  return g;
}
