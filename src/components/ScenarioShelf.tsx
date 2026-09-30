import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, FolderOpen, Play, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { defaultScenario, type Scenario } from "@/lib/simulation";

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
    return parsed
      .filter(
        (item): item is SavedScenario =>
          Boolean(item) && typeof item === "object" && validScenario((item as SavedScenario).scenario),
      )
      .slice(0, 10);
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
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    const newId = crypto.randomUUID();
    const entry: SavedScenario = {
      id: newId,
      name: title,
      savedAt: new Date().toISOString(),
      scenario: { ...scenario, name: title, createdAt: new Date().toISOString() },
    };
    persist([entry, ...saved].slice(0, 10));
    setActiveScenarioId(newId);
    setName("");
    toast.success(`Scenariusz "${title}" zapisany!`);
  };

  const handleLoad = (target: Scenario, label: string, id: string) => {
    onLoad(target);
    setActiveScenarioId(id);
    toast.success(`Wczytano: ${label}`);
  };

  const share = async () => {
    const url = new URL(window.location.href);
    url.hash = `scenario=${encodeScenario(scenario)}`;
    try {
      await navigator.clipboard.writeText(url.toString());
      toast.success("Link do scenariusza skopiowany do schowka");
    } catch {
      window.location.hash = url.hash;
      toast.info("Link do scenariusza jest gotowy w pasku adresu");
    }
  };

  const downloadJson = (targetScenario: Scenario, filename: string) => {
    const blob = new Blob([JSON.stringify(targetScenario, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Pobrano plik scenariusza");
  };

  const handleFileUpload = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as Scenario;
      if (parsed?.version !== 1 || !parsed.districts) throw new Error("zły format");
      const title = parsed.name || file.name.replace(/\.json$/i, "");
      const newId = crypto.randomUUID();
      const entry: SavedScenario = {
        id: newId,
        name: title,
        savedAt: new Date().toISOString(),
        scenario: parsed,
      };
      persist([entry, ...saved].slice(0, 10));
      onLoad(parsed);
      setActiveScenarioId(newId);
      toast.success(`Wczytano i dodano do biblioteki: ${title}`);
    } catch {
      toast.error("Nieprawidłowy plik scenariusza JSON.");
    }
  };

  return (
    <aside className="panel-float flex h-full min-h-[24rem] flex-col p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">Biblioteka scenariuszy</p>
          <h2 className="mt-0.5 font-display text-lg font-bold text-ink">Scenariusze Sejmu</h2>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-colors"
          title="Wczytaj plik scenariusza JSON z dysku"
        >
          <Upload className="h-3 w-3" /> Wczytaj plik
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          aria-label="Wczytaj plik scenariusza JSON"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFileUpload(f);
            e.target.value = "";
          }}
        />
      </div>

      {/* Formularz szybkiego zapisu */}
      <div className="mt-3 flex gap-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && saveLocal()}
          placeholder="Nazwa nowego wariantu..."
          maxLength={48}
          aria-label="Nazwa nowego scenariusza"
          className="h-9 text-xs"
        />
        <Button
          size="sm"
          className="h-9 px-3 gap-1 shrink-0 font-medium"
          onClick={saveLocal}
          title="Zapisz obecny stan w przeglądarce"
        >
          <Plus className="h-3.5 w-3.5" /> Zapisz
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => void share()}
          title="Skopiuj link do obecnego scenariusza"
          aria-label="Skopiuj link"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
        {saved.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-center">
            <FolderOpen className="mx-auto h-6 w-6 text-muted-foreground/60" />
            <p className="mt-2 text-xs font-semibold text-ink">Brak zapisanych wariantów</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Ustaw własne parametry i kliknij <strong>Zapisz</strong>.
            </p>
          </div>
        ) : (
          saved.map((item) => {
            const isActive = activeScenarioId === item.id;
            return (
              <div
                key={item.id}
                className={`flex flex-col gap-2 rounded-lg border p-2.5 transition-all ${
                  isActive
                    ? "border-primary/50 bg-primary/[0.04] shadow-xs"
                    : "border-border bg-surface hover:border-border/80"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-bold text-ink">{item.name}</span>
                      {isActive ? (
                        <span className="inline-flex items-center gap-0.5 rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                          <Check className="h-2.5 w-2.5" /> Wczytany
                        </span>
                      ) : null}
                    </div>
                    <span className="num block text-[10px] text-muted-foreground">
                      {new Date(item.savedAt).toLocaleDateString("pl-PL")}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="sm"
                      variant={isActive ? "secondary" : "default"}
                      className="h-7 gap-1 px-2.5 text-[11px] font-semibold"
                      onClick={() => handleLoad(item.scenario, item.name, item.id)}
                    >
                      <Play className="h-3 w-3 fill-current" /> Wczytaj
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-ink"
                      onClick={() => downloadJson(item.scenario, item.name)}
                      aria-label={`Pobierz plik ${item.name}`}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => persist(saved.filter((entry) => entry.id !== item.id))}
                      aria-label={`Usuń ${item.name}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-[11px] text-muted-foreground">
        <span>{saved.length}/10 wariantów w pamięci</span>
        <button
          onClick={() => {
            handleLoad(defaultScenario(), "Sondaż bazowy (Reset)", "reset");
          }}
          className="hover:text-primary transition-colors font-medium underline-offset-2 hover:underline"
        >
          Przywróć stan wyjściowy
        </button>
      </div>
    </aside>
  );
}