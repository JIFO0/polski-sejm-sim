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
  ExternalLink,
  FileText,
  HardDrive,
  Info,
  Laptop,
  Layers,
  Link2,
  Loader2,
  Mail,
  MapPin,
  Pin,
  RotateCcw,
  Scale,
  ShieldCheck,
  Sparkles,
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
import {
  getAnalyticsSummary,
  clearAllAnalyticsData,
  testFeedbackWebhook,
  revealRecoveryKeysFn,
  generateRecoveryKeyFn,
  revokeRecoveryKeyFn,
} from "@/lib/analytics.functions";
import { isAdminOptedOut, setAdminOptedOut } from "@/lib/analytics";
import { deletePrivateScenarioFn, listPrivateScenariosFn } from "@/lib/private-scenarios.functions";
import { listGeneratedGraphicsFn, deleteGeneratedGraphicFn } from "@/lib/generated-images.functions";
import { Copy, Image as ImageIcon, Key } from "lucide-react";
import { deactivateShare, deleteShare, listShares, togglePermanentShare, toggleFeaturedShare } from "@/lib/shares.functions";
import { ThemeToggle } from "@/components/ThemeToggle";
import { EVENT_LABELS } from "@/lib/analytics-events";
import { PARTIES } from "@/data/parties";
import { recentVisitDays, analyticsPartyName } from "@/lib/analytics-display";
import { VisitBarChart } from "@/components/VisitBarChart";


const TITLE = "Statystyki SejmSim 2027";
const DESCRIPTION = "Anonimowe, zbiorcze statystyki korzystania z symulatora SejmSim 2027.";

export const Route = createFileRoute("/statystyki")({
  staticData: { sitemap: false },
  head: () => ({
    links: [{ rel: "canonical", href: "https://sejmsim.pl/statystyki" }],
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://sejmsim.pl/statystyki" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StatsPage,
});

type ShareRow = { id: string; name: string; active: boolean; featured?: boolean; views: number; created_at: string; expires_at: string };
type Summary = Extract<Awaited<ReturnType<typeof getAnalyticsSummary>>, { ok: true }>;

const PARTY_NAMES = Object.fromEntries(PARTIES.map((p) => [p.id, p.name]));
const PARTY_SHORTS = Object.fromEntries(PARTIES.map((p) => [p.id, p.short]));
const PARTY_COLORS = Object.fromEntries(PARTIES.map((p) => [p.id, p.color]));

function formatCoalition(membersStr: string, partyLabels: Record<string, string> = {}) {
  const pids = membersStr.split("+");
  return pids.map((pid) => PARTY_SHORTS[pid] ?? analyticsPartyName(pid, partyLabels, PARTY_NAMES)).join(" + ");
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
  const [privateScenarios, setPrivateScenarios] = useState<{ id: number; name: string; created_at: string; author: string; description: string; filledDistricts: number; json: string }[]>([]);
  const fetchPrivate = useServerFn(listPrivateScenariosFn);
  const removePrivate = useServerFn(deletePrivateScenarioFn);
  const [securityKey, setSecurityKey] = useState("");
  const [graphics, setGraphics] = useState<Array<{ id: number; scenario_name: string; image_data: string; created_at: string }>>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fetchGraphics = useServerFn(listGeneratedGraphicsFn);
  const deleteGraphicFn = useServerFn(deleteGeneratedGraphicFn);
  const revealKeysServerFn = useServerFn(revealRecoveryKeysFn);
  const generateKeyServerFn = useServerFn(generateRecoveryKeyFn);
  const revokeKeyServerFn = useServerFn(revokeRecoveryKeyFn);

  const [adminOptedOut, setAdminOptedOutState] = useState(isAdminOptedOut());

  const [revealDialogOpen, setRevealDialogOpen] = useState(false);
  const [revealPassword, setRevealPassword] = useState("");
  const [revealedKeys, setRevealedKeys] = useState<Array<{ id: number; label: string; status: string; key: string | null; created_at: string; used_at: string | null }> | null>(null);
  const [revealLoading, setRevealLoading] = useState(false);

  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generateLabel, setGenerateLabel] = useState("");
  const [generatePassword, setGeneratePassword] = useState("");
  const [generatedKey, setGeneratedKey] = useState<{ key: string; label: string } | null>(null);
  const [generateLoading, setGenerateLoading] = useState(false);

  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revokingKeyId, setRevokingKeyId] = useState<number | null>(null);
  const [revokePassword, setRevokePassword] = useState("");
  const [revokeLoading, setRevokeLoading] = useState(false);

  const handleRevealKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revealPassword.trim()) return;
    setRevealLoading(true);
    try {
      const res = await revealKeysServerFn({
        data: {
          login: login.trim(),
          key: key.trim(),
          recoveryPassword: revealPassword.trim(),
        },
      });
      if (res.ok && res.keys) {
        setRevealedKeys(res.keys);
        toast.success("Klucze zostały pomyślnie odszyfrowane.");
      } else {
        toast.error((res as any).error || "Nie udało się odkryć kluczy.");
      }
    } catch (err: any) {
      toast.error(err.message || "Błąd połączenia.");
    } finally {
      setRevealLoading(false);
    }
  };

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generatePassword.trim()) return;
    setGenerateLoading(true);
    try {
      const res = await generateKeyServerFn({
        data: {
          login: login.trim(),
          key: key.trim(),
          recoveryPassword: generatePassword.trim(),
          label: generateLabel.trim(),
        },
      });
      if (res.ok && res.key) {
        setGeneratedKey({ key: res.key, label: res.label || "Klucz" });
        toast.success("Wygenerowano nowy klucz bezpieczeństwa!");
        void load();
      } else {
        toast.error((res as any).error || "Błąd generowania klucza.");
      }
    } catch (err: any) {
      toast.error(err.message || "Błąd połączenia.");
    } finally {
      setGenerateLoading(false);
    }
  };

  const handleRevokeKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (revokingKeyId === null || !revokePassword.trim()) return;
    setRevokeLoading(true);
    try {
      const res = await revokeKeyServerFn({
        data: {
          login: login.trim(),
          key: key.trim(),
          recoveryPassword: revokePassword.trim(),
          id: revokingKeyId,
        },
      });
      if (res.ok) {
        toast.success("Klucz został unieważniony.");
        setRevokeDialogOpen(false);
        setRevokingKeyId(null);
        setRevokePassword("");
        void load();
      } else {
        toast.error((res as any).error || "Nie udało się unieważnić klucza.");
      }
    } catch (err: any) {
      toast.error(err.message || "Błąd połączenia.");
    } finally {
      setRevokeLoading(false);
    }
  };

  const copyKey = (val: string) => {
    navigator.clipboard.writeText(val);
    toast.success("Skopiowano 64-znakowy klucz bezpieczeństwa!");
  };

  const handleDeleteGraphic = async (id: number) => {
    if (!window.confirm("Usunąć tę wygenerowaną grafikę?")) return;
    const res = await deleteGraphicFn({
      data: { login: login.trim(), key: key.trim(), securityKey: securityKey.trim() || undefined, id },
    });
    if (res.ok) {
      setGraphics((prev) => prev.filter((g) => g.id !== id));
      toast.success("Grafika została usunięta.");
    } else {
      toast.error("Nie udało się usunąć grafiki.");
    }
  };
  const deactivate = useServerFn(deactivateShare);
  const removeShare = useServerFn(deleteShare);
  const togglePermanent = useServerFn(togglePermanentShare);
  const toggleFeatured = useServerFn(toggleFeaturedShare);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const fetchSummary = useServerFn(getAnalyticsSummary);
  const clearDataFn = useServerFn(clearAllAnalyticsData);
  const testWebhookFn = useServerFn(testFeedbackWebhook);
  const [testingWebhook, setTestingWebhook] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState<string>("week");

  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearPassword, setClearPassword] = useState("");
  const [clearing, setClearing] = useState(false);

  const handleTestWebhook = async () => {
    setTestingWebhook(true);
    try {
      const res = await testWebhookFn({
        data: { login: login.trim(), key: key.trim() },
      });
      if (res.ok) {
        toast.success("Wiadomość testowa została pomyślnie wysłana na Discorda!");
      } else {
        toast.error(res.error || "Nie udało się wysłać wiadomości testowej.");
      }
    } catch {
      toast.error("Błąd podczas wysyłania testu webhooka.");
    } finally {
      setTestingWebhook(false);
    }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const effectiveKey = key.trim() || securityKey.trim();
      const creds = { login: login.trim(), key: effectiveKey, securityKey: securityKey.trim() || undefined };
      const [res, sh, priv, gr] = await Promise.all([
        fetchSummary({ data: creds }),
        fetchShares({ data: creds }),
        fetchPrivate({ data: creds }),
        fetchGraphics({ data: creds }),
      ]);
      if (sh.ok) setShares(sh.shares);
      if (priv.ok) setPrivateScenarios(priv.items);
      if (gr.ok) setGraphics(gr.items);
      if (!res.ok) {
        setError(res.error);
        setSummary(null);
      } else {
        setSummary(res);
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
    if (selectedMonth === "week") return recentVisitDays(summary.visitsByDay, 7);
    if (selectedMonth === "month") return recentVisitDays(summary.visitsByDay, 30);
    if (activeMonthObj) return activeMonthObj.days;
    return summary.visitsByDay;
  }, [activeMonthObj, summary, selectedMonth]);

  const partyName = (id: string) => analyticsPartyName(id, summary?.partyLabels ?? {}, PARTY_NAMES);

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
        <ThemeToggle />
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
            <div>
              <label htmlFor="stats-key" className="text-sm font-semibold text-foreground flex items-center justify-between">
                <span>Klucz dostępu (ANALYTICS_KEY)</span>
                <span className="text-xs text-muted-foreground font-normal">lub 64-znakowy klucz</span>
              </label>
              <Input
                id="stats-key"
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Wpisz klucz dostępu (hasło) lub klucz 64-znakowy"
                autoComplete="current-password"
                className="mt-1"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Domyślnym hasłem jest wartość sekretu serwera <code>ANALYTICS_KEY</code>. Możesz również użyć jednego z 64-znakowych kluczy jednorazowych.
              </p>
            </div>
            <div className="pt-1">
              <label htmlFor="stats-sec-key" className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span>Awaryjny klucz bezpieczeństwa (64 znaki)</span>
                <span className="text-[10px] text-muted-foreground/70">Odblokowuje IP po 5 błędach</span>
              </label>
              <Input
                id="stats-sec-key"
                type="text"
                value={securityKey}
                onChange={(e) => setSecurityKey(e.target.value.trim())}
                placeholder="Opcjonalny jednorazowy klucz 64 znaki"
                className="mt-1 font-mono text-xs"
                maxLength={64}
              />
            </div>
            {error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
                {error}
              </div>
            ) : null}
            <Button type="submit" disabled={loading || (!key.trim() && !securityKey.trim())} className="min-h-11">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Pokaż statystyki
            </Button>
          </form>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Definicja i kontrola administratora */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Definicja ruchu i zasady prywatności
                </p>
                <p className="mt-1">
                  <strong>Sesja</strong> = wejście lub powrót po &ge;30 min bezczynności. <strong>Odsłona</strong> = wyświetlenie podstrony w SPA. Zgodnie z polityką prywatności serwis nie używa ciasteczek śledzących, nie profiluje użytkowników, nie zapisuje adresów IP ani fingerprintingu.
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={adminOptedOut}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setAdminOptedOutState(val);
                      setAdminOptedOut(val);
                      toast.success(val ? "Włączono wykluczenie Twoich wejść z analityki." : "Wyłączono wykluczenie Twoich wejść.");
                    }}
                    className="rounded border-border"
                  />
                  <span>Nie licz moich wizyt (admin)</span>
                </label>
              </div>
            </div>

            {/* Główne karty podsumowania */}
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div className="panel p-4">
                <p className="text-xs text-muted-foreground">Sesje (Wizyty)</p>
                <p className="num text-2xl font-bold text-ink mt-1">{summary.sessions ?? summary.pageViews}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Wszystkie unikalne sesje</p>
              </div>

              <div className="panel p-4">
                <p className="text-xs text-muted-foreground">Odsłony (Pageviews)</p>
                <p className="num text-2xl font-bold text-ink mt-1">{summary.pageViews}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Wszystkie podstrony SPA</p>
              </div>

              <div className="panel p-4 border-emerald-500/30 bg-emerald-500/5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Źródła badań</p>
                  <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="num text-2xl font-bold text-emerald-950 dark:text-emerald-100 mt-1">
                  {summary.sourcesViews}
                </p>
                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                  /zrodla & kliknięcia ({summary.pollStats.sourceClicks} do badań)
                </p>
              </div>

              <div className="panel p-4 border-violet-500/30 bg-violet-500/5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-violet-800 dark:text-violet-300">Korekta PKW</p>
                  <Scale className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <p className="num text-2xl font-bold text-violet-950 dark:text-violet-100 mt-1">
                  {summary.pkwCorrectionViews}
                </p>
                <p className="text-[11px] text-violet-700/80 dark:text-violet-300/80 mt-0.5">
                  Odsłony ({summary.pkwCorrectionToggles} włączeń)
                </p>
              </div>

              <div className="panel p-4 border-cyan-500/30 bg-cyan-500/5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-cyan-800 dark:text-cyan-300">Metoda D'Hondta</p>
                  <BarChart3 className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                </div>
                <p className="num text-2xl font-bold text-cyan-950 dark:text-cyan-100 mt-1">
                  {summary.dhondtViews}
                </p>
                <p className="text-[11px] text-cyan-700/80 dark:text-cyan-300/80 mt-0.5">
                  Odwiedziny /metoda-dhondta
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
                  Odwiedziny /o-projekcie
                </p>
              </div>
            </section>

            {/* Druga linia podsumowania */}
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div className="panel p-4 border-amber-500/30 bg-amber-500/5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Buy Me a Coffee</p>
                  <Coffee className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="num text-2xl font-bold text-amber-950 dark:text-amber-100 mt-1">
                  {summary.supportClicks}
                </p>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-0.5">
                  Kliknięcia wsparcia
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
                <p className="text-[11px] text-muted-foreground mt-0.5">Zdarzenia w SQLite</p>
              </div>
            </section>

            {/* ODSŁONY WEDŁUG PODSTRON */}
            <section className="panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" /> Odsłony według podstron (ruch w serwisie)
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Zestawienie liczby wejść na poszczególne podstrony i widoki w SejmSim.
                  </p>
                </div>
                <div className="text-xs font-semibold text-muted-foreground">
                  Łącznie odsłon podstron: <span className="num font-bold text-ink text-sm">{summary.pageViews}</span>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr className="text-left font-semibold text-muted-foreground">
                      <th className="py-2.5 px-3">Ścieżka (URL)</th>
                      <th className="py-2.5 px-3">Nazwa podstrony</th>
                      <th className="py-2.5 px-3">Wizualizacja</th>
                      <th className="py-2.5 px-3 text-right">Odsłony</th>
                      <th className="py-2.5 px-3 text-right">Udział</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {summary.pageViewsByPath.map((item) => {
                      const maxViews = Math.max(1, ...summary.pageViewsByPath.map((p) => p.count));
                      const sharePct = summary.pageViews > 0 ? ((item.count / summary.pageViews) * 100).toFixed(1) : "0.0";
                      return (
                        <tr key={item.path} className="hover:bg-muted/20">
                          <td className="py-2.5 px-3 font-mono font-medium text-primary">
                            <a href={item.path} target="_blank" rel="noreferrer" className="hover:underline">
                              {item.path}
                            </a>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-foreground">{item.label}</td>
                          <td className="py-2.5 px-3">
                            <div className="h-2.5 w-36 max-w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${(item.count / maxViews) * 100}%` }}
                              />
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-ink num">{item.count}</td>
                          <td className="py-2.5 px-3 text-right text-muted-foreground num">{sharePct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ZAINTERESOWANIE SONDAŻAMI I ŹRÓDŁAMI */}
            <section className="panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" /> Zainteresowanie sondażami i weryfikacja źródeł
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Jak często odwiedzający sprawdzają sondaże na stronie głównej oraz przechodzą do oryginalnych publikacji ośrodków badawczych.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-lg border bg-card">
                  <p className="text-xs text-muted-foreground">Rozwinięcia sekcji sondaży</p>
                  <p className="num text-2xl font-bold text-ink mt-1">{summary.pollStats.sectionViews}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Przeglądanie bloku sondażowego</p>
                </div>

                <div className="p-3.5 rounded-lg border bg-card">
                  <p className="text-xs text-muted-foreground">Kliknięcia w publikacje źródłowe</p>
                  <p className="num text-2xl font-bold text-primary mt-1">{summary.pollStats.sourceClicks}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Przejścia do artykułów źródłowych</p>
                </div>

                <div className="p-3.5 rounded-lg border bg-card">
                  <p className="text-xs text-muted-foreground">Przełączenia zakładek sondaży</p>
                  <p className="num text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {summary.pollStats.tabChanges.reduce((a, b) => a + b.count, 0)}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Średnia / Trendy / Badania i źródła</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {/* Źródła ośrodków badawczych */}
                <div className="rounded-lg border border-border p-3.5 bg-surface/50">
                  <h3 className="text-xs font-bold text-ink uppercase tracking-wider mb-2">
                    Przejścia do źródeł według ośrodka
                  </h3>
                  {summary.pollStats.topInstitutes.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-2">Brak zarejestrowanych kliknięć w publikacje źródłowe.</p>
                  ) : (
                    <div className="space-y-2">
                      {summary.pollStats.topInstitutes.map(({ institute, count }) => {
                        const maxInst = Math.max(1, ...summary.pollStats.topInstitutes.map((i) => i.count));
                        return (
                          <div key={institute} className="flex items-center gap-2 text-xs">
                            <span className="w-44 shrink-0 truncate font-medium text-foreground">{institute}</span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${(count / maxInst) * 100}%` }} />
                            </div>
                            <span className="num font-bold text-ink w-8 text-right">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Popularność zakładek w panelu sondaży */}
                <div className="rounded-lg border border-border p-3.5 bg-surface/50">
                  <h3 className="text-xs font-bold text-ink uppercase tracking-wider mb-2">
                    Przeglądane widoki sondaży
                  </h3>
                  {summary.pollStats.tabChanges.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-2">Brak przełączeń zakładek w panelu sondaży.</p>
                  ) : (
                    <div className="space-y-2">
                      {summary.pollStats.tabChanges.map(({ tab, count }) => {
                        const maxTab = Math.max(1, ...summary.pollStats.tabChanges.map((t) => t.count));
                        return (
                          <div key={tab} className="flex items-center gap-2 text-xs">
                            <span className="w-36 shrink-0 truncate font-medium text-foreground">{tab}</span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(count / maxTab) * 100}%` }} />
                            </div>
                            <span className="num font-bold text-ink w-8 text-right">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Stan magazynu i limit 4GB */}
            <section className="panel p-5 bg-surface/90 border-border">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <HardDrive className="h-5 w-5 text-primary" />
                  <div>
                    <h2 className="font-display text-base font-bold text-ink">Magazyn lokalny & Limit rozmiaru 4 GB</h2>
                    <p className="text-xs text-muted-foreground">Zdarzenia, opinie i wyłączone linki zostają w bazie. Najstarsze zdarzenia znikają tylko, gdy plik zbliża się do 4 GB.</p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" /> Limit 4 GB aktywny: {summary.dbStats.sizeFormatted}
                </div>
              </div>
            </section>

            {/* LEJEK AKTYWACJI */}
            <section className="panel p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-base font-bold text-ink flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" /> Lejek aktywacji użytkowników
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Konwersja w ramach pojedynczej sesji: Wejście &rarr; Interakcja (suwaki, partia, mapa) &rarr; Eksport / Udostępnienie.
                  </p>
                </div>
              </div>

              {summary.funnel ? (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg border bg-card">
                    <p className="text-xs text-muted-foreground">1. Sesje (Wejścia)</p>
                    <p className="num text-xl font-bold text-ink mt-1">{summary.funnel.sessions}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Punkt wyjściowy (100%)</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-card">
                    <p className="text-xs text-muted-foreground">2. Interakcja z symulatorem</p>
                    <p className="num text-xl font-bold text-primary mt-1">{summary.funnel.interactions}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {summary.funnel.sessions > 0 ? `${Math.round((summary.funnel.interactions / summary.funnel.sessions) * 100)}% sesji` : "-"}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border bg-card">
                    <p className="text-xs text-muted-foreground">3. Eksport / Udostępnienie</p>
                    <p className="num text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{summary.funnel.exports}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {summary.funnel.sessions > 0 ? `${Math.round((summary.funnel.exports / summary.funnel.sessions) * 100)}% sesji` : "-"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                  Brak danych historycznych dla lejka aktywacji w wybranym okresie (metryka wdrożona w listopadzie 2026).
                </div>
              )}
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

              <VisitBarChart label="Wejścia według godziny" data={hoursData.map((count, hour) => ({ key: String(hour), label: String(hour).padStart(2, "0"), count }))} />

            </section>

            {/* WEJŚCIA WG DNIA (BIEŻĄCY I POPRZEDNIE MIESIĄCE) */}
            <section className="panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" /> Wejścia według dnia
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Przeglądaj dzienne natężenie ruchu z podziałem na miesiące kalendarzowe.
                  </p>
                </div>

                {/* Wybór okresu */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[{ id: "week", label: "Ostatnie 7 dni" }, { id: "month", label: "Ostatnie 30 dni" }].map((period) => <Button key={period.id} size="sm" variant={selectedMonth === period.id ? "default" : "outline"} onClick={() => setSelectedMonth(period.id)}>{period.label}</Button>)}
                  {summary.visitsByMonth.map((m) => (
                    <Button
                      key={m.month}
                      variant={selectedMonth === m.month ? "default" : "outline"}
                      size="sm"
                      className="text-xs h-8"
                      onClick={() => setSelectedMonth(m.month)}
                    >
                      {m.label} ({m.count})
                    </Button>
                  ))}
                  <Button
                    variant={selectedMonth === "all" ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => setSelectedMonth("all")}
                  >
                    Wszystkie miesiące ({summary.sessions ?? summary.pageViews})
                  </Button>
                </div>
              </div>

              {/* Informacja o wybranym okresie */}
              <div className="mt-4 flex items-center justify-between rounded-lg bg-surface/70 border border-border/70 px-3.5 py-2 text-xs">
                <span className="text-muted-foreground">
                  Okres: <strong className="text-foreground">{selectedMonth === "week" ? "Ostatnie 7 dni" : selectedMonth === "month" ? "Ostatnie 30 dni" : activeMonthObj ? activeMonthObj.label : "Wszystkie zarejestrowane dni"}</strong>
                </span>
                <span className="font-semibold text-ink">
                  Łącznie wizyt w okresie: <span className="num text-primary font-bold text-sm">{displayedDays.reduce((acc, d) => acc + d.count, 0)}</span>
                </span>
              </div>

              <VisitBarChart label="Wejścia według dnia" data={[...displayedDays].reverse().map(({ day, count }) => ({ key: day, label: day.slice(8) + "." + day.slice(5, 7), count }))} />

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
                <p className="mt-1 text-xs text-muted-foreground">
                  Zestawienia partii sprawdzane w sekcji „Kto z kim?”.
                  {summary.coalitionTestCount > 0
                    ? ` Większość 231+ w ${summary.coalitionMajorityHits} z ${summary.coalitionTestCount} testów (${Math.round((summary.coalitionMajorityHits / summary.coalitionTestCount) * 100)}%).`
                    : ""}
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  {summary.topCoalitions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Brak zarejestrowanych testów koalicji.</p>
                  ) : (
                    summary.topCoalitions.map(({ members, count, majorityHits }) => (
                      <div key={members} className="flex items-start justify-between gap-2 border-b border-border/40 pb-2 text-xs">
                        <span className="font-semibold text-foreground break-words">{formatCoalition(members, summary?.partyLabels ?? {})}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${majorityHits > 0 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" : "bg-muted text-muted-foreground"}`}>
                            większość {majorityHits}/{count}
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
                          <span className="min-w-28 max-w-[45%] shrink-0 break-words font-medium text-foreground">{partyName(party)}</span>
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
                      <span className="min-w-40 max-w-[45%] shrink-0 break-words text-sm text-foreground">
                        {partyName(party)}
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
                Linki wygasają po 7 dniach. Każdy adres IP może mieć do 5 aktywnych linków naraz. Ten sam scenariusz z jednego IP nie tworzy drugiego linku.
                Dezaktywacja wyłącza link, usunięcie kasuje go z bazy. W bibliotece: {summary.shareLibrary.total} linków, {summary.shareLibrary.views} otwarć, {summary.shareLibrary.permanent} bezterminowych, {shares.filter((s) => s.featured).length} wyróżnionych w społeczności.
              </p>
              <div className="mt-3 max-h-96 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="py-1 font-medium">Nazwa</th>
                      <th className="py-1 font-medium">Utworzony</th>
                      <th className="py-1 font-medium">Wygasa</th>
                      <th className="py-1 text-right font-medium">Otwarcia</th>
                      <th className="py-1 text-right font-medium" colSpan={2}>Akcje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shares.length === 0 ? (
                      <tr><td colSpan={6} className="py-3 text-muted-foreground">Brak linków.</td></tr>
                    ) : shares.map((sh) => {
                      const isPermanent = sh.expires_at >= "9999";
                      const live = sh.active && (isPermanent || new Date(sh.expires_at).getTime() > Date.now());
                      return (
                        <tr key={sh.id} className="border-t border-border/60">
                          <td className="py-1.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <a href={`/?s=${sh.id}`} target="_blank" rel="noreferrer" className="font-medium text-ink underline-offset-2 hover:underline">{sh.name}</a>
                              {sh.featured && (
                                <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                                  <Sparkles className="h-2.5 w-2.5" /> Społeczność
                                </span>
                              )}
                              {isPermanent && !sh.featured && (
                                <span className="inline-flex items-center gap-0.5 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                                  <Pin className="h-2.5 w-2.5" /> Permanentny
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="num py-1.5 text-xs">{new Date(sh.created_at).toLocaleString("pl-PL")}</td>
                          <td className="num py-1.5 text-xs">
                            {isPermanent ? (
                              <span className="font-semibold text-primary">∞ Bezterminowy</span>
                            ) : (
                              new Date(sh.expires_at).toLocaleString("pl-PL")
                            )}
                          </td>
                          <td className="num py-1.5 text-right font-bold text-ink">{sh.views}</td>
                          <td className="py-1.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {live ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant={sh.featured ? "secondary" : "outline"}
                                    className={`min-h-9 gap-1 text-xs ${
                                      sh.featured
                                        ? "border-amber-500/40 bg-amber-500/10 font-semibold text-amber-700 dark:text-amber-400"
                                        : ""
                                    }`}
                                    title={
                                      sh.featured
                                        ? "Usuń z wyróżnionych scenariuszy społeczności"
                                        : "Wyróżnij ten scenariusz w menu społeczności dla odwiedzających"
                                    }
                                    onClick={async () => {
                                      const r = await toggleFeatured({
                                        data: { login: login.trim(), key: key.trim(), id: sh.id },
                                      });
                                      if (r.ok) {
                                        setShares((all) =>
                                          all.map((x) =>
                                            x.id === sh.id
                                              ? {
                                                  ...x,
                                                  featured: r.featured,
                                                  active: true,
                                                  expires_at: r.featured
                                                    ? "9999-12-31T23:59:59.999Z"
                                                    : x.expires_at,
                                                }
                                              : x,
                                          ),
                                        );
                                        toast.success(
                                          r.featured
                                            ? "Scenariusz dodany do wyróżnionych w menu społeczności!"
                                            : "Scenariusz usunięty ze społeczności.",
                                        );
                                      }
                                    }}
                                  >
                                    <Sparkles className="h-3 w-3" />
                                    {sh.featured ? "Wyróżniony" : "Wyróżnij"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={isPermanent ? "secondary" : "outline"}
                                    className="min-h-9 gap-1 text-xs"
                                    title={isPermanent ? "Cofnij permanentność (wróć do 7 dni)" : "Ustaw jako permanentny (nie wygaśnie)"}
                                    onClick={async () => {
                                      const r = await togglePermanent({ data: { login: login.trim(), key: key.trim(), id: sh.id } });
                                      if (r.ok) {
                                        setShares((all) => all.map((x) => x.id === sh.id ? { ...x, expires_at: r.expiresAt, active: true } : x));
                                        toast.success(r.permanent ? "Link ustawiony jako permanentny." : "Link wróci do standardowego wygasania (7 dni).");
                                      }
                                    }}
                                  >
                                    <Pin className="h-3 w-3" />
                                    {isPermanent ? "Stały" : "7 dni"}
                                  </Button>
                                </>
                              ) : null}
                            </div>
                          </td>
                          <td className="py-1.5 text-right pl-1">
                            <div className="flex justify-end gap-1">
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
                                <span className="self-center text-xs text-muted-foreground">{sh.active ? "wygasł" : "wyłączony"}</span>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="min-h-9 gap-1 text-xs text-destructive hover:text-destructive"
                                onClick={async () => {
                                  if (!window.confirm(`Usunąć link „${sh.name}” na stałe? Tej operacji nie cofniesz.`)) return;
                                  const r = await removeShare({ data: { login: login.trim(), key: key.trim(), id: sh.id } });
                                  if (r.ok) {
                                    setShares((all) => all.filter((x) => x.id !== sh.id));
                                    toast.success("Link usunięty z bazy.");
                                  } else {
                                    toast.error("error" in r && r.error ? r.error : "Nie udało się usunąć linku.");
                                  }
                                }}
                              >
                                <Trash2 className="h-3 w-3" /> Usuń
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>


            <section className="panel p-5">
              <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" /> Analiza trendów: największy ruch
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">Tygodnie liczone od poniedziałku, czas polski.</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {([["Najmocniejsze tygodnie", summary.topWeeks.map((w) => ({ k: w.week, label: `od ${new Date(`${w.week}T12:00:00Z`).toLocaleDateString("pl-PL")}`, count: w.count }))], ["Najmocniejsze miesiące", summary.topMonths.map((m) => ({ k: m.month, label: m.label, count: m.count }))]] as const).map(([title, items]) => {
                  const max = Math.max(1, ...items.map((i) => i.count));
                  return (
                    <div key={title}>
                      <h3 className="text-sm font-semibold text-ink">{title}</h3>
                      {items.length === 0 ? <p className="mt-2 text-xs text-muted-foreground">Brak danych.</p> : (
                        <ol className="mt-2 space-y-2">
                          {items.map((i, idx) => (
                            <li key={i.k} className="text-xs">
                              <div className="flex justify-between"><span>{idx + 1}. {i.label}</span><span className="num font-bold text-ink">{i.count}</span></div>
                              <div className="mt-1 h-2 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${(i.count / max) * 100}%` }} /></div>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  );
                })}
              </div>
              <h3 className="mt-5 text-sm font-semibold text-ink">Ostatnie tygodnie</h3>
              <div className="mt-2 flex h-28 items-end gap-1">
                {[...summary.visitsByWeek].reverse().map((w) => {
                  const max = Math.max(1, ...summary.visitsByWeek.map((x) => x.count));
                  return <div key={w.week} title={`Tydzień od ${w.week}: ${w.count}`} className="flex-1 rounded-t bg-primary/80" style={{ height: `${Math.max(4, (w.count / max) * 100)}%` }} />;
                })}
              </div>
            </section>

            <section className="panel p-5">
              <h2 className="font-display text-lg font-bold text-ink">Scenariusze niepubliczne ({privateScenarios.length})</h2>
              <p className="mt-1 text-xs text-muted-foreground">Kopie scenariuszy zapisanych przez użytkowników w bibliotece. Nie są nigdzie publikowane. Przechowywane jest maksymalnie 5000 ostatnich.</p>
              {privateScenarios.length === 0 ? <p className="mt-3 text-xs text-muted-foreground">Nikt jeszcze nie zapisał scenariusza.</p> : (
                <div className="mt-3 max-h-[480px] overflow-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="text-left text-muted-foreground"><th className="py-1">Nazwa</th><th>Stan</th><th>Autor</th><th>Opis</th><th>Data</th><th /></tr></thead>
                    <tbody>
                      {privateScenarios.map((p) => {
                        const { author, description, filledDistricts } = p;
                        const statusLabel = filledDistricts === 0 ? "Pusty (0/41)" : filledDistricts < 41 ? `Niepełny (${filledDistricts}/41)` : "41/41 okr.";
                        const statusClass = filledDistricts === 0
                          ? "bg-destructive/15 text-destructive"
                          : filledDistricts < 41
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
                        return (
                          <tr key={p.id} className="border-t align-top">
                            <td className="py-2 pr-2 font-semibold text-ink">{p.name}</td>
                            <td className="whitespace-nowrap py-2 pr-2"><span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${statusClass}`}>{statusLabel}</span></td>
                            <td className="py-2 pr-2">{author || "-"}</td>
                            <td className="max-w-[320px] py-2 pr-2 text-muted-foreground"><span className="line-clamp-3" title={description}>{description || "-"}</span></td>
                            <td className="whitespace-nowrap py-2 pr-2">{new Date(p.created_at).toLocaleString("pl-PL")}</td>
                            <td className="whitespace-nowrap py-2">
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => {
                                const blob = new Blob([p.json], { type: "application/json" });
                                const a = document.createElement("a");
                                a.href = URL.createObjectURL(blob);
                                a.download = `scenariusz-${p.id}.json`;
                                a.click();
                                URL.revokeObjectURL(a.href);
                              }}>JSON</Button>{" "}
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={async () => {
                                if (!window.confirm(`Usunąć „${p.name}”?`)) return;
                                const r = await removePrivate({ data: { login: login.trim(), key: key.trim(), id: p.id } });
                                if (r.ok) setPrivateScenarios((all) => all.filter((x) => x.id !== p.id));
                              }}><Trash2 className="h-3 w-3" /></Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Wygenerowane grafiki do posta */}
            <section className="panel p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-primary" /> Wygenerowane grafiki do posta ({graphics.length})
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Grafiki wygenerowane w przeglądarce i zapisane na serwerze (do 500 najnowszych). Kliknij grafikę, by powiększyć.
                  </p>
                </div>
              </div>

              {graphics.length === 0 ? (
                <p className="mt-4 text-xs text-muted-foreground italic">Nikt jeszcze nie wygenerował grafiki od momentu wdrożenia.</p>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {graphics.map((g) => (
                    <div key={g.id} className="group relative flex flex-col overflow-hidden rounded-lg border bg-card shadow-xs transition-all hover:shadow-md">
                      <div className="relative w-full overflow-hidden bg-muted cursor-pointer" style={{ aspectRatio: "1200 / 630" }} onClick={() => setPreviewImage(g.image_data)}>
                        <img src={g.image_data} alt={g.scenario_name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                      </div>
                      <div className="flex flex-1 flex-col justify-between p-3">
                        <div>
                          <h3 className="break-words text-sm font-semibold text-ink" title={g.scenario_name}>{g.scenario_name}</h3>
                          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock className="h-3 w-3" /> {new Date(g.created_at).toLocaleString("pl-PL")}
                          </p>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t">
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => {
                            const a = document.createElement("a");
                            a.href = g.image_data;
                            a.download = `sejmsim-grafika-${g.id}.png`;
                            a.click();
                          }}>
                            Pobierz
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteGraphic(g.id)}>
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Usuń
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Bezpieczne zarządzanie kluczami awaryjnymi */}
            <section className="panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
                    <Key className="h-5 w-5 text-primary" /> Klucze awaryjne dostępu (Recovery Keys)
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Zabezpieczenie przed brute-force (IP zewnętrzne: max 5 prób/12h). Klucze są przechowywane wyłącznie jako hashe SHA-256 oraz w zaszyfrowanym sejfie AES-256-GCM.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setRevealedKeys(null); setRevealPassword(""); setRevealDialogOpen(true); }}>
                    Odkryj klucze
                  </Button>
                  <Button size="sm" onClick={() => { setGeneratedKey(null); setGeneratePassword(""); setGenerateLabel(""); setGenerateDialogOpen(true); }}>
                    + Dodaj nowy klucz
                  </Button>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr className="text-left font-semibold text-muted-foreground">
                      <th className="py-2.5 px-3">Etykieta</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Utworzono</th>
                      <th className="py-2.5 px-3">Użycie / Zmiana</th>
                      <th className="py-2.5 px-3 text-right">Akcje</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(summary.securityKeys ?? []).map((k: any) => (
                      <tr key={k.id} className="hover:bg-muted/20">
                        <td className="py-2.5 px-3 font-medium text-foreground">{k.label}</td>
                        <td className="py-2.5 px-3">
                          {k.status === "active" ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                              Aktywny
                            </span>
                          ) : k.status === "used" ? (
                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              Zużyty
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-medium text-destructive">
                              Unieważniony
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">
                          {k.created_at ? new Date(k.created_at).toLocaleDateString("pl-PL") : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">
                          {k.used_at ? `Zużyty: ${new Date(k.used_at).toLocaleDateString("pl-PL")}` : k.revoked_at ? `Unieważniony: ${new Date(k.revoked_at).toLocaleDateString("pl-PL")}` : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {k.status === "active" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                setRevokingKeyId(k.id);
                                setRevokePassword("");
                                setRevokeDialogOpen(true);
                              }}
                            >
                              Unieważnij
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {(summary.securityKeys ?? []).length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-muted-foreground">Brak zarejestrowanych kluczy.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Modal: Odkryj klucze */}
            <Dialog open={revealDialogOpen} onOpenChange={setRevealDialogOpen}>
              <DialogContent className="max-w-md bg-card">
                <DialogHeader>
                  <DialogTitle className="font-display text-lg font-bold">Odkryj klucze awaryjne</DialogTitle>
                  <DialogDescription className="text-xs">
                    Podaj osobne hasło odzyskiwania, aby odszyfrować istniejące klucze.
                  </DialogDescription>
                </DialogHeader>
                {!revealedKeys ? (
                  <form onSubmit={handleRevealKeys} className="space-y-3 pt-2">
                    <div>
                      <label className="text-xs font-semibold text-foreground">Hasło odzyskiwania</label>
                      <Input
                        type="password"
                        value={revealPassword}
                        onChange={(e) => setRevealPassword(e.target.value)}
                        placeholder="Wpisz hasło..."
                        autoFocus
                        className="mt-1"
                      />
                    </div>
                    <DialogFooter className="pt-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setRevealDialogOpen(false)}>Anuluj</Button>
                      <Button type="submit" size="sm" disabled={revealLoading || !revealPassword.trim()}>
                        {revealLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                        Odszyfruj klucze
                      </Button>
                    </DialogFooter>
                  </form>
                ) : (
                  <div className="space-y-3 pt-2">
                    <p className="text-xs text-muted-foreground">Odszyfrowane klucze:</p>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {revealedKeys.map((k) => (
                        <div key={k.id} className="p-2.5 rounded border border-border bg-muted/30 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-foreground">{k.label}</span>
                            <span className="text-[10px] text-muted-foreground">{k.status}</span>
                          </div>
                          {k.key ? (
                            <div className="flex items-center gap-1.5 mt-1">
                              <code className="block flex-1 truncate font-mono text-[11px] bg-background p-1.5 rounded border">{k.key}</code>
                              <Button size="icon" variant="outline" className="h-7 w-7 shrink-0" onClick={() => copyKey(k.key!)} title="Kopiuj">
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <p className="text-[11px] text-destructive italic">Nie udało się odszyfrować (inne hasło)</p>
                          )}
                        </div>
                      ))}
                    </div>
                    <DialogFooter className="pt-2">
                      <Button type="button" size="sm" onClick={() => setRevealDialogOpen(false)}>Zamknij</Button>
                    </DialogFooter>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Modal: Generuj nowy klucz */}
            <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
              <DialogContent className="max-w-md bg-card">
                <DialogHeader>
                  <DialogTitle className="font-display text-lg font-bold">Generuj nowy klucz awaryjny</DialogTitle>
                  <DialogDescription className="text-xs">
                    Zostanie wygenerowany 256-bitowy losowy klucz kryptograficzny.
                  </DialogDescription>
                </DialogHeader>
                {!generatedKey ? (
                  <form onSubmit={handleGenerateKey} className="space-y-3 pt-2">
                    <div>
                      <label className="text-xs font-semibold text-foreground">Etykieta (opcjonalnie)</label>
                      <Input
                        type="text"
                        value={generateLabel}
                        onChange={(e) => setGenerateLabel(e.target.value)}
                        placeholder="np. Laptop zapasowy, Grudzień 2026..."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground">Hasło autoryzacji odzyskiwania</label>
                      <Input
                        type="password"
                        value={generatePassword}
                        onChange={(e) => setGeneratePassword(e.target.value)}
                        placeholder="Wpisz hasło..."
                        className="mt-1"
                      />
                    </div>
                    <DialogFooter className="pt-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setGenerateDialogOpen(false)}>Anuluj</Button>
                      <Button type="submit" size="sm" disabled={generateLoading || !generatePassword.trim()}>
                        {generateLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                        Generuj klucz
                      </Button>
                    </DialogFooter>
                  </form>
                ) : (
                  <div className="space-y-3 pt-2">
                    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
                      <strong>Ważne:</strong> Zapisz ten klucz w bezpiecznym menedżerze haseł. Jest wyświetlany tylko teraz!
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-1">{generatedKey.label}</p>
                      <code className="block break-all font-mono text-xs bg-muted p-2 rounded border border-border select-all">
                        {generatedKey.key}
                      </code>
                    </div>
                    <DialogFooter className="pt-2 flex items-center justify-between">
                      <Button type="button" variant="outline" size="sm" onClick={() => copyKey(generatedKey.key)}>
                        <Copy className="h-3.5 w-3.5 mr-1.5" /> Kopiuj klucz
                      </Button>
                      <Button type="button" size="sm" onClick={() => setGenerateDialogOpen(false)}>Gotowe</Button>
                    </DialogFooter>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Modal: Unieważnij klucz */}
            <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
              <DialogContent className="max-w-md bg-card">
                <DialogHeader>
                  <DialogTitle className="font-display text-lg font-bold text-destructive">Unieważnij klucz awaryjny</DialogTitle>
                  <DialogDescription className="text-xs">
                    Czy na pewno chcesz unieważnić ten klucz? Ta operacja jest nieodwracalna.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleRevokeKey} className="space-y-3 pt-2">
                  <div>
                    <label className="text-xs font-semibold text-foreground">Potwierdź hasłem odzyskiwania</label>
                    <Input
                      type="password"
                      value={revokePassword}
                      onChange={(e) => setRevokePassword(e.target.value)}
                      placeholder="Wpisz hasło..."
                      className="mt-1"
                    />
                  </div>
                  <DialogFooter className="pt-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setRevokeDialogOpen(false)}>Anuluj</Button>
                    <Button type="submit" variant="destructive" size="sm" disabled={revokeLoading || !revokePassword.trim()}>
                      {revokeLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                      Unieważnij klucz
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={Boolean(previewImage)} onOpenChange={(o) => !o && setPreviewImage(null)}>
              <DialogContent className="max-w-4xl p-4 bg-card">
                <DialogHeader>
                  <DialogTitle className="text-base font-bold text-ink">Podgląd wygenerowanej grafiki</DialogTitle>
                </DialogHeader>
                {previewImage && (
                  <div className="overflow-hidden rounded-md border mt-2">
                    <img src={previewImage} alt="Podgląd grafiki" className="w-full h-auto block" />
                  </div>
                )}
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (!previewImage) return;
                      const a = document.createElement("a");
                      a.href = previewImage;
                      a.download = "sejmsim-scenariusz-1200x630.png";
                      a.click();
                    }}
                  >
                    Pobierz plik PNG
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setPreviewImage(null)}>
                    Zamknij
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <section className="panel p-5">
              <h2 className="font-display text-lg font-bold text-ink">Tworzone scenariusze</h2>
              <p className="mt-1 text-xs text-muted-foreground">Zapisy w przeglądarce, linki zapisane na serwerze i pobrane grafiki. Bez treści opisów i autorów.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {summary.scenarioTraits.map((t) => <span key={t.tag} className="rounded-full border px-2 py-1 text-xs">{t.tag}: <b className="num">{t.count}</b></span>)}
                <span className="rounded-full border px-2 py-1 text-xs">grafiki do posta: <b className="num">{summary.socialImageDownloads}</b></span>
              </div>
              <table className="mt-3 w-full text-xs">
                <thead><tr className="text-left text-muted-foreground"><th>Miesiąc</th><th>Zapisy</th><th>Linki serwera</th><th>Grafiki</th></tr></thead>
                <tbody>{summary.scenarioActivityByMonth.map((m) => <tr key={m.month} className="border-t"><td className="py-1">{m.month}</td><td className="num">{m.saves}</td><td className="num">{m.links}</td><td className="num">{m.images}</td></tr>)}</tbody>
              </table>
            </section>

            <section className="panel p-5">
              <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" /> Wejścia według dnia tygodnia
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">Kiedy w tygodniu ludzie faktycznie otwierają symulator (czas polski).</p>
              <div className="mt-4 grid grid-cols-7 gap-2">
                {summary.weekdayVisits.map(({ label, count }) => {
                  const max = Math.max(1, ...summary.weekdayVisits.map((day) => day.count));
                  return (
                    <div key={label} className="flex flex-col items-center gap-1 text-center">
                      <div className="flex h-24 w-full items-end rounded-md bg-muted">
                        <div className="w-full rounded-md bg-primary" style={{ height: `${Math.max(6, (count / max) * 100)}%` }} />
                      </div>
                      <span className="text-[10px] font-semibold text-muted-foreground">{label.slice(0, 3)}</span>
                      <span className="num text-xs font-bold text-ink">{count}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" /> Opinie z formularza
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {summary.feedback.count === 0
                      ? "Nikt jeszcze nie wysłał opinii. Zapisują się w bazie nawet wtedy, gdy powiadomienie na Discordzie się nie uda."
                      : `${summary.feedback.count} opinii, średnia ocena ${summary.feedback.avgRating?.toFixed(1) ?? "—"}/10.`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {summary.webhookConfigured ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Discord Webhook aktywny
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20" title="Ustaw DISCORD_FEEDBACK_WEBHOOK_URL w pliku .env">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      Discord Webhook niepodłączony
                    </span>
                  )}
                  {summary.webhookConfigured ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTestWebhook}
                      disabled={testingWebhook}
                      className="text-xs h-7 px-2.5"
                    >
                      {testingWebhook ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                      Testuj webhook
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3">
                {summary.feedback.recent.map((item, index) => (
                  <article key={`${item.created_at}-${index}`} className="rounded-lg border border-border/70 p-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-ink">
                        {item.name?.trim() || "Anonim"} · {item.rating}/10
                      </p>
                      <p className="num text-[11px] text-muted-foreground">{new Date(item.created_at).toLocaleString("pl-PL")}</p>
                    </div>
                    {item.email ? <p className="mt-0.5 text-xs text-muted-foreground">{item.email}</p> : null}
                    <p className="mt-2 text-sm text-foreground">{item.message}</p>
                  </article>
                ))}
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
