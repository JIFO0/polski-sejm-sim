import { useTranslation } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  ArrowRight,
  Calculator,
  ChevronDown,
  ChevronUp,
  Download,
  Info,
  Layers,
  MapPin,
  PieChart,
  RotateCcw,
  Scale,
  Settings2,
  Share2,
  Sparkles,
  TrendingUp,
  Upload,
  Users,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { toast } from "sonner";

import { LogoMark } from "@/components/Logos";
import { FloatingNav } from "@/components/FloatingNav";
import { SupportButton } from "@/components/SupportButton";

import { DISTRICTS } from "@/data/districts";
import {
  MERGED_INTO,
  PARTIES,
  PARTY_MAP,
  resultParties,
  supportParties,
  syncCustomEntities,
  type Party,
} from "@/data/parties";
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
  type PartySettings,
} from "@/lib/simulation";
import {
  isScenarioModified,
  nationalSharesOf,
  track,
  trackPageViewOncePerSession,
} from "@/lib/analytics";
import { ParticleField } from "@/components/ParticleField";
import { PolandMap, type MapMode } from "@/components/PolandMap";
import { Hemicycle } from "@/components/Hemicycle";
import { DistrictPanel } from "@/components/DistrictPanel";
import { CoalitionBuilder } from "@/components/CoalitionBuilder";
import { ScenarioShelf } from "@/components/ScenarioShelf";
import { TurnoutGroups } from "@/components/TurnoutGroups";
import { HistoricalResults } from "@/components/HistoricalResults";
import { HistoricalDistrictResults } from "@/components/HistoricalDistrictResults";
import { OwnWorkNotice } from "@/components/OwnWorkNotice";
import { PollSourcesPanel } from "@/components/PollSourcesPanel";
import { PartyLogo } from "@/components/PartyLogo";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { AccessibilityMenu } from "@/components/AccessibilityMenu";
import { ShareInput } from "@/components/ShareInput";
import { SocialExportButton } from "@/components/SocialExportButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TITLE = "SejmSim 2.0 (Preview) – Uporządkowany symulator Sejmu";
const DESC = "Wersja poglądowa SejmSim 2.0 ze zoptymalizowanym interfejsem, zakładkami i pływającym paskiem akcji.";

const blankState = (id: number): DistrictState => {
  const base = DISTRICTS.find((d) => d.id === id);
  return { shares: { ...(base?.base ?? {}) }, turnout: BASE_TURNOUT };
};

const DEFAULT_SETTINGS = { threshold: 5 as const, turnoutSensitivity: 0, enabled: true };
const isParty = (party: Party | undefined): party is Party => Boolean(party);

export const Route = createFileRoute("/preview")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://sejmsim.pl/preview" }],
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PreviewIndex,
});

function PreviewIndex() {
  const tr = useTranslation();
  const [scenario, setScenario] = useState<Scenario>(() => defaultScenario());
  const [initialScenarioKey] = useState(() => {
    const { name: _n, author: _a, description: _d, ...rest } = defaultScenario();
    return JSON.stringify(rest);
  });
  const scenarioChanged = useMemo(() => {
    const { name: _n, author: _a, description: _d, ...rest } = scenario;
    return JSON.stringify(rest) !== initialScenarioKey;
  }, [scenario, initialScenarioKey]);

  const [selected, setSelected] = useState<number | null>(null);
  const [mode, setMode] = useState<MapMode>("winner");
  const [focusParty, setFocusParty] = useState("ko");
  const [highlight, setHighlight] = useState<Set<string> | null>(null);
  const [displayOrder, setDisplayOrder] = useState(() =>
    PARTIES.filter((party) => party.id !== "inne").map((party) => party.id),
  );
  const [showVotes, setShowVotes] = useState(false);
  const [showAllParties, setShowAllParties] = useState(false);
  const [activeTab, setActiveTab] = useState("coalitions");
  const [isScrolled, setIsScrolled] = useState(false);

  const [nationalElectorateInput, setNationalElectorateInput] = useState(() =>
    String(DISTRICTS.reduce((acc, d) => acc + d.electorate, 0)),
  );
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    trackPageViewOncePerSession();
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 480);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
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
        (a, b) =>
          (result.seatsByParty[b.id] ?? 0) - (result.seatsByParty[a.id] ?? 0) ||
          (result.nationalShares[b.id] ?? 0) - (result.nationalShares[a.id] ?? 0),
      ),
    [result, registryVersion],
  );

  const displayedParties = useMemo(() => {
    const allowed = supportParties();
    const allowedIds = new Set(allowed.map((p) => p.id));
    const ordered = displayOrder
      .filter((id) => allowedIds.has(id))
      .map((id) => PARTY_MAP[id])
      .filter(isParty);
    const seen = new Set(ordered.map((p) => p.id));
    return [...ordered, ...allowed.filter((p) => !seen.has(p.id))];
  }, [displayOrder, registryVersion]);

  const { primaryParties, secondaryParties } = useMemo(() => {
    // Pierwsze 6 partii lub mające mandaty > 0
    const mainList: Party[] = [];
    const restList: Party[] = [];

    displayedParties.forEach((p, idx) => {
      const seats = result.seatsByParty[p.id] ?? 0;
      const share = result.nationalShares[p.id] ?? 0;
      if (idx < 6 || seats > 0 || share >= 3) {
        mainList.push(p);
      } else {
        restList.push(p);
      }
    });

    return { primaryParties: mainList, secondaryParties: restList };
  }, [displayedParties, result]);

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
        DISTRICTS.reduce((total, district) => {
          const el = scenario.districts[district.id]?.electorate ?? district.electorate;
          return total + (scenario.districts[district.id]?.shares[party.id] ?? 0) * el;
        }, 0) / (weight > 0 ? weight : 1),
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
        districts: {
          ...s.districts,
          [id]: { shares, turnout: BASE_TURNOUT, electorate: base.electorate },
        },
      };
    });
  }, []);

  const partyTrackRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const nationalSwing = useCallback((pid: string, target: number) => {
    if (partyTrackRef.current[pid]) clearTimeout(partyTrackRef.current[pid]);
    partyTrackRef.current[pid] = setTimeout(
      () => track({ event: "party_slider_adjust", meta: pid }),
      1500,
    );

    setScenario((s) => {
      const current = DISTRICTS.reduce(
        (acc, d) =>
          acc +
          (s.districts[d.id]?.shares[pid] ?? 0) * (s.districts[d.id]?.electorate ?? d.electorate),
        0,
      );
      const weight = DISTRICTS.reduce(
        (acc, d) => acc + (s.districts[d.id]?.electorate ?? d.electorate),
        0,
      );
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
                id === pid
                  ? targetHere
                  : MERGED_INTO[id]
                    ? 0
                    : otherTotal > 0
                      ? share * ((100 - targetHere) / otherTotal)
                      : share,
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
    turnoutTrackRef.current = setTimeout(
      () => track({ event: "turnout_set", turnout: value }),
      1500,
    );
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
    const target = Math.round(totalTarget);
    if (target <= 0 || baseTotal <= 0) return;

    const items = DISTRICTS.map((d) => {
      const raw = (d.electorate * target) / baseTotal;
      const floor = Math.floor(raw);
      return { id: d.id, floor, rem: raw - floor };
    });
    const currentSum = items.reduce((sum, item) => sum + item.floor, 0);
    const needed = target - currentSum;
    const sorted = [...items].sort((a, b) => b.rem - a.rem || a.id - b.id);
    const bonusIds = new Set(sorted.slice(0, needed).map((item) => item.id));

    setScenario((s) => {
      const districts = { ...s.districts };
      for (const item of items) {
        const cur = districts[item.id] ?? blankState(item.id);
        const assigned = item.floor + (bonusIds.has(item.id) ? 1 : 0);
        districts[item.id] = { ...cur, electorate: assigned };
      }
      return { ...s, districts };
    });
    setNationalElectorateInput(String(target));
    toast.success(`Zaktualizowano uprawnionych: ${target.toLocaleString("pl-PL")}`);
  }, []);

  const applyNationalElectorate = useCallback(() => {
    const clean = nationalElectorateInput.trim().replace(/\s+/g, "").replace(",", ".");
    const num = parseFloat(clean);
    if (isNaN(num)) {
      toast.error("Wprowadź prawidłową liczbę wyborców.");
      return;
    }
    let val: number;
    if (num > 0 && num <= 60) {
      val = Math.round(num * 1_000_000);
    } else if (num >= 1_000_000 && num <= 60_000_000) {
      val = Math.round(num);
    } else {
      toast.error("Wprowadź prawidłową liczbę wyborców (1 mln do 60 mln).");
      return;
    }
    setGlobalElectorate(val);
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
    toast.info(`Przywrócono domyślne ${baseTotal.toLocaleString("pl-PL")}`);
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
      toast.error("Nie udało się wczytać pliku.");
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
    <div className="relative min-h-dvh overflow-x-hidden pb-24">
      <ParticleField className="pointer-events-none fixed inset-0 z-0 h-dvh w-screen" />
      <FloatingNav mode="simulator" />

      {/* STICKY TOP MINI-BAR (Widoczny po przewinięciu hemicyklu) */}
      <div
        className={`fixed top-0 left-0 right-0 z-40 border-b border-border bg-surface/90 backdrop-blur-md transition-all duration-300 ${
          isScrolled ? "translate-y-0 opacity-100 shadow-md" : "-translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <LogoMark size={28} className="shrink-0" />
            <span className="font-display font-bold text-sm tracking-tight hidden sm:inline">SejmSim 2.0</span>
          </div>

          {/* Mini stacked bar z podziałem mandatów */}
          <div className="flex-1 max-w-md mx-2">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/60">
              {Object.entries(result.seatsByParty)
                .filter(([, s]) => s > 0)
                .sort((a, b) => b[1] - a[1])
                .map(([pid, seats]) => (
                  <div
                    key={pid}
                    style={{
                      width: `${(seats / 460) * 100}%`,
                      background: PARTY_MAP[pid]?.color ?? "#888",
                    }}
                    title={`${PARTY_MAP[pid]?.short ?? pid}: ${seats}`}
                  />
                ))}
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 font-semibold">
              <span className="h-2 w-2 rounded-full" style={{ background: leader?.color }} />
              <span className="text-ink">{leader?.short}:</span>
              <span className="font-mono text-primary font-bold">{result.seatsByParty[leader?.id ?? ""] ?? 0}</span>
            </div>
            <span className="text-muted-foreground hidden md:inline">|</span>
            <span className="text-muted-foreground hidden md:inline">
              Większość: <strong className="text-ink">231</strong>
            </span>
          </div>
        </div>
      </div>

      {/* HEADER & COCKPIT */}
      <header className="relative z-10 border-b border-border bg-surface/80 backdrop-blur-[2px]">
        <div className="relative mx-auto flex max-w-[1400px] flex-col gap-6 px-4 py-8 md:px-6 md:py-10">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                PREVIEW 2.0
              </span>
              <span className="text-xs text-muted-foreground">Koncepcja zoptymalizowanego interfejsu</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild className="h-7 text-xs text-primary">
                <Link to="/">
                  Wróć do wersji standardowej
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
              <LanguageToggle />
              <ThemeToggle />
              <AccessibilityMenu />
            </div>
          </div>

          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.95fr)]">
            {/* Lewa kolumna: Tytuł + Hemicykl */}
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl md:text-5xl">
                  SejmSim<span className="text-primary">.</span>
                </h1>
                <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                  Ustaw poparcie partii, twórz koalicje i sprawdzaj mandaty D'Hondta. Dół strony uporządkowano w wygodne zakładki robocze.
                </p>
              </div>

              {/* Karta Hemicyklu */}
              <div
                className="panel-float leader-tint w-full p-5"
                style={{ "--leader-color": leader?.color ?? "var(--border)" } as CSSProperties}
              >
                <div className="flex items-baseline justify-between">
                  <h2 className="font-display text-lg font-bold text-ink">Skład parlamentu</h2>
                  <p className="num text-xs text-muted-foreground">
                    frekwencja {result.nationalTurnout.toFixed(1)}%
                  </p>
                </div>

                <Hemicycle seatsByParty={result.seatsByParty} highlight={highlight ?? undefined} />

                {/* Pigułki partii */}
                <ul className="mt-3 flex flex-wrap gap-x-2.5 gap-y-1.5" aria-label="Legenda partii">
                  {Object.entries(result.seatsByParty)
                    .filter(([, seats]) => seats > 0)
                    .sort((a, b) => b[1] - a[1])
                    .map(([id, seats]) => (
                      <li
                        key={id}
                        className="inline-flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-0.5 text-xs"
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: PARTY_MAP[id]?.color ?? "#94A3B8" }}
                        />
                        <span className="font-semibold text-ink">{PARTY_MAP[id]?.short ?? id}</span>
                        <span className="num font-bold text-primary">{seats}</span>
                      </li>
                    ))}
                </ul>

                <div className="mt-4 flex items-end justify-between border-t border-border/60 pt-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Największy klub</p>
                    <p className="font-display text-lg font-bold" style={{ color: leader?.color }}>
                      {leader?.short}: {result.seatsByParty[leader?.id ?? ""] ?? 0}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="num text-xs text-muted-foreground flex items-center justify-end gap-1.5">
                      <span>Większość: <strong>{MAJORITY} mandatów</strong></span>
                      {result.demographicAdjustmentActive && (
                        <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          PKW ±11
                        </span>
                      )}
                    </p>
                    <Link
                      to="/metoda-dhondta"
                      className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                    >
                      <Calculator className="h-3 w-3" />
                      <span>Metoda D'Hondta</span>
                    </Link>
                  </div>
                </div>

                {!scenarioChanged && <OwnWorkNotice className="mt-3" />}
              </div>
            </div>

            {/* Prawa kolumna: Półka scenariuszy */}
            <div className="space-y-4">
              <ScenarioShelf
                scenario={scenario}
                onLoad={loadScenario}
                onMetadataChange={(metadata) => setScenario((current) => ({ ...current, ...metadata }))}
              />
            </div>
          </div>
        </div>
      </header>

      {/* GŁÓWNA TREŚĆ */}
      <main className="relative z-10 mx-auto max-w-[1400px] space-y-8 px-4 py-8 md:px-6">

        {/* SEKCJA 1: KOMPAKTOWE SUWAKI POPARCIA */}
        <section className="panel p-5 md:p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-bold text-ink">Poparcie ogólnokrajowe</h2>
                <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  Główny pulpit
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Przesuwaj suwaki, aby w czasie rzeczywistym zmieniać podział mandatów w okręgach.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant={showVotes ? "secondary" : "outline"}
                size="sm"
                className="h-8 gap-1.5 px-2.5 text-xs font-semibold"
                onClick={() => setShowVotes(!showVotes)}
              >
                <Users className="h-3.5 w-3.5 text-primary" />
                <span>{showVotes ? "Ukryj głosy" : "Liczba głosów"}</span>
              </Button>

              <label className="flex items-center gap-2 cursor-pointer text-xs rounded-md border border-border bg-surface px-2.5 py-1">
                <Checkbox
                  checked={scenario.independentSupport ?? false}
                  onCheckedChange={(checked) => {
                    track({
                      event: "independent_mode",
                      meta: checked === true ? "wlaczony" : "wylaczony",
                    });
                    setScenario((current) => ({
                      ...current,
                      independentSupport: checked === true,
                    }));
                  }}
                  className="h-4 w-4"
                />
                <span className="font-semibold text-ink">Tryb niezależny</span>
              </label>
            </div>
          </div>

          {scenario.independentSupport && (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2 text-xs">
              <span className="font-medium text-ink">Głosy nieprzypisane w kraju:</span>
              <span className="font-mono text-sm font-bold text-primary">
                {unassignedShare.toFixed(1)}%
              </span>
            </div>
          )}

          {/* Siatka suwaków partii */}
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {(showAllParties ? displayedParties : primaryParties).map((p) => {
              const share = scenario.independentSupport
                ? (nationalRawShares[p.id] ?? 0)
                : (result.nationalShares[p.id] ?? 0);
              const seats = result.seatsByParty[p.id] ?? 0;
              const votes = Math.round(result.nationalVotes[p.id] ?? 0);
              const settings = scenario.parties[p.id] ?? DEFAULT_SETTINGS;
              const inSejm = result.qualified.includes(p.id);
              const mergerDef = scenario.mergers?.find((m) => m.id === p.id);

              return (
                <div
                  key={p.id}
                  className="rounded-lg border border-border/80 bg-surface/60 p-3 transition-colors hover:border-border"
                  onMouseEnter={() => setHighlight(new Set([p.id]))}
                  onMouseLeave={() => setHighlight(null)}
                >
                  <div className="flex items-center gap-2.5">
                    <PartyLogo id={p.id} size={26} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-bold">{p.short}</p>
                        <span
                          className={`rounded px-1.5 py-0.2 text-[10px] font-semibold ${
                            inSejm ? "bg-muted text-foreground" : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {mergerDef ? "Koalicja" : `${settings.threshold}%`}
                        </span>
                      </div>
                      {showVotes && (
                        <p className="text-[11px] font-mono text-muted-foreground">
                          {votes.toLocaleString("pl-PL")} głosów
                        </p>
                      )}
                    </div>

                    <ShareInput
                      value={share}
                      onChange={(next) => nationalSwing(p.id, next)}
                      label={`Poparcie ${p.name}`}
                      max={scenario.independentSupport ? share + unassignedShare : 100}
                    />

                    <span
                      className="num w-11 rounded-md bg-ink/10 py-1 text-center text-sm font-bold text-ink shrink-0"
                      title={`${seats} mandatów`}
                    >
                      {seats}
                    </span>
                  </div>

                  <Slider
                    className="mt-2.5"
                    aria-label={`Poparcie ${p.name} w kraju`}
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

          {/* Przycisk rozwijania pozostałych partii */}
          {secondaryParties.length > 0 && (
            <div className="mt-4 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllParties(!showAllParties)}
                className="gap-2 text-xs font-semibold text-muted-foreground hover:text-ink"
              >
                {showAllParties ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Zwiń mniejsze ugrupowania
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Pokaż pozostałe ugrupowania ({secondaryParties.length})
                  </>
                )}
              </Button>
            </div>
          )}
        </section>

        {/* SEKCJA 2: ZAKŁADKI ROBOCZE (TABS) */}
        <section className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto p-1.5 bg-surface-strong/60 backdrop-blur-sm border border-border/80 rounded-xl">
              <TabsTrigger
                value="coalitions"
                className="flex items-center gap-2 py-2.5 text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Layers className="h-3.5 w-3.5 text-primary" />
                <span>1. Koalicje i większość</span>
              </TabsTrigger>
              <TabsTrigger
                value="map"
                className="flex items-center gap-2 py-2.5 text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span>2. Mapa okręgów</span>
              </TabsTrigger>
              <TabsTrigger
                value="polls"
                className="flex items-center gap-2 py-2.5 text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                <span>3. Sondaże i źródła</span>
              </TabsTrigger>
              <TabsTrigger
                value="advanced"
                className="flex items-center gap-2 py-2.5 text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Settings2 className="h-3.5 w-3.5 text-primary" />
                <span>4. Zaawansowane</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: KOALICJE */}
            <TabsContent value="coalitions" className="space-y-4 pt-2">
              <CoalitionBuilder
                coalitions={scenario.coalitions}
                seatsByParty={result.seatsByParty}
                qualified={result.qualified}
                onChange={(next: Coalition[]) => setScenario((s) => ({ ...s, coalitions: next }))}
                onHover={(members) => setHighlight(members ? new Set(members) : null)}
              />
            </TabsContent>

            {/* TAB 2: MAPA 41 OKRĘGÓW */}
            <TabsContent value="map" className="space-y-4 pt-2">
              <div className="panel p-4 md:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-bold text-ink">41 okręgów wyborczych</h2>
                    <p className="text-xs text-muted-foreground">
                      Wybierz okręg na mapie, aby precyzyjnie dostroić lokalne wyniki i frekwencję.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex rounded-lg border border-border p-0.5">
                      <button
                        onClick={() => {
                          setMode("winner");
                          track({ event: "map_mode_change", meta: "zwyciezca" });
                        }}
                        className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
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
                        className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                          mode === "party" ? "bg-ink text-background" : "text-muted-foreground"
                        }`}
                      >
                        Jedna partia
                      </button>
                      <button
                        onClick={() => {
                          setMode("adjustment");
                          track({ event: "map_mode_change", meta: "korekta_okregow" });
                        }}
                        className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                          mode === "adjustment" ? "bg-ink text-background" : "text-muted-foreground"
                        }`}
                      >
                        Korekta PKW
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                  <div>
                    {mode === "party" && (
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        {resultParties().map((p) => (
                          <button
                            key={p.id}
                            onClick={() => setFocusParty(p.id)}
                            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                              focusParty === p.id
                                ? "border-transparent text-white"
                                : "border-border text-muted-foreground hover:border-ink/30"
                            }`}
                            style={focusParty === p.id ? { background: p.color } : undefined}
                          >
                            <PartyLogo id={p.id} size={14} />
                            {p.short}
                          </button>
                        ))}
                      </div>
                    )}

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
                  </div>

                  <div className="min-h-[480px]">
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
                      <div className="panel h-full p-5 flex flex-col justify-center items-center text-center text-muted-foreground border-dashed">
                        <MapPin className="h-10 w-10 text-muted-foreground/40 mb-3" />
                        <h3 className="font-display font-bold text-base text-ink">Brak zaznaczonego okręgu</h3>
                        <p className="text-xs max-w-xs mt-1">
                          Kliknij dowolny okręg na mapie obok, aby sprawdzić podział mandatów, kandydatów i frekwencję w tym rejonie.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: SONDAŻE I ŹRÓDŁA */}
            <TabsContent value="polls" className="space-y-4 pt-2">
              <PollSourcesPanel />
            </TabsContent>

            {/* TAB 4: ZAAWANSOWANE (FREKWENCJA, PKW, WŁASNE LISTY, HISTORIA) */}
            <TabsContent value="advanced" className="space-y-6 pt-2">
              {/* Frekwencja */}
              <div className="panel p-5 md:p-6">
                <h3 className="font-display text-lg font-bold text-ink">Frekwencja i elektorat</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ustaw uprawnionych do głosowania oraz ogólnokrajową frekwencję.
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-lg border border-border bg-surface p-3">
                    <span className="text-xs font-semibold text-muted-foreground">Uprawnieni w kraju</span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="font-mono text-lg font-bold text-ink">
                        {Math.round(result.totalElectorate).toLocaleString("pl-PL")}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        type="text"
                        value={nationalElectorateInput}
                        onChange={(e) => setNationalElectorateInput(e.target.value)}
                        placeholder="np. 28.5"
                        className="h-8 text-xs font-mono"
                      />
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={applyNationalElectorate}>
                        Zmień
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" onClick={resetGlobalElectorate}>
                        Reset
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-surface p-3">
                    <span className="text-xs font-semibold text-muted-foreground">Średnia frekwencja</span>
                    <div className="mt-1">
                      <span className="font-mono text-xl font-bold text-primary">
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

                  <div className="rounded-lg border border-border bg-surface p-3 sm:col-span-2 lg:col-span-1">
                    <span className="text-xs font-semibold text-muted-foreground">Korekta demograficzna PKW</span>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs">Aktualizacja mandatów (±11)</span>
                      <Switch
                        checked={Boolean(scenario.demographicAdjustment)}
                        onCheckedChange={(checked) => {
                          setScenario((s) => ({
                            ...s,
                            demographicAdjustment: checked ? "pkw" : undefined,
                          }));
                          if (checked) toast.success("Włączono korektę demograficzną PKW");
                          else toast.info("Przywrócono standardowy podział");
                        }}
                      />
                    </div>
                    <Link
                      to="/korekta-okregow"
                      className="mt-3 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                    >
                      <Info className="h-3 w-3" />
                      Więcej o wniosku PKW
                    </Link>
                  </div>
                </div>

                <div className="mt-6 border-t border-border pt-4">
                  <TurnoutGroups settings={scenario.parties} onMove={setTurnoutSide} embedded />
                </div>
              </div>

              {/* Własne partie i wspólne listy */}
              <div className="panel p-5 md:p-6">
                <CustomPartiesPanel
                  scenario={scenario}
                  setScenario={setScenario}
                  onLogoChange={() => setLogoVersion((v) => v + 1)}
                />
              </div>

              {/* Dawne wybory */}
              <div className="panel p-5 md:p-6">
                <h3 className="font-display text-lg font-bold text-ink mb-4">Wyniki dawnych wyborów PKW</h3>
                <HistoricalResults />
                <div className="mt-6">
                  <HistoricalDistrictResults />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </section>

        {/* STOPKA INFORMACYJNA */}
        <footer className="border-t border-border pt-6 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p>SejmSim 2.0 (Wersja poglądowa UI). Kalkulacja metodą D'Hondta w 41 okręgach wyborczych.</p>
            <div className="flex flex-wrap gap-4 font-medium">
              <Link to="/metoda-dhondta" className="text-primary hover:underline">Metoda D'Hondta</Link>
              <Link to="/korekta-okregow" className="text-primary hover:underline">Korekta okręgów</Link>
              <Link to="/zrodla" className="text-primary hover:underline">Zasady i źródła</Link>
              <Link to="/o-projekcie" className="text-primary hover:underline">O projekcie</Link>
            </div>
          </div>
        </footer>
      </main>

      {/* FLOATING ACTION BAR (Dok na dole ekranu zoptymalizowany pod kciuk na telefonie) */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border border-border/80 bg-surface/95 px-4 py-2 shadow-2xl backdrop-blur-md">
        <Button
          size="sm"
          variant="default"
          className="rounded-full shadow-sm h-8 px-3 text-xs font-semibold gap-1.5"
          onClick={save}
        >
          <Download className="h-3.5 w-3.5" />
          <span>Pobierz</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="rounded-full h-8 px-3 text-xs font-semibold gap-1.5"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5" />
          <span>Wczytaj</span>
        </Button>

        <SocialExportButton scenario={scenario} compact />

        <Button
          size="sm"
          variant="ghost"
          className="rounded-full h-8 px-2.5 text-xs text-muted-foreground hover:text-ink"
          onClick={() => {
            setScenario(defaultScenario());
            toast.info("Przywrócono stan wyjściowy");
          }}
          title="Resetuj do stanu domyślnego"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline ml-1">Reset</span>
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
  );
}
