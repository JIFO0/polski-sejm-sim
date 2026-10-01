import { useEffect, useState } from "react";
import { Accessibility } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const STORAGE_KEY = "sejmsim.accessibility.v1";

type AccessibilitySettings = {
  contrast: boolean;
  largeText: boolean;
  reduceMotion: boolean;
  readableFont: boolean;
};

const DEFAULTS: AccessibilitySettings = {
  contrast: false,
  largeText: false,
  reduceMotion: false,
  readableFont: false,
};

const OPTIONS: { key: keyof AccessibilitySettings; label: string; description: string }[] = [
  { key: "contrast", label: "Wysoki kontrast", description: "Mocniejsze teksty i obramowania" },
  { key: "largeText", label: "Większy tekst", description: "Powiększa tekst w całym serwisie" },
  { key: "reduceMotion", label: "Ogranicz ruch", description: "Wyłącza tło i ogranicza animacje" },
  { key: "readableFont", label: "Czytelna czcionka", description: "Używa prostego kroju systemowego" },
];

function applySettings(settings: AccessibilitySettings) {
  const root = document.documentElement;
  root.dataset.highContrast = String(settings.contrast);
  root.dataset.largeText = String(settings.largeText);
  root.dataset.reduceMotion = String(settings.reduceMotion);
  root.dataset.readableFont = String(settings.readableFont);
}

export function AccessibilityMenu({ compact = false }: { compact?: boolean }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULTS);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<AccessibilitySettings> | null;
      const next = saved ? { ...DEFAULTS, ...saved } : DEFAULTS;
      setSettings(next);
      applySettings(next);
    } catch {
      applySettings(DEFAULTS);
    }
  }, []);

  const update = (key: keyof AccessibilitySettings, checked: boolean) => {
    const next = { ...settings, [key]: checked };
    setSettings(next);
    applySettings(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ustawienia nadal działają w bieżącej karcie, nawet gdy pamięć jest zablokowana.
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={compact ? "ghost" : "outline"}
          size={compact ? "icon" : "sm"}
          className={compact ? "min-h-11 min-w-11 rounded-full" : "min-h-11"}
          aria-label="Ustawienia dostępności"
          title="Ustawienia dostępności"
        >
          <Accessibility className="h-4 w-4" />
          {!compact ? <span>Dostępność</span> : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(21rem,calc(100vw-2rem))] p-4">
        <h2 className="font-display text-base font-bold text-ink">Dostępność</h2>
        <p className="mt-1 text-xs text-muted-foreground">Dostosuj wygląd strony do swoich potrzeb.</p>
        <div className="mt-4 space-y-2">
          {OPTIONS.map((option) => {
            const id = `accessibility-${option.key}`;
            return (
              <label key={option.key} htmlFor={id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-border p-3">
                <Checkbox
                  id={id}
                  checked={settings[option.key]}
                  onCheckedChange={(value) => update(option.key, value === true)}
                  className="h-5 w-5"
                />
                <span>
                  <span className="block text-sm font-semibold text-foreground">{option.label}</span>
                  <span className="block text-xs text-muted-foreground">{option.description}</span>
                </span>
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}