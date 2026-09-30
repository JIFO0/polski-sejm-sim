import { Coffee, Heart } from "lucide-react";
import { type ButtonHTMLAttributes } from "react";

export interface SupportButtonProps extends ButtonHTMLAttributes<HTMLAnchorElement> {
  size?: "sm" | "default" | "lg";
  variant?: "pill" | "solid" | "glow";
  showSubtext?: boolean;
}

export function SupportButton({
  size = "sm",
  variant = "glow",
  className = "",
  showSubtext = false,
}: SupportButtonProps) {
  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    default: "px-4 py-2 text-sm gap-2",
    lg: "px-5 py-2.5 text-base gap-2.5",
  }[size];

  return (
    <a
      href="https://buymeacoffee.com/jifo"
      target="_blank"
      rel="noreferrer"
      aria-label="Wesprzyj projekt na Buy Me a Coffee"
      className={`group relative inline-flex items-center justify-center font-medium rounded-full transition-all duration-300 select-none overflow-visible ${sizeClasses} ${className}`}
    >
      {/* Kolorowe animowane cząsteczki (particles) w tle i wokół przycisku */}
      <span className="pointer-events-none absolute -inset-1 rounded-full opacity-60 blur-xs transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-r from-amber-400 via-rose-500 to-indigo-500 animate-pulse" />

      {/* Pływające kolorowe mikro-cząsteczki (particles) */}
      <span className="pointer-events-none absolute inset-0 overflow-visible">
        {/* Cząstka 1: Złota góra-lewo */}
        <span
          className="absolute -top-1 left-2 h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_#f59e0b] animate-bounce"
          style={{ animationDuration: "2.2s", animationDelay: "0.1s" }}
        />
        {/* Cząstka 2: Różowo-czerwona góra-prawo */}
        <span
          className="absolute -top-1.5 right-4 h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_8px_#f43f5e] animate-ping"
          style={{ animationDuration: "3s", animationDelay: "0.5s" }}
        />
        {/* Cząstka 3: Cyjanowa dół-lewo */}
        <span
          className="absolute -bottom-1 left-4 h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_6px_#06b6d4] animate-pulse"
          style={{ animationDuration: "1.8s", animationDelay: "0.3s" }}
        />
        {/* Cząstka 4: Bursztynowa dół-prawo */}
        <span
          className="absolute -bottom-1.5 right-3 h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24] animate-bounce"
          style={{ animationDuration: "2.6s", animationDelay: "0.7s" }}
        />
        {/* Cząstka 5: Fioletowa prawa strona */}
        <span
          className="absolute top-1/2 -right-1.5 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-fuchsia-400 shadow-[0_0_6px_#e879f9] animate-pulse"
          style={{ animationDuration: "2s", animationDelay: "0.2s" }}
        />
      </span>

      {/* Główny korpus przycisku z głębokim tłem i gradientowym borderem */}
      <span className="relative z-10 flex items-center gap-1.5 rounded-full bg-slate-950 px-3.5 py-1.5 text-white font-semibold shadow-sm transition-transform duration-200 group-hover:scale-[1.02] group-active:scale-[0.98] border border-amber-400/40">
        <span className="relative flex items-center justify-center">
          <Coffee className="h-4 w-4 text-amber-400 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
          <Heart className="absolute -top-1 -right-1 h-2 w-2 text-rose-500 fill-rose-500 animate-ping" />
        </span>
        <span className="bg-gradient-to-r from-amber-200 via-white to-rose-200 bg-clip-text text-transparent tracking-tight">
          Wesprzyj projekt
        </span>
      </span>

      {showSubtext && (
        <span className="sr-only">buymeacoffee.com/jifo</span>
      )}
    </a>
  );
}

export function SupportCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-surface to-rose-500/10 p-6 md:p-8 text-center shadow-sm">
      {/* Ozdobne cząsteczki w tle karty */}
      <div className="pointer-events-none absolute -top-10 -right-10 h-36 w-36 rounded-full bg-amber-400/20 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-rose-500/20 blur-2xl" />

      <div className="relative z-10 max-w-xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <Coffee className="h-3.5 w-3.5" /> Podoba Ci się Sejmowy Symulator?
        </div>
        <h3 className="font-display text-2xl font-bold text-ink">
          Postaw kawę i wesprzyj rozwój projektu
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Platforma <strong className="text-foreground">sejmsim.pl</strong> powstaje pro bono jako niezależne narzędzie obywatelskie bez reklam. Każda wpłata pomaga utrzymać serwery, dopracowywać algorytmy i dodawać nowe funkcje.
        </p>
        <div className="pt-2 flex justify-center">
          <SupportButton size="lg" />
        </div>
      </div>
    </div>
  );
}
