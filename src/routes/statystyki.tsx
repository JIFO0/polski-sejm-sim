import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, BarChart3, Database, HardDrive, Laptop, Link2, Loader2, MapPin, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAnalyticsSummary } from "@/lib/analytics.functions";
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
      }
    } catch {
      setError("Nie udało się pobrać statystyk.");
    } finally {
      setLoading(false);
    }
  };

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
            Zbiorcze, anonimowe dane behawioralne z ostatnich 90 dni. System działa w 100% lokalnie na serwerze (baza SQLite), nie korzysta z zewnętrznych trackerów ani chmury Lovable, nie zapisuje ciasteczek, adresów IP ani żadnych danych osobowych.
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
            {/* Karty podsumowania */}
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { label: "Wejścia na stronę", value: summary.pageViews },
                { label: "Zapisane warianty", value: summary.scenarioSaves },
                { label: "Pobrane pliki", value: summary.scenarioDownloads },
                { label: "Aktywne linki (max 5/IP)", value: summary.activeShares },
                { label: "Zmiany frekwencji", value: summary.turnoutSets },
                { label: "Wszystkie akcje", value: summary.totalEvents },
              ].map((card) => (
                <div key={card.label} className="panel p-4">
                  <p className="num text-2xl font-bold text-ink">{card.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{card.label}</p>
                </div>
              ))}
            </section>

            {/* Stan magazynu i limit 4GB */}
            <section className="panel p-5 bg-surface/90 border-border">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <HardDrive className="h-5 w-5 text-primary" />
                  <div>
                    <h2 className="font-display text-base font-bold text-ink">Magazyn lokalny & Limit rozmiaru 4 GB</h2>
                    <p className="text-xs text-muted-foreground">Baza SQLite na urządzeniu/serwerze, niezależna od Lovable</p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" /> Limit 4 GB aktywny: {summary.dbStats.sizeFormatted}
                </div>
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
                Na podstawie zapisywanych, pobieranych i udostępnianych scenariuszy.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                {summary.avgShares.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Brak zapisanych scenariuszy.</p>
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

            {/* Wejścia dzienne i godziny */}
            <div className="grid gap-6 md:grid-cols-2">
              <section className="panel p-5">
                <h2 className="font-display text-lg font-bold text-ink">Wejścia dzienne</h2>
                <div className="mt-3 max-h-72 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground">
                        <th className="py-1 font-medium">Dzień</th>
                        <th className="py-1 text-right font-medium">Wejścia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.visitsByDay.map(({ day, count }) => (
                        <tr key={day} className="border-t border-border/60">
                          <td className="num py-1.5 text-foreground">{day}</td>
                          <td className="num py-1.5 text-right font-semibold text-ink">{count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="panel p-5">
                <h2 className="font-display text-lg font-bold text-ink">Wejścia wg godziny (czas polski)</h2>
                <div className="mt-6 flex h-40 items-end gap-0.5">
                  {Array.from({ length: 24 }, (_, h) => {
                    const v = summary.pageViewsByHourUtc[(h + 22) % 24] ?? 0;
                    const max = Math.max(1, ...summary.pageViewsByHourUtc);
                    return (
                      <div key={h} className="flex flex-1 flex-col items-center gap-1" title={`${h}:00 — ${v}`}>
                        <div className="w-full rounded-t bg-primary/80" style={{ height: `${(v / max) * 100}%` }} />
                        <span className="num text-[9px] text-muted-foreground">{h}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

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

            <Button variant="outline" size="sm" className="self-start" onClick={() => void load()}>
              Odśwież dane
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
