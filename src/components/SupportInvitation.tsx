import { useEffect, useState } from "react";
import { Coffee, HeartHandshake } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { track } from "@/lib/analytics";

export const VISITS_COUNT_KEY = "sejmsim.visits.count";
export const SESSION_COUNTED_KEY = "sejmsim.session.counted";
export const SUPPORT_DISMISSED_KEY = "sejmsim.support-prompt.dismissed";
export const SUPPORT_PROMPT_MIN_VISITS = 3;
export const SUPPORT_PROMPT_DELAY_MS = 15000; // 15 sekund obecności na stronie
export const COOLDOWN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

let shownThisSession = false;

export function SupportInvitation() {
  const [open, setOpen] = useState(false);
  const lang = useLanguage();
  const en = lang === "en";

  useEffect(() => {
    if (typeof window === "undefined" || shownThisSession) return;

    let visitCount = 1;
    try {
      const alreadyMarked = sessionStorage.getItem(SESSION_COUNTED_KEY);
      const storedCount = parseInt(localStorage.getItem(VISITS_COUNT_KEY) || "0", 10);
      if (!alreadyMarked) {
        visitCount = storedCount + 1;
        sessionStorage.setItem(SESSION_COUNTED_KEY, "1");
        localStorage.setItem(VISITS_COUNT_KEY, String(visitCount));
      } else {
        visitCount = storedCount || 1;
      }
    } catch {
      // Memory fallback
    }

    if (visitCount < SUPPORT_PROMPT_MIN_VISITS) return;

    try {
      const dismissed = localStorage.getItem(SUPPORT_DISMISSED_KEY);
      if (dismissed === "permanent") return;
      if (dismissed) {
        const dismissedAt = parseInt(dismissed, 10);
        if (!isNaN(dismissedAt) && Date.now() - dismissedAt < COOLDOWN_DAYS_MS) {
          return;
        }
      }
    } catch {
      // Memory fallback
    }

    const timer = window.setTimeout(() => {
      if (document.visibilityState !== "visible" || document.querySelector('[role="dialog"]')) {
        return;
      }
      shownThisSession = true;
      setOpen(true);
    }, SUPPORT_PROMPT_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  const handleSupportClick = () => {
    track({ event: "support_click", meta: "support_invitation_modal" });
    try {
      localStorage.setItem(SUPPORT_DISMISSED_KEY, "permanent");
    } catch {
      // ignore
    }
    setOpen(false);
    window.open("https://buymeacoffee.com/jifo", "_blank", "noopener,noreferrer");
  };

  const handleLater = () => {
    try {
      localStorage.setItem(SUPPORT_DISMISSED_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setOpen(false);
  };

  const handleNever = () => {
    try {
      localStorage.setItem(SUPPORT_DISMISSED_KEY, "permanent");
    } catch {
      // ignore
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md border-amber-500/30 bg-card p-6 shadow-xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
          <Coffee className="h-6 w-6" />
        </div>

        <DialogHeader className="text-left space-y-2">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <span>{en ? "You visit SejmSim often! ☕" : "Często tu zaglądasz! ☕"}</span>
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground space-y-2">
            <p>
              {en
                ? "I noticed you return to SejmSim often. I created this simulator as an independent, free and completely ad-free tool for everyone following Polish elections and politics."
                : "Zauważyłem, że SejmSim regularnie Ci służy. Tworzę ten symulator jako niezależny, darmowy i całkowicie wolny od reklam projekt dla wszystkich pasjonatów polskiej polityki."}
            </p>
            <p>
              {en
                ? "Server hosting and keeping polls constantly up-to-date have real ongoing costs. Every support helps me maintain and develop the project until the 2027 parliamentary elections — and hopefully even longer!"
                : "Utrzymanie serwerów i bieżące aktualizowanie bazy sondaży niestety kosztują, więc każde wsparcie pomaga mi kontynuować projekt aż do wyborów w 2027 roku i mam nadzieję, że jeszcze dłużej."}
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex flex-col gap-2.5">
          <Button
            onClick={handleSupportClick}
            className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold shadow-md hover:from-amber-600 hover:to-orange-600 active:scale-[0.98] transition-all"
          >
            <Coffee className="h-4 w-4" />
            {en ? "Support with a coffee (Buy Me a Coffee)" : "Postaw kawę (Buy Me a Coffee)"}
          </Button>

          <div className="flex items-center justify-between gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={handleLater} className="text-xs text-muted-foreground hover:text-foreground">
              {en ? "Maybe later" : "Może później"}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleNever} className="text-xs text-muted-foreground/70 hover:text-muted-foreground">
              <HeartHandshake className="h-3 w-3 mr-1" />
              {en ? "Already supported / Don't show again" : "Już wsparłem / Nie pytaj"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
