import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { sendFeedback } from "@/lib/feedback.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function FeedbackDialog() {
  const send = useServerFn(sendFeedback);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 3) {
      toast.error("Opinia jest za krótka.");
      return;
    }
    setBusy(true);
    try {
      const r = await send({ data: { name: name.trim() || undefined, message: message.trim() } });
      if (r.ok) {
        toast.success("Dziękuję za opinię!");
        setMessage("");
        setOpen(false);
      } else {
        const when =
          "nextAt" in r && r.nextAt
            ? ` Kolejną dodasz po ${new Date(r.nextAt).toLocaleString("pl-PL", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "numeric" })}.`
            : "";
        toast.error(r.error + when);
      }
    } catch {
      toast.error("Nie udało się wysłać opinii.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MessageSquareText className="mr-1.5 h-4 w-4" /> Dodaj opinię
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Twoja opinia o Sejmometrze</DialogTitle>
          <DialogDescription>Uwagi, błędy, pomysły. Jedna opinia na 12 godzin.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Input placeholder="Podpis (opcjonalnie)" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea
            placeholder="Co warto poprawić lub dodać?"
            rows={6}
            maxLength={1500}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
          <div className="flex items-center justify-between">
            <span className="num text-xs text-muted-foreground">{message.length}/1500</span>
            <Button type="submit" disabled={busy}>
              {busy ? "Wysyłanie..." : "Wyślij opinię"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
