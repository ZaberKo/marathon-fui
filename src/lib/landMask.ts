/**
 * Land mask from the 110 m world atlas, without three.js.
 * Returns (lat, lon) → boolean; crossings are cached per latitude.
 */
let landP: Promise<(lat: number, lon: number) => boolean> | null = null;

export function loadLandMask() {
  if (landP) return landP;
  landP = (async () => {
    const [{ feature }, topo] = await Promise.all([import('topojson-client'), import('world-atlas/land-110m.json')]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t = (topo as any).default ?? topo;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const land = feature(t, t.objects.land) as any;
    const polys: number[][][][] = land.features.flatMap((f: any) =>
      f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates,
    );
    // unwrap rings that cross the antimeridian (Fiji, Chukotka) so their edges stay short;
    // crossings may then sit beyond ±180, and lookups test x, x + 360 and x − 360
    const rings = polys.flat().map((ring) => {
      let shift = 0;
      return ring.map((p, i) => {
        if (i > 0) {
          const d = p[0] + shift - (ring[i - 1][0] + shift);
          if (d > 180) shift -= 360;
          else if (d < -180) shift += 360;
        }
        return [p[0] + shift, p[1]];
      });
    });
    const rows = new Map<number, number[]>();
    return (lat: number, lon: number) => {
      let crossings = rows.get(lat);
      if (!crossings) {
        crossings = [];
        for (const ring of rings) {
          const own: number[] = [];
          for (let i = 1; i < ring.length; i++) {
            const [x0, y0] = ring[i - 1];
            const [x1, y1] = ring[i];
            if ((y0 > lat) === (y1 > lat)) continue;
            own.push(x0 + ((x1 - x0) * (lat - y0)) / (y1 - y0));
          }
          crossings.push(...own);
        }
        crossings.sort((a, b) => a - b);
        rows.set(lat, crossings);
      }
      const x = ((((lon + 180) % 360) + 360) % 360) - 180;
      const inside = (v: number) => {
        let n = 0;
        for (const c of crossings!) if (c < v) n++;
        return n % 2 === 1;
      };
      return inside(x) || inside(x + 360) || inside(x - 360);
    };
  })();
  return landP;
}
