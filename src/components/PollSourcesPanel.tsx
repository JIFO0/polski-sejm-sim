import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";

import { PARTIES } from "@/data/parties";
import {
  POLLS,
  activeSilence,
  currentPollAverage,
  electoralThreshold,
  formatPolishDate,
  pollsVisibleAt,
  proportionMargin,
  recentPolls,
  type Poll,
} from "@/lib/poll-average";

const now = () => new Date();

function partyLabel(id: string): string {
  return PARTIES.find((party) => party.id === id)?.short ?? id;
}

function resultLine(poll: Poll): string {
  const entries = Object.entries(poll.results ?? {}).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return "brak wyników";
  return entries.map(([id, value]) => `${partyLabel(id)} ${value.toFixed(1)}%`).join(" · ");
}

const TREND_PARTIES = ["ko", "pis", "konf"] as const;

function PollTrend({ polls }: { polls: Poll[] }) {
  const series = polls
    .filter((poll) => poll.publishedAt && poll.results)
    .slice()
    .sort((a, b) => (a.publishedAt ?? "").localeCompare(b.publishedAt ?? ""));
  if (series.length < 2) return null;

  const width = 640;
  const height = 200;
  const pad = { left: 32, right: 12, top: 16, bottom: 28 };
  const values = series.flatMap((poll) =>
    TREND_PARTIES.map((id) => poll.results?.[id]).filter((value): value is number => value != null),
  );
  const max = Math.max(40, ...values);
  const xAt = (index: number) =>
    pad.left + (index * (width - pad.left - pad.right)) / Math.max(1, series.length - 1);
  const yAt = (value: number) => pad.top + (1 - value / max) * (height - pad.top - pad.bottom);
  const pathFor = (partyId: (typeof TREND_PARTIES)[number]) =>
    series
      .map((poll, index) => {
        const value = poll.results?.[partyId];
        if (value == null) return null;
        return `${index === 0 ? "M" : "L"} ${xAt(index).toFixed(1)} ${yAt(value).toFixed(1)}`;
      })
      .filter(Boolean)
      .join(" ");

  return (
    <figure className="mt-5">
      <figcaption className="font-display text-base font-bold text-ink">
        Trend trzech największych komitetów
      </figcaption>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby="trend-opis"
        className="mt-2 h-auto w-full"
      >
        <title id="trend-opis">
          Wykres poparcia KO, PiS i Konfederacji w kolejnych sondażach zbioru SejmSim
        </title>
        {[0, 10, 20, 30, 40].map((tick) => (
          <g key={tick}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={yAt(tick)}
              y2={yAt(tick)}
              stroke="currentColor"
              className="text-border"
            />
            <text x={0} y={yAt(tick) + 4} className="fill-muted-foreground text-[11px]">
              {tick}
            </text>
          </g>
        ))}
        {TREND_PARTIES.map((partyId) => (
          <path
            key={partyId}
            d={pathFor(partyId)}
            fill="none"
            stroke={PARTIES.find((party) => party.id === partyId)?.color ?? "#334155"}
            strokeWidth={2.5}
          />
        ))}
      </svg>
      <ul className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
        {TREND_PARTIES.map((partyId) => (
          <li key={partyId} className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-4 rounded-sm"
              style={{ background: PARTIES.find((party) => party.id === partyId)?.color }}
            />
            {partyLabel(partyId)}
          </li>
        ))}
      </ul>
      <table className="mt-3 w-full text-left text-xs">
        <caption className="sr-only">
          Poparcie KO, PiS i Konfederacji w sondażach użytych na wykresie
        </caption>
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th scope="col" className="py-1 pr-2 font-semibold">
              Publikacja
            </th>
            <th scope="col" className="py-1 pr-2 font-semibold">
              Ośrodek
            </th>
            {TREND_PARTIES.map((partyId) => (
              <th key={partyId} scope="col" className="py-1 pr-2 font-semibold">
                {partyLabel(partyId)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {series.map((poll) => (
            <tr key={poll.id} className="border-b border-border/70">
              <th scope="row" className="py-1 pr-2 font-medium text-foreground">
                {formatPolishDate(poll.publishedAt)}
              </th>
              <td className="py-1 pr-2">{poll.institute ?? "niepodany"}</td>
              {TREND_PARTIES.map((partyId) => (
                <td key={partyId} className="py-1 pr-2">
                  {poll.results?.[partyId] != null
                    ? `${poll.results[partyId].toFixed(1)}%`
                    : "brak"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function fieldwork(poll: Poll): string {
  if (poll.fieldworkFrom && poll.fieldworkTo) {
    return `${formatPolishDate(poll.fieldworkFrom)} – ${formatPolishDate(poll.fieldworkTo)}`;
  }
  if (poll.fieldworkFrom || poll.fieldworkTo)
    return formatPolishDate(poll.fieldworkFrom ?? poll.fieldworkTo);
  return "daty badania niepodane";
}

export function PollSourcesPanel() {
  const moment = now();
  const silence = activeSilence(moment);
  const average = currentPollAverage(moment);
  const latest = recentPolls(moment);
  const trendPolls = pollsVisibleAt(moment).filter(
    (poll) => poll.results != null && Object.keys(poll.results).length > 0,
  );

  return (
    <section className="panel p-5 md:p-6" aria-labelledby="sondaze-sejm-sim">
      <p className="eyebrow">Sondaże</p>
      <h2 id="sondaze-sejm-sim" className="mt-1 font-display text-2xl font-bold text-ink">
        Średnia liczona przez SejmSim
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Serwis sam liczy średnią z publicznie opublikowanych sondaży zebranych w{" "}
        <code className="text-foreground">src/data/polls.json</code>. To nie jest sondaż SejmSim ani
        prognoza wyniku wyborów. Symulacja mandatów pokazuje skutki przyjętych założeń.
      </p>

      {silence ? (
        <p className="mt-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground">
          Trwa cisza wyborcza ({silence.label}, do {new Date(silence.until).toLocaleString("pl-PL")}
          ). W tym czasie nie publikujemy nowych wyników sondaży ani nie aktualizujemy średniej.
        </p>
      ) : null}

      {average ? (
        <div className="mt-5">
          <p className="text-sm text-muted-foreground">
            Data średniej:{" "}
            <span className="font-semibold text-foreground">
              {formatPolishDate(average.asOfDate)}
            </span>
            {average.extendedBeyondWindow
              ? ". W ostatnich 30 dniach było za mało badań, więc średnia sięga też starszych sondaży."
              : ". Średnia z sondaży opublikowanych w ostatnich 30 dniach (albo z co najmniej czterech najnowszych)."}
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {Object.entries(average.results)
              .sort((a, b) => b[1] - a[1])
              .map(([id, value]) => {
                const threshold = electoralThreshold(id);
                const below = threshold != null && value < threshold;
                const margin = average.margins[id];
                return (
                  <li
                    key={id}
                    className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-ink"
                  >
                    {partyLabel(id)} {value.toFixed(1)}%
                    {margin != null ? ` ±${margin.toFixed(1)}` : ""}
                    {below
                      ? ` (poniżej progu ${threshold}%${threshold === 8 ? " dla koalicji" : ""})`
                      : ""}
                  </li>
                );
              })}
          </ul>
          <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            Znak ± to przybliżony błąd statystyczny 95% przy założeniu losowania prostego i
            niezależnych sondaży. Nie uwzględnia sposobu ważenia próby przez ośrodek ani osób
            niezdecydowanych. Gdy próby brakuje, przedziału nie pokazujemy.
          </p>
          <PollTrend polls={trendPolls} />
          <h3 className="mt-5 font-display text-base font-bold text-ink">
            Sondaże użyte do średniej
          </h3>
          <ul className="mt-2 divide-y divide-border text-sm">
            {average.polls.map((poll) => (
              <li key={poll.id} className="py-2">
                <p className="font-semibold text-foreground">
                  {poll.institute ?? "Ośrodek niepodany"}
                </p>
                <p className="text-muted-foreground">
                  publikacja {formatPolishDate(poll.publishedAt)} · badanie {fieldwork(poll)} ·
                  próba {poll.sampleSize ?? "niepodana"}
                  {poll.method ? ` · ${poll.method}` : ""}
                </p>
                {poll.sourceUrl ? (
                  <a
                    href={poll.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-primary hover:underline"
                  >
                    Źródło <ExternalLink className="ml-1 h-3.5 w-3.5" />
                  </a>
                ) : (
                  <p className="text-muted-foreground">Link do źródła niepodany</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          W zbiorze nie ma jeszcze ani jednego kompletnego sondażu (ośrodek może być pusty, ale
          potrzebne są data publikacji i wyniki). Symulator startuje więc z profilu okręgowego, a
          nie ze średniej sondażowej. Wcześniejsza wersja wskazywała średnią ewybory.eu z 30
          września 2026 — tych liczb nie przepisujemy jako własnego badania, bo w repozytorium nie
          było pojedynczych sondaży z próbą i datami.
        </p>
      )}

      <h3 className="mt-5 font-display text-base font-bold text-ink">Ostatnie sondaże</h3>
      {latest.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Brak sondaży z wynikami{POLLS.length > 0 ? " widocznych poza ciszą wyborczą" : ""}.
        </p>
      ) : (
        <ul className="mt-2 space-y-3">
          {latest.map((poll) => (
            <li key={poll.id} className="rounded-lg border border-border px-3 py-2 text-sm">
              <p className="font-semibold text-foreground">
                {poll.institute ?? "Ośrodek niepodany"} · {formatPolishDate(poll.publishedAt)}
              </p>
              <p className="text-muted-foreground">
                {fieldwork(poll)} · próba {poll.sampleSize ?? "niepodana"}
                {poll.commissioner ? ` · zleceniodawca: ${poll.commissioner}` : ""}
              </p>
              <p className="mt-1 text-foreground">
                {resultLine(poll)}
                {poll.sampleSize != null && poll.results
                  ? ` Przybliżony błąd dla wyniku 50% przy tej próbie: ±${proportionMargin(50, poll.sampleSize)?.toFixed(1) ?? "—"} pkt.`
                  : ""}
              </p>
              {poll.sourceUrl ? (
                <a
                  href={poll.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center text-primary hover:underline"
                >
                  Źródło <ExternalLink className="ml-1 h-3.5 w-3.5" />
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-sm">
        <Link to="/zrodla" className="font-semibold text-primary hover:underline">
          Źródła i metodologia
        </Link>
      </p>
    </section>
  );
}
