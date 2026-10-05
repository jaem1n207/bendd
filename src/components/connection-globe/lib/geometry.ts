import { cubicBezier } from 'motion/react';

export interface Coordinates {
  latitude: number;
  longitude: number;
}
export interface Vector {
  x: number;
  y: number;
  z: number;
}
export interface Camera {
  phi: number;
  theta: number;
  scale: number;
}
export interface Point {
  x: number;
  y: number;
}

export const SEOUL: Coordinates = { latitude: 37.5665, longitude: 126.978 };
const FORMATION_MS = 1000;
const VISITOR_HOLD_MS = 200;
const CAMERA_MS = 1800;
const CAMERA_START_MS = FORMATION_MS + VISITOR_HOLD_MS;
const ROUTE_MS = 1600;
export const ROUTE_START_MS = CAMERA_START_MS + CAMERA_MS;
export const DURATION_MS = ROUTE_START_MS + ROUTE_MS;
export const EARTH_RADIUS_METERS = 6371008.8;
export const NEARBY_DISTANCE_METERS = 50000;
export const GLOBE_RADIUS = 0.8;
const INITIAL_CAMERA_SCALE = 0.68;
const MAX_APPROACH_SCALE = 1.2;
const FINAL_CAMERA_SCALE = 1.06;
const RADIANS = Math.PI / 180;
const cameraEase = cubicBezier(0.645, 0.045, 0.355, 1);
const formationEase = cubicBezier(0.22, 1, 0.36, 1);
const routeEase = cubicBezier(0.3, 0.6, 0.4, 1);
const numberFormat = new Intl.NumberFormat('ko-KR');

export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}
function normalize(point: Vector): Vector {
  const length = Math.hypot(point.x, point.y, point.z);
  return { x: point.x / length, y: point.y / length, z: point.z / length };
}
function dot(a: Vector, b: Vector) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
function cross(a: Vector, b: Vector): Vector {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}
function multiply(point: Vector, amount: number): Vector {
  return { x: point.x * amount, y: point.y * amount, z: point.z * amount };
}

/** COBE's world axes: +Y north, +X Greenwich, -Z 90 degrees east. */
export function toVector({ latitude, longitude }: Coordinates): Vector {
  const lat = latitude * RADIANS;
  const lon = longitude * RADIANS;
  return {
    x: Math.cos(lat) * Math.cos(lon),
    y: Math.sin(lat),
    z: -Math.cos(lat) * Math.sin(lon),
  };
}

/** A stable great-circle path, including identical and antipodal endpoints. */
export function greatCircle(
  from: Vector,
  to: Vector,
  progress: number
): Vector {
  if (progress <= 0) {
    return from;
  }
  if (progress >= 1) {
    return to;
  }
  const cosine = clamp(dot(from, to), -1, 1);
  if (cosine > 1 - 1e-12) {
    return from;
  }
  const tangent = {
    x: to.x - cosine * from.x,
    y: to.y - cosine * from.y,
    z: to.z - cosine * from.z,
  };
  const axis =
    Math.abs(from.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
  const axisDot = dot(axis, from);
  const direction = normalize(
    Math.hypot(tangent.x, tangent.y, tangent.z) > 1e-8
      ? tangent
      : {
          x: axis.x - axisDot * from.x,
          y: axis.y - axisDot * from.y,
          z: axis.z - axisDot * from.z,
        }
  );
  const angle = Math.acos(cosine) * progress;
  return {
    x: from.x * Math.cos(angle) + direction.x * Math.sin(angle),
    y: from.y * Math.cos(angle) + direction.y * Math.sin(angle),
    z: from.z * Math.cos(angle) + direction.z * Math.sin(angle),
  };
}

export function distanceInMeters(from: Coordinates, to: Coordinates) {
  const lat1 = from.latitude * RADIANS;
  const lat2 = to.latitude * RADIANS;
  const halfLat = (lat2 - lat1) / 2;
  const halfLon = ((to.longitude - from.longitude) * RADIANS) / 2;
  const haversine =
    Math.sin(halfLat) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(halfLon) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.asin(Math.sqrt(clamp(haversine)));
}
export function formatDistance(meters: number, progress = 1) {
  const unit = meters < 1000 ? 'm' : 'km';
  const total = Math.round(unit === 'm' ? meters : meters / 1000);
  return `${numberFormat.format(Math.round(total * clamp(progress)))} ${unit}`;
}
function cameraFor(point: Vector, fallbackPhi = 0): Camera {
  return {
    phi:
      Math.hypot(point.x, point.z) < 1e-8
        ? fallbackPhi
        : Math.atan2(-point.x, point.z),
    theta: Math.asin(clamp(point.y, -1, 1)),
    scale: 1,
  };
}
export function project(
  point: Vector,
  camera: Camera,
  width: number,
  height: number
) {
  const cx = Math.cos(camera.theta),
    cy = Math.cos(camera.phi);
  const sx = Math.sin(camera.theta),
    sy = Math.sin(camera.phi);
  const x = cy * point.x + sy * point.z;
  const y = sy * sx * point.x + cx * point.y - cy * sx * point.z;
  const depth = -sy * cx * point.x + sx * point.y + cy * cx * point.z;
  const radius = (GLOBE_RADIUS * camera.scale * height) / 2;
  const surface = Math.sqrt(Math.max(0, 1 - x * x - y * y));
  return {
    x: width / 2 + x * radius,
    y: height / 2 - y * radius,
    depth,
    visible: x * x + y * y >= 1 || depth >= surface - 0.002,
  };
}
export function timelineAt(elapsed: number) {
  return {
    formationProgress: formationEase(clamp(elapsed / FORMATION_MS)),
    approachProgress: cameraEase(clamp(elapsed / FORMATION_MS)),
    cameraProgress: cameraEase(clamp((elapsed - CAMERA_START_MS) / CAMERA_MS)),
    routeProgress: routeEase(clamp((elapsed - ROUTE_START_MS) / ROUTE_MS)),
    phase:
      elapsed >= DURATION_MS
        ? 'complete'
        : elapsed >= ROUTE_START_MS
          ? 'connecting'
          : elapsed >= CAMERA_START_MS
            ? 'camera'
            : elapsed >= FORMATION_MS
              ? 'origin'
              : 'forming',
  };
}

/** Build geographic geometry once per viewport, never once per animation frame. */
export function createJourney(
  visitor: Coordinates | null,
  width: number,
  height: number,
  formationOrigin?: Coordinates
) {
  const from = toVector(visitor ?? SEOUL),
    to = toVector(SEOUL);
  const meters = visitor ? distanceInMeters(visitor, SEOUL) : 0;
  const nearby = visitor !== null && meters <= NEARBY_DISTANCE_METERS;
  const start = cameraFor(formationOrigin ? toVector(formationOrigin) : from);
  const approachScale =
    (formationOrigin ? 1.08 : MAX_APPROACH_SCALE) * Math.min(1, width / height);
  const middle = greatCircle(from, to, 0.5);
  let end = cameraFor(nearby ? to : middle, start.phi);
  if (visitor && !nearby) {
    // Looking exactly along the route's plane makes a real 3D arch look flat.
    // Tilt across that plane while keeping both geographic endpoints in front.
    let normal = normalize(cross(from, middle));
    if (normal.y < 0) {
      normal = multiply(normal, -1);
    }
    end = cameraFor(
      normalize({
        x: middle.x - normal.x * 0.42,
        y: middle.y - normal.y * 0.42,
        z: middle.z - normal.z * 0.42,
      }),
      start.phi
    );
  }
  const surfacePoint = (progress: number) =>
    multiply(
      greatCircle(from, to, progress),
      1 + Math.sin(Math.PI * progress) * 0.32
    );
  const surfaceRoute = Array.from({ length: 97 }, (_, index) =>
    surfacePoint(index / 96)
  );
  const fitPoints = [from, to, ...(!nearby ? surfaceRoute : [])].map(point =>
    project(point, end, width, height)
  );
  const maxX = Math.max(
    ...fitPoints.map(point => Math.abs(point.x - width / 2)),
    1e-9
  );
  const maxY = Math.max(
    ...fitPoints.map(point => Math.abs(point.y - height / 2)),
    1e-9
  );
  end.scale = Math.min(
    FINAL_CAMERA_SCALE,
    approachScale,
    (width / 2 - 62) / maxX,
    (height / 2 - 82) / maxY
  );
  // Nearby people share a UI cluster at Seoul, not a fabricated travel route.
  const routes = !visitor || nearby ? [] : [surfaceRoute];
  const rotation = Math.atan2(
    Math.sin(end.phi - start.phi),
    Math.cos(end.phi - start.phi)
  );

  const sample = (elapsed: number, cameraOverride?: Camera) => {
    const timeline = timelineAt(elapsed);
    const { approachProgress, cameraProgress, routeProgress } = timeline;
    const camera = cameraOverride ?? {
      phi: start.phi - 0.6 * (1 - approachProgress) + rotation * cameraProgress,
      theta:
        start.theta -
        0.12 * (1 - approachProgress) +
        (end.theta - start.theta) * cameraProgress,
      scale:
        INITIAL_CAMERA_SCALE +
        (approachScale - INITIAL_CAMERA_SCALE) * approachProgress +
        (end.scale - approachScale) * cameraProgress,
    };
    const origin = project(from, camera, width, height);
    const destination = project(to, camera, width, height);
    const head = nearby
      ? destination
      : project(surfacePoint(routeProgress), camera, width, height);
    // SVG is a readable fallback only. Split at occlusions instead of joining
    // visible samples across the back of the globe.
    const route = routes
      .map(points => {
        const samples = Math.ceil((points.length - 1) * routeProgress);
        let drawing = false;
        return Array.from({ length: samples + 1 }, (_, index) => {
          const progress = samples ? (index / samples) * routeProgress : 0;
          const p = project(surfacePoint(progress), camera, width, height);
          if (!p.visible) {
            drawing = false;
            return '';
          }
          const segment = `${drawing ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`;
          drawing = true;
          return segment;
        }).join(' ');
      })
      .join(' ');
    return {
      ...timeline,
      camera,
      nearby,
      routes,
      origin,
      destination,
      visitorMarker: origin,
      seoulMarker: destination,
      head,
      route,
      label: {
        x: clamp(head.x, 65, width - 65),
        y: clamp(head.y - 52, 24, height - 40),
      },
    };
  };
  return { sample, routes, finalCamera: end };
}
export function sceneAt(
  visitor: Coordinates | null,
  width: number,
  height: number,
  elapsed: number,
  camera?: Camera
) {
  return createJourney(visitor, width, height).sample(elapsed, camera);
}
export type GlobeScene = ReturnType<ReturnType<typeof createJourney>['sample']>;
