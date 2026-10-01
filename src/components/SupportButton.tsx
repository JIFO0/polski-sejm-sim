import { Coffee } from "lucide-react";
import type { AnchorHTMLAttributes } from "react";
import { track } from "@/lib/analytics";

export interface SupportButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  size?: "sm" | "default" | "lg";
  iconOnly?: boolean;
  className?: string;
}

export function SupportButton({
  size = "sm",
  iconOnly = false,
  className = "",
  ...props
}: SupportButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    track({ event: "support_click" });
    props.onClick?.(e);
  };

  if (iconOnly) {
    return (
      <a
        href="https://buymeacoffee.com/jifo"
        target="_blank"
        rel="noreferrer"
        title="Wesprzyj projekt (Buy Me a Coffee)"
        aria-label="Wesprzyj projekt"
        onClick={handleClick}
        className={`group relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300 transition-all duration-200 hover:bg-amber-500/20 hover:border-amber-500/60 hover:scale-105 active:scale-95 shadow-xs ${className}`}
        {...props}
      >
        <Coffee className="h-4 w-4 transition-transform group-hover:rotate-6" />
      </a>
    );
  }

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    default: "px-3.5 py-2 text-xs md:text-sm gap-2",
    lg: "px-5 py-2.5 text-sm md:text-base gap-2.5",
  }[size];

  return (
    <a
      href="https://buymeacoffee.com/jifo"
      target="_blank"
      rel="noreferrer"
      aria-label="Wesprzyj projekt na Buy Me a Coffee"
      onClick={handleClick}
      className={`group inline-flex items-center justify-center rounded-full font-medium transition-all duration-200 border border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20 hover:border-amber-500/60 hover:text-amber-950 dark:hover:text-amber-100 shadow-xs active:scale-[0.98] ${sizeClasses} ${className}`}
      {...props}
    >
      <Coffee className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 transition-transform group-hover:rotate-6 shrink-0" />
      <span>Wesprzyj projekt</span>
    </a>
  );
}

export function SupportCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-amber-500/25 bg-surface/90 p-6 md:p-8 text-center shadow-xs backdrop-blur-xs ${className}`}
    >
      <div className="relative z-10 mx-auto max-w-xl space-y-3">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
          <Coffee className="h-3.5 w-3.5" /> Podoba Ci się SejmSim?
        </div>
        <h3 className="font-display text-2xl font-bold text-ink">
          Postaw kawę i wesprzyj rozwój projektu
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Platforma <strong className="text-foreground">sejmsim.pl</strong> powstaje pro bono jako niezależne narzędzie obywatelskie bez reklam. Każda wpłata pomaga utrzymać serwery, dopracowywać algorytmy i dodawać nowe funkcje.
        </p>
        <div className="pt-2 flex justify-center">
          <SupportButton size="default" />
        </div>
      </div>
    </div>
  );
}
