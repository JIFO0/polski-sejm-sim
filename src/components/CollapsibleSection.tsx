import { useTranslation } from "@/lib/i18n";
import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  className = "",
  onOpenChange,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  onOpenChange?: (open: boolean) => void;
}) {
  const tr = useTranslation();
  const [open, setOpen] = useState(defaultOpen);
  const [mounted, setMounted] = useState(defaultOpen);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && !mounted) {
      setMounted(true);
    }
    setOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  return (
    <Collapsible open={open} onOpenChange={handleOpenChange} className={className}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="mb-1 h-auto min-h-11 w-full justify-between rounded-b-none rounded-t-lg border border-border/70 bg-surface/85 px-4 py-3 text-left shadow-sm hover:bg-surface"
          aria-label={`${open ? tr("Zwiń") : tr("Rozwiń")} ${tr("sekcję")} ${tr(title)}`}
        >
          <span className="font-display text-lg font-bold text-ink">{tr(title)}</span>
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            {open ? tr("Zwiń") : tr("Rozwiń")}
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          </span>
        </Button>
      </CollapsibleTrigger>
      {mounted ? (
        <CollapsibleContent className="overflow-hidden data-[state=closed]:hidden data-[state=open]:animate-accordion-down">
          {children}
        </CollapsibleContent>
      ) : null}
    </Collapsible>
  );
}
