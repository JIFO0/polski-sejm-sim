import { useEffect, useState } from "react";
import { HeartHandshake, MessageSquareText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { useLanguage } from "@/lib/i18n";
import { track } from "@/lib/analytics";

export const VISITS_COUNT_KEY = "sejmsim.visits.count";
export const SESSION_COUNTED_KEY = "sejmsim.session.counted";
export const SUPPORT_DISMISSED_KEY = "sejmsim.support-prompt.dismissed";
export const SUPPORT_PROMPT_MIN_VISITS = 3;
export const SUPPORT_PROMPT_DELAY_MS = 15000; // 15 sekund obecności na stronie
export const COOLDOWN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

let shownThisSession = false;

export function TeaIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Subtle floating steam lines */}
      <path d="M7 2c.4.9-.4 1.7 0 2.6" className="animate-[pulse_2.2s_ease-in-out_infinite] opacity-75" />
      <path d="M11 1.5c.4 1-.4 1.9 0 2.9" className="animate-[pulse_2.2s_ease-in-out_infinite_0.4s] opacity-90" />
      <path d="M15 2.5c.4.8-.4 1.5 0 2.3" className="animate-[pulse_2.2s_ease-in-out_infinite_0.8s] opacity-75" />
      {/* Cup body */}
      <path d="M3 8h14v6a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" />
      {/* Handle */}
      <path d="M17 10h2a2 2 0 0 1 0 4h-2" />
      {/* Saucer */}
      <path d="M2 20h17" />
      {/* Teabag string and tag */}
      <path d="M7 8v2.5" strokeWidth="1.5" />
      <path d="M6 10.5h2v2.2H6z" fill="currentColor" fillOpacity="0.2" strokeWidth="1" />
    </svg>
  );
}

export function SupportInvitation() {
  const [open, setOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const lang = useLanguage();
  const en = lang === "en";

  useEffect(() => {
    if (typeof window === "undefined" || shownThisSession) return;

    const isTesting =
      typeof window !== "undefined" &&
      (window.location.search.includes("test_support=1") || window.location.search.includes("test_support=true"));

    if (!isTesting) {
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
    }

    const delay = isTesting ? 400 : SUPPORT_PROMPT_DELAY_MS;
    const timer = window.setTimeout(() => {
      if (document.visibilityState !== "visible" || document.querySelector('[role="dialog"]')) {
        return;
      }
      shownThisSession = true;
      setOpen(true);
      track({ event: "support_prompt_shown" });
    }, delay);

    return () => clearTimeout(timer);
  }, []);

  const handleSupportClick = () => {
    track({ event: "support_click", meta: "support_invitation_modal" });
    track({ event: "support_prompt_support" });
    try {
      localStorage.setItem(SUPPORT_DISMISSED_KEY, "permanent");
    } catch {
      // ignore
    }
    setOpen(false);
    window.open("https://buymeacoffee.com/jifo", "_blank", "noopener,noreferrer");
  };

  const handleFeedbackClick = () => {
    track({ event: "support_prompt_feedback" });
    try {
      // Don't disturb with support prompt again for 14 days when submitting feedback
      localStorage.setItem(SUPPORT_DISMISSED_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setOpen(false);
    setFeedbackOpen(true);
  };

  const handleLater = () => {
    track({ event: "support_prompt_later" });
    try {
      localStorage.setItem(SUPPORT_DISMISSED_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setOpen(false);
  };

  const handleNever = () => {
    track({ event: "support_prompt_never" });
    try {
      localStorage.setItem(SUPPORT_DISMISSED_KEY, "permanent");
    } catch {
      // ignore
    }
    setOpen(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      handleLater();
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="max-w-[calc(100%-2rem)] sm:max-w-md border-border/80 bg-card p-0 shadow-2xl overflow-hidden rounded-2xl"
        >
          {/* Subtle SejmSim accent bar at the top */}
          <div className="h-1 w-full bg-primary" />

          <div className="p-6 sm:p-7 space-y-5">
            {/* Header: Author info with JIFO logo and pill */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-border/80 bg-surface-strong/90 p-1 shadow-xs flex items-center justify-center">
                  <img
                    src="/images/jifo_logo.webp"
                    alt="JIFO"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-display font-bold text-sm text-ink truncate">Iwo Laskowski</span>
                    <a
                      href="https://jifo.dev"
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-primary/10 px-1.5 py-0.2 font-mono text-[10px] font-semibold text-primary hover:bg-primary/20 transition-colors"
                      title="jifo.dev"
                    >
                      @jifo
                    </a>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {en ? "Creator of SejmSim • Gdynia" : "Twórca SejmSim z Gdyni • jifo.dev"}
                  </p>
                </div>
              </div>

              {/* Tea badge */}
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary shrink-0">
                <TeaIcon className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">{en ? "Tea break" : "Wsparcie"}</span>
              </div>
            </div>

            {/* Dialog Content */}
            <DialogHeader className="text-left space-y-2">
              <DialogTitle className="font-display text-xl sm:text-2xl font-bold tracking-tight text-ink">
                {en ? "You visit SejmSim often" : "Często tu zaglądasz"}
              </DialogTitle>
              <DialogDescription asChild>
                <div className="text-sm leading-relaxed text-muted-foreground space-y-2">
                  <p>
                    {en
                      ? "SejmSim is an independent, free and ad-free civic tool. Maintaining the server and updating polls takes daily work."
                      : "SejmSim to niezależne, darmowe i wolne od reklam narzędzie. Utrzymanie serwera i codzienne aktualizowanie sondaży wymaga stałej pracy."}
                  </p>
                  <p>
                    {en
                      ? "If you find it useful, consider buying me a cup of tea — every contribution helps keep the project running."
                      : "Jeśli symulator Ci się przydaje, możesz postawić mi herbatę — każde wsparcie pomaga rozwijać projekt."}
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>

            {/* Feedback & Bug Reporting Box */}
            <div className="rounded-xl border border-border/80 bg-surface/60 p-3.5 text-left">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <MessageSquareText className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-xs font-semibold text-ink">
                    {en ? "Found a bug or have an idea?" : "Masz uwagę lub pomysł?"}
                  </p>
                  <p className="text-[12px] leading-relaxed text-muted-foreground">
                    {en
                      ? "Share your feedback — I read every message and reply if you leave your email."
                      : "Napisz opinię lub zgłoś błąd — czytam każdą wiadomość."}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleFeedbackClick}
                    className="mt-1 h-7 text-xs gap-1.5"
                  >
                    <MessageSquareText className="h-3.5 w-3.5" />
                    <span>{en ? "Share feedback / report bug" : "Napisz opinię / zgłoś uwagę"}</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-2 pt-1">
              <Button
                onClick={handleSupportClick}
                className="w-full gap-2 font-semibold shadow-sm"
              >
                <TeaIcon className="h-4 w-4" />
                <span>{en ? "Support with a tea (Buy Me a Coffee)" : "Postaw herbatę (Buy Me a Coffee)"}</span>
              </Button>

              <div className="flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLater}
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  {en ? "Maybe later" : "Może później"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNever}
                  className="h-8 px-2 text-xs text-muted-foreground/70 hover:text-muted-foreground"
                >
                  <HeartHandshake className="h-3.5 w-3.5 mr-1" />
                  {en ? "Already supported / Don't ask again" : "Już wsparłem / Nie pytaj"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Seamlessly connected feedback dialog */}
      <FeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        hideTrigger
      />
    </>
  );
}
