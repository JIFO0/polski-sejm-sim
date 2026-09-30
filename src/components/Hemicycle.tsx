import { useMemo } from "react";
import { PARTY_MAP } from "@/data/parties";

const LEFT_TO_RIGHT = ["razem", "nl", "pl2050", "ko", "psl", "rp", "pis", "konf", "kkp"];

interface Seat {
  x: number;
  y: number;
  party: string;
}

/** Układ sali sejmowej: 460 miejsc rozłożonych po łukach, od lewej do prawej. */
export function Hemicycle({
  seatsByParty,
  total = 460,
  highlight,
}: {
  seatsByParty: Record<string, number>;
  total?: number;
  highlight?: Set<string> | undefined;
}) {
  const seats = useMemo<Seat[]>(() => {
    const order = [
      ...LEFT_TO_RIGHT.filter((p) => (seatsByParty[p] ?? 0) > 0),
      ...Object.keys(seatsByParty).filter(
        (p) => !LEFT_TO_RIGHT.includes(p) && (seatsByParty[p] ?? 0) > 0,
      ),
    ];
    const queue: string[] = [];
    for (const p of order) {
      for (let i = 0; i < (seatsByParty[p] ?? 0); i++) queue.push(p);
    }
    while (queue.length < total) queue.push("_empty");

    const rows = 13;
    const rInner = 0.42;
    const rOuter = 1;
    const weights = Array.from({ length: rows }, (_, i) => rInner + ((rOuter - rInner) * i) / (rows - 1));
    const sum = weights.reduce((a, b) => a + b, 0);
    const counts = weights.map((w) => Math.max(1, Math.round((w / sum) * queue.length)));
    let diff = queue.length - counts.reduce((a, b) => a + b, 0);
    let idx = rows - 1;
    while (diff !== 0) {
      counts[idx] = (counts[idx] ?? 1) + (diff > 0 ? 1 : -1);
      diff += diff > 0 ? -1 : 1;
      idx = (idx - 1 + rows) % rows;
    }

    const out: Seat[] = [];
    let cursor = 0;
    // Pobieramy kolumnami: dla każdego "slotu kątowego" idziemy od środka na zewnątrz.
    const perRow: string[][] = counts.map(() => []);
    const maxCount = Math.max(...counts);
    for (let col = 0; col < maxCount; col++) {
      for (let r = 0; r < rows; r++) {
        if (col < (counts[r] ?? 0)) (perRow[r] as string[]).push(queue[cursor++] ?? "_empty");
      }
    }

    for (let r = 0; r < rows; r++) {
      const radius = weights[r] ?? 1;
      const n = counts[r] ?? 0;
      for (let i = 0; i < n; i++) {
        const angle = Math.PI - (Math.PI * (i + 0.5)) / n;
        out.push({
          x: +(50 + Math.cos(angle) * radius * 46).toFixed(3),
          y: +(50 - Math.sin(angle) * radius * 46).toFixed(3),
          party: perRow[r]?.[i] ?? "_empty",
        });
      }
    }
    return out;
  }, [seatsByParty, total]);

  return (
    <svg viewBox="0 0 100 56" className="h-auto w-full">
      {seats.map((s, i) => {
        const dim = highlight && highlight.size > 0 && !highlight.has(s.party);
        return (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={1.05}
            fill={s.party === "_empty" ? "#E2E8F0" : (PARTY_MAP[s.party]?.color ?? "#94A3B8")}
            opacity={s.party === "_empty" ? 0.6 : dim ? 0.16 : 1}
            style={{ transition: "fill 300ms ease, opacity 250ms ease" }}
          />
        );
      })}
      <line x1="50" y1="0.5" x2="50" y2="7" stroke="var(--ink)" strokeWidth="0.35" strokeDasharray="1.2 1.2" />
    </svg>
  );
}
