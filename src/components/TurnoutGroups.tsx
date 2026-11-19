import { useTranslation } from "@/lib/i18n";
import { ArrowLeft, ArrowLeftRight, ArrowRight, Minus } from "lucide-react";
import { supportParties } from "@/data/parties";
import { PartyLogo } from "@/components/PartyLogo";
import { Button } from "@/components/ui/button";
import type { PartySettings } from "@/lib/simulation";
import { track } from "@/lib/analytics";
import { playSfx } from "@/lib/sfx";

type Side = "lower" | "neutral" | "higher";

const sideFor = (sensitivity: number): Side => {
  if (sensitivity < -0.01) return "lower";
  if (sensitivity > 0.01) return "higher";
  return "neutral";
};

export function TurnoutGroups({
  settings,
  onMove: rawOnMove,
  embedded = false,
}: {
  settings: Record<string, PartySettings>;
  onMove: (partyId: string, side: Side) => void;
  embedded?: boolean;
}) {
  const tr = useTranslation();
  const onMove = (partyId: string, side: Side) => {
    if (side !== sideFor(settings[partyId]?.turnoutSensitivity ?? 0)) playSfx("turnout.group");
    track({ event: "turnout_group_move", meta: `${partyId}:${side}` });
    rawOnMove(partyId, side);
  };

  const parties = supportParties();
  const groups: { side: Side; title: string; note: string }[] = [
    { side: "lower", title: tr("Zyskują przy niższej frekwencji"), note: tr("Bardziej zdyscyplinowany elektorat") },
    { side: "neutral", title: tr("Frekwencja nie wpływa"), note: tr("Poparcie pozostaje bez korekty") },
    { side: "higher", title: tr("Zyskują przy wyższej frekwencji"), note: tr("Większa mobilizacja nowych wyborców") },
  ];

  return (
    <div className={embedded ? "border-t border-border pt-6" : "panel p-5"}>
      <div className="flex items-center gap-3">
        <ArrowLeftRight className="h-5 w-5 text-primary" />
        <div>
          <h2 className="font-display text-xl font-bold text-ink">{tr("Wpływ frekwencji")}</h2>
          <p className="text-sm text-muted-foreground">{tr("Przeciągnij partię między grupami. Na telefonie użyj strzałek na karcie partii.")}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {groups.map((group) => (
          <div
            key={group.side}
            className="min-h-40 rounded-lg border border-dashed border-border bg-surface-strong/70 p-3"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const partyId = event.dataTransfer.getData("text/plain");
              if (partyId) onMove(partyId, group.side);
            }}
          >
            <p className="text-sm font-bold text-ink">{group.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{group.note}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {parties
                .filter((party) => sideFor(settings[party.id]?.turnoutSensitivity ?? 0) === group.side)
                .map((party) => (
                  <div
                    key={party.id}
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData("text/plain", party.id)}
                    className="flex min-h-10 items-center gap-1 rounded-md border border-border bg-surface/80 p-1 shadow-sm"
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="min-h-11 min-w-11 shrink-0"
                      onClick={() => onMove(party.id, group.side === "higher" ? "neutral" : "lower")}
                      disabled={group.side === "lower"}
                      aria-label={`Przenieś ${party.short} w lewo`}
                      title="Przenieś w lewo"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex min-w-0 flex-1 cursor-grab items-center justify-center gap-2 px-1 active:cursor-grabbing">
                      <PartyLogo id={party.id} size={20} />
                      <span className="truncate text-xs font-semibold">{party.short}</span>
                    </div>
                    {group.side === "neutral" ? <Minus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="min-h-11 min-w-11 shrink-0"
                      onClick={() => onMove(party.id, group.side === "lower" ? "neutral" : "higher")}
                      disabled={group.side === "higher"}
                      aria-label={`Przenieś ${party.short} w prawo`}
                      title="Przenieś w prawo"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}