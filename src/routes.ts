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
  { id: '', num: '00', label: 'Index', code: 'SYS.INDEX', load: () => import('./pages/boot') },
  { id: 'type', num: '01', label: 'Type', code: 'TYP.SPEC', load: () => import('./pages/type') },
  { id: 'colour', num: '02', label: 'Colour', code: 'COL.STATE', load: () => import('./pages/colour') },
  { id: 'marks', num: '03', label: 'Marks', code: 'MRK.VECT', load: () => import('./pages/marks') },
  { id: 'interface', num: '04', label: 'Interface', code: 'UI.MENU', load: () => import('./pages/interface') },
  { id: 'data', num: '05', label: 'Data', code: 'DAT.DIAL', load: () => import('./pages/data') },
  { id: 'fields', num: '06', label: 'Fields', code: 'FLD.POSTER', load: () => import('./pages/fields') },
  { id: 'spatial', num: '07', label: 'Spatial', code: 'GPU.SCENE', load: () => import('./pages/spatial') },
  { id: 'study', num: '08', label: 'Film', code: 'CIN.FILM', load: () => import('./pages/study') },
];

/** Old chapter ids still resolve after the restructure. */
export const ALIASES: Record<string, string> = {
  signal: 'colour',
  controls: 'interface',
  glyphs: 'marks',
  telemetry: 'data',
  'telemetry/dials': 'data',
  dials: 'data',
  motion: 'fields',
  fault: 'fields',
};
