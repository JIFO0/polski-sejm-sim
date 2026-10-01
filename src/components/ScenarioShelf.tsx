import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, FolderOpen, Link2, Loader2, Maximize2, Play, Plus, Trash2, Upload } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { createShare, getShare } from "@/lib/shares.functions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { defaultScenario, type Scenario } from "@/lib/simulation";
import { isScenarioModified, nationalSharesOf, track } from "@/lib/analytics";
import { PARTIES, PARTY_MAP } from "@/data/parties";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STORAGE_KEY = "sejmometr.saved-scenarios.v1";

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `scenario-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

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
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is SavedScenario =>
          Boolean(item) &&
          typeof item === "object" &&
          typeof (item as SavedScenario).name === "string" &&
          validScenario((item as SavedScenario).scenario),
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

function scenarioPartyMap(sc: Scenario): Record<string, { short: string; color: string; name: string }> {
  const map: Record<string, { short: string; color: string; name: string }> = {};
  for (const p of PARTIES) {
    map[p.id] = { short: p.short, color: p.color, name: p.name };
  }
  if (typeof PARTY_MAP === "object" && PARTY_MAP) {
    for (const [k, v] of Object.entries(PARTY_MAP)) {
      if (v) map[k] = { short: v.short, color: v.color, name: v.name };
    }
  }
  for (const c of sc.customParties ?? []) {
    if (c) map[c.id] = { short: c.short, color: c.color, name: c.name };
  }
  for (const m of sc.mergers ?? []) {
    if (m) map[m.id] = { short: m.short, color: m.color, name: m.name };
  }
  return map;
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
  const [sharingId, setSharingId] = useState<string | null>(null);
  const shareLock = useRef(false);
  const [expandedOpen, setExpandedOpen] = useState(false);
  const createShareFn = useServerFn(createShare);
  const getShareFn = useServerFn(getShare);

  useEffect(() => {
    setSaved(readSaved());
    const linkId = new URLSearchParams(window.location.search).get("s");
    if (linkId) {
      void getShareFn({ data: { id: linkId } })
        .then((raw) => {
          const res = raw as { ok: true; scenarioJson: string; name: string } | { ok: false; error: string };
          let parsed: unknown = null;
          if (res.ok) {
            try {
              parsed = JSON.parse(res.scenarioJson);
            } catch {
              parsed = null;
            }
          }
          if (res.ok && validScenario(parsed)) {
            onLoad(parsed);
            track({ event: "share_link_open" });
            toast.success(`Wczytano udostępniony scenariusz: ${res.name}`);
          } else {
            toast.error(res.ok ? "Nieprawidłowy scenariusz." : res.error);
          }
        })
        .catch(() => toast.error("Nie udało się wczytać udostępnionego scenariusza."));
      return;
    }
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
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSaved(next);
      return true;
    } catch {
      toast.error("Przeglądarka zablokowała zapis. Sprawdź ustawienia prywatności lub pobierz plik.");
      return false;
    }
  };

  const saveLocal = () => {
    try {
      const title = name.trim() || `Scenariusz ${saved.length + 1}`;
      const newId = createId();
      const entry: SavedScenario = {
        id: newId,
        name: title,
        savedAt: new Date().toISOString(),
        scenario: { ...scenario, name: title, createdAt: new Date().toISOString() },
      };
      if (!persist([entry, ...saved].slice(0, 10))) return;
      setActiveScenarioId(newId);
      setName("");
      try {
        track({
          event: "scenario_save",
          ...(isScenarioModified(scenario) ? { shares: nationalSharesOf(scenario) } : {}),
        });
      } catch (trackErr) {
        console.warn("Analytics track failed in saveLocal", trackErr);
      }
      toast.success(`Scenariusz "${title}" zapisany!`);
    } catch (err) {
      console.error("saveLocal error:", err);
      toast.error("Wystąpił błąd podczas zapisywania scenariusza.");
    }
  };

  const shareLink = async (item: SavedScenario) => {
    if (shareLock.current) return;
    shareLock.current = true;
    setSharingId(item.id);
    try {
      const res = await createShareFn({ data: { name: item.name.slice(0, 60), scenario: item.scenario as unknown as Record<string, unknown> } });
      if (!res.ok) {
        const when = "nextAt" in res && res.nextAt ? ` Najbliższy wygaśnie ${new Date(res.nextAt).toLocaleString("pl-PL")}.` : "";
        toast.error(res.error + when);
        return;
      }
      if (!res.reused) {
        track({
          event: "share_link_create",
          ...(isScenarioModified(item.scenario) ? { shares: nationalSharesOf(item.scenario) } : {}),
        });
      }
      const url = `${window.location.origin}/?s=${res.id}`;
      const expires = new Date(res.expiresAt).toLocaleDateString("pl-PL");
      const notice = res.reused
        ? `Ten scenariusz ma już link. Skopiowany ponownie, ważny do ${expires}.`
        : `Link skopiowany (do 5 na IP). Ważny do ${expires}.`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success(notice);
      } catch {
        window.prompt(`Link ważny do ${expires}:`, url);
      }
    } catch {
      toast.error("Nie udało się utworzyć linku.");
    } finally {
      shareLock.current = false;
      setSharingId(null);
    }
  };

  const handleLoad = (target: Scenario, label: string, id: string) => {
    if (id !== "reset") track({ event: "scenario_load" });
    onLoad(target);
    setActiveScenarioId(id);
    toast.success(`Wczytano: ${label}`);
  };

  const share = async () => {
    track({
      event: "scenario_share",
      ...(isScenarioModified(scenario) ? { shares: nationalSharesOf(scenario) } : {}),
    });
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
      const newId = createId();
      const entry: SavedScenario = {
        id: newId,
        name: title,
        savedAt: new Date().toISOString(),
        scenario: parsed,
      };
      if (!persist([entry, ...saved].slice(0, 10))) return;
      onLoad(parsed);
      track({ event: "scenario_upload" });
      setActiveScenarioId(newId);
      toast.success(`Wczytano i dodano do biblioteki: ${title}`);
    } catch {
      toast.error("Nieprawidłowy plik scenariusza JSON.");
    }
  };

  return (
    <>
      <aside className="panel-float flex h-full min-h-[25rem] flex-col p-4">
        {/* Nagłówek panelu */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="eyebrow">Biblioteka wariantów</p>
            <h2 className="mt-0.5 font-display text-lg font-bold text-ink">Twoje scenariusze</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpandedOpen(true)}
              className="min-h-9 gap-1 text-[11px] font-semibold"
              title="Otwórz pełny widok biblioteki"
            >
              <Maximize2 className="h-3.5 w-3.5" /> Rozwiń
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-9 gap-1 text-[11px]"
              title="Wczytaj plik scenariusza JSON z dysku"
            >
              <Upload className="h-3.5 w-3.5" /> Plik
            </Button>
          </div>
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
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && saveLocal()}
            placeholder="Nazwa nowego wariantu..."
            maxLength={60}
            aria-label="Nazwa nowego scenariusza"
            className="h-10 text-xs"
          />
          <Button
            size="sm"
            className="h-10 gap-1 px-3 font-semibold text-xs"
            onClick={saveLocal}
            title="Zapisz obecny stan w pamięci"
          >
            <Plus className="h-3.5 w-3.5" /> Zapisz
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => void share()}
            title="Skopiuj bezpośredni link do obecnego scenariusza"
            aria-label="Skopiuj bezpośredni link"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Lista zapisanych scenariuszy z wyraźnymi nazwami */}
        <div className="mt-3 flex-1 space-y-2.5 overflow-y-auto pr-1">
          {saved.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-5 text-center">
              <FolderOpen className="mx-auto h-7 w-7 text-muted-foreground/60" />
              <p className="mt-2 text-xs font-semibold text-ink">Brak zapisanych wariantów</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Dostosuj poparcie i kliknij <strong>Zapisz</strong>, aby zachować wariant.
              </p>
            </div>
          ) : (
            saved.map((item) => {
              const isActive = activeScenarioId === item.id;
              const shares = nationalSharesOf(item.scenario);
              const mergedMembers = new Set((item.scenario.mergers ?? []).flatMap((m) => m.members));
              const sMap = scenarioPartyMap(item.scenario);
              const topParties = Object.keys(shares)
                .filter((pid) => pid !== "inne" && !mergedMembers.has(pid) && (shares[pid] ?? 0) > 0 && sMap[pid])
                .sort((a, b) => (shares[b] ?? 0) - (shares[a] ?? 0))
                .slice(0, 3)
                .map((pid) => ({ id: pid, ...sMap[pid] }));

              return (
                <div
                  key={item.id}
                  className={`flex flex-col gap-2 rounded-xl border p-3 transition-all ${
                    isActive
                      ? "border-primary/60 bg-primary/[0.05] shadow-xs ring-1 ring-primary/25"
                      : "border-border bg-surface/90 hover:border-border/90 hover:bg-surface"
                  }`}
                >
                  {/* Wiersz z pełną nazwą scenariusza */}
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      className="font-display text-sm font-bold text-ink leading-snug break-words"
                      title={item.name}
                    >
                      {item.name}
                    </h3>
                    {isActive ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                        <Check className="h-3 w-3" /> Wczytany
                      </span>
                    ) : null}
                  </div>

                  {/* Pigułki z czołowymi partiami i data */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {topParties.map((p) => (
                      <span
                        key={p.id}
                        className="inline-flex items-center gap-1 rounded-md bg-muted/70 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                      >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="font-semibold text-ink">{p.short}</span>
                        <span className="num font-bold">{(shares[p.id] ?? 0).toFixed(0)}%</span>
                      </span>
                    ))}
                    <span className="num ml-auto text-[10px] text-muted-foreground">
                      {new Date(item.savedAt).toLocaleDateString("pl-PL")}
                    </span>
                  </div>

                  {/* Dedykowany pasek akcji */}
                  <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2 mt-0.5">
                    <Button
                      size="sm"
                      variant={isActive ? "secondary" : "default"}
                      className="h-8 gap-1.5 px-3 text-xs font-semibold"
                      onClick={() => handleLoad(item.scenario, item.name, item.id)}
                    >
                      <Play className="h-3 w-3 fill-current" /> {isActive ? "Aktywny" : "Wczytaj"}
                    </Button>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 px-2.5 text-xs font-medium"
                        onClick={() => void shareLink(item)}
                        disabled={sharingId === item.id}
                        title="Udostępnij link serwera (do 5 aktywnych, ważny 7 dni)"
                      >
                        {sharingId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />}
                        <span>Link</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-ink"
                        onClick={() => downloadJson(item.scenario, item.name)}
                        title="Pobierz plik JSON"
                        aria-label={`Pobierz plik ${item.name}`}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => persist(saved.filter((entry) => entry.id !== item.id))}
                        title="Usuń z biblioteki"
                        aria-label={`Usuń ${item.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Dolna belka z resetem */}
        <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-[11px] text-muted-foreground">
          <span>{saved.length}/10 wariantów w pamięci</span>
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              track({ event: "scenario_reset" });
              handleLoad(defaultScenario(), "Sondaż bazowy (Reset)", "reset");
            }}
            className="h-auto min-h-9 px-1 text-right text-[11px]"
          >
            Przywróć stan wyjściowy
          </Button>
        </div>
      </aside>

      {/* Dialog pełnego widoku biblioteki scenariuszy */}
      <Dialog open={expandedOpen} onOpenChange={setExpandedOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-bold text-ink">
              Biblioteka zapisanych scenariuszy
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Wszystkie zachowane warianty sejmowe z pełnymi nazwami, poparciem partii i akcjami udostępniania (do 5 linków na IP).
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex-1 overflow-y-auto pr-2">
            {saved.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-12 text-center">
                <FolderOpen className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <h3 className="mt-3 font-display text-base font-bold text-ink">Brak zapisanych wariantów</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Zapisz obecny stan w symulatorze, aby pojawił się tutaj.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {saved.map((item) => {
                  const isActive = activeScenarioId === item.id;
                  const shares = nationalSharesOf(item.scenario);
                  const mergedMembers = new Set((item.scenario.mergers ?? []).flatMap((m) => m.members));
                  const sMap = scenarioPartyMap(item.scenario);
                  const rankedParties = Object.keys(shares)
                    .filter((pid) => pid !== "inne" && !mergedMembers.has(pid) && (shares[pid] ?? 0) > 0 && sMap[pid])
                    .sort((a, b) => (shares[b] ?? 0) - (shares[a] ?? 0))
                    .map((pid) => ({ id: pid, ...sMap[pid] }));

                  return (
                    <div
                      key={item.id}
                      className={`flex flex-col justify-between gap-4 rounded-2xl border p-4 transition-all ${
                        isActive
                          ? "border-primary bg-primary/[0.04] shadow-md ring-2 ring-primary/20"
                          : "border-border bg-surface hover:border-border/80"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-display text-base font-bold text-ink leading-snug">
                            {item.name}
                          </h3>
                          {isActive ? (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary">
                              <Check className="h-3.5 w-3.5" /> Wczytany
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 num text-xs text-muted-foreground">
                          Zapisano: {new Date(item.savedAt).toLocaleString("pl-PL")}
                        </p>

                        {/* Pełny pasek poparcia partii */}
                        <div className="mt-4 space-y-1.5">
                          <p className="text-xs font-semibold text-muted-foreground">Poparcie ogólnokrajowe:</p>
                          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                            {rankedParties.map((p) => (
                              <div
                                key={p.id}
                                style={{
                                  width: `${Math.min(100, shares[p.id] ?? 0)}%`,
                                  backgroundColor: p.color,
                                }}
                                title={`${p.name}: ${(shares[p.id] ?? 0).toFixed(1)}%`}
                              />
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-xs">
                            {rankedParties.map((p) => (
                              <span key={p.id} className="inline-flex items-center gap-1 font-medium">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                                <span>{p.short}:</span>
                                <strong className="num text-ink">{(shares[p.id] ?? 0).toFixed(1)}%</strong>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Akcje w pełnym widoku */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
                        <Button
                          size="sm"
                          variant={isActive ? "secondary" : "default"}
                          className="min-h-9 gap-1.5 px-4 font-semibold text-xs"
                          onClick={() => {
                            handleLoad(item.scenario, item.name, item.id);
                            setExpandedOpen(false);
                          }}
                        >
                          <Play className="h-3.5 w-3.5 fill-current" /> {isActive ? "Wczytano do Sejmu" : "Wczytaj scenariusz"}
                        </Button>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="min-h-9 gap-1.5 px-3 text-xs font-semibold"
                            onClick={() => void shareLink(item)}
                            disabled={sharingId === item.id}
                            title="Wygeneruj link na serwerze (do 5 na IP)"
                          >
                            {sharingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                            Udostępnij link
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="min-h-9 min-w-9"
                            onClick={() => downloadJson(item.scenario, item.name)}
                            title="Pobierz plik JSON"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="min-h-9 min-w-9 text-muted-foreground hover:text-destructive"
                            onClick={() => persist(saved.filter((entry) => entry.id !== item.id))}
                            title="Usuń ten scenariusz"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}