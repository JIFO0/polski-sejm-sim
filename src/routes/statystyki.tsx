import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Calendar,
  Clock,
  Coffee,
  Database,
  HardDrive,
  Info,
  Laptop,
  Link2,
  Loader2,
  Mail,
  MapPin,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { getAnalyticsSummary, clearAllAnalyticsData } from "@/lib/analytics.functions";
import { deactivateShare, listShares } from "@/lib/shares.functions";
import { EVENT_LABELS } from "@/lib/analytics-events";
import { PARTIES } from "@/data/parties";

const TITLE = "Statystyki SejmSim 2027";
const DESCRIPTION = "Anonimowe, zbiorcze statystyki korzystania z symulatora SejmSim 2027.";

export const Route = createFileRoute("/statystyki")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StatsPage,
});

type ShareRow = { id: string; name: string; active: boolean; views: number; created_at: string; expires_at: string };
type Summary = Extract<Awaited<ReturnType<typeof getAnalyticsSummary>>, { ok: true }>;

const PARTY_NAMES = Object.fromEntries(PARTIES.map((p) => [p.id, p.name]));
const PARTY_SHORTS = Object.fromEntries(PARTIES.map((p) => [p.id, p.short]));
const PARTY_COLORS = Object.fromEntries(PARTIES.map((p) => [p.id, p.color]));

function formatCoalition(membersStr: string) {
  const pids = membersStr.split("+");
  return pids.map((pid) => PARTY_SHORTS[pid] ?? pid).join(" + ");
}

function getPolishWeekday(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T12:00:00Z");
    const name = new Intl.DateTimeFormat("pl-PL", { weekday: "short" }).format(d);
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return "";
  }
}

function StatsPage() {
  const [login, setLogin] = useState("JIFO");
  const [key, setKey] = useState("");
  const [shares, setShares] = useState<ShareRow[]>([]);
  const fetchShares = useServerFn(listShares);
  const deactivate = useServerFn(deactivateShare);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const fetchSummary = useServerFn(getAnalyticsSummary);
  const clearDataFn = useServerFn(clearAllAnalyticsData);

  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearPassword, setClearPassword] = useState("");
  const [clearing, setClearing] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const creds = { login: login.trim(), key: key.trim() };
      const [res, sh] = await Promise.all([fetchSummary({ data: creds }), fetchShares({ data: creds })]);
      if (sh.ok) setShares(sh.shares);
      if (!res.ok) {
        setError(res.error);
        setSummary(null);
      } else {
        setSummary(res);
        if (res.visitsByMonth.length > 0 && selectedMonth === "all") {
          // Domyślnie ustawiamy bieżący miesiąc
          setSelectedMonth(res.visitsByMonth[0]?.month ?? "all");
        }
      }
    } catch {
      setError("Nie udało się pobrać statystyk.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clearPassword.trim()) return;
    setClearing(true);
    try {
      const res = await clearDataFn({
        data: {
          login: login.trim(),
          key: key.trim(),
          confirmPassword: clearPassword.trim(),
        },
      });
      if (!res.ok) {
        toast.error(res.error || "Błąd czyszczenia danych.");
        return;
      }
      toast.success(
        `Wyczyszczono bazę: usunięto ${res.result.deletedEvents} zdarzeń i ${res.result.deletedShares} linków.`
      );
      setClearDialogOpen(false);
      setClearPassword("");
      await load();
    } catch {
      toast.error("Wystąpił błąd podczas usuwania danych.");
    } finally {
      setClearing(false);
    }
  };

  const hoursData = useMemo(() => {
    if (!summary) return Array(24).fill(0);
    return summary.pageViewsByHourPolish ?? summary.pageViewsByHourUtc ?? Array(24).fill(0);
  }, [summary]);

  const maxHourly = useMemo(() => Math.max(1, ...hoursData), [hoursData]);
  const peakHour = useMemo(() => {
    let max = -1;
    let idx = 0;
    hoursData.forEach((count, h) => {
      if (count > max) {
        max = count;
        idx = h;
      }
    });
    return idx;
  }, [hoursData]);

  const activeMonthObj = useMemo(() => {
    if (!summary || selectedMonth === "all") return null;
    return summary.visitsByMonth.find((m) => m.month === selectedMonth) ?? null;
  }, [selectedMonth, summary]);

  const displayedDays = useMemo(() => {
    if (!summary) return [];
    if (activeMonthObj) return activeMonthObj.days;
    return summary.visitsByDay;
  }, [activeMonthObj, summary]);

  const maxDaily = useMemo(() => {
    if (!displayedDays.length) return 1;
    return Math.max(1, ...displayedDays.map((d) => d.count));
  }, [displayedDays]);

  return (
    <div className="min-h-dvh bg-background">
      <nav
        className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3.5"
        aria-label="Nawigacja strony statystyk"
      >
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Wróć do symulatora
          </Link>
        </Button>
      </nav>

      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-5 pb-16 pt-6">
        <header>
          <p className="eyebrow">Panel właściciela</p>
          <h1 className="font-display mt-1 text-3xl font-bold text-ink">
            <BarChart3 className="mr-2 inline h-7 w-7 align-[-0.15em]" /> Statystyki platformy SejmSim
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Zbiorcze, anonimowe dane odwiedzin i zachowań plaformy bez cookies, adresów IP i danych osobowych
          </p>
        </header>

        {!summary ? (
          <form
            className="panel flex max-w-md flex-col gap-3 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              void load();
            }}
          >
            <label htmlFor="stats-login" className="text-sm font-semibold text-foreground">
              Login
            </label>
            <Input id="stats-login" value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" />
            <label htmlFor="stats-key" className="text-sm font-semibold text-foreground">
              Hasło
            </label>
            <Input
              id="stats-key"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Wpisz hasło"
              autoComplete="current-password"
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={loading || !key.trim()} className="min-h-11">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Pokaż statystyki
            </Button>
          </form>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Główne karty podsumowania */}
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
              <div className="panel p-4">
                <p className="text-xs text-muted-foreground">Wejścia na stronę</p>
                <p className="num text-2xl font-bold text-ink mt-1">{summary.pageViews}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Wszystkie sesje</p>
              </div>

              <div className="panel p-4 border-amber-500/30 bg-amber-500/5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Buy Me a Coffee</p>
                  <Coffee className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="num text-2xl font-bold text-amber-950 dark:text-amber-100 mt-1">
                  {summary.supportClicks}
                </p>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-0.5">
                  Kliknięcia w link wsparcia
                </p>
              </div>

              <div className="panel p-4 border-sky-500/30 bg-sky-500/5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-sky-800 dark:text-sky-300">Kontakt (jifo.dev)</p>
                  <Mail className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                </div>
                <p className="num text-2xl font-bold text-sky-950 dark:text-sky-100 mt-1">
                  {summary.contactClicks}
                </p>
                <p className="text-[11px] text-sky-700/80 dark:text-sky-300/80 mt-0.5">
                  Przejścia do kontaktu
                </p>
              </div>

              <div className="panel p-4 border-indigo-500/30 bg-indigo-500/5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-indigo-800 dark:text-indigo-300">O projekcie</p>
                  <Info className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <p className="num text-2xl font-bold text-indigo-950 dark:text-indigo-100 mt-1">
                  {summary.aboutViews}
                </p>
                <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80 mt-0.5">
                  Odwiedziny podstrony
                </p>
              </div>
            </section>

            {/* Druga linia podsumowania */}
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="panel p-4">
                <p className="text-xs text-muted-foreground">Zapisane warianty</p>
                <p className="num text-2xl font-bold text-ink mt-1">{summary.scenarioSaves}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">W bibliotece</p>
              </div>
              <div className="panel p-4">
                <p className="text-xs text-muted-foreground">Pobrane pliki</p>
                <p className="num text-2xl font-bold text-ink mt-1">{summary.scenarioDownloads}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Eksporty JSON</p>
              </div>
              <div className="panel p-4">
                <p className="text-xs text-muted-foreground">Aktywne linki (max 5/IP)</p>
                <p className="num text-2xl font-bold text-ink mt-1">{summary.activeShares}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Ważność 7 dni</p>
              </div>
              <div className="panel p-4">
                <p className="text-xs text-muted-foreground">Wszystkie akcje w bazie</p>
                <p className="num text-2xl font-bold text-ink mt-1">{summary.totalEvents}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Zapisane bezterminowo</p>
              </div>
            </section>

            {/* Stan magazynu i limit 4GB */}
            <section className="panel p-5 bg-surface/90 border-border">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <HardDrive className="h-5 w-5 text-primary" />
                  <div>
                    <h2 className="font-display text-base font-bold text-ink">Magazyn lokalny & Limit rozmiaru 4 GB</h2>
                    <p className="text-xs text-muted-foreground">Baza SQLite na urządzeniu/serwerze, bezterminowa retencja</p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" /> Limit 4 GB aktywny: {summary.dbStats.sizeFormatted}
                </div>
              </div>
            </section>

            {/* WYKRES: WEJŚCIA WG GODZINY (CZAS POLSKI) */}
            <section className="panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" /> Wejścia według godziny (czas polski)
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Rozkład godzinowy wszystkich wizyt (strefa Europe/Warsaw, 00:00 – 23:59).
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-md bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground">
                  <span>Szczyt:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {peakHour}:00 ({hoursData[peakHour] ?? 0} wizyt)
                  </span>
                </div>
              </div>

              {/* Interaktywny wykres słupkowy 24h z tłem kolumn */}
              <div className="mt-6 flex h-48 items-end gap-1 sm:gap-1.5 pt-6 pb-2 border-b border-border/50">
                {hoursData.map((count, h) => {
                  const pct = Math.round((count / maxHourly) * 100);
                  const isPeak = count === maxHourly && count > 0;
                  const isHovered = hoveredHour === h;
                  return (
                    <div
                      key={h}
                      className="group relative flex flex-1 flex-col items-center h-full justify-end cursor-pointer"
                      onMouseEnter={() => setHoveredHour(h)}
                      onMouseLeave={() => setHoveredHour(null)}
                    >
                      {/* Etykieta tooltip nad słupkiem */}
                      <div
                        className={`absolute -top-7 z-20 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold shadow-md transition-all pointer-events-none ${
                          isHovered
                            ? "opacity-100 scale-100 bg-ink text-background"
                            : "opacity-0 scale-95"
                        }`}
                      >
                        {h}:00 — {count} {count === 1 ? "wejście" : "wejść"}
                      </div>

                      {/* Tło kolumny slotu godzinowego */}
                      <div className="w-full flex-1 flex items-end rounded-t bg-muted/30 border-x border-t border-border/20 overflow-hidden relative">
                        <div
                          className={`w-full rounded-t transition-all duration-300 ${
                            isPeak
                              ? "bg-amber-500 hover:bg-amber-400 dark:bg-amber-400"
                              : "bg-primary hover:bg-primary/80"
                          } ${isHovered ? "ring-2 ring-foreground/20 brightness-110" : ""}`}
                          style={{ height: count > 0 ? `${Math.max(8, pct)}%` : "0%" }}
                        />
                      </div>

                      {/* Etykieta godziny na osi X */}
                      <span
                        className={`num mt-1.5 text-[9px] sm:text-[10px] transition-colors ${
                          isHovered ? "font-bold text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {h % 3 === 0 ? `${h}h` : ""}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>00:00 (północ)</span>
                <span>12:00 (południe)</span>
                <span>23:00 (wieczór)</span>
              </div>
            </section>

            {/* WEJŚCIA WG DNIA (BIEŻĄCY I POPRZEDNIE MIESIĄCE) */}
            <section className="panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" /> Wejścia według dnia (w tym i poprzednich miesiącach)
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Przeglądaj dzienne natężenie ruchu z podziałem na miesiące kalendarzowe.
                  </p>
                </div>

                {/* Selektor miesięcy */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {summary.visitsByMonth.map((m, idx) => (
                    <Button
                      key={m.month}
                      variant={selectedMonth === m.month ? "default" : "outline"}
                      size="sm"
                      className="text-xs h-8"
                      onClick={() => setSelectedMonth(m.month)}
                    >
                      {m.label} {idx === 0 ? "(bieżący)" : ""} ({m.count})
                    </Button>
                  ))}
                  <Button
                    variant={selectedMonth === "all" ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => setSelectedMonth("all")}
                  >
                    Wszystkie miesiące ({summary.pageViews})
                  </Button>
                </div>
              </div>

              {/* Informacja o wybranym okresie */}
              <div className="mt-4 flex items-center justify-between rounded-lg bg-surface/70 border border-border/70 px-3.5 py-2 text-xs">
                <span className="text-muted-foreground">
                  Okres: <strong className="text-foreground">{activeMonthObj ? activeMonthObj.label : "Wszystkie zarejestrowane dni"}</strong>
                </span>
                <span className="font-semibold text-ink">
                  Łącznie wizyt w okresie: <span className="num text-primary font-bold text-sm">{displayedDays.reduce((acc, d) => acc + d.count, 0)}</span>
                </span>
              </div>

              {/* Wizualny wykres dzienny dla wybranego miesiąca */}
              {displayedDays.length > 0 && (
                <div className="mt-4 pt-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Wizualizacja natężenia dziennego
                  </p>
                  <div className="flex h-32 items-end gap-1 overflow-x-auto pb-2 border-b border-border/50">
                    {[...displayedDays].reverse().map(({ day, count }) => {
                      const pct = Math.round((count / maxDaily) * 100);
                      const isHovered = hoveredDay === day;
                      const dayNumber = day.slice(8);
                      const weekday = getPolishWeekday(day);
                      return (
                        <div
                          key={day}
                          className="group relative flex flex-1 min-w-[20px] max-w-[40px] flex-col items-center h-full justify-end cursor-pointer"
                          onMouseEnter={() => setHoveredDay(day)}
                          onMouseLeave={() => setHoveredDay(null)}
                        >
                          <div
                            className={`absolute -top-7 z-20 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold shadow-md transition-all pointer-events-none ${
                              isHovered ? "opacity-100 scale-100 bg-ink text-background" : "opacity-0 scale-95"
                            }`}
                          >
                            {day} ({weekday}): {count} {count === 1 ? "wejście" : "wejść"}
                          </div>

                          <div className="w-full flex-1 flex items-end rounded-t bg-muted/30 overflow-hidden relative">
                            <div
                              className="w-full rounded-t bg-primary transition-all duration-300 group-hover:bg-primary/80"
                              style={{ height: count > 0 ? `${Math.max(8, pct)}%` : "0%" }}
                            />
                          </div>

                          <span className={`num mt-1 text-[9px] ${isHovered ? "font-bold text-primary" : "text-muted-foreground"}`}>
                            {dayNumber}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tabela szczegółowa dni */}
              <div className="mt-4 max-h-72 overflow-y-auto rounded-lg border border-border/60">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 sticky top-0">
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="py-2 px-3 font-medium">Dzień</th>
                      <th className="py-2 px-3 font-medium">Dzień tygodnia</th>
                      <th className="py-2 px-3 font-medium">Wykres</th>
                      <th className="py-2 px-3 text-right font-medium">Wejścia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedDays.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-xs text-muted-foreground">
                          Brak zarejestrowanych wejść w tym okresie.
                        </td>
                      </tr>
                    ) : (
                      displayedDays.map(({ day, count }) => (
                        <tr key={day} className="border-t border-border/50 hover:bg-muted/20">
                          <td className="num py-2 px-3 font-medium text-foreground">{day}</td>
                          <td className="py-2 px-3 text-xs text-muted-foreground">{getPolishWeekday(day)}</td>
                          <td className="py-2 px-3">
                            <div className="h-2 w-32 max-w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${(count / maxDaily) * 100}%` }}
                              />
                            </div>
                          </td>
                          <td className="num py-2 px-3 text-right font-bold text-ink">{count}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Najczęściej sprawdzane okręgi */}
              <section className="panel p-5">
                <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" /> Najczęściej sprawdzane okręgi
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">Które z 41 okręgów wyborczych odwiedzający klikają najchętniej.</p>
                <div className="mt-4 flex flex-col gap-2">
                  {summary.topDistricts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Brak odnotowanych kliknięć w okręgi.</p>
                  ) : (
                    summary.topDistricts.map(({ name, count }) => {
                      const max = Math.max(1, ...summary.topDistricts.map((d) => d.count));
                      return (
                        <div key={name} className="flex items-center gap-3 text-xs">
                          <span className="w-36 shrink-0 truncate font-medium text-foreground">{name}</span>
                          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${(count / max) * 100}%` }} />
                          </div>
                          <span className="num w-10 text-right font-bold text-ink">{count}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              {/* Najczęściej testowane koalicje */}
              <section className="panel p-5">
                <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" /> Najczęściej testowane koalicje
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">Zestawienia partii sprawdzane w sekcji „Kto z kim?”.</p>
                <div className="mt-4 flex flex-col gap-2">
                  {summary.topCoalitions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Brak zarejestrowanych testów koalicji.</p>
                  ) : (
                    summary.topCoalitions.map(({ members, count, majority }) => (
                      <div key={members} className="flex items-center justify-between gap-2 border-b border-border/40 pb-2 text-xs">
                        <span className="font-semibold text-foreground truncate">{formatCoalition(members)}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${majority ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" : "bg-muted text-muted-foreground"}`}>
                            {majority ? "Większość (231+)" : "Brak większości"}
                          </span>
                          <span className="num font-bold text-ink">×{count}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Najczęściej modyfikowane partie */}
              <section className="panel p-5">
                <h2 className="font-display text-lg font-bold text-ink">Najczęściej modyfikowane partie</h2>
                <p className="mt-1 text-xs text-muted-foreground">O których partiach użytkownicy najczęściej zmieniają poparcie.</p>
                <div className="mt-4 flex flex-col gap-2">
                  {summary.partyAdjustments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Brak odnotowanych zmian suwaków.</p>
                  ) : (
                    summary.partyAdjustments.map(({ party, count }) => {
                      const max = Math.max(1, ...summary.partyAdjustments.map((p) => p.count));
                      return (
                        <div key={party} className="flex items-center gap-3 text-xs">
                          <span className="w-28 shrink-0 truncate font-medium text-foreground">{PARTY_NAMES[party] ?? party}</span>
                          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full" style={{ width: `${(count / max) * 100}%`, backgroundColor: PARTY_COLORS[party] ?? "var(--primary)" }} />
                          </div>
                          <span className="num w-10 text-right font-bold text-ink">{count}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              {/* Urządzenia i źródła wejść */}
              <section className="panel p-5">
                <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
                  <Laptop className="h-4 w-4 text-primary" /> Urządzenia i źródła wizyt
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">Anonimowy podział ekranów i domen odsyłających (bez linków i PII).</p>
                <div className="mt-4 space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Urządzenia</h3>
                    <div className="mt-2 flex flex-col gap-1.5">
                      {summary.deviceBreakdown.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Brak danych urządzeń.</p>
                      ) : (
                        summary.deviceBreakdown.map(({ device, count }) => (
                          <div key={device} className="flex justify-between border-b border-border/40 py-1 text-xs">
                            <span className="capitalize">{device}</span>
                            <span className="num font-semibold text-ink">{count}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Źródła wejść</h3>
                    <div className="mt-2 flex flex-col gap-1.5">
                      {summary.trafficSources.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Brak danych źródeł.</p>
                      ) : (
                        summary.trafficSources.map(({ source, count }) => (
                          <div key={source} className="flex justify-between border-b border-border/40 py-1 text-xs">
                            <span className="capitalize">{source}</span>
                            <span className="num font-semibold text-ink">{count}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Średnie poparcie w scenariuszach */}
            <section className="panel p-5">
              <h2 className="font-display text-lg font-bold text-ink">Średnie poparcie w tworzonych scenariuszach</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Na podstawie zapisywanych, pobieranych i udostępnianych scenariuszy (z wyłączeniem scenariusza domyślnego).
              </p>
              <div className="mt-4 flex flex-col gap-2">
                {summary.avgShares.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Brak zmodyfikowanych scenariuszy użytkowników.</p>
                ) : (
                  summary.avgShares.map(({ party, avg, count }) => (
                    <div key={party} className="flex items-center gap-3">
                      <span className="w-40 shrink-0 truncate text-sm text-foreground">
                        {PARTY_NAMES[party] ?? party}
                      </span>
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.min(100, avg)}%`, backgroundColor: PARTY_COLORS[party] ?? "var(--primary)" }}
                        />
                      </div>
                      <span className="num w-16 text-right text-sm font-semibold text-ink">
                        {avg.toFixed(1)}%
                      </span>
                      <span className="w-10 text-right text-xs text-muted-foreground">×{count}</span>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Frekwencja */}
            <section className="panel p-5">
              <h2 className="font-display text-lg font-bold text-ink">Frekwencja ustawiana przez odwiedzających</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {summary.avgTurnout !== null
                  ? `Średnia ustawiana frekwencja to ${summary.avgTurnout.toFixed(1)}% (z ${summary.turnoutSets} zmian).`
                  : "Nikt jeszcze nie zmienił frekwencji."}
              </p>
              <div className="mt-4 flex flex-col gap-1.5">
                {summary.turnoutBuckets.length === 0 ? <p className="text-xs text-muted-foreground">Brak danych.</p> : summary.turnoutBuckets.map(({ bucket, count }) => {
                  const max = Math.max(...summary.turnoutBuckets.map((b) => b.count));
                  return (
                    <div key={bucket} className="flex items-center gap-3 text-sm">
                      <span className="num w-20 shrink-0 text-xs">{bucket}</span>
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(count / max) * 100}%` }} /></div>
                      <span className="num w-10 text-right font-semibold text-xs">{count}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Udostępnione linki serwera */}
            <section className="panel p-5">
              <div className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-bold text-ink">Udostępnione linki serwera</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Linki wygasają po 7 dniach. Każdy adres IP może mieć do 5 aktywnych linków naraz. Wszystko zapisywane jest bezpośrednio w lokalnej bazie na serwerze (bez Lovable).
              </p>
              <div className="mt-3 max-h-96 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="py-1 font-medium">Nazwa</th>
                      <th className="py-1 font-medium">Utworzony</th>
                      <th className="py-1 font-medium">Wygasa</th>
                      <th className="py-1 text-right font-medium">Otwarcia</th>
                      <th className="py-1 text-right font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shares.length === 0 ? (
                      <tr><td colSpan={5} className="py-3 text-muted-foreground">Brak aktywnych linków.</td></tr>
                    ) : shares.map((sh) => {
                      const live = sh.active && new Date(sh.expires_at).getTime() > Date.now();
                      return (
                        <tr key={sh.id} className="border-t border-border/60">
                          <td className="py-1.5">
                            <a href={`/?s=${sh.id}`} target="_blank" rel="noreferrer" className="font-medium text-ink underline-offset-2 hover:underline">{sh.name}</a>
                          </td>
                          <td className="num py-1.5 text-xs">{new Date(sh.created_at).toLocaleString("pl-PL")}</td>
                          <td className="num py-1.5 text-xs">{new Date(sh.expires_at).toLocaleString("pl-PL")}</td>
                          <td className="num py-1.5 text-right font-bold text-ink">{sh.views}</td>
                          <td className="py-1.5 text-right">
                            {live ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="min-h-9 text-xs"
                                onClick={async () => {
                                  const r = await deactivate({ data: { login: login.trim(), key: key.trim(), id: sh.id } });
                                  if (r.ok) setShares((all) => all.map((x) => (x.id === sh.id ? { ...x, active: false } : x)));
                                }}
                              >
                                Dezaktywuj
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">{sh.active ? "wygasł" : "wyłączony"}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Zestawienie wszystkich zdarzeń */}
            <section className="panel p-5">
              <h2 className="font-display text-lg font-bold text-ink">Wszystkie zarejestrowane zdarzenia</h2>
              <div className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {summary.eventCounts.map(({ event, count }) => (
                  <div key={event} className="flex justify-between border-b border-border/50 py-1.5 text-xs">
                    <span>{EVENT_LABELS[event as keyof typeof EVENT_LABELS] ?? event}</span>
                    <span className="num font-bold text-ink">{count}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Strefa czyszczenia bazy danych */}
            <section className="panel p-5 border-destructive/30 bg-destructive/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-bold text-destructive text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Strefa czyszczenia danych
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Trwałe usunięcie wszystkich zdarzeń telemetrycznych oraz aktywnych linków z bazy SQLite.
                </p>
              </div>

              <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="shrink-0 gap-1.5">
                    <Trash2 className="h-4 w-4" /> Wyczyść wszystkie dane
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="text-destructive flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" /> Potwierdzenie czyszczenia bazy danych
                    </DialogTitle>
                    <DialogDescription>
                      Ta operacja trwale usunie wszystkie zgromadzone zdarzenia analityczne oraz aktywne linki scenariuszy z lokalnej bazy serwera SQLite.
                      Tej operacji nie można cofnąć.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleClearAll} className="space-y-4 pt-2">
                    <div>
                      <label className="text-xs font-semibold text-foreground">
                        Aby potwierdzić, wpisz hasło właściciela JIFO:
                      </label>
                      <Input
                        type="password"
                        value={clearPassword}
                        onChange={(e) => setClearPassword(e.target.value)}
                        placeholder="Wpisz hasło"
                        className="mt-1.5"
                        autoFocus
                      />
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setClearDialogOpen(false);
                          setClearPassword("");
                        }}
                      >
                        Anuluj
                      </Button>
                      <Button
                        type="submit"
                        variant="destructive"
                        disabled={clearing || !clearPassword.trim()}
                      >
                        {clearing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Potwierdź i usuń dane
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </section>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => void load()}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Odśwież dane
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
