import { FileText, UserRound } from "lucide-react";
import type { Scenario } from "@/lib/simulation";
import { useLanguage } from "@/lib/i18n";

export function ScenarioDetails({ scenario }: { scenario: Scenario }) {
  const en = useLanguage() === "en";
  if (!scenario.author && !scenario.description) return null;
  return <div className="space-y-2 py-2 text-xs text-muted-foreground">
    {scenario.author && <p className="flex items-start gap-1.5"><UserRound className="h-3.5 w-3.5 shrink-0" /><span className="break-words">{en ? "Author" : "Autor"}: <span className="font-semibold text-ink">{scenario.author}</span></span></p>}
    {scenario.description && <details className="group"><summary className="flex cursor-pointer list-none items-center gap-1.5 font-semibold text-primary"><FileText className="h-3.5 w-3.5" />{en ? "Scenario description" : "Opis scenariusza"}</summary><p className="mt-2 whitespace-pre-wrap break-words border-l-2 border-border pl-3 leading-relaxed">{scenario.description}</p></details>}
  </div>;
}