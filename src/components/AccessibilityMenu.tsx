import { useTranslation } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { PersonStanding, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { track } from "@/lib/analytics";

const STORAGE_KEY = "sejmsim.accessibility.v2";

type Toggles = {
  contrast: boolean;
  grayscale: boolean;
  readableFont: boolean;
  spacing: boolean;
  underlineLinks: boolean;
  focusRing: boolean;
  bigCursor: boolean;
  reduceMotion: boolean;
};
type Settings = Toggles & { textScale: number };

const DEFAULTS: Settings = {
  textScale: 100,
  contrast: false,
  grayscale: false,
  readableFont: false,
  spacing: false,
  underlineLinks: false,
  focusRing: false,
  bigCursor: false,
  reduceMotion: false,
};

const OPTIONS: { key: keyof Toggles; attr: string; label: string; description: string }[] = [
  { key: "contrast", attr: "highContrast", label: "Wysoki kontrast", description: "Czarny tekst, mocne obramowania" },
  { key: "grayscale", attr: "grayscale", label: "Skala szarości", description: "Usuwa kolory z całej strony" },
  { key: "readableFont", attr: "readableFont", label: "Czytelna czcionka", description: "Prosty krój bezszeryfowy" },
  { key: "spacing", attr: "spacing", label: "Większe odstępy", description: "Więcej miejsca między liniami i literami" },
  { key: "underlineLinks", attr: "underlineLinks", label: "Podkreśl linki", description: "Wyróżnia wszystkie odnośniki" },
  { key: "focusRing", attr: "focusRing", label: "Wyraźny fokus", description: "Gruba ramka wokół aktywnego elementu" },
  { key: "bigCursor", attr: "bigCursor", label: "Duży kursor", description: "Powiększony wskaźnik myszy" },
  { key: "reduceMotion", attr: "reduceMotion", label: "Ogranicz ruch", description: "Wyłącza tło i animacje" },
];

function applySettings(s: Settings) {
  const root = document.documentElement;
  for (const o of OPTIONS) root.dataset[o.attr] = String(s[o.key]);
  root.style.fontSize = s.textScale === 100 ? "" : `${s.textScale}%`;
}

export function AccessibilityMenu(_props: { compact?: boolean }) {
  const tr = useTranslation();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<Settings> | null;
      const next = saved ? { ...DEFAULTS, ...saved } : DEFAULTS;
      setSettings(next);
      applySettings(next);
    } catch {
      applySettings(DEFAULTS);
    }
  }, []);

  const save = (next: Settings, meta?: string) => {
    setSettings(next);
    applySettings(next);
    if (meta) track({ event: "a11y_setting", meta });
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ustawienia działają w bieżącej karcie nawet bez pamięci.
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          className="h-12 w-12 shrink-0 rounded-full bg-blue-800 text-white shadow-lg hover:bg-blue-900 focus-visible:ring-4 focus-visible:ring-blue-300"
          aria-label={tr("Ustawienia dostępności")}
          title={tr("Ustawienia dostępności")}
        >
          <PersonStanding className="!h-7 !w-7" strokeWidth={2.4} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[80vh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-bold text-ink">{tr("Dostępność")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{tr("Ustawienia zapisują się na tym urządzeniu.")}</p>
          </div>
          <Button variant="outline" size="sm" className="min-h-10 gap-1" onClick={() => save(DEFAULTS, "reset")}>
            <RotateCcw className="h-3.5 w-3.5" /> {tr("Resetuj")}</Button>
        </div>

        <div className="mt-4 rounded-md border border-border p-3">
          <div className="flex items-center justify-between">
            <span id="a11y-scale-label" className="text-sm font-semibold text-foreground">{tr("Rozmiar tekstu")}</span>
            <span className="num text-sm font-bold">{settings.textScale}%</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10"
              aria-label={tr("Zmniejsz tekst")}
              onClick={() => save({ ...settings, textScale: Math.max(90, settings.textScale - 10) }, "tekst")}
            >
              A-
            </Button>
            <Slider
              aria-labelledby="a11y-scale-label"
              min={90}
              max={175}
              step={5}
              value={[settings.textScale]}
              onValueChange={([v = 100]) => save({ ...settings, textScale: v })}
              onValueCommit={() => track({ event: "a11y_setting", meta: "tekst" })}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10"
              aria-label={tr("Powiększ tekst")}
              onClick={() => save({ ...settings, textScale: Math.min(175, settings.textScale + 10) }, "tekst")}
            >
              A+
            </Button>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {OPTIONS.map((option) => {
            const id = `accessibility-${option.key}`;
            return (
              <label key={option.key} htmlFor={id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-border p-3">
                <Checkbox
                  id={id}
                  checked={settings[option.key]}
                  onCheckedChange={(value) => save({ ...settings, [option.key]: value === true }, option.key)}
                  className="h-5 w-5"
                />
                <span>
                  <span className="block text-sm font-semibold text-foreground">{tr(option.label)}</span>
                  <span className="block text-xs text-muted-foreground">{tr(option.description)}</span>
                </span>
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
