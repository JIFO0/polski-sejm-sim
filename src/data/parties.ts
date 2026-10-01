export type ThresholdKind = 5 | 8 | 0;

export interface Party {
  id: string;
  name: string;
  short: string;
  color: string;
  logo?: string;
  /** Domyślny próg wyborczy w procentach głosów w skali kraju. */
  threshold: ThresholdKind;
  /**
   * Wrażliwość na frekwencję. Dodatnia = partia zyskuje przy wysokiej
   * frekwencji (elektorat młodszy, miejski, mniej zdyscyplinowany).
   */
  turnoutSensitivity: number;
  blocHint?: "opozycja" | "koalicja" | "prawica" | "lewica";
}

export const PARTIES: Party[] = [
  {
    id: "ko",
    name: "Koalicja Obywatelska",
    short: "KO",
    color: "#F26722",
    logo: "/logos/ko.svg",
    threshold: 8,
    turnoutSensitivity: 0.45,
    blocHint: "koalicja",
  },
  {
    id: "pis",
    name: "Prawo i Sprawiedliwość",
    short: "PiS",
    color: "#14357F",
    logo: "/logos/pis.jpg",
    threshold: 5,
    turnoutSensitivity: -0.55,
    blocHint: "prawica",
  },
  {
    id: "konf",
    name: "Konfederacja",
    short: "Konf",
    color: "#111B3B",
    threshold: 5,
    turnoutSensitivity: 0.3,
    blocHint: "prawica",
  },
  {
    id: "kkp",
    name: "Konfederacja Korony Polskiej",
    short: "KKP",
    color: "#8C2F39",
    logo: "/logos/kkp.png",
    threshold: 5,
    turnoutSensitivity: 0.1,
    blocHint: "prawica",
  },
  {
    id: "nl",
    name: "Lewica",
    short: "Lewica",
    color: "#D0021B",
    logo: "/logos/nl.svg",
    threshold: 5,
    turnoutSensitivity: 0.4,
    blocHint: "lewica",
  },
  {
    id: "razem",
    name: "Razem",
    short: "Razem",
    color: "#A4247A",
    logo: "/logos/razem.svg",
    threshold: 5,
    turnoutSensitivity: 0.8,
    blocHint: "lewica",
  },
  {
    id: "rp",
    name: "Rozwój Plus",
    short: "R+",
    color: "#0F9BA8",
    logo: "/logos/rp.svg",
    threshold: 5,
    turnoutSensitivity: 0.35,
  },
  {
    id: "psl",
    name: "Polskie Stronnictwo Ludowe",
    short: "PSL",
    color: "#2E7D32",
    logo: "/logos/psl.svg",
    threshold: 5,
    turnoutSensitivity: -0.5,
    blocHint: "koalicja",
  },
  {
    id: "pl2050",
    name: "Polska 2050",
    short: "PL2050",
    color: "#E0AC12",
    logo: "/logos/pl2050.svg",
    threshold: 5,
    turnoutSensitivity: 0.25,
    blocHint: "koalicja",
  },
  {
    id: "inne",
    name: "Pozostałe komitety",
    short: "Inne",
    color: "#94A3B8",
    threshold: 5,
    turnoutSensitivity: 0,
  },
];

export const PARTY_MAP: Record<string, Party> = Object.fromEntries(
  PARTIES.map((p) => [p.id, p]),
);

export const PARTY_COLORS = PARTIES.filter((p) => p.id !== "inne").map((p) => p.color);

/* ---------- Własne partie i wspólne listy (rejestr dynamiczny) ---------- */

export interface CustomPartyDef {
  id: string;
  name: string;
  short: string;
  color: string;
}

export interface MergerDef extends CustomPartyDef {
  members: string[];
  /** Procent sumy poparcia członków zachowany przez wspólną listę (0–100). */
  retention: number;
}

const BUILTIN = PARTIES.slice();
const LOGO_KEY = "sejmsim.custom-logos.v1";

/** id partii składowej → id wspólnej listy, w której aktualnie jest. */
export const MERGED_INTO: Record<string, string> = {};

export function readCustomLogos(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(LOGO_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

export function writeCustomLogo(id: string, dataUrl: string | null) {
  const all = readCustomLogos();
  if (dataUrl) all[id] = dataUrl;
  else delete all[id];
  try {
    window.localStorage.setItem(LOGO_KEY, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}

/** Synchronizuje globalny rejestr partii z własnymi partiami i listami scenariusza. */
export function syncCustomEntities(custom: CustomPartyDef[] = [], mergers: MergerDef[] = []) {
  for (const k of Object.keys(PARTY_MAP)) delete PARTY_MAP[k];
  for (const k of Object.keys(MERGED_INTO)) delete MERGED_INTO[k];
  const logos = readCustomLogos();
  const inne = BUILTIN[BUILTIN.length - 1]!; // „Inne” zawsze na końcu
  PARTIES.splice(0, PARTIES.length, ...BUILTIN.slice(0, -1));
  for (const c of custom) {
    PARTIES.push({ ...c, logo: logos[c.id], threshold: 5, turnoutSensitivity: 0 });
  }
  for (const m of mergers) {
    PARTIES.push({ id: m.id, name: m.name, short: m.short, color: m.color, logo: logos[m.id], threshold: 8, turnoutSensitivity: 0 });
    for (const member of m.members) MERGED_INTO[member] = m.id;
  }
  PARTIES.push(inne);
  for (const p of PARTIES) PARTY_MAP[p.id] = p;
}

/** Partie pokazywane w wynikach (bez „Inne” i bez członków wspólnych list). */
export function resultParties() {
  return PARTIES.filter((p) => p.id !== "inne" && !MERGED_INTO[p.id]);
}

/** Partie z własnym poparciem (bez „Inne” i bez samych list). */
export function supportParties(mergers: MergerDef[] = []) {
  const ids = new Set(mergers.map((m) => m.id));
  return PARTIES.filter((p) => p.id !== "inne" && !ids.has(p.id));
}
