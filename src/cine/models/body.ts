/**
 * Self-built humanoid: an SDF body generated around the joints of an
 * animation rig, meshed with Surface Nets and skinned automatically.
 *
 * Only the *skeleton + motion* comes from a third party (Mixamo clips as
 * distributed with three.js — public/anim/rig.glb has every mesh stripped);
 * the surface is generated here, so proportions/armour are ours to change.
 */
import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { meshSDF, skinFromPrims, toGeometry, type Prim, type V3 } from './sdf';

type RigData = { scene: THREE.Object3D; clips: THREE.AnimationClip[]; names: string[]; joints: Map<string, THREE.Vector3> };

let rigP: Promise<RigData> | null = null;
export function loadRig() {
  if (!rigP)
    rigP = new GLTFLoader()
      .setMeshoptDecoder(MeshoptDecoder)
      .loadAsync(`${import.meta.env.BASE_URL}anim/rig.glb`)
      .then((g) => {
        const scene = g.scene as unknown as THREE.Object3D;
        scene.updateMatrixWorld(true);
        const names: string[] = [];
        const joints = new Map<string, THREE.Vector3>();
        scene.traverse((o) => {
          if (!o.name.startsWith('mixamorig')) return;
          const short = o.name.replace(/^mixamorig:?/, '');
          names.push(o.name);
          joints.set(short, new THREE.Vector3().setFromMatrixPosition(o.matrixWorld));
        });
        return { scene, clips: g.animations as unknown as THREE.AnimationClip[], names, joints };
      });
  return rigP;
}

export type BodyVariant = 'runner' | 'armor' | 'slim';

/* ------------------------------------------------------------------ */
/* Body definition                                                     */
/* ------------------------------------------------------------------ */
function bodyPrims(rig: RigData, variant: BodyVariant): Prim[] {
  const J = (n: string): V3 => {
    const v = rig.joints.get(n);
    if (!v) throw new Error(`joint ${n}`);
    return [v.x, v.y, v.z];
  };
  const B = (n: string) => rig.names.findIndex((x) => x.replace(/^mixamorig:?/, '') === n);
  const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mid = (a: V3, b: V3, k = 0.5): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const slim = variant === 'slim' ? 0.9 : 1;
  const P: Prim[] = [];
  const cone = (a: string | V3, b: string | V3, ra: number, rb: number, bone: string, k = 0.03) =>
    P.push({ t: 'cone', a: typeof a === 'string' ? J(a) : a, b: typeof b === 'string' ? J(b) : b, ra: ra * slim, rb: rb * slim, bone: B(bone), k });
  const ell = (c: V3, r: V3, bone: string, k = 0.04, rot?: THREE.Quaternion) => P.push({ t: 'ell', c, r: [r[0] * slim, r[1], r[2] * slim], bone: B(bone), k, rot });

  // torso
  ell(add(J('Hips'), [0, -0.02, 0]), [0.15, 0.1, 0.1], 'Hips', 0.05);
  ell(add(J('Spine'), [0, 0.0, 0.005]), [0.13, 0.1, 0.09], 'Spine', 0.06);
  ell(add(J('Spine1'), [0, 0.01, 0.0]), [0.14, 0.11, 0.095], 'Spine1', 0.06);
  ell(add(J('Spine2'), [0, 0.035, 0.0]), [0.165, 0.13, 0.11], 'Spine2', 0.06);
  for (const s of ['Left', 'Right']) {
    const sx = s === 'Left' ? 1 : -1;
    // glutes, pecs, shoulder girdle
    ell(add(J('Hips'), [0.07 * sx, -0.06, -0.05]), [0.085, 0.09, 0.075], 'Hips', 0.05);
    ell(add(J('Spine2'), [0.08 * sx, 0.04, 0.06]), [0.08, 0.07, 0.05], 'Spine2', 0.05);
    cone(`${s}Shoulder`, `${s}Arm`, 0.065, 0.058, `${s}Shoulder`, 0.05);
    // arms
    cone(`${s}Arm`, `${s}ForeArm`, 0.052, 0.04, `${s}Arm`, 0.03);
    cone(`${s}ForeArm`, `${s}Hand`, 0.041, 0.03, `${s}ForeArm`, 0.025);
    // hand: palm + fingers
    const palmC = mid(J(`${s}Hand`), J(`${s}HandMiddle1`), 0.55);
    P.push({ t: 'box', c: palmC, h: [0.045, 0.014, 0.04], round: 0.013, bone: B(`${s}Hand`), k: 0.02 });
    for (const fn of ['Index', 'Middle', 'Ring', 'Pinky']) {
      const r = fn === 'Pinky' ? 0.0085 : 0.0105;
      cone(`${s}Hand${fn}1`, `${s}Hand${fn}2`, r, r * 0.95, `${s}Hand${fn}1`, 0.008);
      cone(`${s}Hand${fn}2`, `${s}Hand${fn}3`, r * 0.95, r * 0.9, `${s}Hand${fn}2`, 0.006);
      cone(`${s}Hand${fn}3`, `${s}Hand${fn}4`, r * 0.9, r * 0.75, `${s}Hand${fn}3`, 0.006);
    }
    cone(`${s}HandThumb1`, `${s}HandThumb2`, 0.014, 0.012, `${s}HandThumb1`, 0.012);
    cone(`${s}HandThumb2`, `${s}HandThumb3`, 0.012, 0.011, `${s}HandThumb2`, 0.006);
    cone(`${s}HandThumb3`, `${s}HandThumb4`, 0.011, 0.009, `${s}HandThumb3`, 0.006);
    // legs
    cone(`${s}UpLeg`, `${s}Leg`, 0.082, 0.052, `${s}UpLeg`, 0.04);
    ell(add(mid(J(`${s}UpLeg`), J(`${s}Leg`), 0.35), [0.005 * sx, 0, 0.015]), [0.075, 0.16, 0.075], `${s}UpLeg`, 0.04);
    cone(`${s}Leg`, `${s}Foot`, 0.05, 0.034, `${s}Leg`, 0.025);
    ell(add(J(`${s}Leg`), [0, -0.13, -0.025]), [0.048, 0.11, 0.048], `${s}Leg`, 0.03);
    cone(`${s}Foot`, `${s}ToeBase`, 0.04, 0.033, `${s}Foot`, 0.02);
    cone(add(J(`${s}Foot`), [0, -0.05, -0.03]), add(J(`${s}ToeBase`), [0, 0.0, 0]), 0.03, 0.03, `${s}Foot`, 0.03);
    cone(`${s}ToeBase`, `${s}Toe_End`, 0.032, 0.024, `${s}ToeBase`, 0.015);
  }
  // neck + head
  cone('Neck', 'Head', 0.05, 0.048, 'Neck', 0.04);
  const head = mid(J('Head'), J('HeadTop_End'), 0.48);
  ell(add(head, [0, 0, 0.012]), [0.076, 0.1, 0.093], 'Head', 0.03);
  ell(add(J('Head'), [0, 0.01, 0.045]), [0.058, 0.05, 0.05], 'Head', 0.04); // jaw
  P.push({ t: 'cone', a: add(J('Head'), [0, 0.07, 0.09]), b: add(J('Head'), [0, 0.045, 0.105]), ra: 0.012, rb: 0.016, bone: B('Head'), k: 0.02 }); // nose

  if (variant === 'armor') {
    const qx = (deg: number) => new THREE.Quaternion().setFromEuler(new THREE.Euler((deg * Math.PI) / 180, 0, 0));
    P.push({ t: 'ell', c: add(head, [0, 0.012, 0.004]), r: [0.098, 0.122, 0.112], bone: B('Head'), k: 0.012 });
    P.push({ t: 'box', c: add(head, [0, -0.02, 0.085]), h: [0.07, 0.035, 0.035], round: 0.02, bone: B('Head'), k: 0.01, rot: qx(-12) });
    P.push({ t: 'box', c: add(J('Spine2'), [0, 0.02, 0.075]), h: [0.15, 0.12, 0.045], round: 0.035, bone: B('Spine2'), k: 0.02 });
    P.push({ t: 'box', c: add(J('Spine1'), [0, -0.02, 0.07]), h: [0.12, 0.07, 0.035], round: 0.03, bone: B('Spine1'), k: 0.02 });
    P.push({ t: 'box', c: add(J('Spine2'), [0, 0.0, -0.13]), h: [0.12, 0.16, 0.055], round: 0.025, bone: B('Spine2'), k: 0.02 });
    P.push({ t: 'ell', c: add(J('Hips'), [0, 0.04, 0]), r: [0.165, 0.04, 0.12], bone: B('Hips'), k: 0.01 });
    for (const s of ['Left', 'Right']) {
      const sx = s === 'Left' ? 1 : -1;
      P.push({ t: 'ell', c: add(J(`${s}Arm`), [0.02 * sx, 0.045, 0]), r: [0.08, 0.05, 0.08], bone: B(`${s}Arm`), k: 0.015 });
      P.push({ t: 'cone', a: mid(J(`${s}ForeArm`), J(`${s}Hand`), 0.2), b: mid(J(`${s}ForeArm`), J(`${s}Hand`), 0.85), ra: 0.05, rb: 0.044, bone: B(`${s}ForeArm`), k: 0.01 });
      P.push({ t: 'ell', c: add(J(`${s}Leg`), [0, 0.01, 0.045]), r: [0.055, 0.06, 0.04], bone: B(`${s}Leg`), k: 0.01 });
      P.push({ t: 'cone', a: mid(J(`${s}Leg`), J(`${s}Foot`), 0.55), b: add(J(`${s}Foot`), [0, -0.01, 0.01]), ra: 0.052, rb: 0.05, bone: B(`${s}Leg`), k: 0.015 });
      P.push({ t: 'box', c: add(mid(J(`${s}UpLeg`), J(`${s}Leg`), 0.45), [0.06 * sx, 0, 0.02]), h: [0.02, 0.09, 0.05], round: 0.015, bone: B(`${s}UpLeg`), k: 0.015 });
    }
  }
  return P.filter((p) => p.bone == null || p.bone >= 0);
}

const geoCache = new Map<string, Promise<THREE.BufferGeometry>>();
export function bodyGeometry(variant: BodyVariant, cell = 0.008) {
  const key = `${variant}:${cell}`;
  let p = geoCache.get(key);
  if (!p) {
    p = loadRig().then((rig) => {
      const t0 = performance.now();
      const prims = bodyPrims(rig, variant);
      const g = toGeometry(meshSDF(prims, cell));
      skinFromPrims(g, prims, 0.016);
      console.info(`[body] ${variant} ${g.getAttribute('position').count} verts in ${(performance.now() - t0).toFixed(0)}ms`);
      return g;
    });
    geoCache.set(key, p);
  }
  return p;
}

/* ------------------------------------------------------------------ */
/* Instances                                                           */
/* ------------------------------------------------------------------ */
export type Body = {
  root: THREE.Object3D;
  mesh: THREE.SkinnedMesh;
  bones: Map<string, THREE.Object3D>;
  mixer: THREE.AnimationMixer;
  clips: THREE.AnimationClip[];
  /** play clip at absolute time t (seek-safe) */
  clip(name: string, t: number, speed?: number): void;
  /** static pose (degrees, local euler XYZ) on top of rest */
  pose(p: Pose): void;
  /** after clip()/pose(): slerp the listed bones toward a pose by k (0..1) */
  blendPose(p: Pose, k: number): void;
  joint(name: string, out?: THREE.Vector3): THREE.Vector3;
  setMaterial(m: THREE.Material): void;
};

export type Pose = Record<string, [number, number, number]>;

export async function makeBody(variant: BodyVariant, material: THREE.Material): Promise<Body> {
  const [rig, geo] = await Promise.all([loadRig(), bodyGeometry(variant)]);
  const root = SkeletonUtils.clone(rig.scene) as unknown as THREE.Object3D;
  root.updateMatrixWorld(true);
  const bones = new Map<string, THREE.Object3D>();
  const list: THREE.Object3D[] = [];
  for (const n of rig.names) {
    const o = root.getObjectByName(n.replace(/[\s.:/[\]]/g, '')) ?? root.getObjectByName(n);
    if (!o) throw new Error(`bone ${n}`);
    list.push(o);
    bones.set(n.replace(/^mixamorig:?/, ''), o);
  }
  const inverses = list.map((b) => new THREE.Matrix4().copy(b.matrixWorld).invert());
  const skeleton = new THREE.Skeleton(list as THREE.Bone[], inverses);
  const mesh = new THREE.SkinnedMesh(geo, material);
  mesh.frustumCulled = false;
  root.add(mesh);
  mesh.bind(skeleton, new THREE.Matrix4());
  const rest = new Map(list.map((b) => [b, b.quaternion.clone()]));
  const mixer = new THREE.AnimationMixer(root);
  let current: THREE.AnimationAction | null = null;
  const e = new THREE.Euler();
  const qq = new THREE.Quaternion();
  const body: Body = {
    root,
    mesh,
    bones,
    mixer,
    clips: rig.clips,
    clip(name, t, speed = 1) {
      const c = rig.clips.find((x) => x.name === name);
      if (!c) return;
      if (!current || current.getClip() !== c) {
        mixer.stopAllAction();
        current = mixer.clipAction(c);
        current.play();
      }
      mixer.setTime(t * speed);
    },
    pose(p) {
      mixer.stopAllAction();
      current = null;
      for (const b of list) b.quaternion.copy(rest.get(b)!);
      for (const [k, v] of Object.entries(p)) {
        const b = bones.get(k);
        if (!b) continue;
        e.set((v[0] * Math.PI) / 180, (v[1] * Math.PI) / 180, (v[2] * Math.PI) / 180);
        b.quaternion.copy(rest.get(b)!).multiply(qq.setFromEuler(e));
      }
    },
    blendPose(p, k) {
      for (const [n, v] of Object.entries(p)) {
        const b = bones.get(n);
        if (!b) continue;
        e.set((v[0] * Math.PI) / 180, (v[1] * Math.PI) / 180, (v[2] * Math.PI) / 180);
        qq.copy(rest.get(b)!).multiply(new THREE.Quaternion().setFromEuler(e));
        b.quaternion.slerp(qq, k);
      }
    },
    joint(name, out = new THREE.Vector3()) {
      const b = bones.get(name);
      if (!b) return out.set(0, 0, 0);
      b.updateWorldMatrix(true, false);
      return out.setFromMatrixPosition(b.matrixWorld);
    },
    setMaterial(m) {
      mesh.material = m;
    },
  };
  return body;
}

/* ------------------------------------------------------------------ */
/* Hand-authored poses (degrees). Rest = T-pose, all locals identity.  */
/* ------------------------------------------------------------------ */
export const POSES: Record<string, Pose> = {
  stand: {
    LeftArm: [0, 0, -82], RightArm: [0, 0, 82],
    LeftForeArm: [0, -8, 0], RightForeArm: [0, 8, 0],
    LeftUpLeg: [0, 0, -2], RightUpLeg: [0, 0, 2],
  },
  aim: {
    Spine: [0, -18, 0], Spine1: [0, -10, 0], Neck: [0, 18, 0], Head: [6, 14, 0],
    RightArm: [0, 40, 60], RightForeArm: [0, 95, 0], RightHand: [0, 0, 10],
    LeftArm: [0, -55, -10], LeftForeArm: [0, -35, 0],
    LeftUpLeg: [-8, 0, -12], LeftLeg: [12, 0, 0], RightUpLeg: [10, 0, 8], RightLeg: [8, 0, 0],
  },
  fallen: {
    Hips: [-80, 20, 0], Spine: [10, 0, 6], Spine1: [10, 0, 0], Neck: [20, 0, 0], Head: [10, 20, 0],
    LeftArm: [30, 0, -20], LeftForeArm: [0, -40, 0], RightArm: [-20, 30, 40], RightForeArm: [0, 30, 0],
    LeftUpLeg: [60, 0, -10], LeftLeg: [70, 0, 0], RightUpLeg: [20, 0, 15], RightLeg: [30, 0, 0],
  },
  falling: {
    Hips: [-35, 0, 0], Spine: [-10, 0, 0], Neck: [-25, 0, 0], Head: [-15, 0, 0],
    LeftArm: [-40, 0, -30], LeftForeArm: [0, -50, 0], RightArm: [-50, 0, 40], RightForeArm: [0, 40, 0],
    LeftUpLeg: [-70, 0, -10], LeftLeg: [60, 0, 0], RightUpLeg: [-40, 0, 10], RightLeg: [90, 0, 0],
  },
  crouch: {
    Hips: [0, 0, 0], Spine: [25, 0, 0], Spine1: [10, 0, 0], Neck: [-20, 0, 0],
    LeftArm: [40, 0, -50], LeftForeArm: [0, -70, 0], RightArm: [40, 0, 50], RightForeArm: [0, 70, 0],
    LeftUpLeg: [-90, 0, -8], LeftLeg: [110, 0, 0], RightUpLeg: [-40, 0, 8], RightLeg: [120, 0, 0],
  },
  hit: {
    Spine: [-14, 0, 0], Spine1: [-10, 0, 0], Spine2: [-8, 0, 0], Neck: [-10, 0, 0], Head: [-25, 0, 0],
    LeftArm: [-70, 0, -40], LeftForeArm: [0, -30, 0], RightArm: [-80, 0, 35], RightForeArm: [0, 25, 0],
    LeftUpLeg: [-20, 0, -4], LeftLeg: [35, 0, 0], RightUpLeg: [-8, 0, 4], RightLeg: [45, 0, 0],
  },
  supine: {
    Spine: [-4, 0, 0], Neck: [-6, 0, 0], Head: [-10, 25, 0],
    LeftArm: [0, -20, -20], LeftForeArm: [0, -25, 0], RightArm: [0, 30, 15], RightForeArm: [0, 40, 0],
    LeftUpLeg: [-12, 0, -10], LeftLeg: [18, 0, 0], RightUpLeg: [-4, 0, 6], RightLeg: [6, 0, 0],
  },
  /** lying on the back, arms resting along the body */
  lying: {
    Neck: [-3, 0, 0], Head: [-5, 0, 0],
    LeftArm: [0, 0, -77], RightArm: [0, 0, 77],
    LeftForeArm: [0, -6, 0], RightForeArm: [0, 6, 0],
    LeftUpLeg: [0, 0, -3], RightUpLeg: [0, 0, 3],
  },
  reach: {
    Spine: [8, 0, 0], RightArm: [0, 30, 30], RightForeArm: [0, 30, 0], LeftArm: [0, -20, -65], LeftForeArm: [0, -20, 0],
    LeftUpLeg: [-20, 0, 0], LeftLeg: [30, 0, 0],
  },
};

/** World joint positions of the rig in a given pose (no mesh is built). */
export async function posedJoints(pose: Pose) {
  const rig = await loadRig();
  const root = SkeletonUtils.clone(rig.scene) as unknown as THREE.Object3D;
  const e = new THREE.Euler();
  for (const [k, v] of Object.entries(pose)) {
    const b = root.getObjectByName(`mixamorig${k}`);
    if (!b) continue;
    e.set((v[0] * Math.PI) / 180, (v[1] * Math.PI) / 180, (v[2] * Math.PI) / 180);
    b.quaternion.multiply(new THREE.Quaternion().setFromEuler(e));
  }
  root.updateMatrixWorld(true);
  const out = new Map<string, THREE.Vector3>();
  root.traverse((o) => {
    if (o.name.startsWith('mixamorig')) out.set(o.name.replace(/^mixamorig:?/, ''), new THREE.Vector3().setFromMatrixPosition(o.matrixWorld));
  });
  return out;
}
