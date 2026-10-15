import { useEffect, useState } from "react";
import { MessageSquareHeart } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { SupportButton } from "@/components/SupportButton";
import { FEEDBACK_INVITATION_DELAY, FEEDBACK_INVITATION_KEY, invitationDue } from "@/lib/engagement";
import { useLanguage } from "@/lib/i18n";

let shownThisVisit = false;
let startedAt: number | undefined;

export function FeedbackInvitation() {
  const [open, setOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const lang = useLanguage();
  const en = lang === "en";

  useEffect(() => {
    if (shownThisVisit) return;
    try { if (localStorage.getItem(FEEDBACK_INVITATION_KEY)) return; } catch { /* Memory fallback. */ }
    startedAt ??= Date.now();
    const show = () => {
      if (document.visibilityState !== "visible" || document.querySelector('[role="dialog"]')) return;
      let stored = false;
      try { stored = Boolean(localStorage.getItem(FEEDBACK_INVITATION_KEY)); } catch { /* Memory fallback. */ }
      if (!invitationDue(startedAt ?? Date.now(), Date.now(), stored || shownThisVisit)) return;
      shownThisVisit = true;
      try { localStorage.setItem(FEEDBACK_INVITATION_KEY, "1"); } catch { /* Memory fallback. */ }
      setOpen(true);
    };
    const timer = window.setTimeout(show, Math.max(0, FEEDBACK_INVITATION_DELAY - (Date.now() - startedAt)));
    const retry = window.setInterval(show, 5000);
    document.addEventListener("visibilitychange", show);
    return () => { clearTimeout(timer); clearInterval(retry); document.removeEventListener("visibilitychange", show); };
  }, []);

  return <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
        <MessageSquareHeart className="h-9 w-9 text-primary" />
        <DialogHeader>
          <DialogTitle>{en ? "How do you like SejmSim?" : "Jak Ci się korzysta z SejmSim?"}</DialogTitle>
          <DialogDescription className="pt-2 leading-relaxed">{en ? "Your ideas and feedback help improve the simulator. If you enjoy SejmSim, you can also support this free, independent project with a coffee." : "Twoje pomysły i uwagi pomagają rozwijać symulator. Jeśli SejmSim Ci się podoba, możesz też postawić kawę i wesprzeć ten darmowy, niezależny projekt."}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => { setOpen(false); setFeedbackOpen(true); }}>{en ? "Share feedback" : "Dodaj opinię"}</Button>
          <SupportButton size="default" />
        </div>
        <Button variant="ghost" onClick={() => setOpen(false)}>{en ? "Not now" : "Nie teraz"}</Button>
      </DialogContent>
    </Dialog>
    <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} hideTrigger />
  </>;
}