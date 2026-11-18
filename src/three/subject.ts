import * as THREE from 'three/webgpu';
import { abs, floor, hash, max, mix, normalView, pass, screenSize, screenUV, step, uniform, vec2, vec3, vec4 } from 'three/tsl';
import { fitHeight } from './assets';
import { surfacePrintMaterial } from './materials';
import { makeBody, POSES, type Body } from './models/body';

type SubjectDetails = {
  update(camera: THREE.Camera, height: number, frame: number): void;
  dispose(): void;
};

type SubjectStyle = 'noise' | 'black-dots' | 'ordered';
const BODY_LAYER = 1;
const PORTRAIT_LAYER = 2;

function maskLayer(index: number) {
  const layer = new THREE.Layers();
  layer.set(index);
  return layer;
}

function ink(hex: number) {
  const { r, g, b } = new THREE.Color(hex);
  return vec3(r, g, b);
}

/** The profile and walker share a camera and clock across all three prints. */
export async function createSubject(
  renderer: THREE.WebGPURenderer,
  camera: THREE.PerspectiveCamera,
  createDetails?: (scene: THREE.Scene, body: Body, portrait: THREE.Group) => Promise<SubjectDetails>,
) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const bodyMask = new THREE.MeshBasicNodeMaterial();
  bodyMask.colorNode = vec3(abs(normalView.z).mul(0.83).add(0.17));
  const [body, bust] = await Promise.all([makeBody('armor', bodyMask), makeBody('armor', white)]);

  fitHeight(body.root, 1.8);
  body.mesh.layers.set(BODY_LAYER);
  scene.add(body.root);

  const portrait = new THREE.Group();
  bust.pose(POSES.stand);
  // Use the eye-line origin shared by the head geometry and the film's brain overlay.
  const origin = bust.joint('Head').lerp(bust.joint('HeadTop_End'), 0.48).add(new THREE.Vector3(0, -0.025, 0.018));
  bust.root.position.sub(origin);
  bust.mesh.layers.set(PORTRAIT_LAYER);
  portrait.add(bust.root);
  scene.add(portrait);
  camera.layers.enable(BODY_LAYER);
  camera.layers.enable(PORTRAIT_LAYER);
  const details = createDetails ? await createDetails(scene, body, portrait) : null;

  const seed = uniform(0);
  const slow = floor(seed.div(3));
  const bodyPass = pass(scene, camera, { samples: 0 }).setLayers(maskLayer(BODY_LAYER));
  const portraitPass = pass(scene, camera, { samples: 0 }).setLayers(maskLayer(PORTRAIT_LAYER));
  const detailPass = details ? pass(scene, camera).setLayers(maskLayer(0)) : null;
  bodyPass.setResolutionScale(1 / 5);
  portraitPass.setResolutionScale(1 / 3);

  // Sample the low-resolution pass at each output cell's center.
  const bodyGrid = floor(screenSize.div(5)).max(1);
  const bodyCell = floor(screenUV.mul(bodyGrid));
  const facing = bodyPass.getTextureNode().sample(bodyCell.add(0.5).div(bodyGrid)).r;
  const patch = floor(bodyCell.div(vec2(5, 7)));
  const patchNoise = hash(patch.x.add(patch.y.mul(101)).add(slow.mul(2.7)));
  const cellNoise = hash(bodyCell.x.add(bodyCell.y.mul(157)).add(seed.mul(13.7)));
  const threshold = mix(0.28, 0.78, patchNoise).sub(facing.mul(0.28));
  const onBody = step(0.12, facing).mul(step(threshold, cellNoise));
  const bodyInk = mix(ink(0x2111d8), ink(0x3938ff), step(0.77, facing.mul(0.72).add(patchNoise.mul(0.4))));

  // Form slabs, bites and loose pixels on a single square-cell raster inside the bust.
  const pixel = floor(screenSize.y.div(145).add(0.5)).max(2);
  const portraitGrid = floor(screenSize.div(pixel)).max(1);
  const cell = floor(screenUV.mul(portraitGrid));
  const mask = portraitPass.getTextureNode().sample(cell.add(0.5).div(portraitGrid)).r;
  const band = floor(cell.y.div(6));
  const row = cell.y.sub(band.mul(6));
  const profile = hash(band.mul(19).add(8));
  const thickness = floor(profile.mul(3.6)).add(1);
  const runIndex = floor(cell.x.add(floor(profile.mul(17))).div(17));
  const run = hash(runIndex.mul(17).add(band.mul(89)).add(slow.mul(0.7)));
  const bit = hash(cell.x.mul(7).add(cell.y.mul(53)).add(slow.mul(3)));
  const slab = step(0.34, run).mul(step(row, thickness.sub(1)))
    .mul(max(step(row, thickness.sub(2)), step(0.13, bit)));
  const tooth = step(abs(row.sub(thickness)), 0.1).mul(step(0.48, run)).mul(step(0.68, bit));
  const scatter = step(row, 1).mul(step(run, 0.34)).mul(step(0.83, bit));
  const onPortrait = step(0.5, mask).mul(max(slab, max(tooth, scatter)));
  const silhouettes = mix(ink(0x240ce3).mul(onPortrait), bodyInk, onBody);
  const composite = detailPass ? max(silhouettes, detailPass.getTextureNode().rgb) : silhouettes;
  const pipeline = new THREE.RenderPipeline(renderer, vec4(composite, 1));
  const prints = new Map<SubjectStyle, THREE.Material>();
  let style: SubjectStyle = 'noise';

  return {
    scene,
    setStyle(next: SubjectStyle) {
      if (next === style) return;
      style = next;
      if (next === 'noise') {
        body.setMaterial(bodyMask);
        bust.setMaterial(white);
        return;
      }
      let print = prints.get(next);
      if (!print) {
        print = surfacePrintMaterial(next, next === 'black-dots' ? 0xe8e519 : 0x37eb42);
        prints.set(next, print);
      }
      body.setMaterial(print);
      bust.setMaterial(print);
    },
    update(time: number, frame: number, height: number) {
      const spread = Math.min(1, camera.aspect / 1.55);
      camera.position.set(0, 1.27, 5.95);
      camera.lookAt(0, 1.07, 0);
      camera.updateMatrixWorld();
      body.root.position.x = 0.95 * spread;
      body.root.rotation.y = -0.6 - (Math.floor(time * 2) % 5) * 0.05;
      body.clip('walk', time * 0.73 + 0.3);
      body.root.updateMatrixWorld(true);
      seed.value = frame;

      portrait.position.set(-1.42 * spread, 1.41, -1.35);
      portrait.rotation.y = 1.02 + (Math.floor(time * 2) % 3) * 0.035;
      portrait.scale.setScalar(9.4 * (0.64 + spread * 0.36));
      portrait.updateMatrix();
      details?.update(camera, height, frame);
    },
    render() {
      if (style === 'noise') pipeline.render();
      else renderer.render(scene, camera);
    },
    dispose() {
      body.mixer.stopAllAction();
      body.mesh.skeleton.dispose();
      bust.mesh.skeleton.dispose();
      bodyPass.dispose();
      portraitPass.dispose();
      detailPass?.dispose();
      pipeline.dispose();
      white.dispose();
      bodyMask.dispose();
      prints.forEach((material) => material.dispose());
      details?.dispose();
    },
  };
}
