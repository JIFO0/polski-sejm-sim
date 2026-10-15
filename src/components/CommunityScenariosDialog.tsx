import { useTranslation } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { Copy, Eye, Loader2, Play, Sparkles, Users } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getFeaturedScenarios } from "@/lib/shares.functions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type Scenario } from "@/lib/simulation";
import { nationalSharesOf, track } from "@/lib/analytics";
import { PARTIES, PARTY_MAP } from "@/data/parties";

interface FeaturedItem {
  id: string;
  name: string;
  scenario: Scenario;
  views: number;
  created_at: string;
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

export function CommunityScenariosDialog({
  open,
  onOpenChange,
  onLoad,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoad: (scenario: Scenario) => void;
}) {
  const tr = useTranslation();
  const [items, setItems] = useState<FeaturedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const getFeatured = useServerFn(getFeaturedScenarios);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void getFeatured()
      .then((res) => {
        if (res.ok && Array.isArray(res.items)) {
          setItems(res.items as unknown as FeaturedItem[]);
        }
      })
      .catch((err) => {
        console.error("fetch featured error", err);
      })
      .finally(() => setLoading(false));
  }, [open]);

  const handleSelect = (item: FeaturedItem) => {
    onLoad(item.scenario);
    track({ event: "community_scenario_load", meta: item.id });
    toast.success(`Wczytano scenariusz społeczności: ${item.name}`);
    onOpenChange(false);
  };

  const copyShareLink = async (id: string, name: string) => {
    const url = `${window.location.origin}/?s=${id}`;
    try {
      await navigator.clipboard.writeText(url);
      track({ event: "share_copy" });
      toast.success(`Skopiowano link do scenariusza „${name}”`);
    } catch {
      toast.error("Nie udało się skopiować linku.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-[min(48rem,calc(100vw-2rem))] overflow-y-auto p-6 sm:rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <DialogTitle className="font-display text-xl font-bold text-ink">
              {tr("Scenariusze społeczności")}</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            {tr("Wyróżnione i sprawdzone warianty wyborcze stworzone przez użytkowników SejmSim. Wybierz dowolny scenariusz, aby przetestować go na mapie.")}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-3 text-xs">{tr("Pobieranie wyróżnionych scenariuszy...")}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Users className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="mt-2 text-sm font-semibold text-ink">{tr("Brak wyróżnionych scenariuszy")}</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              {tr("Scenariusze wybrane przez autora pojawią się tutaj wkrótce. Stwórz własny wariant, udostępnij go i podziel się ze znajomymi!")}</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {items.map((item) => {
              const shares = nationalSharesOf(item.scenario);
              const mergedMembers = new Set((item.scenario.mergers ?? []).flatMap((m) => m.members));
              const sMap = scenarioPartyMap(item.scenario);
              const topParties = Object.keys(shares)
                .filter((pid) => pid !== "inne" && !mergedMembers.has(pid) && (shares[pid] ?? 0) > 0 && sMap[pid])
                .sort((a, b) => (shares[b] ?? 0) - (shares[a] ?? 0))
                .slice(0, 4)
                .map((pid) => ({ id: pid, ...sMap[pid] }));

              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-xl border border-border/80 bg-surface/90 p-3.5 shadow-xs transition-all hover:border-primary/40 hover:bg-surface"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-display text-sm font-bold text-ink leading-snug line-clamp-2">
                        {item.name}
                      </h4>
                      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-mono text-muted-foreground" title={tr("Liczba wyświetleń")}>
                        <Eye className="h-3 w-3" />
                        {item.views}
                      </span>
                    </div>

                    {/* Poparcie głównych partii */}
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {topParties.map((p) => (
                        <span
                          key={p.id}
                          className="inline-flex items-center gap-1 rounded-md bg-muted/80 px-2 py-0.5 text-[11px]"
                        >
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                          <span className="font-medium text-ink">{p.short}</span>
                          <span className="num font-bold">{(shares[p.id] ?? 0).toFixed(0)}%</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/50 pt-2.5">
                    <Button
                      size="sm"
                      className="h-8 gap-1.5 px-3 text-xs font-semibold"
                      onClick={() => handleSelect(item)}
                    >
                      <Play className="h-3 w-3 fill-current" /> {tr("Wczytaj")}</Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 shrink-0"
                      title={tr("Skopiuj link do tego scenariusza")}
                      onClick={() => void copyShareLink(item.id, item.name)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
