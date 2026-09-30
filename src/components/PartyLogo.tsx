import { PARTY_MAP } from "@/data/parties";
import { cn } from "@/lib/utils";

/** Logotyp partii; gdy brak pliku — znak literowy w barwie partii. */
export function PartyLogo({
  id,
  size = 28,
  className,
}: {
  id: string;
  size?: number;
  className?: string;
}) {
  const party = PARTY_MAP[id];
  if (!party) return null;

  if (!party.logo) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-md font-display font-bold leading-none",
          className,
        )}
        style={{
          width: size,
          height: size,
          background: party.color,
          color: "#fff",
          fontSize: Math.max(9, size * 0.36),
        }}
        aria-hidden="true"
      >
        {party.short.slice(0, 4)}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface ring-1 ring-border",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <img
        src={party.logo}
        alt={party.name}
        className="h-full w-full object-contain p-[2px]"
        loading="lazy"
      />
    </span>
  );
}
