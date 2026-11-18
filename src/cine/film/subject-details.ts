import * as THREE from 'three/webgpu';
import { rng } from '../../lib/util';
import { sampleVerts, vertexWorld } from '../../three/assets';
import { contourMaterial } from '../../three/materials';
import { ARMOR_BRAIN, armorHeadGeometry, type Body } from '../../three/models/body';
import { FillBatch, LineBatch } from '../../three/overlay';
import { brainGeometry } from '../../three/procedural';

/** Narrative graphics used only by the film's subject identification shot. */
export async function createSubjectDetails(scene: THREE.Scene, body: Body, portrait: THREE.Group) {
  const armorHead = await armorHeadGeometry();
  const brainInk = contourMaterial({ space: 'local', axis: 'y', line: 0x42ed45, freq: 16, width: 0.68, body: 0x000000, line2: 0x237b2d, axis2: 'x', freq2: 10, width2: 0.55 });
  const brain = new THREE.Mesh(brainGeometry(36, 3), brainInk.mat);
  brain.position.copy(ARMOR_BRAIN.center);
  brain.scale.copy(ARMOR_BRAIN.scale);
  const runnerBrain = new THREE.Group();
  runnerBrain.matrixAutoUpdate = false;
  runnerBrain.add(brain);
  const enlargedBrain = new THREE.Group();
  enlargedBrain.matrixAutoUpdate = false;
  enlargedBrain.add(brain.clone());
  scene.add(runnerBrain, enlargedBrain);
  const headBone = body.bones.get('Head')!;
  const lines = new LineBatch(256, { depthTest: false });
  const fills = new FillBatch(128, { depthTest: false });
  scene.add(lines.object, fills.object);

  const random = rng(41);
  const fragments = sampleVerts(body.mesh, 32, random).map((vertex) => ({
    vertex,
    phase: Math.floor(random() * 23),
    drift: new THREE.Vector3(0.36 + random() * 0.75, (random() - 0.45) * 0.55, 0.14),
    size: 7 + random() * 15,
  }));
  const point = new THREE.Vector3();
  const markers = [new THREE.Vector3(-2.05, 0.8, 0), new THREE.Vector3(-0.24, 1.34, 0), new THREE.Vector3(2.05, 1.56, 0)];

  return {
    update(camera: THREE.Camera, height: number, frame: number) {
      enlargedBrain.matrix.copy(portrait.matrix);
      enlargedBrain.matrixWorldNeedsUpdate = true;
      runnerBrain.matrix.multiplyMatrices(headBone.matrixWorld, armorHead.boneFromHead);
      runnerBrain.matrixWorldNeedsUpdate = true;
      lines.begin(camera, height);
      fills.begin(camera, height);
      fragments.forEach((fragment, index) => {
        const age = (frame + fragment.phase) % 23;
        if (age >= 16) return;
        vertexWorld(body.mesh, fragment.vertex, point);
        point.addScaledVector(fragment.drift, age / 16);
        if (index % 4 === 0) {
          fills.color(0xd4ff00).tri(point, fragment.size, index % 3 === 0);
        } else {
          lines.color(0x3431be).tri(point, fragment.size * 0.7, index % 2 === 0, age * 0.14);
        }
      });
      markers.forEach((position) => lines.color(0x7778a4).cross(position, 8));
      lines.end();
      fills.end();
    },
    dispose() {
      brain.geometry.dispose();
      brainInk.mat.dispose();
      lines.object.geometry.dispose();
      fills.object.geometry.dispose();
      (lines.object.material as THREE.Material).dispose();
      (fills.object.material as THREE.Material).dispose();
    },
  };
}
