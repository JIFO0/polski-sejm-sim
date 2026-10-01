import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Info, UserRound } from "lucide-react";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { SupportButton } from "@/components/SupportButton";
import { Button } from "@/components/ui/button";
import { AccessibilityMenu } from "@/components/AccessibilityMenu";

export function FloatingNav({
  mode = "simulator",
}: {
  mode?: "simulator" | "about";
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 48);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <aside
      aria-label="Szybka nawigacja"
      className={`fixed top-4 right-4 z-50 transition-all duration-300 ease-out ${
        scrolled
          ? "translate-y-0 opacity-100 pointer-events-auto scale-100"
          : "-translate-y-3 opacity-0 pointer-events-none scale-95"
      }`}
    >
      <div className="flex items-center gap-1.5 rounded-full border border-border/80 bg-surface/90 p-1.5 shadow-lg shadow-black/5 backdrop-blur-md">
        <AccessibilityMenu compact />
        {mode === "about" ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-all duration-200 active:scale-95"
            asChild
            title="Wróć do symulatora"
            aria-label="Wróć do symulatora"
          >
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-all duration-200 active:scale-95"
            asChild
            title="O projekcie SejmSim"
            aria-label="O projekcie SejmSim"
          >
            <Link to="/o-projekcie">
              <Info className="h-4 w-4" />
            </Link>
          </Button>
        )}

        {/* Opinia / Feedback */}
        <FeedbackDialog iconOnly />

        {/* Kontakt */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-all duration-200 active:scale-95"
          asChild
          title="Kontakt z twórcą (JIFO)"
          aria-label="Kontakt z twórcą"
        >
          <a href="https://jifo.dev/#kontakt" target="_blank" rel="noreferrer">
            <UserRound className="h-4 w-4" />
          </a>
        </Button>

        {/* Wesprzyj projekt (dyskretny, z tonem bursztynowym) */}
        <SupportButton iconOnly />
      </div>
    </aside>
  );
}
