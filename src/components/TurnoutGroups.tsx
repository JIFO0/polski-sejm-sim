import { ArrowLeftRight } from "lucide-react";
import { PARTIES } from "@/data/parties";
import { PartyLogo } from "@/components/PartyLogo";
import type { PartySettings } from "@/lib/simulation";

type Side = "higher" | "lower";

export function TurnoutGroups({
  settings,
  onMove,
}: {
  settings: Record<string, PartySettings>;
  onMove: (partyId: string, side: Side) => void;
}) {
  const parties = PARTIES.filter((party) => party.id !== "inne");
  const groups: { side: Side; title: string; note: string }[] = [
    { side: "lower", title: "Zyskują przy niższej frekwencji", note: "Bardziej zdyscyplinowany elektorat" },
    { side: "higher", title: "Zyskują przy wyższej frekwencji", note: "Większa mobilizacja nowych wyborców" },
  ];

  return (
    <div className="panel p-5">
      <div className="flex items-center gap-3">
        <ArrowLeftRight className="h-5 w-5 text-primary" />
        <div>
          <h2 className="font-display text-xl font-bold text-ink">Wpływ frekwencji</h2>
          <p className="text-sm text-muted-foreground">Przeciągnij partię między grupami lub kliknij ją, aby zmienić stronę.</p>
        </div>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
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
                .filter((party) =>
                  group.side === "higher"
                    ? (settings[party.id]?.turnoutSensitivity ?? party.turnoutSensitivity) >= 0
                    : (settings[party.id]?.turnoutSensitivity ?? party.turnoutSensitivity) < 0,
                )
                .map((party) => (
                  <button
                    key={party.id}
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData("text/plain", party.id)}
                    onClick={() => onMove(party.id, group.side === "higher" ? "lower" : "higher")}
                    className="flex cursor-grab items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-2 text-xs font-semibold shadow-sm transition-transform hover:-translate-y-0.5 active:cursor-grabbing"
                  >
                    <PartyLogo id={party.id} size={20} />
                    {party.short}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}