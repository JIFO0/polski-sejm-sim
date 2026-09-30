import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Download, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";

import { DISTRICTS } from "@/data/districts";
import { PARTIES, PARTY_MAP } from "@/data/parties";
import {
  BASE_TURNOUT,
  MAJORITY,
  defaultScenario,
  simulate,
  type Coalition,
  type DistrictState,
  type Scenario,
} from "@/lib/simulation";
import { ParticleField } from "@/components/ParticleField";
import { PolandMap, type MapMode } from "@/components/PolandMap";
import { Hemicycle } from "@/components/Hemicycle";
import { DistrictPanel } from "@/components/DistrictPanel";
import { CoalitionBuilder } from "@/components/CoalitionBuilder";
import { PartyLogo } from "@/components/PartyLogo";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

const TITLE = "Sejmometr 2027 — symulator wyborów do Sejmu";
const DESC =
  "Interaktywna mapa 41 okręgów, przelicznik D'Hondta, frekwencja i koalicje. Twórz własne scenariusze wyborów do Sejmu 2027 i zapisuj je do pliku.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [scenario, setScenario] = useState<Scenario>(() => defaultScenario());
  const [selected, setSelected] = useState<number | null>(null);
  const [mode, setMode] = useState<MapMode>("winner");
  const [focusParty, setFocusParty] = useState("ko");
  const [highlight, setHighlight] = useState<Set<string> | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const result = useMemo(() => simulate(scenario), [scenario]);
  const resultById = useMemo(
    () => Object.fromEntries(result.districts.map((d) => [d.id, d])),
    [result],
  );

  const ranked = useMemo(
    () =>
      PARTIES.filter((p) => p.id !== "inne").sort(
        (a, b) => (result.seatsByParty[b.id] ?? 0) - (result.seatsByParty[a.id] ?? 0) ||
          (result.nationalShares[b.id] ?? 0) - (result.nationalShares[a.id] ?? 0),
      ),
    [result],
  );

  const setDistrict = useCallback((id: number, next: DistrictState) => {
    setScenario((s) => ({ ...s, districts: { ...s.districts, [id]: next } }));
  }, []);

  const resetDistrict = useCallback((id: number) => {
    const base = DISTRICTS.find((d) => d.id === id);
    if (!base) return;
    setScenario((s) => ({
      ...s,
      districts: { ...s.districts, [id]: { shares: { ...base.base }, turnout: BASE_TURNOUT } },
    }));
  }, []);

  /** Przesunięcie poparcia partii jednakowo we wszystkich okręgach. */
  const nationalSwing = useCallback((pid: string, target: number) => {
    setScenario((s) => {
      const current = DISTRICTS.reduce(
        (acc, d) => acc + (s.districts[d.id]?.shares[pid] ?? 0) * d.electorate,
        0,
      );
      const weight = DISTRICTS.reduce((acc, d) => acc + d.electorate, 0);
      const avg = current / weight;
      const delta = target - avg;
      const districts = { ...s.districts };
      for (const d of DISTRICTS) {
        const st = districts[d.id] ?? blankState(d.id);
        districts[d.id] = {
          turnout: st.turnout,
          shares: {
            ...st.shares,
            [pid]: Math.max(0, +((st.shares[pid] ?? 0) + delta).toFixed(2)),
          },
        };
      }
      return { ...s, districts };
    });
  }, []);

  const setGlobalTurnout = useCallback((value: number) => {
    setScenario((s) => {
      const districts = { ...s.districts };
      for (const d of DISTRICTS)
        districts[d.id] = { shares: (districts[d.id] ?? blankState(d.id)).shares, turnout: value };
      return { ...s, districts };
    });
  }, []);

  const save = () => {
    const blob = new Blob([JSON.stringify(scenario, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scenariusz-sejm-2027-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Scenariusz zapisany do pliku");
  };

  const load = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as Scenario;
      if (parsed?.version !== 1 || !parsed.districts) throw new Error("zły format");
      const base = defaultScenario();
      setScenario({
        ...base,
        ...parsed,
        districts: { ...base.districts, ...parsed.districts },
        parties: { ...base.parties, ...parsed.parties },
      });
      toast.success(`Wczytano: ${parsed.name ?? "scenariusz"}`);
    } catch {
      toast.error("Nie udało się wczytać pliku — to nie jest scenariusz tej aplikacji.");
    }
  };

  const leader = ranked[0];
  const focusColor = PARTY_MAP[focusParty]?.color;

  return (
    <div className="min-h-screen">
      {/* HERO */}
      <header className="relative overflow-hidden border-b border-border bg-surface">
        <ParticleField className="pointer-events-none absolute inset-0 h-full w-full" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 0%, transparent 35%, var(--surface) 92%)",
          }}
        />
        <div className="relative mx-auto flex max-w-[1400px] flex-col gap-8 px-5 py-14 md:py-20">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <p className="eyebrow">Symulator · Wybory do Sejmu RP 2027</p>
              <h1 className="mt-3 font-display text-5xl font-bold leading-[0.95] text-ink md:text-7xl">
                Sejmometr
                <span className="text-primary">.</span>
              </h1>
              <p className="mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
                Maluj okręgi, kręć frekwencją, składaj koalicje. Punkt wyjścia to średnia
                sondażowa z <span className="font-semibold text-foreground">ewybory.eu</span> na
                dziś — resztę dopisujesz sam.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button onClick={save}>
                  <Download className="mr-1.5 h-4 w-4" /> Zapisz scenariusz
                </Button>
                <Button variant="outline" onClick={() => fileRef.current?.click()}>
                  <Upload className="mr-1.5 h-4 w-4" /> Wczytaj plik
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setScenario(defaultScenario());
                    toast.info("Przywrócono stan wyjściowy");
                  }}
                >
                  <RotateCcw className="mr-1.5 h-4 w-4" /> Reset
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void load(f);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>

            <div className="panel-float w-full max-w-md p-5">
              <div className="flex items-baseline justify-between">
                <p className="eyebrow">Skład Sejmu w tym scenariuszu</p>
                <p className="num text-xs text-muted-foreground">
                  frekwencja {result.nationalTurnout.toFixed(1)}%
                </p>
              </div>
              <Hemicycle
                seatsByParty={result.seatsByParty}
                highlight={highlight ?? undefined}
              />
              <div className="mt-1 flex items-end justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Największy klub</p>
                  <p className="font-display text-lg font-bold" style={{ color: leader?.color }}>
                    {leader?.short} · {result.seatsByParty[leader?.id ?? ""] ?? 0}
                  </p>
                </div>
                <p className="num text-xs text-muted-foreground">
                  większość: {MAJORITY} mandatów
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] space-y-14 px-5 py-12">
        {/* MAPA + PANEL */}
        <section className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
          <div className="panel p-4 md:p-6">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="mr-auto">
                <h2 className="font-display text-2xl font-bold text-ink">41 okręgów</h2>
                <p className="text-sm text-muted-foreground">
                  Kliknij okręg, żeby ustawić poparcie i frekwencję.
                </p>
              </div>
              <div className="flex rounded-lg border border-border p-0.5">
                <button
                  onClick={() => setMode("winner")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    mode === "winner" ? "bg-ink text-background" : "text-muted-foreground"
                  }`}
                >
                  Zwycięzca
                </button>
                <button
                  onClick={() => setMode("party")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    mode === "party" ? "bg-ink text-background" : "text-muted-foreground"
                  }`}
                >
                  Jedna partia
                </button>
              </div>
            </div>

            {mode === "party" ? (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {PARTIES.filter((p) => p.id !== "inne").map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setFocusParty(p.id)}
                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                      focusParty === p.id
                        ? "border-transparent text-white"
                        : "border-border text-muted-foreground hover:border-ink/30"
                    }`}
                    style={focusParty === p.id ? { background: p.color } : undefined}
                  >
                    <PartyLogo id={p.id} size={16} />
                    {p.short}
                  </button>
                ))}
              </div>
            ) : null}

            <PolandMap
              result={result}
              mode={mode}
              focusParty={focusParty}
              selected={selected}
              onSelect={(id) => setSelected(id)}
            />

            {mode === "party" ? (
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <span>0%</span>
                <div
                  className="h-2 flex-1 rounded-full"
                  style={{ background: `linear-gradient(90deg, #fff, ${focusColor})` }}
                />
                <span>maks. w kraju</span>
              </div>
            ) : null}
          </div>

          <div className="min-h-[520px]">
            {selected != null ? (
              <DistrictPanel
                districtId={selected}
                state={scenario.districts[selected]}
                result={resultById[selected]}
                onChange={(next) => setDistrict(selected, next)}
                onReset={() => resetDistrict(selected)}
                onClose={() => setSelected(null)}
              />
            ) : (
              <div className="panel h-full p-5">
                <h3 className="font-display text-lg font-bold text-ink">Wynik ogólnokrajowy</h3>
                <p className="text-sm text-muted-foreground">
                  Suwak ustawia poparcie partii jednakowo we wszystkich okręgach.
                </p>
                <div className="mt-4 space-y-3">
                  {ranked.map((p) => {
                    const share = result.nationalShares[p.id] ?? 0;
                    const seats = result.seatsByParty[p.id] ?? 0;
                    const settings = scenario.parties[p.id];
                    const inSejm = result.qualified.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        className="rounded-lg border border-border/70 p-3"
                        onMouseEnter={() => setHighlight(new Set([p.id]))}
                        onMouseLeave={() => setHighlight(null)}
                      >
                        <div className="flex items-center gap-2.5">
                          <PartyLogo id={p.id} size={28} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{p.short}</p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              próg {settings.threshold}%
                              {inSejm ? "" : " · poniżej progu"}
                            </p>
                          </div>
                          <span
                            className="num ml-auto text-sm font-bold"
                            style={{ color: p.color }}
                          >
                            {share.toFixed(1)}%
                          </span>
                          <span className="num w-10 rounded bg-ink/5 py-0.5 text-center text-sm font-bold">
                            {seats}
                          </span>
                        </div>
                        <Slider
                          className="mt-2.5"
                          min={0}
                          max={55}
                          step={0.1}
                          value={[share]}
                          onValueChange={([v = 0]) => nationalSwing(p.id, v)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* KOALICJE */}
        <section>
          <CoalitionBuilder
            coalitions={scenario.coalitions}
            seatsByParty={result.seatsByParty}
            qualified={result.qualified}
            onChange={(next: Coalition[]) => setScenario((s) => ({ ...s, coalitions: next }))}
            onHover={(members) => setHighlight(members ? new Set(members) : null)}
          />
        </section>

        {/* USTAWIENIA MODELU */}
        <section className="grid gap-6 md:grid-cols-2">
          <div className="panel p-5">
            <h2 className="font-display text-xl font-bold text-ink">Frekwencja</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ustaw jedną frekwencję dla całego kraju albo dopieszczaj okręg po okręgu na mapie.
            </p>

            <div className="mt-5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold">Frekwencja we wszystkich okręgach</span>
                <span className="num text-lg font-bold text-primary">
                  {result.nationalTurnout.toFixed(1)}%
                </span>
              </div>
              <Slider
                className="mt-3"
                min={30}
                max={90}
                step={0.5}
                value={[result.nationalTurnout]}
                onValueChange={([v = 0]) => setGlobalTurnout(v)}
              />
            </div>

            <div className="mt-6">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold">Siła profilu elektoratu</span>
                <span className="num text-sm font-bold">
                  {Math.round(scenario.turnoutEffect * 100)}%
                </span>
              </div>
              <Slider
                className="mt-3"
                min={0}
                max={2}
                step={0.05}
                value={[scenario.turnoutEffect]}
                onValueChange={([v = 0]) => setScenario((s) => ({ ...s, turnoutEffect: v }))}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                0% = frekwencja zmienia tylko wagę okręgu. Wyżej = przy wysokiej frekwencji rosną
                partie o młodszym i bardziej miejskim elektoracie, a maleją te o elektoracie
                najbardziej zdyscyplinowanym.
              </p>
            </div>
          </div>

          <div className="panel p-5">
            <h2 className="font-display text-xl font-bold text-ink">Partie i progi</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Komitet partyjny 5%, koalicyjny 8%, mniejszość narodowa bez progu.
            </p>
            <div className="mt-4 space-y-2">
              {PARTIES.filter((p) => p.id !== "inne").map((p) => {
                const s = scenario.parties[p.id];
                return (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 px-3 py-2"
                  >
                    <PartyLogo id={p.id} size={24} />
                    <span className="text-sm font-medium">{p.short}</span>
                    <div className="ml-auto flex items-center gap-1">
                      {([5, 8, 0] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() =>
                            setScenario((sc) => ({
                              ...sc,
                              parties: {
                                ...sc.parties,
                                [p.id]: { ...sc.parties[p.id], threshold: t },
                              },
                            }))
                          }
                          className={`num rounded-md px-2 py-1 text-xs font-bold transition-colors ${
                            s.threshold === t
                              ? "bg-ink text-background"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {t === 0 ? "brak" : `${t}%`}
                        </button>
                      ))}
                      <Switch
                        className="ml-2"
                        checked={s.enabled}
                        onCheckedChange={(v) =>
                          setScenario((sc) => ({
                            ...sc,
                            parties: { ...sc.parties, [p.id]: { ...sc.parties[p.id], enabled: v } },
                          }))
                        }
                      />
                    </div>
                    <div className="w-full">
                      <div className="flex items-baseline justify-between text-[11px] text-muted-foreground">
                        <span>wrażliwość na frekwencję</span>
                        <span className="num">
                          {s.turnoutSensitivity > 0 ? "+" : ""}
                          {s.turnoutSensitivity.toFixed(2)}
                        </span>
                      </div>
                      <Slider
                        className="mt-1.5"
                        min={-1.5}
                        max={1.5}
                        step={0.05}
                        value={[s.turnoutSensitivity]}
                        onValueChange={([v = 0]) =>
                          setScenario((sc) => ({
                            ...sc,
                            parties: {
                              ...sc.parties,
                              [p.id]: { ...sc.parties[p.id], turnoutSensitivity: v },
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <footer className="border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
          <p>
            Dane wyjściowe: średnia sondażowa i symulacja okręgowa z ewybory.eu (stan na 30 września
            2026). Mandaty liczone metodą D'Hondta osobno w każdym z 41 okręgów, z progami
            liczonymi od głosów w skali kraju. Liczba uprawnionych w okręgu jest przybliżana
            proporcjonalnie do liczby mandatów. To narzędzie do scenariuszy „co by było, gdyby”, nie
            prognoza.
          </p>
          <p className="mt-2">
            Logotypy partii pochodzą z Wikimedia Commons i należą do ich właścicieli.
          </p>
        </footer>
      </main>
    </div>
  );
}
