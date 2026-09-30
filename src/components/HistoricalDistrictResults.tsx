import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { DISTRICTS, MAP_VIEWBOX } from "@/data/districts";
import {
  HISTORICAL_DISTRICT_ELECTIONS,
  type HistoricalDistrictYear,
} from "@/data/historicalDistricts";
import { Button } from "@/components/ui/button";

function mix(hex: string, amount: number) {
  const h = hex.replace("#", "");
  const channels = [0, 2, 4].map((start) => parseInt(h.slice(start, start + 2), 16));
  return `rgb(${channels.map((value) => Math.round(value + (255 - value) * (1 - amount))).join(", ")})`;
}

export function HistoricalDistrictResults() {
  const [year, setYear] = useState<HistoricalDistrictYear>(2023);
  const [mode, setMode] = useState<"winner" | "committee">("winner");
  const [committeeId, setCommitteeId] = useState("pis");
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const election = HISTORICAL_DISTRICT_ELECTIONS.find((item) => item.year === year) ?? HISTORICAL_DISTRICT_ELECTIONS[0]!;
  const committee = election.committees.find((item) => item.id === committeeId) ?? election.committees[0]!;
  const maxShare = useMemo(
    () => Math.max(1, ...Object.values(election.districts).map((result) => result[committee.id] ?? 0)),
    [committee.id, election],
  );
  const hovered = hoveredId == null ? null : DISTRICTS.find((district) => district.id === hoveredId);
  const hoveredResults = hoveredId == null ? null : election.districts[hoveredId];
  const rankedHovered = hoveredResults
    ? election.committees
        .map((item) => ({ ...item, share: hoveredResults[item.id] ?? 0 }))
        .sort((a, b) => b.share - a.share)
    : [];

  const fillFor = (id: number) => {
    const shares = election.districts[id] ?? {};
    if (mode === "committee") {
      return mix(committee.color, 0.14 + 0.86 * Math.min(1, (shares[committee.id] ?? 0) / maxShare));
    }
    const winner = election.committees.reduce(
      (best, item) => (shares[item.id] ?? 0) > (shares[best.id] ?? 0) ? item : best,
      election.committees[0]!,
    );
    return mix(winner.color, 0.68);
  };

  const chooseYear = (nextYear: HistoricalDistrictYear) => {
    setYear(nextYear);
    const next = HISTORICAL_DISTRICT_ELECTIONS.find((item) => item.year === nextYear);
    if (next && !next.committees.some((item) => item.id === committeeId)) setCommitteeId(next.committees[0]!.id);
  };

  return (
    <div className="panel p-4 md:p-6">
      <div className="flex flex-wrap items-start gap-3">
        <div className="mr-auto">
          <h3 className="font-display text-xl font-bold text-ink">Mapa wyników w okręgach</h3>
          <p className="mt-1 text-sm text-muted-foreground">Zobacz zwycięzcę albo poparcie wybranego komitetu w każdym okręgu.</p>
        </div>
        <div className="flex rounded-lg border border-border p-0.5" aria-label="Rok wyborów">
          {HISTORICAL_DISTRICT_ELECTIONS.map((item) => (
            <button key={item.year} onClick={() => chooseYear(item.year)} className={`min-h-11 rounded-md px-3 text-xs font-semibold ${year === item.year ? "bg-ink text-background" : "text-muted-foreground"}`}>
              {item.year}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-border p-0.5">
          <button onClick={() => setMode("winner")} className={`min-h-11 rounded-md px-3 text-xs font-semibold ${mode === "winner" ? "bg-ink text-background" : "text-muted-foreground"}`}>Zwycięzca</button>
          <button onClick={() => setMode("committee")} className={`min-h-11 rounded-md px-3 text-xs font-semibold ${mode === "committee" ? "bg-ink text-background" : "text-muted-foreground"}`}>Jeden komitet</button>
        </div>
        {mode === "committee" ? election.committees.map((item) => (
          <button key={item.id} onClick={() => setCommitteeId(item.id)} className="min-h-11 rounded-full border px-3 text-xs font-semibold" style={committee.id === item.id ? { background: item.color, borderColor: item.color, color: "white" } : undefined} title={item.name}>
            {item.short}
          </button>
        )) : null}
      </div>

      <div className="relative mx-auto mt-4 max-w-3xl">
        <svg viewBox={MAP_VIEWBOX} className="h-auto w-full" role="img" aria-label={`Mapa wyników wyborów do Sejmu ${year} według okręgów`}>
          {DISTRICTS.map((district) => (
            <path key={district.id} d={district.path} className="district-path" fill={fillFor(district.id)} tabIndex={0} role="button" aria-label={`Okręg ${district.id}, ${district.name}`} onMouseEnter={() => setHoveredId(district.id)} onMouseLeave={() => setHoveredId(null)} onFocus={() => setHoveredId(district.id)} onBlur={() => setHoveredId(null)}>
              <title>{`${district.id}. ${district.name}`}</title>
            </path>
          ))}
        </svg>
        {hovered && rankedHovered.length ? (
          <div className="panel-float pointer-events-none absolute left-3 top-3 min-w-48 px-3 py-2">
            <p className="eyebrow">Okręg {hovered.id}</p>
            <p className="font-display text-sm font-semibold text-ink">{hovered.name}</p>
            <div className="mt-2 space-y-1">
              {rankedHovered.slice(0, mode === "committee" ? election.committees.length : 4).map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
                  <span>{item.short}</span><strong className="num ml-auto">{item.share.toFixed(2)}%</strong>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex justify-end">
        <Button variant="ghost" size="sm" asChild><a href={election.sourceUrl} target="_blank" rel="noreferrer">Źródło: PKW/KBW <ExternalLink className="ml-1.5 h-3.5 w-3.5" /></a></Button>
      </div>
    </div>
  );
}
