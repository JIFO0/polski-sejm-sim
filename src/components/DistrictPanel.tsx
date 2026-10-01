import { RotateCcw, Users, X } from "lucide-react";
import { DISTRICTS } from "@/data/districts";
import { MERGED_INTO, PARTIES, PARTY_MAP, type MergerDef } from "@/data/parties";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { PartyLogo } from "@/components/PartyLogo";
import { ShareInput } from "@/components/ShareInput";
import { BASE_TURNOUT, type DistrictResult, type DistrictState } from "@/lib/simulation";

export function DistrictPanel({
  districtId,
  state,
  result,
  onChange,
  onReset,
  onClose,
  independentSupport,
  mergers = [],
}: {
  districtId: number;
  state: DistrictState;
  result: DistrictResult | undefined;
  onChange: (next: DistrictState) => void;
  onReset: () => void;
  onClose: () => void;
  independentSupport: boolean;
  mergers?: MergerDef[];
}) {
  const district = DISTRICTS.find((d) => d.id === districtId);
  if (!district) return null;

  const currentElectorate = state.electorate ?? district.electorate;
  const isElectorateModified = state.electorate != null && state.electorate !== district.electorate;
  const validVotes = Math.round((currentElectorate * state.turnout) / 100);

  const setShare = (pid: string, value: number) => {
    const otherTotal = Object.entries(state.shares).reduce(
      (total, [id, share]) => total + (id === pid || MERGED_INTO[id] ? 0 : share),
      0,
    );
    const available = Math.max(0, 100 - otherTotal);
    const snapped = Math.abs(value - available) <= 0.35 ? available : value;
    let shares: Record<string, number>;
    if (independentSupport) {
      shares = { ...state.shares, [pid]: Math.min(snapped, available) };
    } else {
      const target = Math.min(100, Math.max(0, snapped));
      const scale = otherTotal > 0 ? (100 - target) / otherTotal : 0;
      shares = Object.fromEntries(
        Object.entries(state.shares).map(([id, share]) => [
          id,
          id === pid ? target : MERGED_INTO[id] ? 0 : share * scale,
        ]),
      );
      if (!(pid in shares)) shares[pid] = target;
    }
    onChange({ ...state, shares });
  };

  const sum = Object.entries(state.shares)
    .filter(([id]) => !MERGED_INTO[id])
    .reduce((a, [, b]) => a + b, 0);
  const unassigned = Math.max(0, 100 - sum);

  return (
    <div className="panel flex h-full flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <p className="eyebrow">
            Okręg nr {district.id}, {district.seats} mandatów
          </p>
          <h3 className="mt-0.5 font-display text-xl font-bold text-ink">{district.name}</h3>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="min-h-11 min-w-11" onClick={onReset} title="Przywróć wartości bazowe" aria-label="Przywróć wartości bazowe">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="min-h-11 min-w-11" onClick={onClose} title="Zamknij" aria-label="Zamknij panel okręgu">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-5 overflow-y-auto px-5 py-4">
        {/* Kwalifikowani wyborcy (Uprawnieni) */}
        <div className="rounded-lg border border-border/70 bg-surface-strong/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="district-electorate-input" className="flex items-center gap-1.5 text-xs font-semibold text-ink">
              <Users className="h-3.5 w-3.5 text-primary" />
              Kwalifikowani wyborcy (uprawnieni)
            </label>
            {isElectorateModified ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-ink"
                onClick={() => onChange({ ...state, electorate: undefined })}
                title={`Przywróć bazową liczbę: ${district.electorate.toLocaleString("pl-PL")}`}
              >
                <RotateCcw className="mr-1 h-3 w-3" /> Baza ({district.electorate.toLocaleString("pl-PL")})
              </Button>
            ) : null}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Input
              id="district-electorate-input"
              type="number"
              min={10000}
              max={5000000}
              step={1000}
              value={currentElectorate}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val > 0) {
                  onChange({ ...state, electorate: val });
                }
              }}
              className="h-9 font-mono text-sm"
              aria-label="Liczba uprawnionych wyborców w okręgu"
            />
            <span className="shrink-0 text-xs text-muted-foreground">wyborców</span>
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Oddane głosy: <strong className="text-ink">{validVotes.toLocaleString("pl-PL")}</strong> (przy frekwencji {state.turnout.toFixed(1)}%)
          </p>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold">Frekwencja w okręgu</span>
            <span className="num text-lg font-bold text-primary">
              {state.turnout.toFixed(1)}%
            </span>
          </div>
          <Slider
            className="mt-3"
            min={20}
            max={95}
            step={0.5}
            value={[state.turnout]}
            onValueChange={([v = 0]) => onChange({ ...state, turnout: v })}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Baza {BASE_TURNOUT}%. Wyższa frekwencja zwiększa liczbę oddanych głosów w okręgu i jego wagę w kraju.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold">Poparcie partii</span>
            <span className="num text-xs font-semibold text-muted-foreground">Nieprzypisane {unassigned.toFixed(1)}%</span>
          </div>

          {PARTIES.filter((p) => !MERGED_INTO[p.id]).map((p) => {
            const mergerDef = mergers.find((m) => m.id === p.id);
            const base = mergerDef
              ? mergerDef.members.reduce((acc, mid) => acc + (district.base[mid] ?? 0), 0) * (mergerDef.retention / 100)
              : (district.base[p.id] ?? 0);
            const value = state.shares[p.id] ?? (mergerDef ? base : 0);
            const eff = result?.shares[p.id] ?? value;
            const partyVotes = Math.round(result?.votes[p.id] ?? (validVotes * eff) / 100);
            const seats = result?.seatsByParty[p.id] ?? 0;
            return (
              <div key={p.id} className="rounded-lg border border-border/70 bg-surface-strong/60 p-3">
                <div className="flex items-center gap-2.5">
                  <PartyLogo id={p.id} size={26} />
                  <span className="truncate text-sm font-medium">{p.short}</span>
                  <ShareInput value={value} onChange={(next) => setShare(p.id, next)} label={`Poparcie ${p.name} w okręgu`} max={independentSupport ? value + unassigned : 100} />
                  <span className="num w-9 rounded bg-ink/5 py-0.5 text-center text-xs font-bold">
                    {seats}
                  </span>
                </div>
                <Slider
                  className="mt-2.5"
                  min={0}
                  max={independentSupport ? Math.max(70, value + unassigned) : 100}
                  step={0.5}
                  value={[value]}
                  onValueChange={([v = 0]) => setShare(p.id, v)}
                />
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  baza {base.toFixed(1)}%, po frekwencji {eff.toFixed(1)}% • szac. <strong className="text-ink">{partyVotes.toLocaleString("pl-PL")}</strong> głosów
                  {mergerDef ? ` • wspólna lista (${mergerDef.members.map((m) => PARTY_MAP[m]?.short ?? m).join(" + ")})` : ""}
                </p>
              </div>
            );
          })}
        </div>

        {result ? (
          <div className="rounded-lg bg-surface-strong p-3">
            <p className="eyebrow">Podział mandatów</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Object.entries(result.seatsByParty)
                .filter(([, n]) => n > 0)
                .sort((a, b) => b[1] - a[1])
                .map(([pid, n]) => (
                  <span
                    key={pid}
                    className="num rounded-md px-2 py-1 text-xs font-bold text-white"
                    style={{ background: PARTY_MAP[pid]?.color }}
                  >
                    {PARTY_MAP[pid]?.short} {n}
                  </span>
                ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
