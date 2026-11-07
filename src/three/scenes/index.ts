import type { SceneHandle, SceneOpts } from './common';
export type { SceneHandle, SceneOpts } from './common';

export type SceneDef = {
  key: string;
  code: string;
  title: string;
  note: string;
  /** asset weight hint shown in the UI */
  asset: string;
  mount: (host: HTMLElement, opts?: SceneOpts) => Promise<SceneHandle>;
};

export const SCENES: SceneDef[] = [
  {
    key: 'runner',
    code: 'GPU-01',
    title: 'Contour runner',
    asset: 'SDF body (armour) · Mixamo motion',
    note: 'Body = black occluder; form = 1px world-Y iso-lines (TSL fract + fwidth), silhouette rim, sweeping scan band. Vector marks ride skinned vertices; leader lines to labels.',
    mount: async (h, o) => (await import('./runner')).mountRunner(h, o),
  },
  {
    key: 'shell',
    code: 'GPU-02',
    title: 'Shell / dot cloud',
    asset: 'SDF body · Mixamo motion',
    note: 'Bayer 4×4 ordered dither on facing ratio → dot-cloud body; joints as flat cyan plates; outline triangles pop in/out in steps; bezier fan terminates on the surface.',
    mount: async (h, o) => (await import('./shell')).mountShell(h, o),
  },
  {
    key: 'psyche',
    code: 'GPU-03',
    title: 'Psyche link',
    asset: 'procedural brain + SDF body',
    note: 'Ridged-noise brain as dense local-space contours on a grid plate; yellow connectors map cortex points to the figure, drawing in one per step.',
    mount: async (h, o) => (await import('./psyche')).mountPsyche(h, o),
  },
  {
    key: 'orbital',
    code: 'GPU-04',
    title: 'Orbital uplink',
    asset: 'Natural Earth land-110m',
    note: 'Earth = latitude slices that only exist over land. Wireframe satellites on inclined orbits; selected one gets brackets, nadir line, footprint rings and live uplinks.',
    mount: async (h, o) => (await import('./orbital')).mountOrbital(h, o),
  },
  {
    key: 'dropzone',
    code: 'GPU-05',
    title: 'Drop zone',
    asset: 'procedural pixel texture',
    note: 'Planet horizon in flat cobalt with nearest-filtered plate texture; target triangles; green arcs fall from an orbital source cluster, drawing in sequence.',
    mount: async (h, o) => (await import('./dropzone')).mountDropzone(h, o),
  },
  {
    key: 'headscan',
    code: 'GPU-06',
    title: 'Head scan',
    asset: 'SDF head (generated)',
    note: 'Two contour families (orange Y, cobalt X) form a curved wire-grid; cranium node circles, landmark diamonds, internal circuit traces, stepped optic rings.',
    mount: async (h, o) => (await import('./headscan')).mountHeadscan(h, o),
  },
  {
    key: 'terrain',
    code: 'GPU-07',
    title: 'Contour field',
    asset: 'marching squares · CPU',
    note: 'Noise field → marching-squares iso-lines, each level lifted to its height and rebuilt every 3 steps. Pod convoy with axis-ring contours on cobalt rails.',
    mount: async (h, o) => (await import('./terrain')).mountTerrain(h, o),
  },
];
