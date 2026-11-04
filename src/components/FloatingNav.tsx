import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Info, UserRound } from "lucide-react";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { SupportButton } from "@/components/SupportButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { PARTY_MAP } from "@/data/parties";

export function FloatingNav({
  mode = "simulator",
  seatsByParty,
  leader,
}: {
  mode?: "simulator" | "about";
  seatsByParty?: Record<string, number>;
  leader?: { id: string; short: string; color: string };
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

  if (!scrolled) return null;

  return (
    <aside
      aria-label="Szybka nawigacja i podsumowanie mandatów"
      className={`fixed top-4 left-4 right-4 z-50 flex items-center justify-between gap-2.5 pointer-events-none transition-all duration-300 ease-out ${
        scrolled
          ? "translate-y-0 opacity-100 scale-100"
          : "-translate-y-3 opacity-0 scale-95"
      }`}
    >
      {/* Pigułka z paskiem poparcia i przecięciem po środku (230/231) */}
      {seatsByParty && leader ? (
        <div className="pointer-events-auto flex items-center gap-2 sm:gap-3 rounded-full border border-border/80 bg-surface/90 px-3 py-1.5 shadow-lg shadow-black/5 backdrop-blur-md">
          {/* Lider */}
          <div className="flex items-center gap-1.5 shrink-0 text-xs">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm"
              style={{ background: leader.color }}
            />
            <span className="font-bold text-ink hidden xs:inline">{leader.short}:</span>
            <span className="num font-bold text-primary">
              {seatsByParty[leader.id] ?? 0}
            </span>
          </div>

          {/* Pasek rozkładu mandatów z przecięciem 50% (230 | 230) */}
          <div
            className="relative h-2.5 sm:h-3 w-20 xs:w-28 sm:w-44 md:w-56 rounded-full overflow-hidden bg-muted/80 ring-1 ring-border/40 shrink-0"
            title="Rozkład 460 mandatów w Sejmie. Kreska na środku wskazuje próg większości (231 mandatów)."
          >
            <div className="flex h-full w-full">
              {Object.entries(seatsByParty)
                .filter(([, s]) => s > 0)
                .sort((a, b) => b[1] - a[1])
                .map(([pid, seats]) => (
                  <div
                    key={pid}
                    style={{
                      width: `${(seats / 460) * 100}%`,
                      backgroundColor: PARTY_MAP[pid]?.color ?? "#888",
                    }}
                    title={`${PARTY_MAP[pid]?.short ?? pid}: ${seats} mandatów`}
                    className="h-full transition-all duration-300"
                  />
                ))}
            </div>

            {/* Linia przecięcia dokładnie po środku (50% = 230 mandatów) */}
            <div
              className="absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2 bg-ink z-20 shadow-[0_0_2px_rgba(0,0,0,0.8)]"
              aria-hidden="true"
            />
          </div>

          {/* Etykieta większości 231 */}
          <div
            className="num text-[11px] font-semibold text-muted-foreground flex items-center gap-1 shrink-0"
            title="Większość bezwzględna w Sejmie wynosi 231 mandatów"
          >
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80 hidden sm:inline">
              Większość
            </span>
            <span className="font-bold text-ink">231</span>
          </div>
        </div>
      ) : (
        <div />
      )}

      {/* Pigułka z ikonkami po prawej */}
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border/80 bg-surface/90 p-1.5 shadow-lg shadow-black/5 backdrop-blur-md shrink-0">
        <LanguageToggle className="h-8 px-2 text-[11px]" />
        <ThemeToggle className="scale-90" />
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
            className="h-8 w-8 rounded-full text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-all duration-200 active:scale-95 hidden sm:inline-flex"
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
          className="h-8 w-8 rounded-full text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-all duration-200 active:scale-95 hidden sm:inline-flex"
          asChild
          title="Kontakt z twórcą (JIFO)"
          aria-label="Kontakt z twórcą"
        >
          <a
            href="https://jifo.dev/#kontakt"
            target="_blank"
            rel="noreferrer"
            onClick={() => track({ event: "contact_click" })}
          >
            <UserRound className="h-4 w-4" />
          </a>
        </Button>

        {/* Wesprzyj projekt (dyskretny, z tonem bursztynowym) */}
        <SupportButton iconOnly />
      </div>
    </aside>
  );
}
