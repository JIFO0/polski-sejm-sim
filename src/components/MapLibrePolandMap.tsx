import { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { DISTRICTS } from "@/data/districts";
import { DISTRICT_CENTROIDS } from "@/data/demographicAdjustment";
import { PARTY_MAP } from "@/data/parties";
import type { SimulationResult } from "@/lib/simulation";
import { useDarkTheme } from "@/components/ThemeToggle";
import { svgPathToRings, type DistrictGeoFeature } from "@/lib/svgToGeoJson";
import { Maximize2, Minus, Plus } from "lucide-react";

const POLAND_CENTER: [number, number] = [19.14, 51.92];
const POLAND_BOUNDS: [[number, number], [number, number]] = [
  [13.9, 48.9],
  [24.35, 54.95],
];

function mixColor(hex: string, amount: number, dark: boolean): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return dark ? "#334155" : "#E2E8F0";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const target = dark ? 18 : 255;
  const w = (v: number) => Math.round(v + (target - v) * (1 - amount));
  return `rgb(${w(r)}, ${w(g)}, ${w(b)})`;
}

export function MapLibrePolandMap({
  result,
  selected,
  onSelect,
}: {
  result: SimulationResult;
  selected: number | null;
  onSelect: (id: number | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const hoveredIdRef = useRef<number | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const dark = useDarkTheme();
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(5.3);

  const byId = useMemo(
    () => Object.fromEntries(result.districts.map((d) => [d.id, d])),
    [result],
  );

  const geojson = useMemo(() => {
    const empty = dark ? "#334155" : "#E2E8F0";
    const features: DistrictGeoFeature[] = DISTRICTS.map((d) => {
      const res = byId[d.id];
      const winner = res?.winner ?? "";
      const winnerParty = PARTY_MAP[winner];
      const lead =
        res && res.seats > 0 && winner
          ? (res.seatsByParty[winner] ?? 0) / res.seats
          : 0;
      const fillColor = winnerParty
        ? mixColor(winnerParty.color, 0.42 + 0.58 * Math.min(1, lead * 1.9), dark)
        : empty;

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

      const centroid = DISTRICT_CENTROIDS[d.id];
      const labelLng = centroid
        ? 14.12 + (centroid.x / 1100) * (24.15 - 14.12)
        : (minLng + maxLng) / 2;
      const labelLat = centroid
        ? 54.84 - (centroid.y / 1000) * (54.84 - 49.0)
        : (minLat + maxLat) / 2;

      return {
        type: "Feature",
        id: d.id,
        properties: {
          id: d.id,
          name: d.name,
          seats: res?.seats ?? d.seats,
          fillColor,
          winner,
          winnerName: winnerParty?.short ?? winner ?? "—",
          winnerShare: winner && res ? Math.round((res.shares[winner] ?? 0) * 10) / 10 : 0,
          labelLng,
          labelLat,
          minLng,
          minLat,
          maxLng,
          maxLat,
        },
        geometry: {
          type: "Polygon",
          coordinates: rings,
        },
      };
    });

    return {
      type: "FeatureCollection" as const,
      features,
    };
  }, [byId, dark]);

  // Initialize MapLibre GL map once
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: "background",
            type: "background",
            paint: {
              "background-color": dark ? "#090D16" : "#F8FAFC",
            },
          },
        ],
      },
      center: POLAND_CENTER,
      zoom: 5.3,
      minZoom: 4.5,
      maxZoom: 11,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });

    mapRef.current = map;

    map.on("load", () => {
      map.addSource("districts", {
        type: "geojson",
        data: geojson,
        promoteId: "id",
      });

      map.addLayer({
        id: "districts-fill",
        type: "fill",
        source: "districts",
        paint: {
          "fill-color": ["get", "fillColor"],
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            0.95,
            0.84,
          ],
        },
      });

      map.addLayer({
        id: "districts-outline",
        type: "line",
        source: "districts",
        paint: {
          "line-color": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            dark ? "#F8FAFC" : "#0F172A",
            ["boolean", ["feature-state", "hover"], false],
            dark ? "#E2E8F0" : "#1E293B",
            dark ? "#1E293B" : "#FFFFFF",
          ],
          "line-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            2.8,
            ["boolean", ["feature-state", "hover"], false],
            2.0,
            1.0,
          ],
        },
      });

      map.fitBounds(POLAND_BOUNDS, { padding: 24, duration: 0 });
    });

    map.on("zoom", () => {
      setZoomLevel(Number(map.getZoom().toFixed(1)));
    });

    map.on("mousemove", "districts-fill", (e: maplibregl.MapLayerMouseEvent) => {
      map.getCanvas().style.cursor = "pointer";
      const feature = e.features?.[0];
      if (!feature || feature.id == null) return;
      const fid = Number(feature.id);
      if (hoveredIdRef.current !== fid) {
        if (hoveredIdRef.current !== null) {
          map.setFeatureState(
            { source: "districts", id: hoveredIdRef.current },
            { hover: false },
          );
        }
        hoveredIdRef.current = fid;
        map.setFeatureState({ source: "districts", id: fid }, { hover: true });
        setHoveredId(fid);
      }
    });

    map.on("mouseleave", "districts-fill", () => {
      map.getCanvas().style.cursor = "";
      if (hoveredIdRef.current !== null) {
        map.setFeatureState(
          { source: "districts", id: hoveredIdRef.current },
          { hover: false },
        );
        hoveredIdRef.current = null;
        setHoveredId(null);
      }
    });

    map.on("click", "districts-fill", (e: maplibregl.MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature || feature.id == null) return;
      const fid = Number(feature.id);
      const props = feature.properties as DistrictGeoFeature["properties"];
      onSelectRef.current(fid);
      map.fitBounds(
        [
          [Number(props.minLng), Number(props.minLat)],
          [Number(props.maxLng), Number(props.maxLat)],
        ],
        {
          padding: 90,
          duration: 750,
          maxZoom: 8.8,
        },
      );
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update GeoJSON data & background when simulation or theme changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.getLayer("background")) {
      map.setPaintProperty(
        "background",
        "background-color",
        dark ? "#090D16" : "#F8FAFC",
      );
    }
    const src = map.getSource("districts") as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData(geojson);
    }
  }, [geojson, dark]);

  // Sync selected feature state
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    for (const d of DISTRICTS) {
      map.setFeatureState(
        { source: "districts", id: d.id },
        { selected: selected === d.id },
      );
    }
  }, [selected]);

  const handleResetView = () => {
    onSelect(null);
    mapRef.current?.fitBounds(POLAND_BOUNDS, { padding: 24, duration: 700 });
  };

  const handleZoomIn = () => {
    mapRef.current?.zoomIn({ duration: 300 });
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut({ duration: 300 });
  };

  const hoveredDistrict = hoveredId != null ? byId[hoveredId] : null;
  const hoveredMeta = hoveredId != null ? DISTRICTS.find((d) => d.id === hoveredId) : null;

  return (
    <div className="relative h-[560px] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-[#090D16] sm:h-[640px]">
      <div ref={containerRef} className="h-full w-full" />

      {/* Top-right CNN-style zoom & reset controls */}
      <div className="absolute right-3 top-3 z-10 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleZoomIn}
          aria-label="Przybliż mapę"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white/95 text-slate-700 shadow-sm backdrop-blur transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          aria-label="Oddal mapę"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white/95 text-slate-700 shadow-sm backdrop-blur transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleResetView}
          aria-label="Widok całej Polski"
          title="Cała Polska"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white/95 text-slate-700 shadow-sm backdrop-blur transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {/* Bottom-left zoom badge */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-md border border-slate-200/80 bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/90 dark:text-slate-300">
        Zoom: {zoomLevel}x • Kliknij okręg, aby przybliżyć
      </div>

      {/* Hover tooltip */}
      {hoveredDistrict && hoveredMeta && (
        <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-xs rounded-lg border border-slate-200 bg-white/95 p-3 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Okręg nr {hoveredMeta.id} • {hoveredDistrict.seats} mandatów
          </div>
          <div className="mt-0.5 text-sm font-bold text-slate-900 dark:text-slate-100">
            {hoveredMeta.name}
          </div>
          {hoveredDistrict.winner && (
            <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor:
                    PARTY_MAP[hoveredDistrict.winner]?.color ?? "#64748B",
                }}
              />
              <span className="font-semibold">
                {PARTY_MAP[hoveredDistrict.winner]?.short ?? hoveredDistrict.winner}
              </span>
              <span>
                {(hoveredDistrict.shares[hoveredDistrict.winner] ?? 0).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
