export interface HistoricalCommitteeResult {
  name: string;
  short: string;
  share: number;
  seats: number;
  color: string;
}

export interface HistoricalElection {
  year: 2011 | 2015 | 2019 | 2023;
  turnout: number;
  sourceUrl: string;
  committees: HistoricalCommitteeResult[];
}

export const HISTORICAL_ELECTIONS: HistoricalElection[] = [
  {
    year: 2023,
    turnout: 74.38,
    sourceUrl: "https://wybory.gov.pl/sejmsenat2023/pl/sejm/wynik/pl",
    committees: [
      { name: "Prawo i Sprawiedliwość", short: "PiS", share: 35.38, seats: 194, color: "#14357F" },
      { name: "Koalicja Obywatelska", short: "KO", share: 30.7, seats: 157, color: "#F26722" },
      { name: "Trzecia Droga", short: "TD", share: 14.4, seats: 65, color: "#2E7D32" },
      { name: "Nowa Lewica", short: "Lewica", share: 8.61, seats: 26, color: "#D0021B" },
      { name: "Konfederacja", short: "Konf", share: 7.16, seats: 18, color: "#111B3B" },
    ],
  },
  {
    year: 2019,
    turnout: 61.74,
    sourceUrl: "https://sejmsenat2019.pkw.gov.pl/sejmsenat2019/pl/wyniki/sejm/pl",
    committees: [
      { name: "Prawo i Sprawiedliwość", short: "PiS", share: 43.59, seats: 235, color: "#14357F" },
      { name: "Koalicja Obywatelska", short: "KO", share: 27.4, seats: 134, color: "#F26722" },
      { name: "Sojusz Lewicy Demokratycznej", short: "SLD", share: 12.56, seats: 49, color: "#D0021B" },
      { name: "Polskie Stronnictwo Ludowe", short: "PSL", share: 8.55, seats: 30, color: "#2E7D32" },
      { name: "Konfederacja", short: "Konf", share: 6.81, seats: 11, color: "#111B3B" },
      { name: "Mniejszość Niemiecka", short: "MN", share: 0.17, seats: 1, color: "#64748B" },
    ],
  },
  {
    year: 2015,
    turnout: 50.92,
    sourceUrl: "https://danewyborcze.kbw.gov.pl/index4ca9.html?title=Wybory_do_Sejmu_w_2015_r.",
    committees: [
      { name: "Prawo i Sprawiedliwość", short: "PiS", share: 37.58, seats: 235, color: "#14357F" },
      { name: "Platforma Obywatelska", short: "PO", share: 24.09, seats: 138, color: "#F26722" },
      { name: "Kukiz'15", short: "Kukiz'15", share: 8.81, seats: 42, color: "#222222" },
      { name: "Nowoczesna", short: "Nowoczesna", share: 7.6, seats: 28, color: "#42A5B3" },
      { name: "Zjednoczona Lewica", short: "ZL", share: 7.55, seats: 0, color: "#D0021B" },
      { name: "Polskie Stronnictwo Ludowe", short: "PSL", share: 5.13, seats: 16, color: "#2E7D32" },
      { name: "KORWiN", short: "KORWiN", share: 4.76, seats: 0, color: "#111B3B" },
      { name: "Razem", short: "Razem", share: 3.62, seats: 0, color: "#A4247A" },
    ],
  },
  {
    year: 2011,
    turnout: 48.92,
    sourceUrl: "https://wybory2011.pkw.gov.pl/wyn/pl/000000.html",
    committees: [
      { name: "Platforma Obywatelska", short: "PO", share: 39.18, seats: 207, color: "#F26722" },
      { name: "Prawo i Sprawiedliwość", short: "PiS", share: 29.89, seats: 157, color: "#14357F" },
      { name: "Ruch Palikota", short: "Ruch Palikota", share: 10.02, seats: 40, color: "#F4A300" },
      { name: "Polskie Stronnictwo Ludowe", short: "PSL", share: 8.36, seats: 28, color: "#2E7D32" },
      { name: "Sojusz Lewicy Demokratycznej", short: "SLD", share: 8.24, seats: 27, color: "#D0021B" },
      { name: "Polska Jest Najważniejsza", short: "PJN", share: 2.19, seats: 0, color: "#4772B3" },
      { name: "Polska Partia Pracy", short: "PPP", share: 0.55, seats: 0, color: "#9B1B30" },
    ],
  },
];