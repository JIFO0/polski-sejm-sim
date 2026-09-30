import { Plus, Trash2 } from "lucide-react";
import { PARTIES, PARTY_MAP } from "@/data/parties";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PartyLogo } from "@/components/PartyLogo";
import { MAJORITY, type Coalition } from "@/lib/simulation";

export function CoalitionBuilder({
  coalitions,
  seatsByParty,
  qualified,
  onChange,
  onHover,
}: {
  coalitions: Coalition[];
  seatsByParty: Record<string, number>;
  qualified: string[];
  onChange: (next: Coalition[]) => void;
  onHover: (members: string[] | null) => void;
}) {
  const update = (id: string, patch: Partial<Coalition>) =>
    onChange(coalitions.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const toggle = (c: Coalition, pid: string) =>
    update(c.id, {
      members: c.members.includes(pid)
        ? c.members.filter((m) => m !== pid)
        : [...c.members, pid],
    });

  const add = () =>
    onChange([
      ...coalitions,
      {
        id: `c${Date.now()}`,
        name: `Nowa grupa ${coalitions.length + 1}`,
        color: "#475569",
        members: [],
      },
    ]);

  const available = PARTIES.filter((p) => p.id !== "inne");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-ink">Kto z kim?</h2>
          <p className="text-sm text-muted-foreground">
            Złóż dowolne grupy partii i sprawdź, czy mają 231 mandatów.
          </p>
        </div>
        <Button onClick={add} variant="outline" size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> Dodaj grupę
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {coalitions.map((c) => {
          const seats = c.members.reduce((s, m) => s + (seatsByParty[m] ?? 0), 0);
          const pct = Math.min(100, (seats / 460) * 100);
          const majority = seats >= MAJORITY;
          return (
            <div
              key={c.id}
              className="panel p-4"
              onMouseEnter={() => onHover(c.members)}
              onMouseLeave={() => onHover(null)}
            >
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={c.color}
                  onChange={(e) => update(c.id, { color: e.target.value })}
                  className="h-7 w-7 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
                  aria-label="Kolor grupy"
                />
                <Input
                  value={c.name}
                  onChange={(e) => update(c.id, { name: e.target.value })}
                  className="h-8 border-transparent bg-transparent px-1 font-display text-base font-semibold shadow-none focus-visible:border-border"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  aria-label={`Usuń koalicję ${c.name}`}
                  onClick={() => onChange(coalitions.filter((x) => x.id !== c.id))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-3 flex items-end gap-2">
                <span className="num text-4xl font-bold leading-none" style={{ color: c.color }}>
                  {seats}
                </span>
                <span className="mb-1 text-xs text-muted-foreground">/ 460 mandatów</span>
                <span
                  className={`mb-1 ml-auto rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    majority
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {majority ? `większość +${seats - MAJORITY + 1}` : `brakuje ${MAJORITY - seats}`}
                </span>
              </div>

              <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: c.color }}
                />
                <div
                  className="absolute top-0 h-full w-px bg-ink/50"
                  style={{ left: `${(MAJORITY / 460) * 100}%` }}
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {available.map((p) => {
                  const on = c.members.includes(p.id);
                  const inSejm = qualified.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggle(c, p.id)}
                      className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-medium transition-all ${
                        on
                          ? "border-transparent text-white shadow-sm"
                          : "border-border bg-surface text-muted-foreground hover:border-ink/30"
                      } ${inSejm ? "" : "opacity-45"}`}
                      style={on ? { background: p.color } : undefined}
                    >
                      <PartyLogo id={p.id} size={16} className={on ? "" : ""} />
                      {p.short}
                      <span className="num font-bold">{seatsByParty[p.id] ?? 0}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
