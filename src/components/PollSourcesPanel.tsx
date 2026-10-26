import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, ExternalLink, Search } from "lucide-react";
import { PARTIES } from "@/data/parties";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { OwnWorkNotice } from "@/components/OwnWorkNotice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { activeSilence, currentPollAverage, electoralThreshold, formatPolishDate, pollsVisibleAt, type Poll } from "@/lib/poll-average";
import { useLanguage } from "@/lib/i18n";

const label = (id: string) => PARTIES.find((party) => party.id === id)?.short ?? id;
const color = (id: string) => PARTIES.find((party) => party.id === id)?.color ?? "var(--primary)";
const pct = (value: number) => `${value.toFixed(1)}%`;

function fieldwork(poll: Poll) {
  return [poll.fieldworkFrom, poll.fieldworkTo].filter(Boolean).map(formatPolishDate).join(" / ");
}

function isCbos(poll: Poll) {
  return (poll.institute ?? "").includes("CBOS") || (poll.sourceUrl ?? "").includes("cbos.pl");
}

function methodText(poll: Poll) {
  return poll.methodDetail || poll.method || "";
}

export function PollSourcesPanel() {
  const lang = useLanguage();
  const en = lang === "en";
  const [search, setSearch] = useState("");
  const available = [...new Set(pollsVisibleAt(new Date()).flatMap((poll) => Object.keys(poll.results ?? {})))].filter((id) => id !== "inne");
  const [selected, setSelected] = useState<string[]>(available);
  const [expanded, setExpanded] = useState<string | null>(null);
  const moment = new Date();
  const average = currentPollAverage(moment);
  const silence = activeSilence(moment);
  const polls = pollsVisibleAt(moment).filter((poll) => poll.results && Object.keys(poll.results).length > 0);
  const filtered = polls.filter((poll) => `${poll.institute ?? ""} ${poll.commissioner ?? ""} ${poll.publicationTitle ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  const series = useMemo(() => [...polls].sort((a, b) => (a.publishedAt ?? "").localeCompare(b.publishedAt ?? "")), [polls]);
  const entries = Object.entries(average?.results ?? {}).filter(([id]) => id !== "inne").sort((a, b) => b[1] - a[1]);
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  const max = Math.max(40, ...series.flatMap((poll) => selected.map((id) => poll.results?.[id] ?? 0)));
  const x = (index: number) => 36 + index * 588 / Math.max(1, series.length - 1);
  const y = (value: number) => 16 + (1 - value / max) * 192;

  return (
    <div className="space-y-3">
    <CollapsibleSection title={en ? "Opinion polls" : "Sondaże"} defaultOpen={false}>
      <section className="border-x border-b border-border bg-surface/80 px-4 py-5 backdrop-blur-sm md:px-6" aria-labelledby="polls-heading">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">SejmSim</p>
            <h2 id="polls-heading" className="mt-1 font-display text-xl font-bold text-ink">{en ? "Polling overview" : "Przegląd sondaży"}</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{en ? "Weighted average of published polls. An analytical starting point, not an election forecast." : "Ważona średnia opublikowanych badań. Punkt wyjścia do analiz, nie prognoza wyborów."}</p>
          </div>
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
            <div>{en ? "Last polling update" : "Ostatnia aktualizacja sondaży"}<time dateTime="2026-10-22" className="mt-1 block font-semibold text-ink">{en ? "22 October 2026" : "22 października 2026"}</time></div>
          </div>
        </div>
        {silence && <p className="mt-4 border-l-2 border-primary bg-primary/10 p-3 text-sm">{en ? "Polling updates are paused during the election silence period." : "Trwa cisza wyborcza. Aktualizacje sondaży są wstrzymane."}</p>}
        <Tabs defaultValue="average" className="mt-6">
          <TabsList className="h-auto max-w-full flex-wrap">
            <TabsTrigger value="average">{en ? "Average" : "Średnia"}</TabsTrigger>
            <TabsTrigger value="trend">{en ? "Trends" : "Trendy"}</TabsTrigger>
            <TabsTrigger value="sources">{en ? "Polls & sources" : "Badania i źródła"} ({polls.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="average" className="mt-5">
            <OwnWorkNotice className="mb-4" />
            {average ? <>
              <div className="mb-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                <span>{en ? "Polls included" : "Uwzględnione badania"}: <strong className="text-ink">{average.polls.length}</strong></span>
                <span>{en ? "Average reference date" : "Data średniej"}: <strong className="text-ink">{formatPolishDate(average.asOfDate)}</strong></span>
                <span>{en ? "Window: 30 days" : "Okno: 30 dni"}{average.extendedBeyondWindow ? (en ? " (extended)" : " (rozszerzone)") : ""}</span>
              </div>
              <div className="grid gap-x-10 md:grid-cols-2">
                {entries.map(([id, value]) => {
                  const threshold = electoralThreshold(id);
                  const margin = average.margins[id];
                  return <div key={id} className="border-b border-border/70 py-3">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2 font-semibold text-ink"><span className="h-2.5 w-2.5 rounded-full" style={{ background: color(id) }} />{label(id)}</span>
                      <span className="num font-bold text-ink">{pct(value)} {margin != null && <span className="font-normal text-xs text-muted-foreground">±{margin.toFixed(1)}</span>}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${value}%`, background: color(id) }} /></div>
                    {threshold != null && value < threshold && <p className="mt-1.5 text-[11px] text-muted-foreground">{en ? "Below electoral threshold" : "Poniżej progu wyborczego"} {threshold}%</p>}
                  </div>;
                })}
              </div>
              <p className="mt-4 max-w-3xl text-xs leading-relaxed text-muted-foreground">{en ? "± is an approximate 95% statistical margin, assuming independent simple random samples. It does not cover weighting or undecided voters. A missing sample size means no margin is shown." : "± to przybliżony błąd statystyczny 95% dla niezależnych prób losowych. Nie uwzględnia ważenia ani niezdecydowanych. Bez liczebności próby nie pokazujemy przedziału."}</p>
            </> : <p className="text-sm text-muted-foreground">{en ? "No complete polls are available." : "Brak kompletnych sondaży w zbiorze."}</p>}
          </TabsContent>
          <TabsContent value="trend" className="mt-5">
            <div className="flex flex-wrap gap-2">
              {available.map((id) => <Button key={id} size="sm" variant={selected.includes(id) ? "secondary" : "outline"} aria-pressed={selected.includes(id)} onClick={() => toggle(id)} className="gap-2"><span className="h-2 w-2 rounded-full" style={{ background: color(id) }} />{label(id)}</Button>)}
            </div>
            {selected.length === 0 ? <p className="py-12 text-center text-sm text-muted-foreground">{en ? "Select a party" : "Wybierz partię"}</p> : <figure className="mt-4">
              <svg viewBox="0 0 640 246" className="h-auto max-h-80 w-full" role="img" aria-label={en ? "Support in successive polls" : "Poparcie w kolejnych sondażach"}>
                {[0, 10, 20, 30, 40].map((tick) => <g key={tick}><line x1="36" x2="624" y1={y(tick)} y2={y(tick)} stroke="currentColor" className="text-border" /><text x="0" y={y(tick) + 4} className="fill-muted-foreground text-[11px]">{tick}%</text></g>)}
                {selected.map((id) => {
                  let started = false;
                  const path = series.map((poll, index) => {
                    const value = poll.results?.[id];
                    if (value == null) { started = false; return ""; }
                    const command = started ? "L" : "M"; started = true;
                    return `${command}${x(index)},${y(value)}`;
                  }).join(" ");
                  return <g key={id}><path d={path} fill="none" stroke={color(id)} strokeWidth="2.5" />{series.map((poll, index) => poll.results?.[id] != null ? <circle key={poll.id} cx={x(index)} cy={y(poll.results[id])} r="4" fill={color(id)}><title>{label(id)} {pct(poll.results[id])}, {poll.institute}, {formatPolishDate(poll.publishedAt)}</title></circle> : null)}</g>;
                })}
                {series.filter((_, index) => index === 0 || index === series.length - 1).map((poll) => <text key={poll.id} x={x(series.indexOf(poll))} y="235" textAnchor={series.indexOf(poll) === 0 ? "start" : "end"} className="fill-muted-foreground text-[11px]">{formatPolishDate(poll.publishedAt)}</text>)}
              </svg>
              <figcaption className="text-xs text-muted-foreground">{en ? "Individual polls ordered by publication date" : "Pojedyncze badania według daty publikacji"}</figcaption>
              <OwnWorkNotice className="mt-3" />
              <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-border"><th scope="col" className="py-2">{en ? "Poll / date" : "Badanie / data"}</th>{selected.map((id) => <th scope="col" key={id} className="px-2">{label(id)}</th>)}<th scope="col" className="px-2">{en ? "Source" : "Źródło"}</th></tr></thead><tbody>{series.map((poll) => <tr key={poll.id} className="border-b border-border/60"><th scope="row" className="py-2 font-normal">{poll.institute} <span className="text-muted-foreground">{formatPolishDate(poll.publishedAt)}</span></th>{selected.map((id) => <td key={id} className="num px-2">{poll.results?.[id] != null ? pct(poll.results[id]) : "-"}</td>)}<td className="px-2">{poll.sourceUrl ? <a href={poll.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 whitespace-nowrap text-primary hover:underline" aria-label={`${en ? "Source" : "Źródło"}: ${poll.institute}, ${formatPolishDate(poll.publishedAt)}`}>{en ? "Publication" : "Publikacja"}<ExternalLink className="h-3 w-3" /></a> : "-"}</td></tr>)}</tbody></table></div>
            </figure>}
          </TabsContent>
          <TabsContent value="sources" className="mt-5">
            <div className="relative max-w-sm"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" aria-label={en ? "Find a poll" : "Szukaj badania"} placeholder={en ? "Institute or commissioner" : "Ośrodek lub zleceniodawca"} /></div>
            <div className="mt-4 divide-y divide-border">
              {filtered.map((poll) => <article key={poll.id} className="py-3">
                <Button variant="ghost" className="h-auto w-full justify-between gap-3 whitespace-normal px-0 text-left" onClick={() => setExpanded(expanded === poll.id ? null : poll.id)} aria-expanded={expanded === poll.id}>
                  <span><span className="block font-semibold text-ink">{poll.institute ?? (en ? "Unknown institute" : "Ośrodek niepodany")}</span><span className="mt-1 block text-xs font-normal text-muted-foreground">{poll.publicationTitle ? `${poll.publicationTitle} / ` : ""}{formatPolishDate(poll.publishedAt)} / n = {poll.sampleSize ?? "n/a"}{poll.commissioner ? ` / ${poll.commissioner}` : ""}</span></span>
                  <span className="text-xs text-primary">{expanded === poll.id ? (en ? "Hide" : "Zwiń") : (en ? "Results" : "Wyniki")}</span>
                </Button>
                <div className="mt-2 space-y-1 text-xs leading-relaxed text-muted-foreground">
                  <p>{en ? "Fieldwork" : "Termin badania"}: {fieldwork(poll) || "n/a"}</p>
                  <p>{en ? "Sample size" : "Wielkość próby"}: N = {poll.sampleSize ?? "n/a"}</p>
                  <p>{en ? "Method" : "Metoda"}: {methodText(poll) || (en ? "not stated in the source" : "niepodana w źródle")}</p>
                  {poll.sourceUrl && <a href={poll.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">{isCbos(poll) ? "cbos.pl" : (en ? "Source publication" : "Publikacja źródłowa")}<ExternalLink className="h-3 w-3" /></a>}
                  {isCbos(poll) && <p className="text-ink">{en ? "Results used and processed by sejmsim.pl" : "Wyniki wykorzystane i przetworzone przez sejmsim.pl"}</p>}
                </div>
                {expanded === poll.id && <div className="pt-3"><div className="mt-2 flex flex-wrap gap-3">{Object.entries(poll.results ?? {}).sort((a, b) => b[1] - a[1]).map(([id, value]) => <span key={id} className="inline-flex items-center gap-1.5 text-xs"><span className="h-2 w-2 rounded-full" style={{ background: color(id) }} />{label(id)} <strong className="num">{pct(value)}</strong></span>)}</div></div>}
              </article>)}
              {filtered.length === 0 && <p className="py-6 text-sm text-muted-foreground">{en ? "No matching polls" : "Brak pasujących badań"}</p>}
            </div>
          </TabsContent>
        </Tabs>
        <div className="mt-5 border-t border-border pt-3"><Button asChild variant="link" className="h-auto px-0 text-xs"><Link to="/zrodla">{en ? "Sources and methodology" : "Źródła i metodologia"}<ExternalLink className="ml-1 h-3 w-3" /></Link></Button></div>
      </section>
    </CollapsibleSection>
    </div>
  );
}
