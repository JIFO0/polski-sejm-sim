import { Volume1, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { setSfxEnabled, useSfxEnabled } from "@/lib/sfx";

/** Small on/off switch for the quiet interface sounds; sits next to the theme toggle. */
export function SfxToggle({ className = "" }: { className?: string }) {
  const on = useSfxEnabled();
  const en = useLanguage() === "en";
  const label = en
    ? on
      ? "Turn interface sounds off"
      : "Turn interface sounds on"
    : on
      ? "Wyłącz dźwięki interfejsu"
      : "Włącz dźwięki interfejsu";

  return (
    <Button
      variant="ghost"
      size="icon"
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      title={label}
      onClick={() => setSfxEnabled(!on)}
      className={`h-9 w-9 shrink-0 rounded-full border border-border bg-surface text-muted-foreground shadow-sm transition-colors hover:bg-surface-strong ${className}`}
    >
      {on ? <Volume1 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
    </Button>
  );
}
