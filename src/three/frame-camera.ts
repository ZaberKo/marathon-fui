import * as THREE from 'three/webgpu';
import { H, W } from '../graphics/frame';

/**
 * Orthographic camera such that world point `anchor` lands on frame px (x, y)
 * and 1 world unit = `s` px. The camera looks down -Z.
 */
export function pxOrtho(cam: THREE.OrthographicCamera, x: number, y: number, s: number, anchor = new THREE.Vector3()) {
  cam.left = -x / s;
  cam.right = (W - x) / s;
  cam.top = y / s;
  cam.bottom = -(H - y) / s;
  cam.position.set(anchor.x, anchor.y, anchor.z + 10);
  cam.near = 0.01;
  cam.far = 40;
  cam.updateProjectionMatrix();
}
