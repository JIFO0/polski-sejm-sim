import { trackEvent } from "@/lib/analytics.functions";
import { DISTRICTS } from "@/data/districts";
import { PARTIES } from "@/data/parties";
import type { Scenario } from "@/lib/simulation";
import type { AnalyticsEvent } from "@/lib/analytics-events";

export const ADMIN_OPTOUT_KEY = "sejmsim.admin_optout";

/** Sprawdza, czy zalogowany administrator włączył opcję „nie licz mnie”. */
export function isAdminOptedOut(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(ADMIN_OPTOUT_KEY) === "1";
  } catch {
    return false;
  }
}

/** Zmienia ustawienie wykluczenia administratora ze statystyk. */
export function setAdminOptedOut(optOut: boolean): void {
  try {
    if (typeof window !== "undefined") {
      if (optOut) {
        window.localStorage.setItem(ADMIN_OPTOUT_KEY, "1");
      } else {
        window.localStorage.removeItem(ADMIN_OPTOUT_KEY);
      }
    }
  } catch {}
}

/** Filtruje wykluczone ścieżki (statystyki, api, assety) oraz administratora. */
export function shouldIgnoreTracking(path?: string): boolean {
  if (typeof window === "undefined") return false;
  if (isAdminOptedOut()) return true;
  const currentPath = path ?? (typeof window !== "undefined" ? window.location.pathname : "");
  if (!currentPath) return false;
  if (currentPath.startsWith("/statystyki") || currentPath.startsWith("/api")) return true;
  if (/\.(js|css|png|jpg|jpeg|svg|webp|ico|json|woff2?|map)$/i.test(currentPath)) return true;
  return false;
}

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
        (DISTRICTS.reduce((total, district) => {
          const el = scenario.districts[district.id]?.electorate ?? district.electorate;
          return total + (scenario.districts[district.id]?.shares[party.id] ?? 0) * el;
        }, 0) /
          (weight > 0 ? weight : 1)) *
          10,
      ) / 10,
    ]),
  );
}

export const VISITOR_ID_KEY = "sejmsim.visitor_id";

/** Zwraca lub tworzy losowy, anonimowy identyfikator instalacji/przeglądarki do zliczania unikalnych użytkowników. */
export function getOrCreateVisitorId(): string {
  try {
    if (typeof window === "undefined") return "anon";
    let vid = localStorage.getItem(VISITOR_ID_KEY);
    if (!vid || vid.length < 8) {
      vid = "v_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      localStorage.setItem(VISITOR_ID_KEY, vid);
    }
    return vid;
  } catch {
    return "anon";
  }
}

type TrackInput = {
  event: AnalyticsEvent;
  meta?: string;
  shares?: Record<string, number>;
  turnout?: number;
  partyLabels?: Record<string, string>;
  visitorId?: string;
};

/** Anonimowe zdarzenie statystyczne. Rejestruje anonimowy identyfikator sesji/użytkownika do unikalnych statystyk. */
export function track(input: TrackInput) {
  if (shouldIgnoreTracking()) return;
  const partyLabels = {
    ...Object.fromEntries(PARTIES.filter((party) => /^(cp|ml)/.test(party.id)).map((party) => [party.id, party.name])),
    ...input.partyLabels,
  };
  const visitorId = input.visitorId || getOrCreateVisitorId();
  void trackEvent({ data: { ...input, partyLabels, visitorId } }).catch(() => {
    // Statystyki nigdy nie mogą przerywać korzystania ze strony.
  });
}

function sanitizeUtmValue(val: string | null): string | null {
  if (!val) return null;
  const clean = val.trim().toLowerCase().slice(0, 64);
  if (/^[a-z0-9._-]+$/.test(clean)) return clean;
  return "other";
}

/** Pobiera i normalizuje dozwolone parametry UTM (źródło, medium, kampania). */
export function extractSanitizedUtm(): string | null {
  try {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const source = sanitizeUtmValue(params.get("utm_source"));
    const medium = sanitizeUtmValue(params.get("utm_medium"));
    const campaign = sanitizeUtmValue(params.get("utm_campaign"));
    if (!source && !medium && !campaign) return null;
    return [source ?? "-", medium ?? "-", campaign ?? "-"].join("|");
  } catch {
    return null;
  }
}

export function detectTrafficSource(): string {
  try {
    const referrer = document.referrer;
    if (!referrer) return "bezpośrednie";
    const refUrl = new URL(referrer);
    // Przejścia z panelu statystyk nie są liczone jako źródło zewnętrzne
    if (refUrl.pathname.startsWith("/statystyki")) return "bezpośrednie";
    const host = refUrl.hostname.toLowerCase();
    if (host.includes("google")) return "google";
    if (host.includes("twitter") || host.includes("t.co") || host.includes("x.com"))
      return "twitter/x";
    if (host.includes("facebook") || host.includes("fb.com")) return "facebook";
    if (host.includes("wykop")) return "wykop";
    if (host.includes("reddit")) return "reddit";
    if (host.includes("sejmsim")) return "wewnętrzne";
    return host.replace(/^www\./, "").slice(0, 64);
  } catch {
    return "inne";
  }
}

import { baselineSharesFor } from "@/lib/poll-average";
import { BASE_TURNOUT } from "@/lib/simulation";

/** Sprawdza, czy scenariusz różni się od punktu wyjścia (średnia SejmSim albo profil okręgowy). */
export function isScenarioModified(scenario: Scenario): boolean {
  if (!scenario || !scenario.districts) return false;
  for (const d of DISTRICTS) {
    const st = scenario.districts[d.id];
    if (!st) return true;
    if (Math.abs((st.turnout ?? BASE_TURNOUT) - BASE_TURNOUT) > 0.05) return true;
    const base = baselineSharesFor(d.id);
    const partyIds = new Set([...Object.keys(base), ...Object.keys(st.shares)]);
    for (const partyId of partyIds) {
      if (Math.abs((st.shares[partyId] ?? 0) - (base[partyId] ?? 0)) > 0.05) return true;
    }
  }
  return false;
}

export function detectDevice(): "telefon" | "tablet" | "komputer" {
  if (typeof window === "undefined") return "komputer";
  const ua = (navigator.userAgent || "").toLowerCase();
  const maxTouchPoints = navigator.maxTouchPoints || 0;

  const isIPad = /ipad/i.test(ua) || (maxTouchPoints > 1 && /macintosh/i.test(ua));
  const isTabletUA = isIPad || (/android/i.test(ua) && !/mobile/i.test(ua)) || /tablet/i.test(ua);
  const isMobileUA =
    /mobile|iphone|ipod|android.*mobile|blackberry|iemobile|opera mini|webos|windows phone/i.test(
      ua,
    );

  const w =
    window.innerWidth || (document.documentElement ? document.documentElement.clientWidth : 0);

  if (isTabletUA) return "tablet";
  if (isMobileUA) return "telefon";

  if (w > 0 && w < 768) return "telefon";
  if ((w >= 768 && w < 1024) || (maxTouchPoints > 0 && w < 1180)) return "tablet";
  return "komputer";
}

const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minut bezczynności

/**
 * Zapewnia rejestrację nowej sesji, gdy użytkownik otwiera stronę lub wraca po >30 min bezczynności.
 * Nowa sesja wysyła zdarzenie 'session_start' z informacją o urządzeniu, źródle i UTM.
 */
export function ensureSessionAndTrack(): void {
  if (shouldIgnoreTracking()) return;
  try {
    const now = Date.now();
    const lastActiveStr = window.sessionStorage.getItem("sejmsim.last_active");
    const lastActive = lastActiveStr ? Number(lastActiveStr) : 0;
    const isNewSession = !lastActive || now - lastActive > SESSION_IDLE_TIMEOUT_MS;

    window.sessionStorage.setItem("sejmsim.last_active", String(now));

    if (isNewSession) {
      window.sessionStorage.setItem("sejmsim.session_id", String(now));
      window.sessionStorage.removeItem("sejmsim.funnel_step"); // reset lejka dla nowej sesji
      const utm = extractSanitizedUtm();
      const meta = `${detectDevice()}|${detectTrafficSource()}${utm ? `|utm:${utm}` : ""}`;
      track({
        event: "page_view",
        meta,
      });
    }
  } catch {}
}

/** Rejestruje odsłonę podstrony (pageview) przy każdej zmianie trasy. */
export function trackPageView(path?: string): void {
  const currentPath = path ?? (typeof window !== "undefined" ? window.location.pathname : "");
  if (shouldIgnoreTracking(currentPath)) return;
  ensureSessionAndTrack();
  track({
    event: "page_view",
    meta: currentPath.slice(0, 100),
  });
}

/** Rejestruje bezpieczny lejek aktywacji w ramach bieżącej sesji użytkownika. */
export function trackFunnelStep(step: "interaction" | "export"): void {
  if (shouldIgnoreTracking()) return;
  try {
    const currentStep = window.sessionStorage.getItem("sejmsim.funnel_step");
    if (step === "interaction" && !currentStep) {
      window.sessionStorage.setItem("sejmsim.funnel_step", "interaction");
      track({ event: "funnel_step", meta: "interaction" });
    } else if (step === "export" && currentStep !== "export") {
      window.sessionStorage.setItem("sejmsim.funnel_step", "export");
      track({ event: "funnel_step", meta: "export" });
    }
  } catch {}
}

let pageViewLegacySent = false;

/** Zachowane dla wstecznej kompatybilności komponentów. */
export function trackPageViewOncePerSession() {
  if (pageViewLegacySent) return;
  pageViewLegacySent = true;
  ensureSessionAndTrack();
  trackPageView();
}

/** Anonimowe cechy scenariusza (bez treści opisu ani autora). */
export function scenarioTraits(scenario: Scenario): string {
  const parts = scenario.customParties?.length ?? 0;
  const lists = scenario.mergers?.length ?? 0;
  const tags = [isScenarioModified(scenario) ? "zmieniony" : "bazowy"];
  if (parts) tags.push("własne partie");
  if (lists) tags.push("wspólne listy");
  if (scenario.author?.trim()) tags.push("autor");
  if (scenario.description?.trim()) tags.push("opis");
  return tags.join(", ").slice(0, 200);
}
