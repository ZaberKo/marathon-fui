import { FPS } from '../../graphics/frame';
import { createBufferDial as createPortraitDial } from '../../three/buffer-portrait';
import { ANCHORS, cue } from '../../content/shell-07/cues';
import { ST } from '../../content/shell-07/times';

export { BUFFER_LOAD_DURATION, BUFFER_LOCK_DURATION } from '../../graphics/buffer-tracks';
export const BUFFER_RETURN_FLASH = 3 / FPS;
export const BUFFER_RETURN_DURATION = ANCHORS.downbeat - ST.S21[0] - BUFFER_RETURN_FLASH;
const countAt = cue('v06') + 1.12 - ST.S06[0];

export function createBufferDial() {
  return createPortraitDial({ countAt });
}
