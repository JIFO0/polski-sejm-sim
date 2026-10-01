import { trackEvent } from "@/lib/analytics.functions";
import { DISTRICTS } from "@/data/districts";
import { PARTIES } from "@/data/parties";
import type { Scenario } from "@/lib/simulation";
import type { AnalyticsEvent } from "@/lib/analytics-events";

/** Krajowe poparcie (średnia ważona liczbą wyborców) zaokrąglone do 0.1 pkt. */
export function nationalSharesOf(scenario: Scenario): Record<string, number> {
  const weight = DISTRICTS.reduce((total, district) => {
    const el = scenario.districts[district.id]?.electorate ?? district.electorate;
    return total + el;
  }, 0);
  const allParties = new Map<string, { id: string }>();
  for (const p of PARTIES) allParties.set(p.id, p);
  for (const c of scenario.customParties ?? []) allParties.set(c.id, c);
  for (const m of scenario.mergers ?? []) allParties.set(m.id, m);

  return Object.fromEntries(
    Array.from(allParties.values()).map((party) => [
      party.id,
      Math.round(
        (DISTRICTS.reduce(
          (total, district) => {
            const el = scenario.districts[district.id]?.electorate ?? district.electorate;
            return total + (scenario.districts[district.id]?.shares[party.id] ?? 0) * el;
          },
          0,
        ) /
          (weight > 0 ? weight : 1)) *
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

import { BASE_TURNOUT } from "@/lib/simulation";

/** Sprawdza czy scenariusz różni się czymkolwiek od domyślnego punktu wyjścia ewybory.eu */
export function isScenarioModified(scenario: Scenario): boolean {
  if (!scenario || !scenario.districts) return false;
  for (const d of DISTRICTS) {
    const st = scenario.districts[d.id];
    if (!st) return true;
    if (Math.abs((st.turnout ?? BASE_TURNOUT) - BASE_TURNOUT) > 0.05) return true;
    for (const [partyId, baseShare] of Object.entries(d.base)) {
      if (Math.abs((st.shares[partyId] ?? 0) - baseShare) > 0.05) return true;
    }
  }
  return false;
}

export function detectDevice(): "telefon" | "tablet" | "komputer" {
  if (typeof window === "undefined") return "komputer";
  const ua = (navigator.userAgent || "").toLowerCase();
  const maxTouchPoints = navigator.maxTouchPoints || 0;

  // Tablety (w tym iPad na nowym iOS, który zgłasza się jako Macintosh z touch screenem)
  const isIPad = /ipad/i.test(ua) || (maxTouchPoints > 1 && /macintosh/i.test(ua));
  const isTabletUA = isIPad || (/android/i.test(ua) && !/mobile/i.test(ua)) || /tablet/i.test(ua);

  // Smartfony / urządzenia mobilne
  const isMobileUA =
    /mobile|iphone|ipod|android.*mobile|blackberry|iemobile|opera mini|webos|windows phone/i.test(ua);

  const w = window.innerWidth || (document.documentElement ? document.documentElement.clientWidth : 0);

  if (isTabletUA) return "tablet";
  if (isMobileUA) return "telefon";

  // Rezerwa na podstawie rozdzielczości i punktów dotyku
  if (w > 0 && w < 768) return "telefon";
  if ((w >= 768 && w < 1024) || (maxTouchPoints > 0 && w < 1180)) return "tablet";
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

