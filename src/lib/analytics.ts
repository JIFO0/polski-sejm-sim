import { trackEvent } from "@/lib/analytics.functions";
import { DISTRICTS } from "@/data/districts";
import { PARTIES } from "@/data/parties";
import type { Scenario } from "@/lib/simulation";
import type { AnalyticsEvent } from "@/lib/analytics-events";

/** Krajowe poparcie (średnia ważona liczbą wyborców) zaokrąglone do 0.1 pkt. */
export function nationalSharesOf(scenario: Scenario): Record<string, number> {
  const weight = DISTRICTS.reduce((total, district) => total + district.electorate, 0);
  return Object.fromEntries(
    PARTIES.map((party) => [
      party.id,
      Math.round(
        (DISTRICTS.reduce(
          (total, district) =>
            total + (scenario.districts[district.id]?.shares[party.id] ?? 0) * district.electorate,
          0,
        ) /
          weight) *
          10,
      ) / 10,
    ]),
  );
}

type TrackInput = {
  event: AnalyticsEvent;
  meta?: string;
  shares?: Record<string, number>;
  turnout?: number;
};

/** Anonimowe, zbiorcze zdarzenie statystyczne. Bez ciasteczek, bez IP, bez identyfikatorów. */
export function track(input: TrackInput) {
  void trackEvent({ data: input }).catch(() => {
    // Statystyki nigdy nie mogą przerywać korzystania ze strony.
  });
}

function detectTrafficSource(): string {
  try {
    const referrer = document.referrer;
    if (!referrer) return "bezpośrednie";
    const host = new URL(referrer).hostname.toLowerCase();
    if (host.includes("google")) return "google";
    if (host.includes("twitter") || host.includes("t.co") || host.includes("x.com")) return "twitter/x";
    if (host.includes("facebook") || host.includes("fb.com")) return "facebook";
    if (host.includes("wykop")) return "wykop";
    if (host.includes("reddit")) return "reddit";
    if (host.includes("sejmsim")) return "wewnętrzne";
    return host.replace(/^www\./, "").slice(0, 30);
  } catch {
    return "inne";
  }
}

function detectDevice(): string {
  if (typeof window === "undefined") return "komputer";
  const w = window.innerWidth;
  if (w < 768) return "telefon";
  if (w < 1100) return "tablet";
  return "komputer";
}

let pageViewSent = false;

export function trackPageViewOncePerSession() {
  if (pageViewSent) return;
  try {
    if (window.sessionStorage.getItem("sejmsim.pv") === "1") return;
    window.sessionStorage.setItem("sejmsim.pv", "1");
  } catch {
    // Pamięć sesji zablokowana — i tak wysyłamy jedno zdarzenie na załadowanie strony.
  }
  pageViewSent = true;
  track({
    event: "page_view",
    meta: `${detectDevice()}|${detectTrafficSource()}`,
  });
}
