import { useTranslation } from "@/lib/i18n";
import { Link } from "@tanstack/react-router";
import { RotateCcw, Users, X } from "lucide-react";
import { DISTRICTS } from "@/data/districts";
import { MERGED_INTO, PARTIES, PARTY_MAP, type MergerDef } from "@/data/parties";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { PartyLogo } from "@/components/PartyLogo";
import { ShareInput } from "@/components/ShareInput";
import { BASE_TURNOUT, type DistrictResult, type DistrictState } from "@/lib/simulation";
import { DISTRICT_DEMOGRAPHIC_NOTES } from "@/data/demographicAdjustment";
import { playSfx } from "@/lib/sfx";

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
  mergers?: MergerDef[] | undefined;
}) {
  const tr = useTranslation();
  const district = DISTRICTS.find((d) => d.id === districtId);
  if (!district) return null;

  const currentElectorate = state.electorate ?? district.electorate;
  const isElectorateModified = state.electorate != null && state.electorate !== district.electorate;
  const validVotes = Math.round((currentElectorate * state.turnout) / 100);

  const setShare = (pid: string, value: number) => {
    playSfx("slider.change");
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
  // If we have result shares (effective), use those for unassigned display so it matches the eff-based sliders
  const effSum = result
    ? Object.entries(result.shares)
        .filter(([id]) => !MERGED_INTO[id])
        .reduce((a, [, b]) => a + b, 0)
    : sum;
  const unassigned = Math.max(0, 100 - effSum);


  return (
    <div className="panel flex h-full flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 sm:px-5 py-3.5 sm:py-4">
        <div>
          <p className="eyebrow flex items-center gap-1.5 flex-wrap">
            <span>
              {tr("Okręg nr")}{district.id}, {result?.seats ?? district.seats} {tr("mandatów")}
            </span>
            {result?.seatDelta ? (
              <span
                className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold ${
                  result.seatDelta > 0
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                }`}
                title={`Korekta demograficzna PKW: ${result.seatDelta > 0 ? `+${result.seatDelta}` : result.seatDelta} mandat(y)`}
              >
                {result.seatDelta > 0 ? `+${result.seatDelta}` : result.seatDelta} PKW
              </span>
            ) : null}
            <Link
              to="/metoda-dhondta"
              className="ml-1 font-mono text-[10px] text-primary hover:underline"
              title="Jak przeliczane są mandaty w okręgu? Metoda D'Hondta"
            >
              (D'Hondt)
            </Link>
          </p>
          <h3 className="mt-0.5 font-display text-xl font-bold text-ink">{district.name}</h3>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="min-h-11 min-w-11" onClick={onReset} title={tr("Przywróć wartości bazowe")} aria-label={tr("Przywróć wartości bazowe")}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="min-h-11 min-w-11" onClick={onClose} title={tr("Zamknij")} aria-label={tr("Zamknij panel okręgu")}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-4 sm:space-y-5 overflow-y-auto px-4 sm:px-5 py-3.5 sm:py-4">
        {result?.seatDelta !== 0 && DISTRICT_DEMOGRAPHIC_NOTES[district.id] ? (
          <div className="rounded-lg border border-border/70 bg-surface/60 p-2.5 text-xs text-muted-foreground">
            <span className="font-semibold text-ink">Demografia (PKW): </span>
            {DISTRICT_DEMOGRAPHIC_NOTES[district.id]}
          </div>
        ) : null}

        {/* Kwalifikowani wyborcy (Uprawnieni) */}
        <div className="rounded-lg border border-border/70 bg-surface-strong/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="district-electorate-input" className="flex items-center gap-1.5 text-xs font-semibold text-ink">
              <Users className="h-3.5 w-3.5 text-primary" />
              {tr("Kwalifikowani wyborcy (uprawnieni)")}</label>
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
                  playSfx("slider.change");
                  onChange({ ...state, electorate: val });
                }
              }}
              className="h-9 font-mono text-sm"
              aria-label={tr("Liczba uprawnionych wyborców w okręgu")}
            />
            <span className="shrink-0 text-xs text-muted-foreground">{tr("wyborców")}</span>
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {tr("Oddane głosy:")}<strong className="text-ink">{validVotes.toLocaleString("pl-PL")}</strong> (przy frekwencji {state.turnout.toFixed(1)}%)
          </p>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold">{tr("Frekwencja w okręgu")}</span>
            <span className="num text-lg font-bold text-primary">
              {state.turnout.toFixed(1)}%
            </span>
          </div>
          <Slider
            className="mt-3"
            aria-label={tr("Frekwencja w okręgu")}
            min={20}
            max={95}
            step={0.5}
            value={[state.turnout]}
            onValueChange={([v = 0]) => {
              playSfx("slider.change");
              onChange({ ...state, turnout: v });
            }}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {tr("Baza")} {BASE_TURNOUT}{tr("%. Wyższa frekwencja zwiększa liczbę głosów. Mandaty zmieniają się tylko wtedy, gdy któraś partia jest wrażliwa na frekwencję.")} </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold">{tr("Poparcie partii")}</span>
            <span className="num text-xs font-semibold text-muted-foreground">{tr("Nieprzypisane")}{unassigned.toFixed(1)}%</span>
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
            const effDiffers = Math.abs(eff - value) >= 0.05;
            return (
              <div key={p.id} className="rounded-lg border border-border/70 bg-surface-strong/60 p-2.5 sm:p-3">
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <PartyLogo id={p.id} size={26} className="shrink-0" />
                  <span className="truncate text-sm font-medium min-w-0 flex-1">{p.short}</span>
                  <ShareInput value={eff} onChange={(next) => setShare(p.id, next)} label={`Poparcie ${p.name} w okręgu`} max={independentSupport ? eff + unassigned : 100} />
                  <span className="num w-8 sm:w-9 rounded bg-ink/5 py-0.5 text-center text-xs font-bold shrink-0">
                    {seats}
                  </span>
                </div>
                <Slider
                  className="mt-2.5"
                  aria-label={`Poparcie ${p.name} w okręgu`}
                  min={0}
                  max={independentSupport ? Math.max(70, eff + unassigned) : 100}
                  step={0.5}
                  value={[eff]}
                  onValueChange={([v = 0]) => setShare(p.id, v)}
                />
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {tr("baza")} {base.toFixed(1)}%{effDiffers ? `, wpływ frekwencji → ${eff.toFixed(1)}%` : ""} {tr("• szac.")} <strong className="text-ink">{partyVotes.toLocaleString("pl-PL")}</strong> {tr("głosów")} {mergerDef ? ` • wspólna lista (${mergerDef.members.map((m) => PARTY_MAP[m]?.short ?? m).join(" + ")})` : ""}
                </p>
              </div>
            );
          })}

        </div>

        {result ? (
          <div className="rounded-lg bg-surface-strong p-3">
            <p className="eyebrow">{tr("Podział mandatów")}</p>
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
