import { useMemo, useState } from "react";
import { DISTRICTS, MAP_VIEWBOX } from "@/data/districts";
import { PARTY_MAP } from "@/data/parties";
import type { SimulationResult } from "@/lib/simulation";
import { useDarkTheme } from "@/components/ThemeToggle";
import {
  DISTRICT_CENTROIDS,
  DISTRICT_DEMOGRAPHIC_NOTES,
  getDistrictDelta,
} from "@/data/demographicAdjustment";

export type MapMode = "winner" | "party" | "adjustment";

function mix(hex: string, amount: number, dark: boolean) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const target = dark ? 18 : 255;
  const w = (v: number) => Math.round(v + (target - v) * (1 - amount));
  return `rgb(${w(r)}, ${w(g)}, ${w(b)})`;
}

export function PolandMap({
  result,
  mode,
  focusParty,
  selected,
  onSelect,
  showSeatBadges = false,
}: {
  result: SimulationResult;
  mode: MapMode;
  focusParty: string;
  selected: number | null;
  onSelect: (id: number) => void;
  showSeatBadges?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const dark = useDarkTheme();
  const empty = dark ? "#334155" : "#E2E8F0";

  const byId = useMemo(
    () => Object.fromEntries(result.districts.map((d) => [d.id, d])),
    [result],
  );

  const maxShare = useMemo(() => {
    if (mode !== "party") return 1;
    return Math.max(...result.districts.map((d) => d.shares[focusParty] ?? 0), 1);
  }, [mode, focusParty, result]);

  const fillFor = (id: number) => {
    const d = byId[id];
    if (!d) return empty;

    if (mode === "adjustment") {
      const delta = d.seatDelta ?? getDistrictDelta(id, result.demographicAdjustmentMode ?? "pkw");
      if (delta > 0) {
        if (delta >= 3) return dark ? "#059669" : "#047857";
        if (delta === 2) return dark ? "#10B981" : "#059669";
        return dark ? "#34D399" : "#10B981";
      }
      if (delta < 0) {
        return dark ? "#E11D48" : "#F43F5E";
      }
      return dark ? "#1E293B" : "#E2E8F0";
    }

    if (mode === "party") {
      const color = PARTY_MAP[focusParty]?.color ?? "#64748B";
      const share = d.shares[focusParty] ?? 0;
      return mix(color, 0.12 + 0.88 * Math.min(1, share / maxShare), dark);
    }

    if (!d.winner) return empty;
    const color = PARTY_MAP[d.winner]?.color ?? "#64748B";
    const lead = d.seats > 0 ? (d.seatsByParty[d.winner] ?? 0) / d.seats : 0;
    return mix(color, 0.42 + 0.58 * Math.min(1, lead * 1.9), dark);
  };

  const hovered = hover != null ? byId[hover] : null;
  const isAdjustmentActive = Boolean(result.demographicAdjustmentActive);
  const renderBadges = mode === "adjustment" || showSeatBadges || isAdjustmentActive;

  return (
    <div className="relative">
      <svg
        viewBox={MAP_VIEWBOX}
        className="h-auto w-full"
        role="img"
        aria-label="Mapa 41 okręgów wyborczych do Sejmu"
      >
        <g>
          {DISTRICTS.map((d) => {
            const res = byId[d.id];
            const seats = res?.seats ?? d.seats;
            const delta = res?.seatDelta ?? 0;
            const deltaLabel = delta > 0 ? ` (+${delta} PKW)` : delta < 0 ? ` (${delta} PKW)` : "";
            return (
              <path
                key={d.id}
                d={d.path}
                className="district-path"
                data-selected={selected === d.id}
                role="button"
                tabIndex={0}
                aria-label={`Okręg ${d.id}, ${d.name}, ${seats} mandatów${deltaLabel}`}
                aria-pressed={selected === d.id}
                fill={fillFor(d.id)}
                onClick={() => onSelect(d.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(d.id);
                  }
                }}
                onMouseEnter={() => setHover(d.id)}
                onMouseLeave={() => setHover((h) => (h === d.id ? null : h))}
              >
                <title>{`${d.id}. ${d.name}, ${seats} mandatów${deltaLabel}`}</title>
              </path>
            );
          })}
        </g>

        {/* Etykiety zmian mandatów na mapie */}
        {renderBadges ? (
          <g className="pointer-events-none select-none">
            {DISTRICTS.map((d) => {
              const res = byId[d.id];
              const delta =
                res?.seatDelta ?? getDistrictDelta(d.id, result.demographicAdjustmentMode ?? "pkw");
              if (delta === 0) return null;
              const pos = DISTRICT_CENTROIDS[d.id] ?? { x: 0, y: 0 };
              const isGain = delta > 0;
              const badgeBg = isGain ? "#059669" : "#E11D48";
              const textVal = isGain ? `+${delta}` : `${delta}`;

              return (
                <g key={`badge-${d.id}`} transform={`translate(${pos.x}, ${pos.y})`}>
                  <circle
                    r="13"
                    fill={badgeBg}
                    stroke="#FFFFFF"
                    strokeWidth="2.5"
                    className="drop-shadow-md"
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#FFFFFF"
                    fontSize="11.5"
                    fontWeight="800"
                    fontFamily="system-ui, sans-serif"
                  >
                    {textVal}
                  </text>
                </g>
              );
            })}
          </g>
        ) : null}
      </svg>

      <div className="pointer-events-none absolute left-3 top-3 min-h-[3.5rem] max-w-[16rem]">
        {hovered ? (
          <div className="panel-float animate-fade-in px-3 py-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <p className="eyebrow">Okręg {hovered.id}</p>
              {hovered.seatDelta !== 0 ? (
                <span
                  className={`inline-flex items-center rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    hovered.seatDelta > 0
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {hovered.seatDelta > 0 ? `+${hovered.seatDelta}` : hovered.seatDelta} mand. (PKW)
                </span>
              ) : null}
            </div>
            <p className="font-display text-sm font-semibold text-ink">{hovered.name}</p>

            <div className="mt-1 flex items-center justify-between text-muted-foreground border-b border-border/50 pb-1">
              <span>Mandaty w okręgu:</span>
              <strong className="num text-ink">
                {hovered.seats}
                {hovered.seatDelta !== 0 ? (
                  <span className="text-[10px] text-muted-foreground ml-1">
                    (było {hovered.baseSeats})
                  </span>
                ) : null}
              </strong>
            </div>

            {mode === "adjustment" ? (
              <div className="mt-1.5 space-y-1">
                <p className="text-[11px] leading-tight text-ink">
                  {DISTRICT_DEMOGRAPHIC_NOTES[hovered.id] ??
                    (hovered.seatDelta === 0
                      ? "Liczba ludności w normie przedstawicielskiej (bez zmian)."
                      : "Korekta wg normy przedstawicielskiej PKW.")}
                </p>
                <div className="mt-2 pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
                  Zwycięzca:{" "}
                  <strong className="text-ink">
                    {hovered.winner ? PARTY_MAP[hovered.winner]?.short : "—"}
                  </strong>
                </div>
              </div>
            ) : mode === "party" ? (
              <div className="mt-2 flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: PARTY_MAP[focusParty]?.color }}
                />
                <span className="text-xs text-muted-foreground">{PARTY_MAP[focusParty]?.short}</span>
                <strong className="num ml-auto text-base text-ink">
                  {(hovered.shares[focusParty] ?? 0).toFixed(1)}%
                </strong>
              </div>
            ) : (
              <div className="mt-1.5 space-y-0.5">
                {hovered.winner && PARTY_MAP[hovered.winner] ? (
                  <div className="mb-1 flex items-center gap-1.5 border-b border-border/50 pb-1 text-[11px] font-semibold">
                    <span className="text-muted-foreground">Wygrana:</span>
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: PARTY_MAP[hovered.winner]?.color }}
                    />
                    <span className="truncate text-ink">{PARTY_MAP[hovered.winner]?.name}</span>
                  </div>
                ) : null}
                {Object.entries(hovered.seatsByParty)
                  .filter(([, n]) => n > 0)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([pid, n]) => (
                    <div key={pid} className="flex items-center gap-1.5 text-xs">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: PARTY_MAP[pid]?.color }}
                      />
                      <span className="truncate text-muted-foreground">{PARTY_MAP[pid]?.short}</span>
                      <span className="num ml-auto font-semibold">{n}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {mode === "adjustment" ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-surface/50 p-2.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-600 dark:bg-emerald-500" />
            <span>Zyskują mandaty (+1 do +3) – aglomeracje i strefy podmiejskie</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-600 dark:bg-rose-500" />
            <span>Tracą mandaty (-1) – subregiony depopulacyjne</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-slate-300 dark:bg-slate-700" />
            <span>Bez zmian</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
