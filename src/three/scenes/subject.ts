import * as THREE from 'three/webgpu';
import type { Stage } from '../core';
import { createSubject } from '../subject';
import { mountStage, type SceneHandle, type SceneOpts } from './common';

export async function mountSubject(host: HTMLElement, { fps = 12, pixel = 1, signal }: SceneOpts = {}): Promise<SceneHandle> {
  const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 100);
  return mountStage(host, { label: 'SUBJECT', fps, pixel, camera, signal }, (stage) => setupSubject(stage, camera));
}

async function setupSubject(stage: Stage, camera: THREE.PerspectiveCamera) {
  const subject = await createSubject(stage.renderer, camera);
  stage.setRender(subject.render);
  stage.start((time, frame) => {
    subject.update(Math.max(0, time), frame, stage.size.h);
  });

  return {
    set(key: string, value: unknown) {
      if (key !== 'style' || (value !== 'noise' && value !== 'black-dots' && value !== 'ordered')) return;
      subject.setStyle(value);
      stage.setRender(subject.render);
    },
    dispose() {
      stage.setRender(null);
      subject.dispose();
    },
  };
}
