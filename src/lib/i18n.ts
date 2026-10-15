import { useCallback, useSyncExternalStore } from "react";
import { track } from "@/lib/analytics";
import { UI_TRANSLATIONS } from "./ui-translations";

export type Language = "pl" | "en";

const STORAGE_KEY = "sejmsim.lang";
const listeners = new Set<() => void>();
let currentLanguage: Language | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getStoredLang(): Language {
  if (typeof window === "undefined") return "pl";
  if (currentLanguage) return currentLanguage;
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    // Domyślny zawsze "pl", tylko jawnie wybrany "en" przełącza na angielski
    return val === "en" ? "en" : "pl";
  } catch {
    return "pl";
  }
}

function notify() {
  for (const listener of listeners) listener();
}

export function useLanguage(): Language {
  return useSyncExternalStore(subscribe, getStoredLang, () => "pl");
}

export function setLanguage(lang: Language) {
  currentLanguage = lang;
  document.documentElement.lang = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  } catch {
    // tryb prywatny
  }
  track({ event: "language_change", meta: lang });
  notify();
}

const translations: Record<Language, Record<string, string>> = {
  pl: {
    about: "O projekcie",
    contact: "Kontakt",
    feedback: "Opinia",
    support: "Wesprzyj",
    scenarios: "Twoje scenariusze",
    community: "Społeczność",
    community_scenarios: "Scenariusze społeczności",
    explore_community: "Poznaj scenariusze społeczności",
    coalitions: "Kto z kim?",
    coalitions_desc: "Złóż dowolne grupy partii i sprawdź, czy mają większość zwykłą (231) lub konstytucyjną (307).",
    turnout_and_votes: "Frekwencja i głosy",
    qualified_voters: "Kwalifikowani wyborcy i szacunek liczby głosów",
    electorate_poland: "Uprawnieni do głosowania w kraju",
    estimated_votes: "Szacowana liczba oddanych głosów",
    national_turnout: "Frekwencja we wszystkich okręgach",
    electorate_profile: "Siła profilu elektoratu",
    seats_distribution: "Podział 460 mandatów",
    constitutional_majority: "Większość konstytucyjna (307+)",
    regular_majority: "Większość zwykła (231+)",
    lang_pl: "Polski",
    lang_en: "Angielski",
  },
  en: {
    about: "About Project",
    contact: "Contact",
    feedback: "Feedback",
    support: "Support",
    scenarios: "Your Scenarios",
    community: "Community",
    community_scenarios: "Community Scenarios",
    explore_community: "Explore Community Scenarios",
    coalitions: "Coalitions",
    coalitions_desc: "Assemble parliamentary groups and check for simple (231) or constitutional (307) majority.",
    turnout_and_votes: "Turnout & Votes",
    qualified_voters: "Eligible voters & vote estimation",
    electorate_poland: "Eligible voters in Poland",
    estimated_votes: "Estimated valid votes cast",
    national_turnout: "Turnout across all districts",
    electorate_profile: "Turnout demographic sensitivity",
    seats_distribution: "Distribution of 460 Seats",
    constitutional_majority: "Constitutional majority (307+)",
    regular_majority: "Parliamentary majority (231+)",
    lang_pl: "Polish",
    lang_en: "English",
  },
};

export function t(key: string, lang: Language = "pl"): string {
  return translations[lang]?.[key] ?? translations.pl[key] ?? key;
}

/** Translate authored interface strings; user-created names remain unchanged. */
export function useTranslation() {
  const lang = useLanguage();
  return useCallback((text: string) => lang === "en" ? (UI_TRANSLATIONS[text] ?? text) : text, [lang]);
}
