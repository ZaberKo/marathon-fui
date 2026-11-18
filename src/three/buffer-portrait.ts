import * as THREE from 'three/webgpu';
import { H, W, hash } from '../graphics/frame';
import { F, text } from '../graphics/draw';
import { bufferTracks, type BufferTrackOptions } from '../graphics/buffer-tracks';
import { fitHeight } from './assets';
import { pxOrtho } from './frame-camera';
import { contourMaterial } from './materials';
import { makeBody, POSES } from './models/body';

const CX = W / 2;
const CY = H / 2;

export async function createBufferDial(options: BufferTrackOptions) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera();
  const anchor = new THREE.Vector3(0, .9, 0);
  const material = contourMaterial({
    line: 0x2428c9, body: 0x070a39, freq: 81, width: .74, line2: 0x171ba4,
    freq2: 38, axis2: 'theta', width2: .5, opacity: .81,
  });
  const body = await makeBody('armor', material.mat).catch((error) => {
    material.mat.dispose();
    throw error;
  });
  fitHeight(body.root, 1.8);
  body.pose(POSES.stand);
  scene.add(body.root);

  const tracks = bufferTracks(options, (f, scale, phase, echo) => {
    material.u.offset.value = phase * .052;
    material.u.offset2.value = phase * -.032;
    body.root.rotation.y = .07 * Math.sin(phase * .14) + .08;
    pxOrtho(camera, CX - 19, CY - 4, scale, anchor);
    f.three = { scene, camera };
    text(f.fg, 'VR–X097', CX + 190, CY - 70, { size: 29, family: F.mono, weight: 700, rot: 90, color: '#101362', alpha: .6 });
    for (let i = 0; i < 11; i++) {
      const strength = hash(i, 29);
      const y = CY - 213 + i * 43;
      const flicker = Math.sin(phase * .18 + i * 1.22);
      f.fg.fillStyle = strength > .69 ? '#0e135e' : '#060a30';
      f.fg.fillRect(CX - 114 + flicker * 9 - echo, y, 20 + strength * 44 + echo, i % 4 === 0 ? 2 : 1);
      f.fg.fillRect(CX + 106 + flicker * 6, y + 3, 7 + strength * 28, 1);
    }
  });
  return {
    ...tracks,
    dispose() {
      body.mesh.skeleton.dispose();
      material.mat.dispose();
    },
  };
}
