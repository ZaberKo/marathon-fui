/**
 * Cross-sections of a (posed) mesh: intersect every triangle with planes
 * x = c and return the contour segments — the "CT slice" frames of the print.
 */
import * as THREE from 'three/webgpu';

/** World-space vertex positions of a skinned mesh in its current pose. */
export function skinnedPositions(mesh: THREE.SkinnedMesh) {
  mesh.updateMatrixWorld(true);
  const n = mesh.geometry.getAttribute('position').count;
  const out = new Float32Array(n * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    mesh.getVertexPosition(i, v);
    v.applyMatrix4(mesh.matrixWorld);
    out[i * 3] = v.x;
    out[i * 3 + 1] = v.y;
    out[i * 3 + 2] = v.z;
  }
  return out;
}

/** Segments where the triangle mesh crosses the plane (axis = c), axis 0/1/2 = x/y/z (pairs of points). */
export function sliceAxis(pos: Float32Array, index: ArrayLike<number> | null, axis: 0 | 1 | 2, c: number) {
  const seg: number[] = [];
  const triCount = index ? index.length / 3 : pos.length / 9;
  for (let t = 0; t < triCount; t++) {
    const ia = index ? index[t * 3] : t * 3;
    const ib = index ? index[t * 3 + 1] : t * 3 + 1;
    const ic = index ? index[t * 3 + 2] : t * 3 + 2;
    const v = [ia, ib, ic];
    const d = v.map((i) => pos[i * 3 + axis] - c);
    let n = 0;
    for (let e = 0; e < 3 && n < 2; e++) {
      const a = e;
      const b = (e + 1) % 3;
      if (d[a] < 0 !== d[b] < 0) {
        const k = d[a] / (d[a] - d[b]);
        for (let q = 0; q < 3; q++) seg.push(pos[v[a] * 3 + q] + (pos[v[b] * 3 + q] - pos[v[a] * 3 + q]) * k);
        n++;
      }
    }
    if (n === 1) seg.length -= 3;
  }
  return new Float32Array(seg);
}

/** Segments where the triangle mesh crosses x = c (pairs of points). */
export const sliceX = (pos: Float32Array, index: ArrayLike<number> | null, c: number) => sliceAxis(pos, index, 0, c);

export function segmentsToLines(seg: Float32Array, color: number, opacity = 1) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(seg, 3));
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }));
}
