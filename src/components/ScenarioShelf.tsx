import { useEffect, useState } from "react";
import { Copy, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Scenario } from "@/lib/simulation";

const STORAGE_KEY = "sejmometr.saved-scenarios.v1";

interface SavedScenario {
  id: string;
  name: string;
  savedAt: string;
  scenario: Scenario;
}

function validScenario(value: unknown): value is Scenario {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Scenario>;
  return candidate.version === 1 && Boolean(candidate.districts) && Boolean(candidate.parties);
}

function readSaved(): SavedScenario[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SavedScenario =>
        Boolean(item) && typeof item === "object" && validScenario((item as SavedScenario).scenario),
    ).slice(0, 10);
  } catch {
    return [];
  }
}

function encodeScenario(scenario: Scenario) {
  const json = JSON.stringify(scenario);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeScenario(encoded: string): Scenario | null {
  try {
    const padded = encoded.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(encoded.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
    return validScenario(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function ScenarioShelf({
  scenario,
  onLoad,
}: {
  scenario: Scenario;
  onLoad: (scenario: Scenario) => void;
}) {
  const [saved, setSaved] = useState<SavedScenario[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    setSaved(readSaved());
    const encoded = window.location.hash.startsWith("#scenario=")
      ? window.location.hash.slice("#scenario=".length)
      : "";
    if (!encoded) return;
    const shared = decodeScenario(encoded);
    if (shared) {
      onLoad(shared);
      toast.success("Wczytano scenariusz z udostępnionego linku");
    }
  }, [onLoad]);

  const persist = (next: SavedScenario[]) => {
    setSaved(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const saveLocal = () => {
    const title = name.trim() || `Scenariusz ${saved.length + 1}`;
    const entry: SavedScenario = {
      id: crypto.randomUUID(),
      name: title,
      savedAt: new Date().toISOString(),
      scenario: { ...scenario, name: title, createdAt: new Date().toISOString() },
    };
    persist([entry, ...saved].slice(0, 10));
    setName("");
    toast.success("Scenariusz zapisany w tej przeglądarce");
  };

  const share = async () => {
    const url = new URL(window.location.href);
    url.hash = `scenario=${encodeScenario(scenario)}`;
    try {
      await navigator.clipboard.writeText(url.toString());
      toast.success("Link do scenariusza skopiowany");
    } catch {
      window.location.hash = url.hash;
      toast.info("Link do scenariusza jest gotowy w pasku adresu");
    }
  };

  return (
    <aside className="panel-float flex h-full min-h-[22rem] flex-col p-4">
      <div>
        <p className="eyebrow">Twoja biblioteka</p>
        <h2 className="mt-1 font-display text-lg font-bold text-ink">Zapisane scenariusze</h2>
      </div>

      <div className="mt-3 flex gap-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && saveLocal()}
          placeholder="Nazwa scenariusza"
          maxLength={48}
          aria-label="Nazwa scenariusza"
        />
        <Button size="icon" className="min-h-11 min-w-11" onClick={saveLocal} title="Zapisz lokalnie" aria-label="Zapisz lokalnie">
          <Save className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="min-h-11 min-w-11" onClick={() => void share()} title="Kopiuj link" aria-label="Kopiuj link">
          <Copy className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
        {saved.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
            Możesz zachować tutaj do 10 wariantów. Pozostaną dostępne po ponownym wejściu.
          </p>
        ) : (
          saved.map((item) => (
            <div key={item.id} className="flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-2">
              <button className="min-w-0 flex-1 text-left" onClick={() => onLoad(item.scenario)}>
                <span className="block truncate text-sm font-semibold">{item.name}</span>
                <span className="num block text-[10px] text-muted-foreground">
                  {new Date(item.savedAt).toLocaleDateString("pl-PL")}
                </span>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="min-h-11 min-w-11 shrink-0"
                onClick={() => persist(saved.filter((savedItem) => savedItem.id !== item.id))}
                title="Usuń scenariusz"
                aria-label={`Usuń ${item.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">{saved.length}/10 zapisanych</p>
    </aside>
  );
}