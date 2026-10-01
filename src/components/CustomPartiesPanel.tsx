import { useState, type Dispatch, type SetStateAction } from "react";
import { ImagePlus, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  MERGED_INTO,
  PARTY_MAP,
  supportParties,
  writeCustomLogo,
  type CustomPartyDef,
  type MergerDef,
} from "@/data/parties";
import type { Scenario } from "@/lib/simulation";
import { track } from "@/lib/analytics";
import { PartyLogo } from "@/components/PartyLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

const MAX_CUSTOM = 10;
const MAX_MERGERS = 5;
const MAX_LOGO_BYTES = 500 * 1024;

const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function LogoPicker({ id, label, onDone }: { id: string; label: string; onDone: () => void }) {
  const hasLogo = Boolean(PARTY_MAP[id]?.logo);
  return (
    <div className="flex items-center gap-1">
      <label className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium hover:bg-muted">
        <ImagePlus className="h-4 w-4" /> {hasLogo ? "Zmień obrazek" : "Obrazek .jpg"}
        <input
          type="file"
          accept="image/jpeg,.jpg,.jpeg"
          className="sr-only"
          aria-label={`Obrazek dla ${label}`}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            if (!/jpe?g$/i.test(file.type) && !/\.jpe?g$/i.test(file.name)) {
              toast.error("Wybierz plik .jpg.");
              return;
            }
            if (file.size > MAX_LOGO_BYTES) {
              toast.error("Obrazek może mieć najwyżej 500 kB.");
              return;
            }
            const reader = new FileReader();
            reader.onload = () => {
              if (writeCustomLogo(id, String(reader.result))) onDone();
              else toast.error("Przeglądarka nie pozwoliła zapisać obrazka.");
            };
            reader.readAsDataURL(file);
          }}
        />
      </label>
      {hasLogo ? (
        <Button
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11"
          aria-label={`Usuń obrazek ${label}`}
          onClick={() => {
            writeCustomLogo(id, null);
            onDone();
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}

function IdentityFields({
  item,
  onPatch,
}: {
  item: CustomPartyDef;
  onPatch: (patch: Partial<CustomPartyDef>) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)_7rem]">
      <input
        type="color"
        value={item.color}
        onChange={(e) => onPatch({ color: e.target.value })}
        className="h-11 w-11 cursor-pointer rounded-md border border-border bg-transparent p-1"
        aria-label={`Kolor ${item.name}`}
      />
      <Input
        value={item.name}
        maxLength={40}
        onChange={(e) => onPatch({ name: e.target.value })}
        aria-label="Pełna nazwa"
        placeholder="Pełna nazwa"
        className="h-11"
      />
      <Input
        value={item.short}
        maxLength={10}
        onChange={(e) => onPatch({ short: e.target.value })}
        aria-label="Skrót"
        placeholder="Skrót"
        className="h-11"
      />
    </div>
  );
}

export function CustomPartiesPanel({
  scenario,
  setScenario,
  onLogoChange,
}: {
  scenario: Scenario;
  setScenario: Dispatch<SetStateAction<Scenario>>;
  onLogoChange: () => void;
}) {
  const custom = scenario.customParties ?? [];
  const mergers = scenario.mergers ?? [];
  const [draft, setDraft] = useState<string[]>([]);

  const addParty = () => {
    if (custom.length >= MAX_CUSTOM) {
      toast.error(`Możesz dodać najwyżej ${MAX_CUSTOM} własnych partii.`);
      return;
    }
    const id = newId("cp");
    const n = custom.length + 1;
    track({ event: "custom_party_add" });
    setScenario((s) => ({
      ...s,
      customParties: [...(s.customParties ?? []), { id, name: `Nowa partia ${n}`, short: `NP${n}`, color: "#0EA5E9" }],
      parties: { ...s.parties, [id]: { threshold: 5, turnoutSensitivity: 0, enabled: true } },
    }));
  };

  const patchParty = (id: string, patch: Partial<CustomPartyDef>) =>
    setScenario((s) => ({
      ...s,
      customParties: (s.customParties ?? []).map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));

  const removeEntity = (id: string) => {
    writeCustomLogo(id, null);
    setScenario((s) => {
      const parties = { ...s.parties };
      delete parties[id];
      const districts = Object.fromEntries(
        Object.entries(s.districts).map(([k, d]) => {
          const shares = { ...d.shares };
          delete shares[id];
          return [k, { ...d, shares }];
        }),
      );
      return {
        ...s,
        parties,
        districts,
        customParties: (s.customParties ?? []).filter((c) => c.id !== id),
        mergers: (s.mergers ?? [])
          .filter((m) => m.id !== id)
          .map((m) => ({ ...m, members: m.members.filter((x) => x !== id) }))
          .filter((m) => m.members.length >= 2),
        coalitions: s.coalitions.map((c) => ({ ...c, members: c.members.filter((x) => x !== id) })),
      };
    });
  };

  const createMerger = () => {
    if (mergers.length >= MAX_MERGERS) {
      toast.error(`Możesz utworzyć najwyżej ${MAX_MERGERS} wspólnych list.`);
      return;
    }
    if (draft.length < 2) return;
    const id = newId("ml");
    const first = PARTY_MAP[draft[0]!];
    const name = draft.map((m) => PARTY_MAP[m]?.short ?? m).join(" + ");
    track({ event: "merger_create", meta: [...draft].sort().join("+").slice(0, 40) });
    setScenario((s) => ({
      ...s,
      mergers: [
        ...(s.mergers ?? []),
        { id, name, short: name.slice(0, 10), color: first?.color ?? "#475569", members: draft, retention: 85 },
      ],
      parties: { ...s.parties, [id]: { threshold: 8, turnoutSensitivity: 0, enabled: true } },
      coalitions: s.coalitions.map((c) =>
        c.members.some((m) => draft.includes(m))
          ? { ...c, members: [...c.members.filter((m) => !draft.includes(m)), id] }
          : c,
      ),
    }));
    setDraft([]);
  };

  const patchMerger = (id: string, patch: Partial<MergerDef>) =>
    setScenario((s) => ({
      ...s,
      mergers: (s.mergers ?? []).map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));

  const candidates = supportParties().filter((p) => !MERGED_INTO[p.id]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="panel p-5" aria-labelledby="custom-parties-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="custom-parties-title" className="font-display text-xl font-bold text-ink">Własne partie</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Dodaj nowe ugrupowanie, a potem ustaw jego poparcie suwakiem w wyniku ogólnokrajowym lub w wybranym okręgu na mapie.
            </p>
          </div>
          <Button onClick={addParty} variant="outline" className="min-h-11">
            <Plus className="mr-1.5 h-4 w-4" /> Dodaj partię
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {custom.length === 0 ? (
            <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">Nie dodano jeszcze własnych partii.</p>
          ) : null}
          {custom.map((c) => (
            <div key={c.id} className="space-y-2 rounded-lg border border-border/70 p-3">
              <div className="flex items-center gap-2">
                <PartyLogo id={c.id} size={32} />
                <span className="truncate text-sm font-semibold">{c.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto min-h-11 min-w-11"
                  aria-label={`Usuń partię ${c.name}`}
                  onClick={() => removeEntity(c.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <IdentityFields item={c} onPatch={(patch) => patchParty(c.id, patch)} />
              <LogoPicker id={c.id} label={c.name} onDone={onLogoChange} />
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-5" aria-labelledby="mergers-title">
        <h2 id="mergers-title" className="font-display text-xl font-bold text-ink">Wspólne listy</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Połącz partie w jeden komitet. Ich poparcie się sumuje, a suwak określa, jaka część wyborców zostaje przy wspólnej liście.
        </p>

        <div className="mt-4 rounded-lg border border-dashed border-border p-3">
          <p className="text-xs font-semibold text-muted-foreground">Wybierz partie do połączenia</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {candidates.map((p) => {
              const on = draft.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setDraft((d) => (on ? d.filter((x) => x !== p.id) : [...d, p.id]))}
                  className={`flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors ${
                    on ? "border-transparent text-white" : "border-border bg-surface text-muted-foreground hover:border-ink/30"
                  }`}
                  style={on ? { background: p.color } : undefined}
                >
                  <PartyLogo id={p.id} size={16} /> {p.short}
                </button>
              );
            })}
          </div>
          <Button onClick={createMerger} className="mt-3 min-h-11" disabled={draft.length < 2}>
            <Plus className="mr-1.5 h-4 w-4" /> Utwórz wspólną listę
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {mergers.map((m) => (
            <div key={m.id} className="space-y-3 rounded-lg border border-border/70 p-3">
              <div className="flex items-center gap-2">
                <PartyLogo id={m.id} size={32} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{m.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {m.members.map((x) => PARTY_MAP[x]?.short ?? x).join(" + ")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto min-h-11 min-w-11"
                  aria-label={`Rozwiąż listę ${m.name}`}
                  onClick={() => removeEntity(m.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <IdentityFields item={m} onPatch={(patch) => patchMerger(m.id, patch)} />
              <LogoPicker id={m.id} label={m.name} onDone={onLogoChange} />
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold">Zachowane poparcie</span>
                  <span className="num text-sm font-bold text-primary">{m.retention}%</span>
                </div>
                <Slider
                  className="mt-2"
                  min={50}
                  max={100}
                  step={1}
                  value={[m.retention]}
                  aria-label={`Zachowane poparcie listy ${m.name}`}
                  onValueChange={([v = 85]) => patchMerger(m.id, { retention: v })}
                />
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Pozostałe {100 - m.retention}% wyborców partii składowych przechodzi do innych komitetów.
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="text-xs text-muted-foreground lg:col-span-2">
        Własne partie i listy zapisują się w bibliotece, w pobieranym pliku i w linkach. Obrazki zostają tylko w tej przeglądarce.
      </p>
    </div>
  );
}
