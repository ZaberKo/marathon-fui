import * as THREE from 'three/webgpu';
import { blockTextRows } from '../../lib/glyphs';

type Ink = THREE.ColorRepresentation;
type Point = readonly [number, number];
type Lettering = { align?: 'left' | 'center'; maxWidth?: number; aspect?: number; layer?: number };

/** Flat marks in design coordinates, batched into a single vertex-colored mesh. */
export class VectorPlate {
  private readonly positions: number[] = [];
  private readonly colors: number[] = [];
  private readonly ink = new THREE.Color();

  constructor(readonly width: number, readonly height: number, private readonly worldWidth: number, private readonly worldHeight: number) {}

  polygon(points: readonly Point[], color: Ink, layer = 0) {
    if (points.length < 3) return;
    const area = points.reduce((sum, [x, y], i) => {
      const [nx, ny] = points[(i + 1) % points.length];
      return sum + x * ny - y * nx;
    }, 0);
    if (area === 0) return;
    const { r, g, b } = this.ink.set(color);
    const z = layer * this.worldWidth / this.width;
    const vertex = ([x, y]: Point) => {
      this.positions.push((x / this.width - 0.5) * this.worldWidth, (0.5 - y / this.height) * this.worldHeight, z);
      this.colors.push(r, g, b);
    };
    for (let i = 1; i < points.length - 1; i++) {
      vertex(points[0]);
      vertex(points[area < 0 ? i : i + 1]);
      vertex(points[area < 0 ? i + 1 : i]);
    }
  }

  rect(x: number, y: number, width: number, height: number, color: Ink, layer = 0) {
    this.polygon([[x, y], [x + width, y], [x + width, y + height], [x, y + height]], color, layer);
  }

  segment(x0: number, y0: number, x1: number, y1: number, width: number, color: Ink) {
    const scale = width / (2 * Math.hypot(x1 - x0, y1 - y0));
    const dx = (y1 - y0) * scale;
    const dy = (x0 - x1) * scale;
    this.polygon([[x0 - dx, y0 - dy], [x1 - dx, y1 - dy], [x1 + dx, y1 + dy], [x0 + dx, y0 + dy]], color);
  }

  text(label: string, x: number, y: number, capHeight: number, color: Ink, o: Lettering = {}) {
    const rows = blockTextRows(label);
    const columns = rows[0].length;
    if (!columns) return;
    const dy = capHeight / rows.length;
    const dx = Math.min(dy * (o.aspect ?? 1), (o.maxWidth ?? Infinity) / columns);
    const left = o.align === 'center' ? x - columns * dx / 2 : x;
    for (let row = 0; row < rows.length; row++) {
      for (let column = 0; column < columns; column++) {
        if (rows[row][column] !== '#') continue;
        this.rect(left + column * dx, y + row * dy, dx, dy, color, o.layer);
      }
    }
  }

  mesh(params: THREE.MeshBasicMaterialParameters = {}) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ ...params, vertexColors: true }));
  }
}
