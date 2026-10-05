import { clamp } from '@/components/connection-globe/lib/geometry';

type Boundary = ReadonlyArray<readonly [longitude: number, latitude: number]>;

// Coarse mainland envelopes, clipped by the existing land mask. These are
// geographic color regions, not country borders or political classifications.
const africa: Boundary = [
  [-19, -36],
  [-19, 36],
  [-5, 36],
  [0, 37],
  [10, 38],
  [12, 34],
  [20, 34],
  [26, 33],
  [32.5, 31.5],
  [32.5, 29.8],
  [35, 23],
  [43.3, 12.7],
  [52, 11.9],
  [52, -36],
];
const europe: Boundary = [
  [-31, 35],
  [25, 34],
  [28, 35],
  [28, 40],
  [29.1, 40.8],
  [29.2, 41.5],
  [40, 43.2],
  [50, 43.2],
  [55, 50],
  [60, 55],
  [60, 64],
  [69, 72],
  [69, 90],
  [-31, 90],
];

function inside(latitude: number, longitude: number, boundary: Boundary) {
  let result = false;
  for (
    let index = 0, previous = boundary.length - 1;
    index < boundary.length;
    previous = index++
  ) {
    const [x, y] = boundary[index];
    const [px, py] = boundary[previous];
    if (
      y > latitude !== py > latitude &&
      longitude < ((px - x) * (latitude - y)) / (py - y) + x
    ) {
      result = !result;
    }
  }
  return result;
}

/** North/South America, Africa, Europe, Asia, Oceania, Antarctica. */
export function continentColor(latitude: number, longitude: number) {
  if (latitude < -60) {
    return 6;
  }
  if (
    (longitude > 110 && latitude < -11) ||
    (longitude > 130 && latitude < 20) ||
    (longitude < -130 && latitude < 25) ||
    (longitude < -95 && latitude < -20)
  ) {
    return 5;
  }
  if (latitude > 70 && longitude < -12) {
    return 0;
  }
  if (longitude < -30) {
    return (latitude < 13 &&
      longitude > -81.5 &&
      (latitude < 7.5 || longitude > -77.5)) ||
      (latitude < 0 && longitude > -95)
      ? 1
      : 0;
  }
  if (inside(latitude, longitude, africa)) {
    return 2;
  }
  if (inside(latitude, longitude, europe)) {
    return 3;
  }
  return 4;
}

/** Sample an equirectangular land mask at equal-area Fibonacci sphere points. */
export function createLandParticles(
  mask: { width: number; height: number; data: Uint8ClampedArray },
  samples: number
) {
  const particles: number[] = [];
  const cells = new Map<
    string,
    { region: number; phase: number; offsets: number[] }
  >();
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let index = 0; index < samples; index++) {
    const y = 1 - (2 * (index + 0.5)) / samples;
    const radius = Math.sqrt(1 - y * y);
    const longitude = ((index * goldenAngle) % (Math.PI * 2)) - Math.PI;
    const latitude = Math.asin(y);
    const column = clamp(
      Math.floor(((longitude + Math.PI) / (2 * Math.PI)) * mask.width),
      0,
      mask.width - 1
    );
    const row = clamp(
      Math.floor(((Math.PI / 2 - latitude) / Math.PI) * mask.height),
      0,
      mask.height - 1
    );
    if (mask.data[(row * mask.width + column) * 4] < 128) {
      continue;
    }
    const seed = Math.sin(index * 127.1 + 311.7) * 43758.5453;
    const region = continentColor(
      (latitude * 180) / Math.PI,
      (longitude * 180) / Math.PI
    );
    // Equal-area cells keep both colors present locally, including the poles.
    const band = Math.floor((y + 1) * 12);
    const sector = Math.floor(((longitude + Math.PI) / (Math.PI * 2)) * 48);
    const key = `${region}:${band}:${sector}`;
    const cell = cells.get(key) ?? {
      region,
      phase: seed - Math.floor(seed) < 0.5 ? 0 : 1,
      offsets: [],
    };
    cell.offsets.push(particles.length);
    cells.set(key, cell);
    particles.push(
      radius * Math.cos(longitude),
      y,
      -radius * Math.sin(longitude),
      region,
      seed - Math.floor(seed),
      0
    );
  }
  const balance = Array.from({ length: 7 }, () => 0);
  for (const { region, phase, offsets } of cells.values()) {
    // Stable seeded order avoids geographic stripes. Each cell differs by at
    // most one grain, and odd-cell extras balance across the whole continent.
    offsets.sort(
      (left, right) =>
        particles[left + 4] - particles[right + 4] || left - right
    );
    const first = balance[region] > 0 ? 1 : balance[region] < 0 ? 0 : phase;
    offsets.forEach((offset, index) => {
      const tone = (first + index) % 2;
      particles[offset + 5] = tone;
      balance[region] += tone === 0 ? 1 : -1;
    });
  }
  return new Float32Array(particles);
}
