import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquareText, Star } from "lucide-react";
import { toast } from "sonner";
import { sendFeedback } from "@/lib/feedback.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 3) {
      toast.error("Opinia jest za krótka.");
      return;
    }
    if (rating == null) {
      toast.error("Wybierz ocenę od 1 do 10.");
      return;
    }
    setBusy(true);
    try {
      const r = await send({
        data: {
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          rating,
          message: message.trim(),
        },
      });
      if (r.ok) {
        toast.success("Dziękuję za opinię!");
        setMessage("");
        setEmail("");
        setRating(null);
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
          <div className="space-y-1.5">
            <Label htmlFor="feedback-name">Podpis <span className="font-normal text-muted-foreground">(opcjonalnie)</span></Label>
            <Input id="feedback-name" autoComplete="name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="feedback-email">E-mail kontaktowy <span className="font-normal text-muted-foreground">(opcjonalnie)</span></Label>
            <Input
              id="feedback-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="adres@example.pl"
            />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Jak oceniasz Sejmometr?</legend>
            <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10" role="radiogroup" aria-label="Ocena narzędzia od 1 do 10">
              {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                <label key={value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="feedback-rating"
                    value={value}
                    checked={rating === value}
                    onChange={() => setRating(value)}
                    className="peer sr-only"
                    required
                  />
                  <span className="flex min-h-11 items-center justify-center gap-1 rounded-md border border-border bg-background text-sm font-bold text-muted-foreground transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">
                    <Star className="h-3.5 w-3.5" aria-hidden="true" /> {value}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor="feedback-message">Opinia</Label>
          <Textarea
            id="feedback-message"
            placeholder="Co warto poprawić lub dodać?"
            rows={6}
            maxLength={1500}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
          </div>
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
