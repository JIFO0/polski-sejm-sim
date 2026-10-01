import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, BarChart3, Loader2 } from "lucide-react";
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
const PARTY_COLORS = Object.fromEntries(PARTIES.map((p) => [p.id, p.color]));

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
        className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-5 py-3.5"
        aria-label="Nawigacja strony statystyk"
      >
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Wróć do symulatora
          </Link>
        </Button>
      </nav>

      <main className="mx-auto flex max-w-4xl flex-col gap-8 px-5 pb-16 pt-6">
        <header>
          <p className="eyebrow">Panel właściciela</p>
          <h1 className="font-display mt-1 text-3xl font-bold text-ink">
            <BarChart3 className="mr-2 inline h-7 w-7 align-[-0.15em]" /> Statystyki strony
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Zbiorcze, anonimowe dane z ostatnich 90 dni. Strona nie zapisuje ciasteczek, adresów IP
            ani żadnych identyfikatorów odwiedzających, tylko same zdarzenia i wartości.
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
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {[
                { label: "Wejścia na stronę", value: summary.pageViews },
                { label: "Zapisane scenariusze", value: summary.scenarioSaves },
                { label: "Pobrane scenariusze", value: summary.scenarioDownloads },
                { label: "Aktywne linki", value: summary.activeShares },
                { label: "Zmiany frekwencji", value: summary.turnoutSets },
              ].map((card) => (
                <div key={card.label} className="panel p-4">
                  <p className="num text-2xl font-bold text-ink">{card.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{card.label}</p>
                </div>
              ))}
            </section>

            <section className="panel p-5">
              <h2 className="font-display text-lg font-bold text-ink">Frekwencja ustawiana przez odwiedzających</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {summary.avgTurnout !== null
                  ? `Średnia ustawiana frekwencja to ${summary.avgTurnout.toFixed(1)}% (z ${summary.turnoutSets} zmian).`
                  : "Nikt jeszcze nie zmienił frekwencji."}
              </p>
            </section>

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
              <h2 className="font-display text-lg font-bold text-ink">Udostępnione linki</h2>
              <p className="mt-1 text-xs text-muted-foreground">Linki wygasają po 7 dniach. Jeden adres może mieć 3 aktywne naraz.</p>
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
                      <tr><td colSpan={5} className="py-3 text-muted-foreground">Brak linków.</td></tr>
                    ) : shares.map((sh) => {
                      const live = sh.active && new Date(sh.expires_at).getTime() > Date.now();
                      return (
                        <tr key={sh.id} className="border-t border-border/60">
                          <td className="py-1.5">
                            <a href={`/?s=${sh.id}`} target="_blank" rel="noreferrer" className="font-medium text-ink underline-offset-2 hover:underline">{sh.name}</a>
                          </td>
                          <td className="num py-1.5 text-xs">{new Date(sh.created_at).toLocaleString("pl-PL")}</td>
                          <td className="num py-1.5 text-xs">{new Date(sh.expires_at).toLocaleString("pl-PL")}</td>
                          <td className="num py-1.5 text-right">{sh.views}</td>
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

            <section className="panel p-5">
              <h2 className="font-display text-lg font-bold text-ink">Wszystkie zdarzenia</h2>
              <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                {summary.eventCounts.map(({ event, count }) => (
                  <div key={event} className="flex justify-between border-b border-border/50 py-1 text-sm">
                    <span>{EVENT_LABELS[event as keyof typeof EVENT_LABELS] ?? event}</span>
                    <span className="num font-semibold text-ink">{count}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel p-5">
              <h2 className="font-display text-lg font-bold text-ink">Rozkład ustawianej frekwencji</h2>
              <div className="mt-3 flex flex-col gap-1.5">
                {summary.turnoutBuckets.length === 0 ? <p className="text-sm text-muted-foreground">Brak danych.</p> : summary.turnoutBuckets.map(({ bucket, count }) => {
                  const max = Math.max(...summary.turnoutBuckets.map((b) => b.count));
                  return (
                    <div key={bucket} className="flex items-center gap-3 text-sm">
                      <span className="num w-20 shrink-0">{bucket}</span>
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(count / max) * 100}%` }} /></div>
                      <span className="num w-10 text-right font-semibold">{count}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="panel p-5">
              <h2 className="font-display text-lg font-bold text-ink">Wejścia wg godziny (czas polski)</h2>
              <div className="mt-4 flex h-32 items-end gap-0.5">
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

            <section className="panel p-5">
              <h2 className="font-display text-lg font-bold text-ink">Szczegóły (urządzenia, progi, dostępność)</h2>
              <div className="mt-3 grid max-h-80 gap-1.5 overflow-y-auto sm:grid-cols-2">
                {summary.metaCounts.map(({ key: k, count }) => {
                  const [ev, ...rest] = k.split(":");
                  return (
                    <div key={k} className="flex justify-between gap-2 border-b border-border/50 py-1 text-sm">
                      <span className="truncate"><span className="text-muted-foreground">{EVENT_LABELS[ev as keyof typeof EVENT_LABELS] ?? ev}:</span> {rest.join(":")}</span>
                      <span className="num font-semibold text-ink">{count}</span>
                    </div>
                  );
                })}
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
