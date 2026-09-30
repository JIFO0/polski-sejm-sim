import { DISTRICTS, type District } from "@/data/districts";
import { PARTIES, PARTY_MAP, type ThresholdKind } from "@/data/parties";

export const BASE_TURNOUT = 74.4;
export const MAJORITY = 231;

export interface DistrictState {
  /** Procentowe poparcie partii w okręgu (suma powinna dawać 100). */
  shares: Record<string, number>;
  /** Frekwencja w okręgu, w procentach. */
  turnout: number;
}

export interface PartySettings {
  threshold: ThresholdKind;
  turnoutSensitivity: number;
  enabled: boolean;
}

export interface Coalition {
  id: string;
  name: string;
  color: string;
  members: string[];
}

export interface Scenario {
  version: 1;
  name: string;
  createdAt: string;
  /** Siła wpływu frekwencji na profil elektoratu: 0 = wyłączony, 1 = pełny. */
  turnoutEffect: number;
  districts: Record<number, DistrictState>;
  parties: Record<string, PartySettings>;
  coalitions: Coalition[];
}

export function defaultScenario(): Scenario {
  const districts: Record<number, DistrictState> = {};
  for (const d of DISTRICTS) {
    districts[d.id] = { shares: { ...d.base }, turnout: BASE_TURNOUT };
  }
  const parties: Record<string, PartySettings> = {};
  for (const p of PARTIES) {
    parties[p.id] = {
      threshold: p.threshold,
      turnoutSensitivity: 0,
      enabled: true,
    };
  }
  return {
    version: 1,
    name: "Sondaż ewybory.eu: punkt wyjścia",
    createdAt: new Date().toISOString(),
    turnoutEffect: 1,
    districts,
    parties,
    coalitions: [
      {
        id: "c1",
        name: "Koalicja 15 października",
        color: "#F26722",
        members: ["ko", "nl", "psl", "pl2050", "razem"],
      },
      { id: "c2", name: "Blok prawicy", color: "#14357F", members: ["pis", "konf", "kkp"] },
    ],
  };
}

/** Udziały w okręgu po uwzględnieniu frekwencji, znormalizowane do 100. */
export function effectiveShares(
  district: District,
  state: DistrictState,
  turnoutEffect: number,
  parties: Record<string, PartySettings>,
): Record<string, number> {
  const delta = (state.turnout - BASE_TURNOUT) / BASE_TURNOUT;
  const raw: Record<string, number> = {};
  let sum = 0;
  for (const [id, pct] of Object.entries(state.shares)) {
    const settings = parties[id];
    if (!settings?.enabled) continue;
    const sens = settings.turnoutSensitivity ?? 0;
    const v = Math.max(0, pct * (1 + sens * turnoutEffect * delta));
    raw[id] = v;
    sum += v;
  }
  if (sum <= 0) return raw;
  for (const id of Object.keys(raw)) raw[id] = ((raw[id] ?? 0) / sum) * 100;
  return raw;
}

function dhondt(votes: Record<string, number>, seats: number): Record<string, number> {
  const ids = Object.keys(votes).filter((k) => (votes[k] ?? 0) > 0);
  const result: Record<string, number> = Object.fromEntries(ids.map((k) => [k, 0]));
  for (let s = 0; s < seats; s++) {
    let best: string | null = null;
    let bestQ = -1;
    for (const id of ids) {
      const q = (votes[id] ?? 0) / ((result[id] ?? 0) + 1);
      if (q > bestQ + 1e-12) {
        bestQ = q;
        best = id;
      }
    }
    if (!best) break;
    result[best] = (result[best] ?? 0) + 1;
  }
  return result;
}

export interface DistrictResult {
  id: number;
  name: string;
  seats: number;
  votes: Record<string, number>;
  shares: Record<string, number>;
  seatsByParty: Record<string, number>;
  winner: string | null;
  validVotes: number;
}

export interface SimulationResult {
  districts: DistrictResult[];
  nationalShares: Record<string, number>;
  nationalVotes: Record<string, number>;
  seatsByParty: Record<string, number>;
  qualified: string[];
  totalVotes: number;
  nationalTurnout: number;
}

export function simulate(scenario: Scenario): SimulationResult {
  const perDistrict: {
    d: District;
    shares: Record<string, number>;
    votes: Record<string, number>;
    valid: number;
  }[] = [];
  const nationalVotes: Record<string, number> = {};
  let totalVotes = 0;
  let totalElectorate = 0;

  for (const d of DISTRICTS) {
    const state = scenario.districts[d.id] ?? {
      shares: { ...d.base },
      turnout: BASE_TURNOUT,
    };
    const shares = effectiveShares(d, state, scenario.turnoutEffect, scenario.parties);
    const valid = (d.electorate * state.turnout) / 100;
    const votes: Record<string, number> = {};
    for (const [id, pct] of Object.entries(shares)) {
      const v = (valid * pct) / 100;
      votes[id] = v;
      nationalVotes[id] = (nationalVotes[id] ?? 0) + v;
    }
    totalVotes += valid;
    totalElectorate += d.electorate;
    perDistrict.push({ d, shares, votes, valid });
  }

  const nationalShares: Record<string, number> = {};
  for (const [id, v] of Object.entries(nationalVotes)) {
    nationalShares[id] = totalVotes > 0 ? (v / totalVotes) * 100 : 0;
  }

  const qualified = Object.keys(nationalVotes).filter((id) => {
    if (id === "inne") return false;
    const settings = scenario.parties[id];
    if (!settings?.enabled) return false;
    return (nationalShares[id] ?? 0) >= settings.threshold - 1e-9;
  });

  const seatsByParty: Record<string, number> = {};
  const districts: DistrictResult[] = perDistrict.map(({ d, shares, votes, valid }) => {
    const eligible: Record<string, number> = {};
    for (const id of qualified) eligible[id] = votes[id] ?? 0;
    const seatsHere = dhondt(eligible, d.seats);
    for (const [id, n] of Object.entries(seatsHere)) {
      seatsByParty[id] = (seatsByParty[id] ?? 0) + n;
    }
    let winner: string | null = null;
    let bestSeats = -1;
    let bestVotes = -1;
    for (const [id, n] of Object.entries(seatsHere)) {
      if (n > bestSeats || (n === bestSeats && (votes[id] ?? 0) > bestVotes)) {
        bestSeats = n;
        bestVotes = votes[id] ?? 0;
        winner = id;
      }
    }
    if (bestSeats <= 0) winner = null;
    return {
      id: d.id,
      name: d.name,
      seats: d.seats,
      votes,
      shares,
      seatsByParty: seatsHere,
      winner,
      validVotes: valid,
    };
  });

  return {
    districts,
    nationalShares,
    nationalVotes,
    seatsByParty,
    qualified,
    totalVotes,
    nationalTurnout: totalElectorate > 0 ? (totalVotes / totalElectorate) * 100 : 0,
  };
}

export function partyLabel(id: string) {
  return PARTY_MAP[id]?.short ?? id;
}

export function partyColor(id: string) {
  return PARTY_MAP[id]?.color ?? "#94A3B8";
}
