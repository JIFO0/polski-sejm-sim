import { useMemo, useState } from "react";
import { DISTRICTS, MAP_VIEWBOX } from "@/data/districts";
import { PARTY_MAP } from "@/data/parties";
import type { SimulationResult } from "@/lib/simulation";
import { useDarkTheme } from "@/components/ThemeToggle";

export type MapMode = "winner" | "party";

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
}: {
  result: SimulationResult;
  mode: MapMode;
  focusParty: string;
  selected: number | null;
  onSelect: (id: number) => void;
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

  return (
    <div className="relative">
      <svg
        viewBox={MAP_VIEWBOX}
        className="h-auto w-full"
        role="img"
        aria-label="Mapa 41 okręgów wyborczych do Sejmu"
      >
        <g>
          {DISTRICTS.map((d) => (
            <path
              key={d.id}
              d={d.path}
              className="district-path"
              data-selected={selected === d.id}
              role="button"
              tabIndex={0}
              aria-label={`Okręg ${d.id}, ${d.name}, ${d.seats} mandatów`}
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
              <title>{`${d.id}. ${d.name}, ${d.seats} mandatów`}</title>
            </path>
          ))}
        </g>
      </svg>

      <div className="pointer-events-none absolute left-3 top-3 min-h-[3.5rem] max-w-[15rem]">
        {hovered ? (
          <div className="panel-float animate-fade-in px-3 py-2">
            <p className="eyebrow">Okręg {hovered.id}</p>
            <p className="font-display text-sm font-semibold text-ink">{hovered.name}</p>
            {mode === "party" ? (
              <div className="mt-2 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: PARTY_MAP[focusParty]?.color }} />
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
                  <span className="h-2 w-2 rounded-full" style={{ background: PARTY_MAP[hovered.winner]?.color }} />
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
    </div>
  );
}
