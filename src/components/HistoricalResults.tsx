import { ExternalLink, History } from "lucide-react";
import { HISTORICAL_ELECTIONS } from "@/data/historical";
import { Button } from "@/components/ui/button";

export function HistoricalResults() {
  return (
    <section className="panel p-5 md:p-6" aria-labelledby="historical-results-title">
      <div className="flex items-start gap-3">
        <History className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <p className="eyebrow">Punkt odniesienia</p>
          <h2 id="historical-results-title" className="mt-1 font-display text-2xl font-bold text-ink">
            Wyniki wyborów 2023, 2019, 2015 i 2011
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Oficjalne wyniki wyborów do Sejmu. To porównanie historyczne, nie gotowe scenariusze symulacji.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-10">
        {HISTORICAL_ELECTIONS.map((election) => (
          <article key={election.year} aria-labelledby={`election-${election.year}`}>
            <div className="flex items-end justify-between border-b border-border pb-3">
              <div>
                <h3 id={`election-${election.year}`} className="font-display text-xl font-bold text-ink">
                  Sejm {election.year}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Frekwencja {election.turnout.toFixed(2)}%</p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <a href={election.sourceUrl} target="_blank" rel="noreferrer">
                  Dane PKW <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              {election.committees.map((committee) => (
                <div key={committee.name} className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] items-center gap-2 py-1.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: committee.color }} />
                    <span className="truncate text-sm font-semibold" title={committee.name}>{committee.short}</span>
                  </div>
                  <span className="num text-right text-sm">{committee.share.toFixed(2)}%</span>
                  <span className="num text-right text-sm font-bold text-ink">{committee.seats} mand.</span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}