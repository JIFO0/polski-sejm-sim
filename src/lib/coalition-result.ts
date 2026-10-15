import { MAJORITY, type Coalition } from "./simulation";

export function coalitionResult(coalitions: Coalition[], seatsByParty: Record<string, number>) {
  const ranked = coalitions.map((coalition) => ({
    ...coalition,
    seats: [...new Set(coalition.members)].reduce((total, id) => total + (seatsByParty[id] ?? 0), 0),
  })).sort((a, b) => b.seats - a.seats);
  return { winners: ranked.filter((coalition) => coalition.seats >= MAJORITY), strongest: ranked[0] };
}