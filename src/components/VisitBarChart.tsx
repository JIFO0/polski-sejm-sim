import { useState } from "react";
import { Button } from "@/components/ui/button";

export function VisitBarChart({ data, label }: { data: { key: string; label: string; count: number }[]; label: string }) {
  const [active, setActive] = useState<string | null>(null);
  const max = Math.max(1, ...data.map((item) => item.count));
  const selected = data.find((item) => item.key === active);
  return <div className="mt-4" aria-label={label}>
    <p className="mb-3 min-h-5 text-xs text-muted-foreground" aria-live="polite">{selected ? `${selected.label}: ${selected.count} wejść` : `${data.reduce((sum, item) => sum + item.count, 0)} wejść w wybranym okresie`}</p>
    <div className="overflow-x-auto pb-2">
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(${data.length > 24 ? 26 : 20}px, 1fr))` }}>
        {data.map((item) => <div key={item.key} className="grid min-w-0 grid-rows-[160px_24px] gap-2">
          <Button variant="ghost" className="relative h-full min-w-0 w-full items-end rounded-t-sm rounded-b-none bg-muted/50 p-0 hover:bg-muted" aria-label={`${item.label}: ${item.count} wejść`} aria-pressed={active === item.key} onClick={() => setActive(item.key)} onMouseEnter={() => setActive(item.key)} onFocus={() => setActive(item.key)} title={`${item.label}: ${item.count} wejść`}>
            <span className={`block w-full rounded-t-sm ${active === item.key ? "bg-chart-2" : "bg-primary"}`} style={{ height: `${item.count / max * 100}%` }} />
          </Button>
          <span className="num flex items-center justify-center overflow-hidden text-[10px] text-muted-foreground">{item.label}</span>
        </div>)}
      </div>
    </div>
  </div>;
}