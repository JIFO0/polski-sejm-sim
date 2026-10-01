import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BarChart3, ExternalLink, Globe, Mail, MapPinned, Play, Save, UsersRound } from "lucide-react";

import { FeedbackDialog } from "@/components/FeedbackDialog";
import { FloatingNav } from "@/components/FloatingNav";
import { ParticleField } from "@/components/ParticleField";
import { SupportButton } from "@/components/SupportButton";
import { Button } from "@/components/ui/button";
import { AccessibilityMenu } from "@/components/AccessibilityMenu";

const TITLE = "O projekcie i twórcy | SejmSim 2027 (sejmsim.pl) — Iwo Laskowski";
const DESCRIPTION =
  "Poznaj historię SejmSim (sejmsim.pl) oraz twórcę projektu Iwo Laskowskiego (@jifo). Dowiedz się, jak działa symulator ordynacji wyborczej.";

export const Route = createFileRoute("/o-projekcie")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutProject,
});

const features = [
  {
    icon: MapPinned,
    title: "41 okręgów wyborczych",
    text: "Zmieniaj poparcie i frekwencję osobno w każdym okręgu. Polska nie głosuje jednorodnie — geografia ma kluczowe znaczenie.",
  },
  {
    icon: BarChart3,
    title: "Mandaty metodą D'Hondta",
    text: "Sprawdź, jak progi wyborcze (5% i 8%) oraz wielkość okręgów wpływają na podział 460 miejsc na sali sejmowej.",
  },
  {
    icon: UsersRound,
    title: "Frekwencja i koalicje",
    text: "Testuj zróżnicowaną mobilizację wyborców i badaj, jakie bloki partyjne mogą osiągnąć większość 231 mandatów.",
  },
  {
    icon: Save,
    title: "Własne scenariusze",
    text: "Zapisuj własne warianty, pobieraj pliki JSON i udostępniaj swoje analizy przez bezpośredni link.",
  },
];

function AboutProject() {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <ParticleField className="pointer-events-none fixed inset-0 z-0 h-dvh w-screen" />
      <FloatingNav mode="about" />

      {/* Górny pasek nawigacji */}
      <header className="relative z-10 border-b border-border bg-surface/80 backdrop-blur-sm">
        <nav
          className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-5 py-3.5"
          aria-label="Nawigacja strony O projekcie"
        >
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Wróć do symulatora
            </Link>
          </Button>

          <div className="flex items-center gap-2">
            <FeedbackDialog />
            <Button variant="outline" size="sm" asChild>
              <a href="https://jifo.dev/#kontakt" target="_blank" rel="noreferrer">
                Kontakt <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </a>
            </Button>
            <SupportButton size="sm" />
            <AccessibilityMenu />
          </div>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl space-y-12 px-5 py-8 md:py-12">
        <article className="space-y-12">
          {/* GŁÓWNA HISTORIA / MOTYWACJA (naturalny, bezpośredni język) */}
          <header className="space-y-4">
            <p className="eyebrow">Dlaczego powstał SejmSim</p>
            <h1 className="font-display text-3xl font-bold leading-tight text-ink sm:text-4xl md:text-5xl">
              Ogólnokrajowe procenty nie tworzą rządu. O wszystkim decydują okręgi.
            </h1>
            <div className="space-y-4 text-base leading-relaxed text-muted-foreground md:text-lg">
              <p>
                Cześć, nazywam się <strong>Iwo Laskowski</strong>.
              </p>
              <p>
                Pomysł na SejmSim zrodził się z prostej obserwacji po dyskusji o kolejnych sondażach.
                W mediach w kółko widzimy te same ogólne wykresy słupkowe, ale w polskim systemie wyborczym
                taki wynik niewiele mówi o przyszłej większości parlamentarnej.
              </p>
              <p>
                O mandatach decydują <strong>41 okręgów wyborczych</strong>, lokalna frekwencja oraz metoda D&apos;Hondta,
                która premiuje silniejsze ugrupowania, a mniejsze partie potrafi zepchnąć pod próg. Różnica 1–2 punktów
                procentowych w odpowiednich regionach może przesądzić o tym, kto ma większość 231 posłów, a kto ląduje w opozycji.
              </p>
              <p>
                Zamiast opierać się na gotowych komentarzach publicystów, chciałem mieć narzędzie, w którym sam mogę
                przesunąć suwak, sprawdzić co się stanie przy wyższej mobilizacji wielkich miast albo przy spadku poparcia
                jednego z koalicjantów. Zacząłem od skryptu w Pythonie na własny użytek, a potem rozwinąłem go
                w publiczny, bezpłatny symulator na <strong className="text-foreground">sejmsim.pl</strong>.
              </p>
            </div>
          </header>

          {/* CO POTRAFI SEJMSIM */}
          <section aria-labelledby="funkcje-projektu" className="border-t border-border pt-10">
            <p className="eyebrow">Możliwości narzędzia</p>
            <h2 id="funkcje-projektu" className="mt-1 font-display text-2xl font-bold text-ink sm:text-3xl">
              Co możesz sprawdzić w SejmSim?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">
              Punktem wyjścia jest aktualna średnia sondażowa serwisu ewybory.eu, ale każdy parametr możesz dowolnie modyfikować.
            </p>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {features.map(({ icon: Icon, title, text }) => (
                <li key={title} className="panel p-5 transition-shadow hover:shadow-md">
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h3 className="mt-3 font-display text-base font-bold text-ink">{title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">{text}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* SYMULATOR NIE WRÓŻKA (Req 7) */}
          <section className="rounded-2xl border border-border bg-surface/80 p-6 text-center backdrop-blur-sm sm:p-8">
            <p className="eyebrow">Ważna uwaga</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-ink">Symulator nie wróżka</h2>
            <p className="mx-auto mt-2.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              SejmSim pokazuje matematyczne skutki przyjętych założeń w oparciu o algorytm D&apos;Hondta i rozkład okręgowy.
              To narzędzie analityczne do sprawdzania scenariuszy „co by było, gdyby” — nie jest prognozą ani oficjalnym badaniem opinii.
            </p>
          </section>

          {/* POŁĄCZONY, ELEGANCKI BOX TWÓRCY I WSPARCIA (Req 6 & Req 8) */}
          <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-md">
            {/* Zmniejszony, subtelny baner na samym dole */}
            <div className="relative h-24 w-full bg-slate-950 sm:h-28">
              <img
                src="/images/iwo-banner.png"
                alt="Iwo Laskowski - banner twórcy"
                className="h-full w-full object-cover object-center opacity-85"
              />
            </div>

            <div className="p-6 sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-border shadow-sm">
                    <img
                      src="/images/iwo-photo.png"
                      alt="Iwo Laskowski"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-lg font-bold text-ink">Iwo Laskowski</h3>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary">
                        @jifo
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Twórca SejmSim • Gdynia
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://jifo.dev" target="_blank" rel="noreferrer">
                      <Globe className="mr-1.5 h-3.5 w-3.5" /> jifo.dev
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <a href="https://jifo.dev/#kontakt" target="_blank" rel="noreferrer">
                      <Mail className="mr-1.5 h-3.5 w-3.5" /> Kontakt z Iwo
                    </a>
                  </Button>
                </div>
              </div>

              <div className="mt-5 border-t border-border pt-5 space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Platforma <strong className="text-foreground">sejmsim.pl</strong> powstaje pro bono jako niezależne narzędzie obywatelskie bez reklam. Każda wpłata pomaga utrzymać serwery, dopracowywać algorytmy i dodawać nowe funkcje.
                </p>
                <p className="font-display text-sm font-semibold text-ink">
                  Pomyślnych analiz życzy JIFO!
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <Button asChild>
                    <Link to="/">
                      <Play className="mr-1.5 h-4 w-4 fill-current" /> Uruchom SejmSim
                    </Link>
                  </Button>
                  <SupportButton size="default" />
                </div>
              </div>
            </div>
          </section>
        </article>
      </main>
    </div>
  );
}