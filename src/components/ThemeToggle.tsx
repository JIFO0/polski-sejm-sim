import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";

const KEY = "sejmsim.theme";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function isDark() {
  return document.documentElement.classList.contains("dark");
}

function notify() {
  for (const listener of listeners) listener();
}

export function useDarkTheme() {
  return useSyncExternalStore(subscribe, isDark, () => false);
}

export function setDarkTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
  try {
    localStorage.setItem(KEY, dark ? "dark" : "light");
  } catch {
    // Prywatny tryb przeglądarki i tak zostawia motyw do końca wizyty.
  }
  notify();
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const dark = useDarkTheme();

  return (
    <Button
      variant="ghost"
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? "Włącz jasny motyw" : "Włącz ciemny motyw"}
      title={dark ? "Jasny motyw" : "Ciemny motyw"}
      onClick={() => {
        const next = !isDark();
        setDarkTheme(next);
        track({ event: "theme_toggle", meta: next ? "ciemny" : "jasny" });
      }}
      className={`relative grid h-9 w-[4.25rem] shrink-0 grid-cols-2 items-center justify-items-center gap-0 rounded-full border border-border bg-surface p-1 shadow-sm transition-colors hover:bg-surface-strong ${className}`}
    >
      <Sun className={`relative z-10 h-3.5 w-3.5 ${dark ? "text-muted-foreground" : "text-chart-4"}`} />
      <Moon className={`relative z-10 h-3.5 w-3.5 ${dark ? "text-chart-3" : "text-muted-foreground"}`} />
      <span
        aria-hidden
        className={`absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-background shadow-sm transition-all ${
          dark ? "left-[calc(75%-2px)]" : "left-[calc(25%+2px)]"
        }`}
      />
    </Button>
  );
}
