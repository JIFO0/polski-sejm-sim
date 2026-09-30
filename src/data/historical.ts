export interface HistoricalCommitteeResult {
  name: string;
  short: string;
  share: number;
  seats: number;
  color: string;
}

export interface HistoricalElection {
  year: 2019 | 2023;
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
];