import { DISTRICTS } from "@/data/districts";
import electionSilenceJson from "@/data/election-silence.json";
import pollsJson from "@/data/polls.json";

/**
 * Własna średnia sondażowa SejmSim.
 *
 * Serwis nie kopiuje cudzych średnich. Każdy wpis w `src/data/polls.json` to
 * jedno publicznie opublikowane badanie. Średnią liczy wyłącznie ten moduł.
 *
 * Dobór sondaży (stan na datę odniesienia `asOf`):
 * 1. Do średniej wchodzi badanie z datą publikacji nie późniejszą niż `asOf`
 *    i z niepustymi wynikami. Brak daty publikacji albo brak wyników wyklucza
 *    wpis ze średniej (zostaje tylko w zbiorze).
 * 2. Najpierw bierzemy sondaże z okna `POLL_WINDOW_DAYS` dni (data publikacji).
 * 3. Gdy w oknie jest mniej niż `POLL_MIN_COUNT`, dokładamy starsze, aż do
 *    `POLL_MIN_COUNT`, ale nigdy więcej niż `POLL_MAX_COUNT` najnowszych.
 * 4. W czasie ciszy wyborczej `asOf` jest początkiem ciszy: badań opublikowanych
 *    w trakcie ciszy nie pokazujemy i nie wliczamy.
 *
 * Wagi:
 * - świeżość: połowiczny zanik co `POLL_HALF_LIFE_DAYS` dni od daty publikacji
 *   (albo od `fieldworkTo`, gdy daty publikacji brak — taki wpis i tak nie
 *   wchodzi do średniej);
 * - próba: `sampleSize / POLL_SAMPLE_REFERENCE`. Gdy liczebność jest null,
 *   waga próby wynosi 1. Nie dopisujemy zgadywanej liczby respondentów.
 * - waga sondażu = świeżość × waga próby.
 *
 * Wynik partii to ważona średnia tylko z tych sondaży, które tę partię podały.
 * Brak partii w badaniu nie jest zerem. Średnie zaokrąglamy do 0,1 pkt proc.
 * i nie dociągamy ich sztucznie do 100% — suma może być inna, bo ośrodki
 * różnie grupują „inne”.
 *
 * Data średniej to ważona średnia dat publikacji sondaży użytych w obliczeniu.
 */

export const POLL_WINDOW_DAYS = 30;
export const POLL_MIN_COUNT = 4;
export const POLL_MAX_COUNT = 12;
export const POLL_HALF_LIFE_DAYS = 14;
export const POLL_SAMPLE_REFERENCE = 1000;
export const RECENT_POLLS_LIMIT = 5;

export type PollMethod = "CATI" | "CAWI" | "mix";

export interface Poll {
  id: string;
  /** Ośrodek badawczy. */
  institute: string | null;
  /** Zleceniodawca. */
  commissioner: string | null;
  /** Początek badania, YYYY-MM-DD. */
  fieldworkFrom: string | null;
  /** Koniec badania, YYYY-MM-DD. */
  fieldworkTo: string | null;
  /** Data publikacji, YYYY-MM-DD. */
  publishedAt: string | null;
  /** Liczebność próby. */
  sampleSize: number | null;
  method: PollMethod | null;
  /** Poparcie partii w procentach. Klucze jak w `src/data/parties.ts`. */
  results: Record<string, number> | null;
  /** Link do pierwotnej publikacji. */
  sourceUrl: string | null;
}

export interface SilencePeriod {
  /** Krótka nazwa, np. „Wybory do Sejmu”. */
  label: string;
  /** Początek ciszy, ISO 8601. */
  from: string;
  /** Koniec ciszy, ISO 8601. */
  until: string;
}

export interface PollAverage {
  /** Data średniej (ważona data publikacji), YYYY-MM-DD. */
  asOfDate: string;
  /** Moment, względem którego liczono średnią. */
  referenceIso: string;
  results: Record<string, number>;
  polls: Poll[];
  /** True, gdy okno 30 dni nie wystarczyło i dociągnięto starsze badania. */
  extendedBeyondWindow: boolean;
  silence: SilencePeriod | null;
}

const MS_DAY = 86_400_000;

export const POLLS: Poll[] = pollsJson as Poll[];
export const SILENCE_PERIODS: SilencePeriod[] = electionSilenceJson as SilencePeriod[];

export function parseDay(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function activeSilence(
  now: Date,
  periods: SilencePeriod[] = SILENCE_PERIODS,
): SilencePeriod | null {
  for (const period of periods) {
    const from = new Date(period.from);
    const until = new Date(period.until);
    if (Number.isNaN(from.getTime()) || Number.isNaN(until.getTime())) continue;
    if (now.getTime() >= from.getTime() && now.getTime() < until.getTime()) return period;
  }
  return null;
}

/** Data odniesienia: w ciszy wyborczej nie sięgamy poza jej początek. */
export function referenceDate(now: Date, periods: SilencePeriod[] = SILENCE_PERIODS): Date {
  const silence = activeSilence(now, periods);
  if (!silence) return now;
  const from = new Date(silence.from);
  return Number.isNaN(from.getTime()) ? now : from;
}

function freshness(published: Date, asOf: Date): number {
  const ageDays = Math.max(0, (asOf.getTime() - published.getTime()) / MS_DAY);
  return 2 ** (-ageDays / POLL_HALF_LIFE_DAYS);
}

function sampleWeight(sampleSize: number | null): number {
  if (sampleSize == null || !Number.isFinite(sampleSize) || sampleSize <= 0) return 1;
  return sampleSize / POLL_SAMPLE_REFERENCE;
}

export function isPollComplete(poll: Poll): boolean {
  return (
    parseDay(poll.publishedAt) != null &&
    poll.results != null &&
    Object.keys(poll.results).length > 0
  );
}

export function pollsVisibleAt(
  now: Date,
  polls: Poll[] = POLLS,
  periods: SilencePeriod[] = SILENCE_PERIODS,
): Poll[] {
  const asOf = referenceDate(now, periods);
  return polls.filter((poll) => {
    const published = parseDay(poll.publishedAt);
    if (!published) return true;
    return published.getTime() <= asOf.getTime();
  });
}

export function computePollAverage(
  now: Date,
  polls: Poll[] = POLLS,
  periods: SilencePeriod[] = SILENCE_PERIODS,
): PollAverage | null {
  const asOf = referenceDate(now, periods);
  const silence = activeSilence(now, periods);
  const eligible = polls
    .filter(isPollComplete)
    .filter((poll) => {
      const published = parseDay(poll.publishedAt);
      return published != null && published.getTime() <= asOf.getTime();
    })
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));

  if (eligible.length === 0) return null;

  const inWindow = eligible.filter((poll) => {
    const published = parseDay(poll.publishedAt)!;
    return asOf.getTime() - published.getTime() <= POLL_WINDOW_DAYS * MS_DAY;
  });

  let used = inWindow.slice(0, POLL_MAX_COUNT);
  let extendedBeyondWindow = false;
  if (used.length < POLL_MIN_COUNT) {
    used = eligible.slice(0, Math.min(POLL_MAX_COUNT, Math.max(POLL_MIN_COUNT, used.length)));
    extendedBeyondWindow = used.some((poll) => !inWindow.includes(poll));
  }

  const weights = new Map<string, number>();
  for (const poll of used) {
    const published = parseDay(poll.publishedAt)!;
    weights.set(poll.id, freshness(published, asOf) * sampleWeight(poll.sampleSize));
  }

  const partyWeight = new Map<string, number>();
  const partySum = new Map<string, number>();
  for (const poll of used) {
    const weight = weights.get(poll.id) ?? 0;
    for (const [partyId, value] of Object.entries(poll.results ?? {})) {
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      partyWeight.set(partyId, (partyWeight.get(partyId) ?? 0) + weight);
      partySum.set(partyId, (partySum.get(partyId) ?? 0) + value * weight);
    }
  }

  const results: Record<string, number> = {};
  for (const [partyId, weight] of partyWeight) {
    if (weight <= 0) continue;
    results[partyId] = Math.round(((partySum.get(partyId) ?? 0) / weight) * 10) / 10;
  }

  let dateWeight = 0;
  let dateSum = 0;
  for (const poll of used) {
    const published = parseDay(poll.publishedAt)!;
    const weight = weights.get(poll.id) ?? 0;
    dateWeight += weight;
    dateSum += published.getTime() * weight;
  }
  const asOfDate = new Date(dateWeight > 0 ? dateSum / dateWeight : asOf.getTime())
    .toISOString()
    .slice(0, 10);

  return {
    asOfDate,
    referenceIso: asOf.toISOString(),
    results,
    polls: used,
    extendedBeyondWindow,
    silence,
  };
}

export function recentPolls(
  now: Date,
  polls: Poll[] = POLLS,
  periods: SilencePeriod[] = SILENCE_PERIODS,
): Poll[] {
  return pollsVisibleAt(now, polls, periods)
    .filter((poll) => poll.results != null && Object.keys(poll.results).length > 0)
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
    .slice(0, RECENT_POLLS_LIMIT);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Rozkłada krajową średnią na istniejący profil okręgowy, zachowując proporcje wewnątrz okręgu. */
export function scaleDistrictsToNational(
  national: Record<string, number> | null,
): Record<number, Record<string, number>> {
  const baselines: Record<number, Record<string, number>> = {};
  if (!national || Object.keys(national).length === 0) {
    for (const district of DISTRICTS) baselines[district.id] = { ...district.base };
    return baselines;
  }

  const electorate = DISTRICTS.reduce((sum, district) => sum + district.electorate, 0);
  const current: Record<string, number> = {};
  for (const district of DISTRICTS) {
    for (const [partyId, share] of Object.entries(district.base)) {
      current[partyId] = (current[partyId] ?? 0) + share * district.electorate;
    }
  }
  for (const partyId of Object.keys(current)) {
    current[partyId] = electorate > 0 ? (current[partyId] ?? 0) / electorate : 0;
  }

  for (const district of DISTRICTS) {
    const raw: Record<string, number> = {};
    const partyIds = new Set([...Object.keys(district.base), ...Object.keys(national)]);
    for (const partyId of partyIds) {
      const target = national[partyId] ?? 0;
      const base = district.base[partyId] ?? 0;
      const country = current[partyId] ?? 0;
      raw[partyId] = country > 0.05 ? base * (target / country) : target;
    }
    const sum = Object.values(raw).reduce((total, value) => total + value, 0);
    const next: Record<string, number> = {};
    if (sum <= 0) {
      baselines[district.id] = { ...district.base };
      continue;
    }
    const entries = Object.entries(raw).filter(([, value]) => value > 0);
    let used = 0;
    entries.forEach(([partyId, value], index) => {
      if (index === entries.length - 1) {
        next[partyId] = round1(Math.max(0, 100 - used));
      } else {
        const rounded = round1((value / sum) * 100);
        next[partyId] = rounded;
        used += rounded;
      }
    });
    baselines[district.id] = next;
  }
  return baselines;
}

let cachedBaselines: Record<number, Record<string, number>> | null = null;

export function baselineSharesFor(districtId: number, now = new Date()): Record<string, number> {
  if (!cachedBaselines) {
    cachedBaselines = scaleDistrictsToNational(computePollAverage(now)?.results ?? null);
  }
  return { ...(cachedBaselines[districtId] ?? {}) };
}

export function currentPollAverage(now = new Date()): PollAverage | null {
  return computePollAverage(now);
}

const MONTHS_PL = [
  "stycznia",
  "lutego",
  "marca",
  "kwietnia",
  "maja",
  "czerwca",
  "lipca",
  "sierpnia",
  "września",
  "października",
  "listopada",
  "grudnia",
];

export function formatPolishDate(isoDay: string | null): string {
  const date = parseDay(isoDay);
  if (!date || !isoDay) return "brak daty";
  const [, month, day] = isoDay.split("-");
  const monthName = MONTHS_PL[Number(month) - 1];
  if (!monthName || !day) return isoDay;
  return `${Number(day)} ${monthName} ${isoDay.slice(0, 4)}`;
}
