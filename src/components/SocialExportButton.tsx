import { useState } from "react";
import { ImageDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import type { Scenario } from "@/lib/simulation";
import { downloadSocialImage } from "@/lib/social-export";
import { scenarioTraits, track, trackFunnelStep } from "@/lib/analytics";

export function SocialExportButton({ scenario, compact = false }: { scenario: Scenario; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const en = useLanguage() === "en";
  const label = en ? "Download post image" : "Pobierz grafikę do posta";
  return <Button variant="outline" size={compact ? "icon" : "sm"} disabled={busy} title={label} aria-label={label} className={compact ? "h-8 w-8 shrink-0" : "min-h-10 gap-2 whitespace-normal text-xs"} onClick={async () => {
    setBusy(true);
    try { await downloadSocialImage(scenario, en); track({ event: "social_image_download", meta: scenarioTraits(scenario) }); trackFunnelStep("export"); } catch { toast.error(en ? "Image download failed" : "Nie udało się pobrać grafiki."); } finally { setBusy(false); }
  }}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageDown className="h-4 w-4" />}{!compact && label}</Button>;
}