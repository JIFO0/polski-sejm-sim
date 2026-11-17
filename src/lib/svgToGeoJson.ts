import { DISTRICTS } from "@/data/districts";

const VIEWBOX_W = 1100;
const VIEWBOX_H = 1000;

// Approximate geographic bounding box of Poland (WGS84)
const MIN_LNG = 14.12;
const MAX_LNG = 24.15;
const MIN_LAT = 49.0;
const MAX_LAT = 54.84;

function svgToLngLat(x: number, y: number): [number, number] {
  const lng = MIN_LNG + (x / VIEWBOX_W) * (MAX_LNG - MIN_LNG);
  const lat = MAX_LAT - (y / VIEWBOX_H) * (MAX_LAT - MIN_LAT);
  return [lng, lat];
}

function cubicBezier(
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  steps = 4,
): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const x =
      mt * mt * mt * p0[0] +
      3 * mt * mt * t * p1[0] +
      3 * mt * t * t * p2[0] +
      t * t * t * p3[0];
    const y =
      mt * mt * mt * p0[1] +
      3 * mt * mt * t * p1[1] +
      3 * mt * t * t * p2[1] +
      t * t * t * p3[1];
    pts.push([x, y]);
  }
  return pts;
}

/**
 * Parses an SVG path string (supporting M/m, L/l, H/h, V/v, C/c, Z/z)
 * into GeoJSON-compatible [lng, lat] rings.
 */
export function svgPathToRings(path: string): [number, number][][] {
  const tokens = path.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g);
  if (!tokens) return [];

  const rings: [number, number][][] = [];
  let currentRing: [number, number][] = [];
  let cx = 0;
  let cy = 0;
  let startX = 0;
  let startY = 0;
  let cmd = "";
  let i = 0;

  const isNum = (s: string | undefined) => s !== undefined && !/^[a-zA-Z]$/.test(s);
  const nextNum = () => parseFloat(tokens[i++] ?? "0");

  while (i < tokens.length) {
    const t = tokens[i] ?? "";
    if (/^[a-zA-Z]$/.test(t)) {
      cmd = t;
      i++;
      if (cmd === "Z" || cmd === "z") {
        if (currentRing.length > 0) {
          currentRing.push(svgToLngLat(startX, startY));
          rings.push(currentRing);
          currentRing = [];
        }
        cx = startX;
        cy = startY;
      }
      continue;
    }

    switch (cmd) {
      case "M":
      case "m": {
        const x = nextNum();
        const y = nextNum();
        cx = cmd === "m" ? cx + x : x;
        cy = cmd === "m" ? cy + y : y;
        startX = cx;
        startY = cy;
        if (currentRing.length > 0) {
          rings.push(currentRing);
        }
        currentRing = [svgToLngLat(cx, cy)];
        // Subsequent coordinate pairs after M/m are treated as L/l
        cmd = cmd === "m" ? "l" : "L";
        break;
      }
      case "L":
      case "l": {
        const x = nextNum();
        const y = nextNum();
        cx = cmd === "l" ? cx + x : x;
        cy = cmd === "l" ? cy + y : y;
        currentRing.push(svgToLngLat(cx, cy));
        break;
      }
      case "H":
      case "h": {
        const x = nextNum();
        cx = cmd === "h" ? cx + x : x;
        currentRing.push(svgToLngLat(cx, cy));
        break;
      }
      case "V":
      case "v": {
        const y = nextNum();
        cy = cmd === "v" ? cy + y : y;
        currentRing.push(svgToLngLat(cx, cy));
        break;
      }
      case "C":
      case "c": {
        const x1 = nextNum();
        const y1 = nextNum();
        const x2 = nextNum();
        const y2 = nextNum();
        const x3 = nextNum();
        const y3 = nextNum();
        const p0: [number, number] = [cx, cy];
        const p1: [number, number] = cmd === "c" ? [cx + x1, cy + y1] : [x1, y1];
        const p2: [number, number] = cmd === "c" ? [cx + x2, cy + y2] : [x2, y2];
        const p3: [number, number] = cmd === "c" ? [cx + x3, cy + y3] : [x3, y3];
        for (const [bx, by] of cubicBezier(p0, p1, p2, p3, 4)) {
          currentRing.push(svgToLngLat(bx, by));
        }
        cx = p3[0];
        cy = p3[1];
        break;
      }
      default: {
        // Skip unknown command arguments safely
        if (isNum(tokens[i])) i++;
        break;
      }
    }
  }

  if (currentRing.length > 0) {
    currentRing.push(svgToLngLat(startX, startY));
    rings.push(currentRing);
  }

  return rings;
}

export interface DistrictGeoFeature {
  type: "Feature";
  id: number;
  properties: {
    id: number;
    name: string;
    seats: number;
    fillColor: string;
    winner: string;
    winnerName: string;
    winnerShare: number;
    labelLng: number;
    labelLat: number;
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
  };
  geometry: {
    type: "Polygon";
    coordinates: [number, number][][];
  };
}

export function buildDistrictBoundsMap(): Record<
  number,
  [[number, number], [number, number]]
> {
  const map: Record<number, [[number, number], [number, number]]> = {};
  for (const d of DISTRICTS) {
    const rings = svgPathToRings(d.path);
    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;
    for (const ring of rings) {
      for (const [lng, lat] of ring) {
        if (lng < minLng) minLng = lng;
        if (lat < minLat) minLat = lat;
        if (lng > maxLng) maxLng = lng;
        if (lat > maxLat) maxLat = lat;
      }
    }
    map[d.id] = [
      [minLng, minLat],
      [maxLng, maxLat],
    ];
  }
  return map;
}
