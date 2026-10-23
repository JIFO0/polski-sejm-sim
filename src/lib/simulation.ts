import { DISTRICTS, type District } from "@/data/districts";
import {
  PARTIES,
  PARTY_MAP,
  type CustomPartyDef,
  type MergerDef,
  type ThresholdKind,
} from "@/data/parties";
import { baselineSharesFor, currentPollAverage } from "@/lib/poll-average";
import {
  getAdjustedSeats,
  type DemographicAdjustmentMode,
} from "@/data/demographicAdjustment";

export type { DemographicAdjustmentMode } from "@/data/demographicAdjustment";

export const BASE_TURNOUT = 74.4;
export const MAJORITY = 231;

export interface DistrictState {
  /** Procentowe poparcie partii w okręgu (suma powinna dawać 100). */
  shares: Record<string, number>;
  /** Frekwencja w okręgu, w procentach. */
  turnout: number;
  /** Liczba kwalifikowanych wyborców / uprawnionych (opcjonalna, domyślnie z DISTRICTS[id].electorate). */
  electorate?: number | undefined;
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
  author?: string;
  description?: string;
  /** Siła wpływu frekwencji na profil elektoratu: 0 = wyłączony, 1 = pełny. */
  turnoutEffect: number;
  /** Gdy aktywne, zmiana jednej partii korzysta z puli nieprzypisanej zamiast skalować pozostałe. */
  independentSupport?: boolean;
  /** Korekta demograficzna okręgów (wniosek PKW) */
  demographicAdjustment?: DemographicAdjustmentMode | boolean | undefined;
  districts: Record<number, DistrictState>;
  parties: Record<string, PartySettings>;
  coalitions: Coalition[];
  /** Własne partie użytkownika (bez obrazków). */
  customParties?: CustomPartyDef[];
  /** Wspólne listy łączące poparcie kilku partii. */
  mergers?: MergerDef[];
}

export function defaultScenario(): Scenario {
  const districts: Record<number, DistrictState> = {};
  for (const d of DISTRICTS) {
    districts[d.id] = {
      shares: baselineSharesFor(d.id),
      turnout: BASE_TURNOUT,
      electorate: d.electorate,
    };
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
    name: currentPollAverage() ? "Średnia sondaży SejmSim" : "Profil okręgowy SejmSim",
    createdAt: new Date().toISOString(),
    turnoutEffect: 1,
    independentSupport: false,
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

/** Udziały w okręgu po uwzględnieniu frekwencji. */
export function effectiveShares(
  district: District,
  state: DistrictState,
  turnoutEffect: number,
  parties: Record<string, PartySettings>,
  independentSupport = false,
  mergers: MergerDef[] = [],
): Record<string, number> {
  const delta = (state.turnout - BASE_TURNOUT) / BASE_TURNOUT;
  const raw: Record<string, number> = {};
  let sum = 0;
  for (const [id, pct] of Object.entries(state.shares)) {
    const settings = parties[id];
    if (settings?.enabled === false) continue;
    const fallbackSens = PARTY_MAP[id]?.turnoutSensitivity ?? 0;
    const sens =
      settings?.turnoutSensitivity !== undefined ? settings.turnoutSensitivity : fallbackSens;
    const v = Math.max(0, pct * (1 + sens * turnoutEffect * delta));
    raw[id] = v;
    sum += v;
  }
  for (const m of mergers) {
    if (raw[m.id] == null) {
      let joint = 0;
      for (const member of m.members) {
        joint += raw[member] ?? 0;
      }
      const kept = joint * Math.min(1, Math.max(0, m.retention / 100));
      if (parties[m.id]?.enabled !== false) {
        raw[m.id] = kept;
        sum += kept;
      }
      const lost = joint - (parties[m.id]?.enabled !== false ? kept : 0);
      if (!independentSupport && raw["inne"] != null) raw["inne"] += lost;
      else sum -= lost;
    }
    for (const member of m.members) {
      if (raw[member] != null) {
        sum -= raw[member]!;
        delete raw[member];
      }
    }
  }
  if (sum <= 0 || (independentSupport && sum <= 100)) return raw;
  for (const id of Object.keys(raw)) raw[id] = ((raw[id] ?? 0) / sum) * 100;
  return raw;
}

function dhondt(votes: Record<string, number>, seats: number): Record<string, number> {
  const ids = Object.keys(votes)
    .filter((k) => (votes[k] ?? 0) > 0)
    .sort();
  const result: Record<string, number> = Object.fromEntries(ids.map((k) => [k, 0]));
  for (let s = 0; s < seats; s++) {
    let best: string | null = null;
    let bestQ = -1;
    for (const id of ids) {
      const q = (votes[id] ?? 0) / ((result[id] ?? 0) + 1);
      // Porównanie względne: ta sama proporcja głosów daje ten sam mandat
      // niezależnie od skali frekwencji (bezwzględny epsilon potrafił przerzucać remisy).
      if (best === null || q > bestQ * (1 + 1e-9)) {
        bestQ = q;
        best = id;
      }
    }
    if (!best) break;
    result[best] = (result[best] ?? 0) + 1;
  }
  return result;
}

/** Czy któraś włączona partia ma profil elektoratu wrażliwy na frekwencję. */
export function turnoutChangesSeats(scenario: Scenario): boolean {
  return Object.entries(scenario.parties).some(([, settings]) => {
    if (settings.enabled === false) return false;
    return Math.abs(settings.turnoutSensitivity) > 0.01;
  });
}

export interface DistrictResult {
  id: number;
  name: string;
  seats: number;
  baseSeats: number;
  seatDelta: number;
  electorate: number;
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
  totalElectorate: number;
  nationalTurnout: number;
  demographicAdjustmentActive?: boolean | undefined;
  demographicAdjustmentMode?: DemographicAdjustmentMode | undefined;
  partySeatDeltas?: Record<string, number> | undefined;
}

export function simulate(scenario: Scenario): SimulationResult {
  const perDistrict: {
    d: District;
    shares: Record<string, number>;
    votes: Record<string, number>;
    allocVotes: Record<string, number>;
    valid: number;
    electorate: number;
  }[] = [];
  const nationalVotes: Record<string, number> = {};
  const allocNational: Record<string, number> = {};
  let totalVotes = 0;
  let allocTotal = 0;
  let totalElectorate = 0;
  // Same partie neutralne: frekwencja skaluje tylko liczbę głosów.
  // Podział mandatów i progi liczymy wagą uprawnionych, nie lokalną frekwencją.
  const reacts = turnoutChangesSeats(scenario);

  for (const d of DISTRICTS) {
    const state = scenario.districts[d.id] ?? {
      shares: { ...d.base },
      turnout: BASE_TURNOUT,
      electorate: d.electorate,
    };
    const electorate =
      typeof state.electorate === "number" && state.electorate > 0
        ? state.electorate
        : d.electorate;
    const shares = effectiveShares(
      d,
      state,
      scenario.turnoutEffect,
      scenario.parties,
      scenario.independentSupport ?? false,
      scenario.mergers ?? [],
    );
    const valid = (electorate * state.turnout) / 100;
    const allocValid = reacts ? valid : (electorate * BASE_TURNOUT) / 100;
    const votes: Record<string, number> = {};
    const allocVotes: Record<string, number> = {};
    for (const [id, pct] of Object.entries(shares)) {
      const shown = (valid * pct) / 100;
      const weighted = (allocValid * pct) / 100;
      votes[id] = shown;
      allocVotes[id] = weighted;
      nationalVotes[id] = (nationalVotes[id] ?? 0) + shown;
      allocNational[id] = (allocNational[id] ?? 0) + weighted;
    }
    totalVotes += valid;
    allocTotal += allocValid;
    totalElectorate += electorate;
    perDistrict.push({ d, shares, votes, allocVotes, valid, electorate });
  }

  const nationalShares: Record<string, number> = {};
  for (const [id, v] of Object.entries(allocNational)) {
    nationalShares[id] = allocTotal > 0 ? (v / allocTotal) * 100 : 0;
  }

  const qualified = Object.keys(nationalVotes).filter((id) => {
    if (id === "inne") return false;
    const settings = scenario.parties[id];
    if (!settings?.enabled) return false;
    return (nationalShares[id] ?? 0) >= settings.threshold - 1e-9;
  });

  const adjMode: DemographicAdjustmentMode =
    typeof scenario.demographicAdjustment === "string"
      ? scenario.demographicAdjustment
      : scenario.demographicAdjustment
        ? "pkw"
        : "none";
  const adjustmentActive = adjMode !== "none";

  const seatsByParty: Record<string, number> = {};
  const districts: DistrictResult[] = perDistrict.map(
    ({ d, shares, votes, allocVotes, valid, electorate }) => {
      const eligible: Record<string, number> = {};
      for (const id of qualified) eligible[id] = allocVotes[id] ?? 0;
      const targetSeats = getAdjustedSeats(d.id, d.seats, adjMode);
      const seatsHere = dhondt(eligible, targetSeats);
      for (const [id, n] of Object.entries(seatsHere)) {
        seatsByParty[id] = (seatsByParty[id] ?? 0) + n;
      }
      let winner: string | null = null;
      let bestSeats = -1;
      let bestVotes = -1;
      for (const [id, n] of Object.entries(seatsHere)) {
        if (n > bestSeats || (n === bestSeats && (allocVotes[id] ?? 0) > bestVotes)) {
          bestSeats = n;
          bestVotes = allocVotes[id] ?? 0;
          winner = id;
        }
      }
      if (bestSeats <= 0) winner = null;
      return {
        id: d.id,
        name: d.name,
        seats: targetSeats,
        baseSeats: d.seats,
        seatDelta: targetSeats - d.seats,
        electorate,
        votes,
        shares,
        seatsByParty: seatsHere,
        winner,
        validVotes: valid,
      };
    },
  );

  let partySeatDeltas: Record<string, number> | undefined;
  if (adjustmentActive) {
    partySeatDeltas = {};
    for (const pid of qualified) partySeatDeltas[pid] = 0;
    for (const { d, allocVotes } of perDistrict) {
      const eligible: Record<string, number> = {};
      for (const id of qualified) eligible[id] = allocVotes[id] ?? 0;
      const baseSeatsHere = dhondt(eligible, d.seats);
      for (const [id, n] of Object.entries(baseSeatsHere)) {
        if (partySeatDeltas[id] !== undefined) {
          partySeatDeltas[id] -= n;
        }
      }
    }
    for (const [id, n] of Object.entries(seatsByParty)) {
      if (partySeatDeltas[id] !== undefined) {
        partySeatDeltas[id] += n;
      }
    }
  }

  return {
    districts,
    nationalShares,
    nationalVotes,
    seatsByParty,
    qualified,
    totalVotes,
    totalElectorate,
    nationalTurnout: totalElectorate > 0 ? (totalVotes / totalElectorate) * 100 : 0,
    demographicAdjustmentActive: adjustmentActive,
    demographicAdjustmentMode: adjMode,
    partySeatDeltas,
  };
}

export function partyLabel(id: string) {
  return PARTY_MAP[id]?.short ?? id;
}

export function partyColor(id: string) {
  return PARTY_MAP[id]?.color ?? "#94A3B8";
}
