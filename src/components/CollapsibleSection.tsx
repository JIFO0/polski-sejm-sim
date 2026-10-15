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
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const tr = useTranslation();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={className}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="mb-1 h-auto min-h-11 w-full justify-between rounded-b-none rounded-t-lg border border-border/70 bg-surface/85 px-4 py-3 text-left shadow-sm hover:bg-surface"
          aria-label={`${open ? tr("Zwiń") : tr("Rozwiń")} sekcję ${title}`}
        >
          <span className="font-display text-lg font-bold text-ink">{title}</span>
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            {open ? tr("Zwiń") : tr("Rozwiń")}
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          </span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent forceMount className="overflow-hidden data-[state=closed]:hidden data-[state=open]:animate-accordion-down">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}