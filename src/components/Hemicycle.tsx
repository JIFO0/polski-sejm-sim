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

    const rows = 11;
    const radii = Array.from({ length: rows }, (_, index) => 20 + (28 * index) / (rows - 1));
    const radiusTotal = radii.reduce((sum, radius) => sum + radius, 0);
    const counts = radii.map((radius) => Math.floor((radius / radiusTotal) * queue.length));
    let remaining = queue.length - counts.reduce((sum, count) => sum + count, 0);
    for (let row = rows - 1; remaining > 0; row = (row - 1 + rows) % rows) {
      counts[row] = (counts[row] ?? 0) + 1;
      remaining -= 1;
    }

    const positions: { x: number; y: number; angle: number; radius: number }[] = [];
    for (let r = 0; r < rows; r++) {
      const radius = radii[r] ?? 20;
      const n = counts[r] ?? 0;
      for (let i = 0; i < n; i++) {
        const angle = Math.PI - (Math.PI * (i + 0.5)) / n;
        positions.push({
          x: Number((50 + Math.cos(angle) * radius).toFixed(3)),
          y: Number((51 - Math.sin(angle) * radius).toFixed(3)),
          angle: Number(angle.toFixed(6)),
          radius,
        });
      }
    }
    positions.sort((a, b) => b.angle - a.angle || a.radius - b.radius);
    return positions.map((position, index) => ({
      x: position.x,
      y: position.y,
      party: queue[index] ?? "_empty",
    }));
  }, [seatsByParty, total]);

  return (
    <svg viewBox="0 0 100 56" className="h-auto w-full">
      <style>{`.hemi-seat{transition:fill 300ms ease,opacity 250ms ease;}`}</style>
      {seats.map((s, i) => {
        const dim = highlight && highlight.size > 0 && !highlight.has(s.party);
        return (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={1.22}
            className="hemi-seat"
            fill={s.party === "_empty" ? "var(--seat-empty)" : (PARTY_MAP[s.party]?.color ?? "#94A3B8")}
            opacity={s.party === "_empty" ? 0.6 : dim ? 0.16 : 1}
          />
        );
      })}
      <line x1="50" y1="0.5" x2="50" y2="7" stroke="var(--ink)" strokeWidth="0.35" strokeDasharray="1.2 1.2" />
    </svg>
  );
}
