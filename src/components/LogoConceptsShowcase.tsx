import { useState, useEffect } from "react";
import { Check, Download, Eye, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  LOGO_CONCEPTS,
  LogoMark,
  type LogoConceptId,
} from "./Logos";
import { Button } from "./ui/button";

const STORAGE_KEY = "sejmometr_selected_logo";

export function getActiveLogoConcept(): LogoConceptId {
  if (typeof window === "undefined") return "concept-7";
  const stored = localStorage.getItem(STORAGE_KEY) as LogoConceptId | null;
  if (stored && LOGO_CONCEPTS.some((c) => c.id === stored)) {
    return stored;
  }
  return "concept-7";
}

export function setActiveLogoConcept(id: LogoConceptId) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, id);
  window.dispatchEvent(new CustomEvent("sejmometr:logo-change", { detail: { id } }));

  // Update favicon dynamically
  const faviconLink = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (faviconLink) {
    faviconLink.href = `/logos/concepts/${id}.svg`;
  }
}

export function useActiveLogo() {
  const [active, setActive] = useState<LogoConceptId>("concept-7");

  useEffect(() => {
    setActive(getActiveLogoConcept());

    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ id: LogoConceptId }>;
      if (custom.detail?.id) {
        setActive(custom.detail.id);
      }
    };

    window.addEventListener("sejmometr:logo-change", handler);
    return () => window.removeEventListener("sejmometr:logo-change", handler);
  }, []);

  return active;
}

export function LogoConceptsShowcase() {
  const activeLogo = useActiveLogo();
  const [selectedPreview, setSelectedPreview] = useState<LogoConceptId>(activeLogo);

  const handleSelect = (id: LogoConceptId) => {
    setActiveLogoConcept(id);
    setSelectedPreview(id);
    toast.success(`Ustawiono ${id.toUpperCase()} jako aktywne logo i favicon!`);
  };

  return (
    <section className="space-y-8" aria-labelledby="logo-showcase-title">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> 7 Konceptów Identyfikacji Wizualnej
          </span>
          <span className="text-xs text-muted-foreground">Wybierz wygrywający wariant</span>
        </div>
        <h2 id="logo-showcase-title" className="font-display text-3xl font-bold tracking-tight text-ink md:text-4xl">
          Wybór oficjalnego logo Sejmowego Symulatora
        </h2>
        <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">
          Zaprojektowaliśmy <strong>7 nowych konceptów stricte w czystym wektorze SVG</strong> opartych na motywie:{" "}
          <strong className="text-foreground">litera S + półkole sejmowe z kropek (parliamentary dot hemicycle)</strong>.
          Każdy wariant bada inną relację przestrzenną między monogramem &apos;S&apos; a amfiteatrem 460 mandatów. Kliknij{" "}
          <strong>„Wybierz jako oficjalne”</strong>, aby natychmiast przetestować dany wariant w nagłówku strony oraz jako favicon przeglądarki.
        </p>
      </div>

      {/* Siatka 7 interaktywnych kart SVG */}

      {/* Siatka 7 interaktywnych kart */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {LOGO_CONCEPTS.map((concept, index) => {
          const isCurrentActive = activeLogo === concept.id;

          return (
            <div
              key={concept.id}
              className={`group relative flex flex-col justify-between rounded-xl border p-5 transition-all duration-200 ${
                isCurrentActive
                  ? "border-primary bg-primary/[0.03] shadow-md ring-2 ring-primary/20"
                  : "border-border bg-card hover:border-ink/30 hover:shadow-sm"
              }`}
            >
              <div className="space-y-4">
                {/* Górny pasek karty */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Koncept #{index + 1}
                  </span>
                  {isCurrentActive && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                      <Check className="h-3 w-3" /> Aktywne logo
                    </span>
                  )}
                </div>

                {/* Prezentacja wektora + podgląd favicon */}
                <div className="flex items-center justify-between gap-4 rounded-lg bg-surface-strong p-4">
                  <div className="flex flex-col items-center gap-1.5">
                    <LogoMark concept={concept.id} size={64} className="drop-shadow-sm" />
                    <span className="text-[10px] font-medium text-muted-foreground">64px (Header)</span>
                  </div>

                  <div className="flex flex-col items-center gap-1.5">
                    <LogoMark concept={concept.id} size={36} className="drop-shadow-sm" />
                    <span className="text-[10px] font-medium text-muted-foreground">36px (Nav)</span>
                  </div>

                  <div className="flex flex-col items-center gap-1.5">
                    <div className="rounded-md border border-border bg-background p-1.5 shadow-xs">
                      <LogoMark concept={concept.id} size={20} />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground">Favicon</span>
                  </div>
                </div>

                {/* Tytuł i opis */}
                <div>
                  <h3 className="font-display text-lg font-bold text-ink">{concept.name}</h3>
                  <p className="text-xs font-medium text-primary">{concept.tagline}</p>
                </div>

                <p className="text-sm leading-relaxed text-muted-foreground">{concept.description}</p>

                {/* Symbolika */}
                <div className="rounded-md bg-muted/50 p-2.5 text-xs text-foreground">
                  <strong className="font-semibold text-ink">Symbolika: </strong>
                  {concept.symbolism}
                </div>

                {/* Wyróżniki */}
                <div className="flex flex-wrap gap-1.5">
                  {concept.highlights.map((h) => (
                    <span
                      key={h}
                      className="rounded bg-accent/60 px-2 py-0.5 text-[11px] font-medium text-accent-foreground"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>

              {/* Przyciski akcji */}
              <div className="mt-5 flex items-center gap-2 pt-4 border-t border-border">
                <Button
                  size="sm"
                  variant={isCurrentActive ? "default" : "outline"}
                  className="flex-1 text-xs"
                  onClick={() => handleSelect(concept.id)}
                >
                  {isCurrentActive ? (
                    <>
                      <Check className="mr-1.5 h-3.5 w-3.5" /> Wybrane
                    </>
                  ) : (
                    <>
                      <Eye className="mr-1.5 h-3.5 w-3.5" /> Wybierz jako oficjalne
                    </>
                  )}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="px-2.5 text-xs"
                  asChild
                  title="Pobierz plik SVG"
                >
                  <a href={`/logos/concepts/${concept.id}.svg`} download={`sejmsim-${concept.id}.svg`}>
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
