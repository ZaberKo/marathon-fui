/**
 * Procedural models and coastline queries from Natural Earth vector data.
 */
import * as THREE from 'three/webgpu';

export type ModelName = 'soldier' | 'xbot' | 'head';

/**
 * Models are generated in-house (src/cine/models): SDF bodies skinned to a
 * motion-only rig (public/anim/rig.glb — Mixamo clips, no meshes) and an SDF
 * head. The names are kept for the scenes that use them:
 *   soldier → armoured runner · xbot → slim runner · head → head bust
 */
export async function loadModel(name: ModelName) {
  if (name === 'head') {
    const { headGeometry } = await import('../cine/models/anatomy');
    const root = new THREE.Group();
    const mesh = new THREE.Mesh(headGeometry().clone(), new THREE.MeshBasicMaterial());
    mesh.name = 'head';
    root.add(mesh);
    return { root: root as THREE.Object3D, clips: [] as THREE.AnimationClip[] };
  }
  const { makeBody } = await import('../cine/models/body');
  const body = await makeBody(name === 'soldier' ? 'armor' : 'runner', new THREE.MeshBasicMaterial());
  body.mesh.name = 'surface';
  return { root: body.root, clips: body.clips };
}

/** Normalise an object so its height is `h` and its feet sit on y=0, centred on x/z. */
export function fitHeight(obj: THREE.Object3D, h: number) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj, true);
  const size = box.getSize(new THREE.Vector3());
  const s = h / size.y;
  obj.scale.multiplyScalar(s);
  obj.updateMatrixWorld(true);
  box.setFromObject(obj, true);
  const c = box.getCenter(new THREE.Vector3());
  obj.position.x -= c.x;
  obj.position.z -= c.z;
  obj.position.y -= box.min.y;
  return obj;
}

export function meshesOf(obj: THREE.Object3D) {
  const out: THREE.Mesh[] = [];
  obj.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) out.push(o as THREE.Mesh);
  });
  return out;
}

/** Pick `n` random vertex indices from a mesh (deterministic with rnd). */
export function sampleVerts(mesh: THREE.Mesh, n: number, rnd: () => number, filter?: (p: THREE.Vector3) => boolean) {
  const pos = mesh.geometry.getAttribute('position');
  const v = new THREE.Vector3();
  const out: number[] = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 50) {
    const i = Math.floor(rnd() * pos.count);
    if (filter) {
      v.fromBufferAttribute(pos, i);
      if (!filter(v)) continue;
    }
    out.push(i);
  }
  return out;
}

/** Vertex index with the extreme world coordinate among `tries` random samples. */
export function extremeVert(mesh: THREE.Mesh, rnd: () => number, score: (p: THREE.Vector3) => number, tries = 800) {
  const v = new THREE.Vector3();
  const n = mesh.geometry.getAttribute('position').count;
  let best = 0;
  let bestS = -Infinity;
  for (let k = 0; k < tries; k++) {
    const i = Math.floor(rnd() * n);
    const s = score(vertexWorld(mesh, i, v));
    if (s > bestS) {
      bestS = s;
      best = i;
    }
  }
  return best;
}

/** World-space position of a (possibly skinned) vertex. */
export function vertexWorld(mesh: THREE.Mesh, i: number, target: THREE.Vector3) {
  (mesh as THREE.SkinnedMesh).isSkinnedMesh
    ? (mesh as THREE.SkinnedMesh).getVertexPosition(i, target)
    : target.fromBufferAttribute(mesh.geometry.getAttribute('position'), i);
  return target.applyMatrix4(mesh.matrixWorld);
}

/* ------------------------------------------------------------------ */
/* Land mask                                                           */
/* ------------------------------------------------------------------ */
let landP: Promise<(lat: number, lon: number) => boolean> | null = null;

/** Sample land from coastline intersections cached for each requested latitude. */
export function loadLandMask() {
  if (landP) return landP;
  landP = (async () => {
    const [{ feature }, topo] = await Promise.all([import('topojson-client'), import('world-atlas/land-110m.json')]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const land = feature((topo as any).default ?? topo, ((topo as any).default ?? topo).objects.land) as any;
    const polys: number[][][][] = land.features.flatMap((f: any) =>
      f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates,
    );
    const rings = polys.flat();
    const rows = new Map<number, number[]>();
    return (lat: number, lon: number) => {
      let crossings = rows.get(lat);
      if (!crossings) {
        crossings = [];
        for (const ring of rings) {
          for (let i = 1; i < ring.length; i++) {
            const [x0, y0] = ring[i - 1];
            const [x1, y1] = ring[i];
            if ((y0 > lat) === (y1 > lat)) continue;
            crossings.push(x0 + (x1 - x0) * (lat - y0) / (y1 - y0));
          }
        }
        crossings.sort((a, b) => a - b);
        rows.set(lat, crossings);
      }
      const x = ((lon + 180) % 360 + 360) % 360 - 180;
      return crossings.findIndex((boundary) => boundary > x) % 2 === 1;
    };
  })();
  return landP;
}

/** lat/lon (deg) → point on sphere of radius r (y up, lon 0 at +z). */
export function latLon(lat: number, lon: number, r = 1, target = new THREE.Vector3()) {
  const la = THREE.MathUtils.degToRad(lat);
  const lo = THREE.MathUtils.degToRad(lon);
  return target.set(Math.cos(la) * Math.sin(lo) * r, Math.sin(la) * r, Math.cos(la) * Math.cos(lo) * r);
}
