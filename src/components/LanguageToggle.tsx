import { Globe } from "lucide-react";
import { useLanguage, setLanguage } from "@/lib/i18n";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function LanguageToggle({ className = "" }: { className?: string }) {
  const lang = useLanguage();

  const toggle = () => {
    const next = lang === "pl" ? "en" : "pl";
    setLanguage(next);
    toast.success(next === "en" ? "Language switched to English" : "Zmieniono język na polski");
  };

  return (
    <Button variant="ghost"
      type="button"
      onClick={toggle}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 text-xs font-semibold text-muted-foreground shadow-xs transition-colors hover:bg-surface-strong hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${className}`}
      title={lang === "pl" ? "Zmień język na angielski (Switch to English)" : "Switch language to Polish (Zmień na polski)"}
      aria-label={lang === "pl" ? "Zmień język na angielski" : "Switch language to Polish"}
    >
      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="font-mono text-[11px] font-bold tracking-wider">
        {lang === "pl" ? "PL" : "EN"}
      </span>
    </Button>
  );
}
