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
