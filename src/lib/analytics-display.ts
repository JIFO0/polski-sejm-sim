export type VisitDay = { day: string; count: number };

export function recentVisitDays(rows: VisitDay[], days: number, now = new Date()): VisitDay[] {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const anchor = new Date(`${today}T12:00:00Z`);
  const counts = new Map(rows.map((row) => [row.day, row.count]));
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(anchor);
    date.setUTCDate(date.getUTCDate() - index);
    const day = date.toISOString().slice(0, 10);
    return { day, count: counts.get(day) ?? 0 };
  });
}

export function analyticsPartyName(id: string, labels: Record<string, string>, builtins: Record<string, string>) {
  return labels[id] || builtins[id] || (/^(cp|ml)/.test(id) ? "Własna partia / wspólna lista (starszy wpis)" : id);
}