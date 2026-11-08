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
    note: 'Body = black occluder; form = 1px world-Y iso-lines with every fifth an index contour, silhouette rim, sweeping scan band. A tracked pose skeleton and leader lines ride the rig above a 120-tick floor dial.',
    mount: async (h, o) => (await import('./runner')).mountRunner(h, o),
  },
  {
    key: 'shell',
    code: 'GPU-02',
    title: 'Shell / flat cel',
    asset: 'SDF body (armour) · stencil decals',
    note: 'Three world-lit flat tones with hard steps and a hard black edge — no gradients, no dither. Stencil decals ride the bones. On the beat the field floods cobalt behind the dark silhouette, connector fan and stepped triangle groups.',
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
    asset: 'procedural planet shader',
    note: 'The shader draws flat cobalt plates and broken dot rows on the planet. Green arcs fall from the orbital source to marked targets in sequence.',
    mount: async (h, o) => (await import('./dropzone')).mountDropzone(h, o),
  },
  {
    key: 'headscan',
    code: 'GPU-06',
    title: 'Head scan / visual pathway',
    asset: 'SDF head at real proportions',
    note: 'Cobalt slices + orange meridians in additive x-ray; wire eyeballs, brain contours and ~70 optic fibres per eye (eye → chiasm → LGN → V1) with signals flowing back from the retina. Stepped scan slice; the head turns in hard cuts.',
    mount: async (h, o) => (await import('./headscan')).mountHeadscan(h, o),
  },
  {
    key: 'terrain',
    code: 'GPU-07',
    title: 'Contour survey',
    asset: 'marching squares · CPU',
    note: 'Marching-squares isolines lifted to their height and coloured by elevation, index contours brighter; a survey level climbs through them in steps. Ruins as map symbols, drop-zone rings draped on the ground, pods landing in sequence.',
    mount: async (h, o) => (await import('./terrain')).mountTerrain(h, o),
  },
  {
    key: 'subject',
    code: 'GPU-08',
    title: 'Subject / surface prints',
    asset: 'SDF armour · RenderPipeline',
    note: 'The profile, walking figure and camera are shared by all three prints. Pixel Noise uses broken cobalt runs, Black Dots cuts holes into yellow ink, and Ordered Dither screens green ink through a Bayer matrix.',
    mount: async (h, o) => (await import('./subject')).mountSubject(h, o),
  },
];
