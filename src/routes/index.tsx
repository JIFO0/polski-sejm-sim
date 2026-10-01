import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Download, ExternalLink, Info, RotateCcw, Upload, UserRound, Users } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";

import { LogoMark } from "@/components/Logos";
import { FloatingNav } from "@/components/FloatingNav";
import { SupportButton } from "@/components/SupportButton";

import { DISTRICTS } from "@/data/districts";
import { MERGED_INTO, PARTIES, PARTY_MAP, resultParties, supportParties, syncCustomEntities, type Party } from "@/data/parties";
import { CustomPartiesPanel } from "@/components/CustomPartiesPanel";
import {
  BASE_TURNOUT,
  MAJORITY,
  defaultScenario,
  simulate,
  turnoutChangesSeats,
  type Coalition,
  type DistrictState,
  type Scenario,
} from "@/lib/simulation";
import { isScenarioModified, nationalSharesOf, track, trackPageViewOncePerSession } from "@/lib/analytics";
import { ParticleField } from "@/components/ParticleField";
import { PolandMap, type MapMode } from "@/components/PolandMap";
import { Hemicycle } from "@/components/Hemicycle";
import { DistrictPanel } from "@/components/DistrictPanel";
import { CoalitionBuilder } from "@/components/CoalitionBuilder";
import { ScenarioShelf } from "@/components/ScenarioShelf";
import { TurnoutGroups } from "@/components/TurnoutGroups";
import { HistoricalResults } from "@/components/HistoricalResults";
import { HistoricalDistrictResults } from "@/components/HistoricalDistrictResults";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { PartyLogo } from "@/components/PartyLogo";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { AccessibilityMenu } from "@/components/AccessibilityMenu";
import { ShareInput } from "@/components/ShareInput";

const TITLE = "SejmSim 2027 (sejmsim.pl) | Kalkulator Sejmu, kalkulator siedzeń i symulator wyborczy";
const DESC =
  "Kalkulator Sejmu i kalkulator siedzeń (mandatów): interaktywna mapa 41 okręgów, przelicznik D'Hondta, frekwencja i koalicje na sejmsim.pl. Twórz własne scenariusze wyborów do Sejmu 2027.";
const KEYWORDS =
  "kalkulator sejmu, kalkulator siedzeń sejmu, kalkulator miejsc w sejmie, kalkulator mandatów sejm, symulator wyborów do sejmu, sejm 2027, metoda d'hondta, podział mandatów, koalicje sejmowe, sejmsim";

const blankState = (id: number): DistrictState => {
  const base = DISTRICTS.find((d) => d.id === id);
  return { shares: { ...(base?.base ?? {}) }, turnout: BASE_TURNOUT };
};

const DEFAULT_SETTINGS = { threshold: 5 as const, turnoutSensitivity: 0, enabled: true };
const isParty = (party: Party | undefined): party is Party => Boolean(party);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "keywords", content: KEYWORDS },
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
  const [displayOrder, setDisplayOrder] = useState(() =>
    PARTIES.filter((party) => party.id !== "inne").map((party) => party.id),
  );
  const [showVotes, setShowVotes] = useState(false);
  const [nationalElectorateInput, setNationalElectorateInput] = useState(() =>
    String(DISTRICTS.reduce((acc, d) => acc + d.electorate, 0)),
  );
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    trackPageViewOncePerSession();
  }, []);

  const [logoVersion, setLogoVersion] = useState(0);
  const registryVersion = useMemo(() => {
    syncCustomEntities(scenario.customParties, scenario.mergers);
    return `${logoVersion}:${(scenario.customParties ?? []).length}:${JSON.stringify(scenario.mergers ?? [])}:${JSON.stringify(scenario.customParties ?? [])}`;
  }, [scenario.customParties, scenario.mergers, logoVersion]);

  const result = useMemo(() => simulate(scenario), [scenario]);
  const resultById = useMemo(
    () => Object.fromEntries(result.districts.map((d) => [d.id, d])),
    [result],
  );

  const ranked = useMemo(
    () =>
      resultParties().sort(
        (a, b) => (result.seatsByParty[b.id] ?? 0) - (result.seatsByParty[a.id] ?? 0) ||
          (result.nationalShares[b.id] ?? 0) - (result.nationalShares[a.id] ?? 0),
      ),
    [result, registryVersion],
  );

  const displayedParties = useMemo(() => {
    const allowed = supportParties();
    const allowedIds = new Set(allowed.map((p) => p.id));
    const ordered = displayOrder.filter((id) => allowedIds.has(id)).map((id) => PARTY_MAP[id]).filter(isParty);
    const seen = new Set(ordered.map((p) => p.id));
    return [...ordered, ...allowed.filter((p) => !seen.has(p.id))];
  }, [displayOrder, registryVersion]);

  const commitPartyOrder = useCallback(() => {
    setDisplayOrder(ranked.map((party) => party.id));
  }, [ranked]);

  const setDistrict = useCallback((id: number, next: DistrictState) => {
    setScenario((s) => ({ ...s, districts: { ...s.districts, [id]: next } }));
  }, []);

  const nationalRawShares = useMemo(() => {
    const weight = DISTRICTS.reduce((total, district) => {
      const el = scenario.districts[district.id]?.electorate ?? district.electorate;
      return total + el;
    }, 0);
    return Object.fromEntries(
      PARTIES.map((party) => [
        party.id,
        DISTRICTS.reduce(
          (total, district) => {
            const el = scenario.districts[district.id]?.electorate ?? district.electorate;
            return total + (scenario.districts[district.id]?.shares[party.id] ?? 0) * el;
          },
          0,
        ) / (weight > 0 ? weight : 1),
      ]),
    );
  }, [scenario.districts]);

  useEffect(() => {
    if (MERGED_INTO[focusParty]) {
      setFocusParty(MERGED_INTO[focusParty] ?? resultParties()[0]?.id ?? "ko");
    }
  }, [registryVersion, focusParty]);

  const unassignedShare = Math.max(
    0,
    100 -
      PARTIES.filter((p) => !MERGED_INTO[p.id]).reduce(
        (total, p) => total + (nationalRawShares[p.id] ?? 0),
        0,
      ),
  );

  const resetDistrict = useCallback((id: number) => {
    const base = DISTRICTS.find((d) => d.id === id);
    if (!base) return;
    setScenario((s) => {
      const shares = { ...base.base };
      for (const m of s.mergers ?? []) {
        let joint = 0;
        for (const mid of m.members) {
          joint += shares[mid] ?? 0;
          delete shares[mid];
        }
        const kept = Math.round(joint * (m.retention / 100) * 10) / 10;
        const lost = Math.round((joint - kept) * 10) / 10;
        shares[m.id] = kept;
        if (!s.independentSupport && shares["inne"] != null) {
          shares["inne"] = Math.round((shares["inne"] + lost) * 10) / 10;
        }
      }
      return {
        ...s,
        districts: { ...s.districts, [id]: { shares, turnout: BASE_TURNOUT, electorate: base.electorate } },
      };
    });
  }, []);

  const partyTrackRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  /** Zmiana krajowego poparcia przy zachowaniu regionalnych różnic. */
  const nationalSwing = useCallback((pid: string, target: number) => {
    if (partyTrackRef.current[pid]) clearTimeout(partyTrackRef.current[pid]);
    partyTrackRef.current[pid] = setTimeout(() => track({ event: "party_slider_adjust", meta: pid }), 1500);

    setScenario((s) => {
      const current = DISTRICTS.reduce(
        (acc, d) => acc + (s.districts[d.id]?.shares[pid] ?? 0) * (s.districts[d.id]?.electorate ?? d.electorate),
        0,
      );
      const weight = DISTRICTS.reduce((acc, d) => acc + (s.districts[d.id]?.electorate ?? d.electorate), 0);
      const avg = current / (weight > 0 ? weight : 1);
      const boundedTarget = Math.min(100, Math.max(0, target));
      const delta = boundedTarget - avg;
      const districts = { ...s.districts };
      for (const d of DISTRICTS) {
        const st = districts[d.id] ?? blankState(d.id);
        const currentParty = st.shares[pid] ?? 0;
        const otherTotal = Object.entries(st.shares).reduce(
          (total, [id, share]) => total + (id === pid || MERGED_INTO[id] ? 0 : share),
          0,
        );
        const targetHere = Math.min(100, Math.max(0, currentParty + delta));
        const available = Math.max(0, 100 - otherTotal);
        const snapped = Math.abs(targetHere - available) <= 0.35 ? available : targetHere;
        const shares: Record<string, number> = s.independentSupport
          ? { ...st.shares, [pid]: Math.min(snapped, available) }
          : Object.fromEntries(
              Object.entries(st.shares).map(([id, share]) => [
                id,
                id === pid ? targetHere : MERGED_INTO[id] ? 0 : otherTotal > 0 ? share * ((100 - targetHere) / otherTotal) : share,
              ]),
            );
        if (!(pid in shares)) shares[pid] = targetHere;
        districts[d.id] = {
          ...st,
          shares,
        };
      }
      return { ...s, districts };
    });
  }, []);

  const turnoutTrackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setGlobalTurnout = useCallback((value: number) => {
    if (turnoutTrackRef.current) clearTimeout(turnoutTrackRef.current);
    turnoutTrackRef.current = setTimeout(() => track({ event: "turnout_set", turnout: value }), 1500);
    setScenario((s) => {
      const districts = { ...s.districts };
      for (const d of DISTRICTS) {
        const cur = districts[d.id] ?? blankState(d.id);
        districts[d.id] = { ...cur, turnout: value };
      }
      return { ...s, districts };
    });
  }, []);

  const setGlobalElectorate = useCallback((totalTarget: number) => {
    const baseTotal = DISTRICTS.reduce((acc, d) => acc + d.electorate, 0);
    const ratio = totalTarget / (baseTotal > 0 ? baseTotal : 1);
    setScenario((s) => {
      const districts = { ...s.districts };
      for (const d of DISTRICTS) {
        const cur = districts[d.id] ?? blankState(d.id);
        districts[d.id] = { ...cur, electorate: Math.round(d.electorate * ratio) };
      }
      return { ...s, districts };
    });
    toast.success(`Zaktualizowano liczbę uprawnionych w kraju: ${Math.round(totalTarget).toLocaleString("pl-PL")}`);
  }, []);

  const applyNationalElectorate = useCallback(() => {
    const val = parseInt(nationalElectorateInput, 10);
    if (!isNaN(val) && val >= 1_000_000 && val <= 50_000_000) {
      setGlobalElectorate(val);
    } else {
      toast.error("Wprowadź prawidłową liczbę wyborców (od 1 mln do 50 mln).");
    }
  }, [nationalElectorateInput, setGlobalElectorate]);

  const resetGlobalElectorate = useCallback(() => {
    const baseTotal = DISTRICTS.reduce((acc, d) => acc + d.electorate, 0);
    setNationalElectorateInput(String(baseTotal));
    setScenario((s) => {
      const districts = { ...s.districts };
      for (const d of DISTRICTS) {
        const cur = districts[d.id] ?? blankState(d.id);
        districts[d.id] = { ...cur, electorate: undefined };
      }
      return { ...s, districts };
    });
    toast.info("Przywrócono domyślną liczbę uprawnionych wyborców (29 276 800)");
  }, []);

  const save = () => {
    track({
      event: "scenario_download",
      ...(isScenarioModified(scenario) ? { shares: nationalSharesOf(scenario) } : {}),
      turnout: scenario.districts[1]?.turnout ?? BASE_TURNOUT,
    });
    const blob = new Blob([JSON.stringify(scenario, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scenariusz-sejm-2027-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Pobrano plik scenariusza");
  };

  const load = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as Scenario;
      if (parsed?.version !== 1 || !parsed.districts) throw new Error("zły format");
      const base = defaultScenario();
      const mergedParties: Record<string, PartySettings> = {};
      for (const [k, v] of Object.entries({ ...base.parties, ...parsed.parties })) {
        mergedParties[k] = {
          ...v,
          turnoutSensitivity:
            v.turnoutSensitivity !== undefined
              ? v.turnoutSensitivity
              : (base.parties[k]?.turnoutSensitivity ?? PARTY_MAP[k]?.turnoutSensitivity ?? 0),
        };
      }
      setScenario({
        ...base,
        ...parsed,
        districts: { ...base.districts, ...parsed.districts },
        parties: mergedParties,
      });
      toast.success(`Wczytano: ${parsed.name ?? "scenariusz"}`);
    } catch {
      toast.error("Nie udało się wczytać pliku. To nie jest scenariusz tej aplikacji.");
    }
  };

  const loadScenario = useCallback((next: Scenario) => {
    const base = defaultScenario();
    const mergedParties: Record<string, PartySettings> = {};
    for (const [k, v] of Object.entries({ ...base.parties, ...next.parties })) {
      mergedParties[k] = {
        ...v,
        turnoutSensitivity:
          v.turnoutSensitivity !== undefined
            ? v.turnoutSensitivity
            : (base.parties[k]?.turnoutSensitivity ?? PARTY_MAP[k]?.turnoutSensitivity ?? 0),
      };
    }
    setScenario({
      ...base,
      ...next,
      districts: { ...base.districts, ...next.districts },
      parties: mergedParties,
    });
  }, []);

  const setTurnoutSide = useCallback((partyId: string, side: "lower" | "neutral" | "higher") => {
    setScenario((current) => ({
      ...current,
      parties: {
        ...current.parties,
        [partyId]: {
          ...(current.parties[partyId] ?? DEFAULT_SETTINGS),
          turnoutSensitivity: side === "higher" ? 0.65 : side === "lower" ? -0.65 : 0,
        },
      },
    }));
  }, []);

  const leader = ranked[0];
  const focusColor = PARTY_MAP[focusParty]?.color;

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <ParticleField className="pointer-events-none fixed inset-0 z-0 h-dvh w-screen" />
      <FloatingNav mode="simulator" />
      <header className="relative z-10 overflow-hidden border-b border-border bg-surface/80 backdrop-blur-[2px]">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 0%, transparent 35%, var(--surface) 92%)",
          }}
        />
        <div className="relative mx-auto flex max-w-[1400px] flex-col gap-8 px-5 py-10 md:py-14">
            <nav className="flex flex-wrap items-center justify-end gap-2" aria-label="Nawigacja główna">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild>
              <Link to="/o-projekcie">
                <Info className="mr-1.5 h-4 w-4" /> O projekcie
              </Link>
            </Button>
            <FeedbackDialog />
            <Button variant="outline" size="sm" asChild>
              <a
                href="https://jifo.dev/#kontakt"
                target="_blank"
                rel="noreferrer"
                onClick={() => track({ event: "contact_click" })}
              >
                <UserRound className="mr-1.5 h-4 w-4" /> Kontakt
              </a>
            </Button>
            <SupportButton size="sm" />
            <AccessibilityMenu />
          </nav>
          <div className="grid items-start gap-8 xl:grid-cols-[minmax(22rem,0.8fr)_minmax(36rem,1.2fr)]">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3.5">
                <LogoMark size={64} className="shrink-0 drop-shadow-sm" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="eyebrow !mb-0">Symulator wyborów do Sejmu RP 2027</p>
                    <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary">
                      sejmsim.pl
                    </span>
                  </div>
                  <h1 className="mt-1 font-display text-4xl font-bold leading-[0.95] text-ink sm:text-5xl md:text-6xl">
                    SejmSim
                    <span className="text-primary">.</span>
                    <span className="sr-only"> SejmSim: kalkulator Sejmu, kalkulator siedzeń i symulator wyborów 2027 sejmsim.pl</span>
                  </h1>
                </div>
              </div>
              <p className="mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
                Profesjonalne narzędzie do analizy poparcia, frekwencji i możliwych koalicji.
                Punktem wyjścia jest średnia sondażowa serwisu
                <span className="font-semibold text-foreground"> ewybory.eu</span>.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button onClick={save}>
                  <Download className="mr-1.5 h-4 w-4" /> Pobierz scenariusz
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
                  aria-label="Wybierz plik scenariusza JSON"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void load(f);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(21rem,0.95fr)]">
            <div
              className="panel-float leader-tint w-full p-5"
              style={{ "--leader-color": leader?.color ?? "var(--border)" } as CSSProperties}
            >
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-lg font-bold text-ink">Skład parlamentu w tym scenariuszu</h2>
                <p className="num text-xs text-muted-foreground">
                  frekwencja {result.nationalTurnout.toFixed(1)}%
                </p>
              </div>
              <Hemicycle
                seatsByParty={result.seatsByParty}
                highlight={highlight ?? undefined}
              />
              <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5" aria-label="Legenda partii z mandatami">
                {Object.entries(result.seatsByParty)
                  .filter(([, seats]) => seats > 0)
                  .sort((a, b) => b[1] - a[1] || (PARTY_MAP[a[0]]?.short ?? a[0]).localeCompare(PARTY_MAP[b[0]]?.short ?? b[0], "pl"))
                  .map(([id, seats]) => (
                    <li key={id} className="inline-flex items-center gap-1.5 text-xs" title={PARTY_MAP[id]?.name ?? id}>
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PARTY_MAP[id]?.color ?? "#94A3B8" }} />
                      <span className="font-semibold text-ink">{PARTY_MAP[id]?.short ?? id}</span>
                      <span className="num text-muted-foreground">{seats}</span>
                    </li>
                  ))}
              </ul>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Największy klub</p>
                  <p className="font-display text-lg font-bold" style={{ color: leader?.color }}>
                    {leader?.short}: {result.seatsByParty[leader?.id ?? ""] ?? 0}
                  </p>
                </div>
                <p className="num text-xs text-muted-foreground">
                  większość: {MAJORITY} mandatów
                </p>
              </div>
            </div>
            <ScenarioShelf scenario={scenario} onLoad={loadScenario} />
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1400px] space-y-14 px-5 py-12">
        <section className="border-l-4 border-primary bg-surface/80 px-5 py-4 backdrop-blur-sm" aria-labelledby="tutorial-title">
          <p className="eyebrow">Jak stworzyć scenariusz</p>
          <h2 id="tutorial-title" className="mt-1 font-display text-lg font-bold text-ink">Samodzielne tworzenie scenariusza</h2>
          <p className="mt-2 max-w-5xl text-sm leading-relaxed text-muted-foreground">
            Aby stworzyć scenariusz składu Sejmu 2027 należy ustawić poparcie dla każdej partii, a opcjonalnie także frekwencję i jej wpływ na rozkład głosów.
            Następnie połącz partie w koalicje, aby sprawdzić, które bloki mogą utworzyć rząd i osiągnąć większość 231 mandatów.
          </p>
        </section>
        <CollapsibleSection title="Własne partie i wspólne listy" defaultOpen={false}>
          <CustomPartiesPanel
            scenario={scenario}
            setScenario={setScenario}
            onLogoChange={() => setLogoVersion((v) => v + 1)}
          />
        </CollapsibleSection>
        <CollapsibleSection title="Symulacja w okręgach">
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
                  onClick={() => {
                    setMode("winner");
                    track({ event: "map_mode_change", meta: "zwyciezca" });
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    mode === "winner" ? "bg-ink text-background" : "text-muted-foreground"
                  }`}
                >
                  Zwycięzca
                </button>
                <button
                  onClick={() => {
                    setMode("party");
                    track({ event: "map_mode_change", meta: `partia:${focusParty}` });
                  }}
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
                {resultParties().map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setFocusParty(p.id);
                      track({ event: "map_mode_change", meta: `partia:${p.id}` });
                    }}
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
              onSelect={(id) => {
                setSelected(id);
                const d = DISTRICTS.find((item) => item.id === id);
                if (d) track({ event: "district_view", meta: `${d.id}. ${d.name}` });
              }}
            />

            {mode === "party" ? (
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <span>0%</span>
                <div
                  className="h-2 flex-1 rounded-full"
                  style={{ background: `linear-gradient(90deg, var(--surface), ${focusColor})` }}
                />
                <span>maks. w kraju</span>
              </div>
            ) : null}
          </div>

          <div className="min-h-[520px]">
            {selected != null ? (
              <DistrictPanel
                districtId={selected}
                state={scenario.districts[selected] ?? blankState(selected)}
                result={resultById[selected]}
                onChange={(next) => setDistrict(selected, next)}
                onReset={() => resetDistrict(selected)}
                onClose={() => setSelected(null)}
                independentSupport={scenario.independentSupport ?? false}
                mergers={scenario.mergers}
              />
            ) : (
              <div
                className="panel leader-tint h-full p-5"
                style={{ "--leader-color": leader?.color ?? "var(--border)" } as CSSProperties}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display text-lg font-bold text-ink">Wynik ogólnokrajowy</h3>
                    <p className="text-sm text-muted-foreground">
                      Suwak i pole procentowe zmieniają poparcie z zachowaniem regionalnych różnic.
                    </p>
                  </div>
                  <Button
                    variant={showVotes ? "secondary" : "outline"}
                    size="sm"
                    className="h-8 gap-1.5 px-2.5 text-xs font-semibold shrink-0"
                    onClick={() => setShowVotes(!showVotes)}
                    title="Przełącz wyświetlanie szacunkowej liczby głosów"
                  >
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <span>{showVotes ? "Ukryj głosy" : "Liczba głosów"}</span>
                  </Button>
                </div>

                <div className="mt-2.5 flex items-center justify-between rounded-md bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground">
                  <span>Uprawnieni: <strong className="text-ink">{(result.totalElectorate / 1_000_000).toFixed(2)} mln</strong></span>
                  <span>Oddane: <strong className="text-ink">{(result.totalVotes / 1_000_000).toFixed(2)} mln</strong> ({result.nationalTurnout.toFixed(1)}%)</span>
                </div>

                <label className="mt-3 flex min-h-12 cursor-pointer items-start gap-3 rounded-md border border-border bg-surface/70 p-3">
                  <Checkbox
                    checked={scenario.independentSupport ?? false}
                    onCheckedChange={(checked) => {
                      track({ event: "independent_mode", meta: checked === true ? "wlaczony" : "wylaczony" });
                      setScenario((current) => ({ ...current, independentSupport: checked === true }));
                    }}
                    className="mt-0.5 h-5 w-5"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-foreground">Wybór proporcjonalny</span>
                    <span className="block text-xs text-muted-foreground">Zmiana jednej partii nie zmienia wyników pozostałych.</span>
                  </span>
                </label>
                <div className="mt-3 flex items-center justify-between rounded-md bg-muted px-3 py-2">
                  <span className="text-sm font-semibold">Głosy nieprzypisane</span>
                  <span className="num text-base font-bold text-primary">{unassignedShare.toFixed(1)}%</span>
                </div>
                <div className="mt-4 space-y-3">
                  {displayedParties.map((p) => {
                    const share = scenario.independentSupport ? (nationalRawShares[p.id] ?? 0) : (result.nationalShares[p.id] ?? 0);
                    const seats = result.seatsByParty[p.id] ?? 0;
                    const votes = Math.round(result.nationalVotes[p.id] ?? 0);
                    const settings = scenario.parties[p.id] ?? DEFAULT_SETTINGS;
                    const inSejm = result.qualified.includes(p.id);
                    const mergerDef = scenario.mergers?.find((m) => m.id === p.id);
                    return (
                      <div
                        key={p.id}
                        className="rounded-lg border border-border/70 p-3"
                        onMouseEnter={() => setHighlight(new Set([p.id]))}
                        onMouseLeave={() => setHighlight(null)}
                      >
                        <div className="flex items-center gap-2.5">
                          <PartyLogo id={p.id} size={28} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{p.short}</p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {mergerDef
                                ? `wspólna lista (${mergerDef.members.map((m) => PARTY_MAP[m]?.short ?? m).join(" + ")})`
                                : `próg ${settings.threshold}%${inSejm ? "" : ", poniżej progu"}`}
                              {showVotes ? ` • szac. ${votes.toLocaleString("pl-PL")} głosów` : ""}
                            </p>
                          </div>
                          <ShareInput
                            value={share}
                            onChange={(next) => nationalSwing(p.id, next)}
                            label={`Krajowe poparcie ${p.name}`}
                            max={scenario.independentSupport ? share + unassignedShare : 100}
                          />
                          <span className="num w-10 rounded bg-ink/5 py-0.5 text-center text-sm font-bold" title={`${seats} mandatów`}>
                            {seats}
                          </span>
                        </div>
                        {showVotes ? (
                          <div className="mt-1.5 flex items-center justify-between rounded bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
                            <span>Szacunkowa liczba głosów:</span>
                            <span className="font-mono font-bold text-ink">
                              {votes.toLocaleString("pl-PL")}
                            </span>
                          </div>
                        ) : null}
                        <Slider
                          className="mt-2.5"
                          min={0}
                          max={scenario.independentSupport ? Math.max(55, share + unassignedShare) : 100}
                          step={0.1}
                          value={[share]}
                          onValueChange={([v = 0]) => nationalSwing(p.id, v)}
                          onValueCommit={commitPartyOrder}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
        </CollapsibleSection>

        {/* FREKWENCJA - centralnie pod symulacją w okręgach */}
        <CollapsibleSection title="Frekwencja">
        <section className="space-y-6">
          <div className="panel p-5 md:p-6">
            <h2 className="font-display text-xl font-bold text-ink">Frekwencja</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ustaw jedną frekwencję dla całego kraju albo dopieszczaj okręg po okręgu na mapie.
            </p>

            <div className="mt-5 grid gap-6 md:grid-cols-2">
            <div>
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
              <p className="mt-2 text-xs text-muted-foreground">
                {turnoutChangesSeats(scenario)
                  ? "Frekwencja zmienia szacowaną liczbę głosów i, przez profil elektoratu, podział mandatów."
                  : "Wszystkie partie są w grupie „Frekwencja nie wpływa”, więc mandaty zostają takie same. Zmienia się tylko szacowana liczba głosów."}
              </p>
            </div>

            <div>
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

            {/* Kwalifikowani wyborcy i szacunek liczby głosów */}
            <div className="mt-6 rounded-xl border border-border/80 bg-surface-strong/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Users className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <h3 className="font-display text-base font-bold text-ink">
                      Kwalifikowani wyborcy i szacunek liczby głosów
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Liczba uprawnionych do głosowania w Polsce (baza PKW: 29 276 800). Wpływa bezpośrednio na szacowaną liczbę głosów w kraju i w 41 okręgach.
                    </p>
                  </div>
                </div>
                <Button
                  variant={showVotes ? "default" : "outline"}
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-semibold"
                  onClick={() => setShowVotes(!showVotes)}
                >
                  <Users className="h-3.5 w-3.5" />
                  {showVotes ? "Liczby głosów aktywne" : "Pokaż szacowane głosy przy partiach"}
                </Button>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border border-border bg-surface p-3">
                  <span className="text-xs font-semibold text-muted-foreground">Uprawnieni do głosowania w kraju</span>
                  <div className="mt-1 flex items-baseline justify-between gap-2">
                    <span className="font-mono text-xl font-bold text-ink">
                      {Math.round(result.totalElectorate).toLocaleString("pl-PL")}
                    </span>
                    <span className="text-xs text-muted-foreground">wyborców</span>
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <Input
                      type="number"
                      min={1000000}
                      max={45000000}
                      step={100000}
                      value={nationalElectorateInput}
                      onChange={(e) => setNationalElectorateInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && applyNationalElectorate()}
                      placeholder="np. 29276800"
                      className="h-8 text-xs font-mono"
                      aria-label="Własna liczba uprawnionych w kraju"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2 text-xs font-semibold shrink-0"
                      onClick={applyNationalElectorate}
                    >
                      Ustaw
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs text-muted-foreground hover:text-ink shrink-0"
                      onClick={resetGlobalElectorate}
                      title="Przywróć domyślne 29 276 800"
                    >
                      Reset
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-surface p-3">
                  <span className="text-xs font-semibold text-muted-foreground">Średnia frekwencja</span>
                  <div className="mt-1 flex items-baseline justify-between gap-2">
                    <span className="font-mono text-xl font-bold text-primary">
                      {result.nationalTurnout.toFixed(1)}%
                    </span>
                    <span className="text-xs text-muted-foreground">baza {BASE_TURNOUT}%</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Zmieniaj suwakiem ogólnym lub w poszczególnych 41 okręgach na mapie.
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-surface p-3 sm:col-span-2 lg:col-span-1">
                  <span className="text-xs font-semibold text-muted-foreground">Szacunkowa liczba oddanych głosów</span>
                  <div className="mt-1 flex items-baseline justify-between gap-2">
                    <span className="font-mono text-xl font-bold text-ink">
                      {Math.round(result.totalVotes).toLocaleString("pl-PL")}
                    </span>
                    <span className="text-xs text-muted-foreground">ważnych głosów</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Obliczana ze wzoru: uprawnieni × frekwencja. Dzielona na partie według ich poparcia.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <TurnoutGroups settings={scenario.parties} onMove={setTurnoutSide} embedded />
            </div>
          </div>
        </section>
        </CollapsibleSection>

        {/* KOALICJE */}
        <CollapsibleSection title="Koalicje i większość">
        <section>
          <CoalitionBuilder
            coalitions={scenario.coalitions}
            seatsByParty={result.seatsByParty}
            qualified={result.qualified}
            onChange={(next: Coalition[]) => setScenario((s) => ({ ...s, coalitions: next }))}
            onHover={(members) => setHighlight(members ? new Set(members) : null)}
          />
        </section>
        </CollapsibleSection>

        <CollapsibleSection title="Progi wyborcze">
        <section>
          <div className="panel p-5">
            <h2 className="font-display text-xl font-bold text-ink">Partie i progi</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Komitet partyjny 5%, koalicyjny 8%, mniejszość narodowa bez progu.
            </p>
            <div className="mt-4 space-y-2">
              {resultParties().map((p) => {
                const s = scenario.parties[p.id] ?? DEFAULT_SETTINGS;
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
                          onClick={() => {
                            track({ event: "threshold_change", meta: `${p.id}:${t}` });
                            setScenario((sc) => ({
                              ...sc,
                              parties: {
                                ...sc.parties,
                                [p.id]: { ...(sc.parties[p.id] ?? DEFAULT_SETTINGS), threshold: t },
                              },
                            }));
                          }}
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
                        aria-label={`${p.short} startuje w wyborach`}
                        onCheckedChange={(v) => {
                          track({ event: "party_toggle", meta: `${p.id}:${v ? "on" : "off"}` });
                          setScenario((sc) => ({
                            ...sc,
                            parties: { ...sc.parties, [p.id]: { ...(sc.parties[p.id] ?? DEFAULT_SETTINGS), enabled: v } },
                          }));
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
        </CollapsibleSection>

        <CollapsibleSection title="Wyniki dawnych wyborów" defaultOpen={false} className="pb-2">
          <div className="space-y-6">
            <HistoricalResults />
            <HistoricalDistrictResults />
          </div>
        </CollapsibleSection>

        <section className="grid gap-6 border-y border-border bg-surface/80 px-5 py-8 backdrop-blur-sm md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="eyebrow">Autor projektu</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-ink">Iwo Laskowski, JIFO</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Twórca z Gdyni łączący ekonomię z technologią. Zajmuje się rozwiązaniami webowymi,
              DevOps, UI/UX i fotografią. Rozwija projekty cyfrowe pod marką JIFO.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SupportButton size="default" />
            <Button asChild>
              <Link to="/o-projekcie">
                O projekcie <Info className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <footer className="border-t border-border bg-background/90 px-5 py-6 text-xs leading-relaxed text-muted-foreground">
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
          <a
            href="https://ewybory.eu/sondaze/"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center font-semibold text-primary hover:underline"
          >
            Sprawdź aktualne sondaże na ewybory.eu <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </a>
        </footer>

      </main>
    </div>
  );
}
