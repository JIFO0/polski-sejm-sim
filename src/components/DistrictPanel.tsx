import { RotateCcw, X } from "lucide-react";
import { DISTRICTS } from "@/data/districts";
import { PARTIES, PARTY_MAP } from "@/data/parties";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { PartyLogo } from "@/components/PartyLogo";
import { BASE_TURNOUT, type DistrictResult, type DistrictState } from "@/lib/simulation";

export function DistrictPanel({
  districtId,
  state,
  result,
  onChange,
  onReset,
  onClose,
}: {
  districtId: number;
  state: DistrictState;
  result: DistrictResult | undefined;
  onChange: (next: DistrictState) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const district = DISTRICTS.find((d) => d.id === districtId);
  if (!district) return null;

  const setShare = (pid: string, value: number) => {
    const shares = { ...state.shares, [pid]: value };
    onChange({ ...state, shares });
  };

  const sum = Object.values(state.shares).reduce((a, b) => a + b, 0);

  return (
    <div className="panel flex h-full flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <p className="eyebrow">
            Okręg nr {district.id} · {district.seats} mandatów
          </p>
          <h3 className="mt-0.5 font-display text-xl font-bold text-ink">{district.name}</h3>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={onReset} title="Przywróć wartości bazowe">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} title="Zamknij">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-5 overflow-y-auto px-5 py-4">
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
            onValueChange={([v]) => onChange({ ...state, turnout: v })}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Baza {BASE_TURNOUT}%. Wyższa frekwencja zwiększa wagę okręgu w skali kraju i przesuwa
            proporcje w stronę partii o mniej zdyscyplinowanym elektoracie.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold">Poparcie partii</span>
            <span className="num text-xs text-muted-foreground">suma {sum.toFixed(1)}%</span>
          </div>

          {PARTIES.map((p) => {
            const base = district.base[p.id] ?? 0;
            const value = state.shares[p.id] ?? 0;
            const eff = result?.shares[p.id] ?? value;
            const seats = result?.seatsByParty[p.id] ?? 0;
            return (
              <div key={p.id} className="rounded-lg border border-border/70 bg-surface-strong/60 p-3">
                <div className="flex items-center gap-2.5">
                  <PartyLogo id={p.id} size={26} />
                  <span className="truncate text-sm font-medium">{p.short}</span>
                  <span className="num ml-auto text-sm font-bold" style={{ color: p.color }}>
                    {value.toFixed(1)}%
                  </span>
                  <span className="num w-9 rounded bg-ink/5 py-0.5 text-center text-xs font-bold">
                    {seats}
                  </span>
                </div>
                <Slider
                  className="mt-2.5"
                  min={0}
                  max={70}
                  step={0.5}
                  value={[value]}
                  onValueChange={([v]) => setShare(p.id, v)}
                />
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  baza {base.toFixed(1)}% · po frekwencji {eff.toFixed(1)}%
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
