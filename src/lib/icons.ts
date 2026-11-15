/**
 * Vector icons — solid Vectorheart geometry on a 24 grid: circles, squares,
 * 45° cuts and 4-unit strokes with butt ends. No small bitmaps; pixels in
 * this idiom only appear as large cells (maps, stepped type, register marks).
 *
 *   icon('target', { size: 20 })  → SVG string, fill = currentColor
 *
 * Each entry is a list of shapes. A plain string is a filled path (even-odd,
 * so inner subpaths cut holes); 's:' prefixes a stroked path.
 */
type Opts = { size?: number; color?: string; cls?: string; label?: string };

const I: Record<string, string[]> = {
  'arrow-r': ['M2 9.5H13V3.5L22 12L13 20.5V14.5H2Z'],
  chevron: ['M4 2H10.5L20.5 12L10.5 22H4L14 12Z'],
  'chevron-2': ['M0.5 3H6L15 12L6 21H0.5L9.5 12Z', 'M9.5 3H15L24 12L15 21H9.5L18.5 12Z'],
  check: ['M1.5 12.5L5.5 8.5L9.5 12.5L18.5 3.5L22.5 7.5L9.5 20.5Z'],
  cross: ['M2 6L6 2L12 8L18 2L22 6L16 12L22 18L18 22L12 16L6 22L2 18L8 12Z'],
  warn: ['M12 1.5L23 21.5H1Z M10.4 8H13.6V14.5H10.4Z M10.4 16.2H13.6V19H10.4Z'],
  target: ['M12 3A9 9 0 1 1 11.99 3Z M12 7A5 5 0 1 0 12.01 7Z', 'M12 10A2 2 0 1 1 11.99 10Z', 'M10.8 0H13.2V3.6H10.8Z M10.8 20.4H13.2V24H10.8Z M0 10.8H3.6V13.2H0Z M20.4 10.8H24V13.2H20.4Z'],
  power: ['s:M6.6 6.2A8.2 8.2 0 1 0 17.4 6.2', 'M10 1H14V12H10Z'],
  lock: ['M3 10H21V23H3Z M10.4 13.5H13.6V19.5H10.4Z', 's:M7 10V7.5A5 5 0 0 1 17 7.5V10'],
  link: ['s:M10 7.5H6.5A4.5 4.5 0 0 0 6.5 16.5H10 M14 7.5H17.5A4.5 4.5 0 0 1 17.5 16.5H14', 'M7.5 10.2H16.5V13.8H7.5Z'],
  signal: ['M1 17H5.5V22H1Z', 'M7 12H11.5V22H7Z', 'M13 7H17.5V22H13Z', 'M19 2H23.5V22H19Z'],
  battery: ['M1 5.5H20V18.5H1Z M3.8 8.3H17.2V15.7H3.8Z', 'M21 9H23.5V15H21Z', 'M5.6 10.1H11V13.9H5.6Z'],
  disk: ['M12 1.5A10.5 10.5 0 1 1 11.99 1.5Z M12 6A6 6 0 1 0 12.01 6Z', 'M9.8 9.8H14.2V14.2H9.8Z'],
  eye: ['M0.5 12C5 3.5 19 3.5 23.5 12C19 20.5 5 20.5 0.5 12Z M12 6.5A5.5 5.5 0 1 0 12.01 6.5Z', 'M12 9.4A2.6 2.6 0 1 1 11.99 9.4Z'],
  node: ['s:M5 5L12 19L19 5', 'M5 1A4 4 0 1 1 4.99 1Z', 'M19 1A4 4 0 1 1 18.99 1Z', 'M12 15A4 4 0 1 1 11.99 15Z'],
  down: ['M10 1H14V11.5H19.5L12 19L4.5 11.5H10Z', 'M2 20.5H22V23.5H2Z'],
  menu: ['M2 3.5H22V7.5H2Z', 'M2 10H22V14H2Z', 'M2 16.5H22V20.5H2Z'],
  grid: ['M2 2H10V10H2Z', 'M14 2H22V10H14Z', 'M2 14H10V22H2Z', 'M14 14H22V22H14Z M16.8 16.8H19.2V19.2H16.8Z'],
  unit: ['M12 1.5A5 5 0 1 1 11.99 1.5Z', 'M3 23V19A6 6 0 0 1 9 13H15A6 6 0 0 1 21 19V23Z'],
  bio: ['M12 22L2.2 12.2A5.6 5.6 0 0 1 12 4.8A5.6 5.6 0 0 1 21.8 12.2Z'],
  wave: ['s:M0.5 12H4.5L8 4L12 20L15.5 7.5L18.5 12H23.5'],
  plus: ['M9 2H15V9H22V15H15V22H9V15H2V9H9Z'],
  eject: ['M12 2L22.5 14H1.5Z', 'M1.5 17H22.5V22H1.5Z'],
  scan: ['M1 1H8.5V4H4V8.5H1Z M15.5 1H23V8.5H20V4H15.5Z M1 15.5H4V20H8.5V23H1Z M20 15.5H23V23H15.5V20H20Z', 'M1 10.5H23V13.5H1Z'],
  notch: ['M12 1.5A10.5 10.5 0 1 0 22.5 12H12Z', 'M14.5 1.8A10.5 10.5 0 0 1 22.2 9.5H14.5Z'],
  slot: ['M2 2H22V7H14.5V17H22V22H2V17H9.5V7H2Z'],
};

export const iconNames = Object.keys(I);

export function icon(name: string, o: Opts & { flip?: boolean } = {}) {
  const shapes = I[name] ?? I.cross;
  const size = o.size ?? 24;
  const body = shapes
    .map((d) =>
      d.startsWith('s:')
        ? `<path d="${d.slice(2)}" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="butt" stroke-linejoin="miter"/>`
        : `<path d="${d}" fill-rule="evenodd"/>`,
    )
    .join('');
  const flip = o.flip ? ' transform="matrix(-1 0 0 1 24 0)"' : '';
  const a11y = o.label ? `role="img" aria-label="${o.label}"` : 'aria-hidden="true"';
  return `<svg class="k-icon ${o.cls ?? ''}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" style="${o.color ? `color:${o.color}` : ''}" ${a11y}><g${flip}>${body}</g></svg>`;
}
