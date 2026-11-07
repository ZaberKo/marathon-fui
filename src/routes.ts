import type { Cleanup } from './lib/util';

export type PageModule = { default: (root: HTMLElement) => Cleanup | Promise<Cleanup> };
export type Route = {
  id: string;
  num: string;
  label: string;
  code: string;
  load: () => Promise<PageModule>;
};

export const ROUTES: Route[] = [
  { id: '', num: '00', label: 'Boot', code: 'SYS.BOOT', load: () => import('./pages/boot') },
  { id: 'type', num: '01', label: 'Type', code: 'TYP.SPEC', load: () => import('./pages/type') },
  { id: 'signal', num: '02', label: 'Signal', code: 'COL.STATE', load: () => import('./pages/signal') },
  { id: 'controls', num: '03', label: 'Controls', code: 'CTL.INPUT', load: () => import('./pages/controls') },
  { id: 'glyphs', num: '04', label: 'Glyphs', code: 'GLY.VECT', load: () => import('./pages/glyphs') },
  { id: 'telemetry', num: '05', label: 'Telemetry', code: 'HUD.INST', load: () => import('./pages/telemetry') },
  { id: 'motion', num: '06', label: 'Motion', code: 'MOT.STEP', load: () => import('./pages/motion') },
  { id: 'spatial', num: '07', label: 'Spatial', code: 'GPU.SCENE', load: () => import('./pages/spatial') },
  { id: 'fault', num: '08', label: 'Fault', code: 'ERR.STATE', load: () => import('./pages/fault') },
  { id: 'study', num: '09', label: 'Film', code: 'CIN.FILM', load: () => import('./pages/study') },
];
