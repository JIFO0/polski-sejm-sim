import { trackEvent } from "@/lib/analytics.functions";
import { DISTRICTS } from "@/data/districts";
import { PARTIES } from "@/data/parties";
import type { Scenario } from "@/lib/simulation";

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
  event: "page_view" | "turnout_set" | "scenario_save" | "scenario_download" | "scenario_share";
  shares?: Record<string, number>;
  turnout?: number;
};

/** Anonimowe, zbiorcze zdarzenie statystyczne. Bez ciasteczek, bez IP, bez identyfikatorów. */
export function track(input: TrackInput) {
  void trackEvent({ data: input }).catch(() => {
    // Statystyki nigdy nie mogą przerywać korzystania ze strony.
  });
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
  track({ event: "page_view" });
}
