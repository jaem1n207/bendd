import {
  toVector,
  type Vector,
} from '@/components/connection-globe/lib/geometry';

interface Mask {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/** Trace the existing land mask; no additional map download or geographic data. */
export function traceCoastlines(mask: Mask): Vector[][] {
  const { width, height, data } = mask;
  const links = new Map<number, number[]>();
  // Marching squares: top, right, bottom, left. Diagonal islands stay separate.
  const cases: number[][][] = [
    [],
    [[3, 0]],
    [[0, 1]],
    [[3, 1]],
    [[1, 2]],
    [
      [3, 0],
      [1, 2],
    ],
    [[0, 2]],
    [[3, 2]],
    [[2, 3]],
    [[0, 2]],
    [
      [0, 1],
      [2, 3],
    ],
    [[1, 2]],
    [[1, 3]],
    [[0, 1]],
    [[3, 0]],
    [],
  ];
  const land = (x: number, y: number) =>
    data[(y * width + (x % width)) * 4] >= 128;
  const key = (x: number, y: number) => y * width * 2 + (x % (width * 2));
  const connect = (a: number, b: number) => {
    const neighbors = links.get(a);
    if (neighbors) {
      neighbors.push(b);
    } else {
      links.set(a, [b]);
    }
  };
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width; x++) {
      const code =
        Number(land(x, y)) +
        Number(land(x + 1, y)) * 2 +
        Number(land(x + 1, y + 1)) * 4 +
        Number(land(x, y + 1)) * 8;
      const edges = [
        key(x * 2 + 1, y * 2),
        key(x * 2 + 2, y * 2 + 1),
        key(x * 2 + 1, y * 2 + 2),
        key(x * 2, y * 2 + 1),
      ];
      for (const [from, to] of cases[code]) {
        connect(edges[from], edges[to]);
        connect(edges[to], edges[from]);
      }
    }
  }
  const seen = new Set<number>();
  const contours: Vector[][] = [];
  for (const start of links.keys()) {
    if (seen.has(start)) {
      continue;
    }
    const chain: number[] = [];
    let current = start;
    while (!seen.has(current)) {
      seen.add(current);
      chain.push(current);
      const next = links.get(current)?.find(point => !seen.has(point));
      if (next === undefined) {
        break;
      }
      current = next;
    }
    if (chain.length < 10) {
      continue;
    }
    const closed = links.get(current)?.includes(start) ?? false;
    let points = chain.map(point =>
      toVector({
        latitude:
          90 - ((Math.floor(point / (width * 2)) / 2 + 0.5) / height) * 180,
        longitude: (((point % (width * 2)) / 2 + 0.5) / width) * 360 - 180,
      })
    );
    // Two local smoothing passes remove raster stair-steps without moving a
    // contour off the sphere or creating a seam at the antimeridian.
    for (let pass = 0; pass < 2; pass++) {
      points = points.map((point, index) => {
        if (!closed && (index === 0 || index === points.length - 1)) {
          return point;
        }
        const before = points[(index - 1 + points.length) % points.length];
        const after = points[(index + 1) % points.length];
        const x = before.x + point.x * 2 + after.x;
        const y = before.y + point.y * 2 + after.y;
        const z = before.z + point.z * 2 + after.z;
        const length = Math.hypot(x, y, z);
        return { x: x / length, y: y / length, z: z / length };
      });
    }
    if (closed) {
      points.push(points[0]);
    }
    contours.push(points);
  }
  return contours.sort((a, b) => b.length - a.length);
}
