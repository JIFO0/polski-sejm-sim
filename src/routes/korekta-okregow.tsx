import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  FileText,
  Info,
  Layers,
  MapPin,
  Scale,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

import { useTranslation } from "@/lib/i18n";
import { ParticleField } from "@/components/ParticleField";
import { FloatingNav } from "@/components/FloatingNav";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { SupportButton } from "@/components/SupportButton";
import { AccessibilityMenu } from "@/components/AccessibilityMenu";
import { Button } from "@/components/ui/button";
import { DISTRICTS } from "@/data/districts";
import {
  CRW_2026_DELTA,
  DISTRICT_DEMOGRAPHIC_NOTES,
  PKW_2022_DELTA,
  getAdjustedSeats,
  getDistrictDelta,
} from "@/data/demographicAdjustment";

const TITLE =
  "Korekta okręgów wyborczych do Sejmu | Wniosek PKW, demografia i mandaty (sejmsim.pl)";
const DESCRIPTION =
  "Aktualizacja podziału mandatów w 41 okręgach do Sejmu RP. Zobacz oficjalny wniosek PKW, dane demograficzne, pełny wykaz okręgów zyskujących i tracących mandaty oraz wpływ na większość 231 mandatów.";

const SCHEMA_FAQ = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Korekta okręgów wyborczych do Sejmu RP: Wniosek PKW, demografia i mandaty",
      "description": DESCRIPTION,
      "author": {
        "@type": "Person",
        "name": "Iwo Laskowski",
        "url": "https://jifo.dev",
      },
      "publisher": {
        "@type": "Organization",
        "name": "SejmSim",
        "url": "https://sejmsim.pl",
      },
      "mainEntityOfPage": "https://sejmsim.pl/korekta-okregow",
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Czym jest korekta demograficzna okręgów wyborczych do Sejmu?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "To ustawowy mechanizm (art. 202–203 Kodeksu wyborczego) mający na celu dostosowanie liczby posłów wybieranych w poszczególnych okręgach do realnej liczby mieszkańców, obliczanej na podstawie jednolitej normy przedstawicielskiej (populacja kraju podzielona przez 460).",
          },
        },
        {
          "@type": "Question",
          "name": "Które okręgi zyskują, a które tracą mandaty według PKW?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Mandaty zyskują rosnące aglomeracje: Warszawa II (obwarzanek, +2 lub +3 mandaty), Wrocław (+1 lub +2), Warszawa miasto (+1), Kraków (+1), Gdańsk (+1), Gdynia (+1), Poznań (+1), Piła (+1), Konin (+1) i Rzeszów (+1). Tracą regiony depopulacyjne (po 1 mandacie): Legnica, Wałbrzych, Toruń, Lublin, Chełm, Łódź, Katowice, Sosnowiec, Kielce, Elbląg, Koszalin, a w nowszych danych także Opole i Olsztyn.",
          },
        },
        {
          "@type": "Question",
          "name": "Jak przesunięcie mandatów wpływa na wyniki wyborów?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Duże aglomeracje i strefy podmiejskie głosują wyraźnie silniej na partie centrowo-liberalne i lewicowe (KO, Lewica, Polska 2050), podczas gdy wyludniające się regiony prowincjonalne to tradycyjne bastiony ugrupowań konserwatywnych (PiS). Przesunięcie 11–13 mandatów oznacza strukturalny zysk rzędu 3–4 mandatów dla obozu proeuropejskiego.",
          },
        },
      ],
    },
  ],
});

export const Route = createFileRoute("/korekta-okregow")({
  staticData: { sitemap: true },
  head: () => ({
    links: [{ rel: "canonical", href: "https://sejmsim.pl/korekta-okregow" }],
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://sejmsim.pl/korekta-okregow" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: SCHEMA_FAQ,
      },
    ],
  }),
  component: KorektaOkregowPage,
});

function KorektaOkregowPage() {
  const tr = useTranslation();
  const [filter, setFilter] = useState<"all" | "gain" | "loss" | "neutral">("all");
  const [variant, setVariant] = useState<"pkw" | "crw">("pkw");

  const filteredDistricts = DISTRICTS.filter((d) => {
    const delta = getDistrictDelta(d.id, variant);
    if (filter === "gain") return delta > 0;
    if (filter === "loss") return delta < 0;
    if (filter === "neutral") return delta === 0;
    return true;
  });

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background text-foreground">
      <ParticleField className="pointer-events-none fixed inset-0 z-0 h-dvh w-screen" />
      <FloatingNav mode="about" />

      {/* Header */}
      <header className="relative z-10 border-b border-border bg-surface/80 backdrop-blur-[2px]">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-8 md:py-12">
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" asChild className="h-9 px-2.5 sm:px-3 text-xs font-semibold">
              <Link to="/" title={tr("Wróć do symulatora SejmSim")} aria-label={tr("Wróć do symulatora SejmSim")}>
                <ArrowLeft className="h-4 w-4 sm:mr-1.5 shrink-0" />
                <span className="hidden sm:inline">{tr("Wróć do symulatora SejmSim")}</span>
              </Link>
            </Button>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <LanguageToggle />
              <ThemeToggle />
              <FeedbackDialog />
              <SupportButton size="sm" />
              <AccessibilityMenu />
            </div>
          </div>

          <div className="max-w-3xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 font-mono text-xs font-semibold text-primary">
                <Scale className="h-3.5 w-3.5" />
                Art. 202–203 Kodeksu wyborczego
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Wniosek PKW & Centralny Rejestr Wyborców
              </span>
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl md:text-5xl">
              Korekta okręgów wyborczych do Sejmu RP
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
              Dlaczego metropolie i strefy podmiejskie powinny mieć więcej posłów, polska prowincja
              się wyludnia, a politycy przez ponad dekadę odkładali aktualizację mandatów.
            </p>
          </div>

          {/* Szybkie metryki */}
          <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-surface/60 p-4">
              <p className="text-xs text-muted-foreground">Mandaty do przeniesienia</p>
              <p className="mt-1 font-display text-2xl font-bold text-ink">11–13</p>
              <p className="text-[11px] text-muted-foreground">pomiędzy 21 a 23 okręgami</p>
            </div>
            <div className="rounded-xl border border-border bg-surface/60 p-4">
              <p className="text-xs text-muted-foreground">Norma przedstawicielska</p>
              <p className="mt-1 font-display text-2xl font-bold text-ink">78 424</p>
              <p className="text-[11px] text-muted-foreground">mieszkańców na 1 posła</p>
            </div>
            <div className="rounded-xl border border-border bg-surface/60 p-4">
              <p className="text-xs text-muted-foreground">Największy beneficjent</p>
              <p className="mt-1 font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                +2 do +3
              </p>
              <p className="text-[11px] text-muted-foreground">okręg 20 („obwarzanek” W-wa)</p>
            </div>
            <div className="rounded-xl border border-border bg-surface/60 p-4">
              <p className="text-xs text-muted-foreground">Wpływ na większość</p>
              <p className="mt-1 font-display text-2xl font-bold text-primary">3–4 mandaty</p>
              <p className="text-[11px] text-muted-foreground">przesunięcie w stronę centrolewicy</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-[1200px] space-y-12 px-5 py-12">
        {/* Sekcja 1: Na czym polega problem? */}
        <section className="space-y-4 rounded-2xl border border-border bg-surface/60 p-6 md:p-8 backdrop-blur-sm">
          <div className="flex items-center gap-2.5 text-primary">
            <Users className="h-5 w-5" />
            <h2 className="font-display text-xl font-bold text-ink sm:text-2xl">
              1. Na czym polega problem nierówności wyborczej w Polsce?
            </h2>
          </div>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
            <p>
              Zgodnie z <strong className="text-foreground">art. 96 ust. 2 Konstytucji RP</strong>{" "}
              wybory do Sejmu są równe. Zasada równości ma dwa wymiary: formalny (każdy obywatel ma
              jeden głos) oraz materialny (każdy oddany głos powinien mieć zbliżoną siłę
              przeliczeniową na mandaty parlamentarne).
            </p>
            <p>
              Aby zrealizować tę zasadę, w Kodeksie wyborczym wprowadzono pojęcie{" "}
              <strong className="text-foreground">jednolitej normy przedstawicielskiej</strong> (art.
              202 § 2). Oblicza się ją, dzieląc oficjalną liczbę ludności Polski przez 460 posłów.
              Dla przykładu, w 2022 r. norma ta wynosiła dokładnie{" "}
              <strong className="text-foreground">78 424 mieszkańców na mandat</strong>.
            </p>
            <p>
              Tymczasem załącznik nr 1 do Kodeksu wyborczego, który sztywno przypisuje liczbę posłów
              do 41 okręgów (od 7 w Częstochowie do 20 w Warszawie),{" "}
              <strong className="text-foreground">
                nie był aktualizowany od 2011 roku
              </strong>
              . Przez kilkanaście lat polskie społeczeństwo podlegało jednak gigantycznym ruchom
              migracyjnym.
            </p>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4" />
                Aglomeracje i strefy podmiejskie (niedoreprezentowane)
              </p>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                W okręgu podwarszawskim (nr 20) na jednego posła przypada już ponad 93 tys.
                mieszkańców. Tłum wyborców w strefach podmiejskich i metropoliach wybiera zbyt małą
                reprezentację, przez co ich głos ważył w Sejmie znacznie mniej.
              </p>
            </div>
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
              <p className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <TrendingDown className="h-4 w-4" />
                Wyludniająca się prowincja (nadreprezentowana)
              </p>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                W regionach takich jak Wałbrzych, Legnica, Koszalin czy Chełm na jednego posła
                przypada niespełna 68–71 tys. mieszkańców. Mimo odpływu tysięcy osób, liczba posłów
                pozostawała tam zamrożona.
              </p>
            </div>
          </div>
        </section>

        {/* Sekcja 2: Źródła danych i kalendarium */}
        <section className="space-y-4 rounded-2xl border border-border bg-surface/60 p-6 md:p-8 backdrop-blur-sm">
          <div className="flex items-center gap-2.5 text-primary">
            <FileText className="h-5 w-5" />
            <h2 className="font-display text-xl font-bold text-ink sm:text-2xl">
              2. Metryka danych i kalendarium wniosków PKW
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
            Państwowa Komisja Wyborcza, wypełniając dyspozycję art. 203 Kodeksu wyborczego, wielokrotnie
            oficjalnie składała wnioski o korektę mandatów. Sejm – niezależnie od rządzącej większości
            – przez lata unikał nowelizacji załącznika z obawy przed utratą mandatów przez posłów z
            tracących regionów.
          </p>

          <div className="space-y-4 border-l-2 border-primary/40 pl-4 my-4">
            <div className="relative">
              <span className="text-xs font-mono font-bold text-primary">2014 ROK</span>
              <h3 className="font-semibold text-ink text-sm">Pierwszy wniosek PKW po wejściu Kodeksu</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                PKW wnioskowała o korektę w 8 okręgach. Sejm VII kadencji nie podjął prac legislacyjnych.
              </p>
            </div>
            <div className="relative">
              <span className="text-xs font-mono font-bold text-primary">2018 / 2019 ROK</span>
              <h3 className="font-semibold text-ink text-sm">Drugie ostrzeżenie PKW przed wyborami 2019</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Konieczność zmian objęła już 9 okręgów. Wniosek ponownie został zignorowany.
              </p>
            </div>
            <div className="relative">
              <span className="text-xs font-mono font-bold text-primary">20 PAŹDZIERNIKA 2022 R.</span>
              <h3 className="font-semibold text-ink text-sm">
                Oficjalny wniosek Przewodniczącego PKW (Znak: ZPOW.501.12.2022)
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Przewodniczący PKW sędzia Sylwester Marciniak przedłożył Marszałek Sejmu kompleksowe
                wyliczenie oparte na danych o liczbie mieszkańców na dzień{" "}
                <strong className="text-foreground">30 września 2022 r.</strong> (36 075 220
                mieszkańców w rejestrach). Wykazało ono bezwzględną konieczność przesunięcia{" "}
                <strong className="text-foreground">11 mandatów w 21 okręgach</strong>. Wybory 2023 r.
                przeprowadzono jednak wbrew tym wnioskom.
              </p>
            </div>
            <div className="relative">
              <span className="text-xs font-mono font-bold text-primary">2024–2026 ROK</span>
              <h3 className="font-semibold text-ink text-sm">
                Centralny Rejestr Wyborców (CRW) i próba odpolitycznienia
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Po uruchomieniu zintegrowanego Centralnego Rejestru Wyborców (CRW) dysproporcja wzrosła
                do <strong className="text-foreground">13 mandatów w 23 okręgach</strong> (obwarzanek
                warszawski urósł do zapotrzebowania na aż +3 mandaty, Wrocław na +2). Sejm uchwalił
                ustawę przekazującą kompetencję corocznej publikacji mandatów PKW w drodze
                obwieszczeń (do 30 listopada), co napotkało jednak na spór polityczny i weto
                prezydenckie.
              </p>
            </div>
          </div>
        </section>

        {/* Sekcja 3: Interaktywna tabela 41 okręgów */}
        <section className="space-y-6 rounded-2xl border border-border bg-surface/60 p-6 md:p-8 backdrop-blur-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <Layers className="h-5 w-5" />
                <h2 className="font-display text-xl font-bold text-ink sm:text-2xl">
                  3. Wykaz 41 okręgów: Kto zyskuje, a kto traci mandaty?
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Wybierz wariant kalkulacji i filtruj okręgi według kierunku zmiany.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-border p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setVariant("pkw")}
                  className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
                    variant === "pkw"
                      ? "bg-ink text-background shadow-xs"
                      : "text-muted-foreground hover:text-ink"
                  }`}
                >
                  Wniosek PKW (±11)
                </button>
                <button
                  type="button"
                  onClick={() => setVariant("crw")}
                  className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
                    variant === "crw"
                      ? "bg-ink text-background shadow-xs"
                      : "text-muted-foreground hover:text-ink"
                  }`}
                >
                  Szacunek CRW (±13)
                </button>
              </div>
            </div>
          </div>

          {/* Filtry */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            <button
              onClick={() => setFilter("all")}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                filter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Wszystkie (41)
            </button>
            <button
              onClick={() => setFilter("gain")}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                filter === "gain"
                  ? "bg-emerald-600 text-white"
                  : "bg-muted text-emerald-600 dark:text-emerald-400 hover:bg-muted/80"
              }`}
            >
              Zyskujące mandaty (+{variant === "crw" ? 13 : 11})
            </button>
            <button
              onClick={() => setFilter("loss")}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                filter === "loss"
                  ? "bg-rose-600 text-white"
                  : "bg-muted text-rose-600 dark:text-rose-400 hover:bg-muted/80"
              }`}
            >
              Tracące mandaty (-{variant === "crw" ? 13 : 11})
            </button>
            <button
              onClick={() => setFilter("neutral")}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                filter === "neutral" ? "bg-ink text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Bez zmian ({41 - (variant === "crw" ? 23 : 21)})
            </button>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="border-b border-border bg-muted/60 text-muted-foreground">
                <tr>
                  <th className="p-3">Nr</th>
                  <th className="p-3">Siedziba okręgu</th>
                  <th className="p-3 text-center">Obecnie</th>
                  <th className="p-3 text-center">Po korekcie</th>
                  <th className="p-3 text-center">Zmiana</th>
                  <th className="p-3">Podłoże demograficzne</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredDistricts.map((d) => {
                  const delta = getDistrictDelta(d.id, variant);
                  const newSeats = getAdjustedSeats(d.id, d.seats, variant);
                  const isGain = delta > 0;
                  const isLoss = delta < 0;

                  return (
                    <tr
                      key={d.id}
                      className={`hover:bg-muted/30 transition-colors ${
                        isGain
                          ? "bg-emerald-500/[0.03]"
                          : isLoss
                            ? "bg-rose-500/[0.03]"
                            : ""
                      }`}
                    >
                      <td className="p-3 font-mono font-bold text-muted-foreground">{d.id}</td>
                      <td className="p-3 font-semibold text-ink">{d.name}</td>
                      <td className="p-3 text-center font-mono text-muted-foreground">{d.seats}</td>
                      <td className="p-3 text-center font-mono font-bold text-ink">{newSeats}</td>
                      <td className="p-3 text-center">
                        {delta !== 0 ? (
                          <span
                            className={`inline-flex items-center gap-0.5 rounded px-2 py-0.5 font-mono text-xs font-bold ${
                              isGain
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {isGain ? `+${delta}` : delta}
                          </span>
                        ) : (
                          <span className="text-muted-foreground font-mono">0</span>
                        )}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {DISTRICT_DEMOGRAPHIC_NOTES[d.id] ??
                          "Liczba ludności w granicach jednolitej normy przedstawicielskiej."}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Sekcja 4: Dlaczego ma to kluczowe znaczenie polityczne? */}
        <section className="space-y-4 rounded-2xl border border-border bg-surface/60 p-6 md:p-8 backdrop-blur-sm">
          <div className="flex items-center gap-2.5 text-primary">
            <BarChart3 className="h-5 w-5" />
            <h2 className="font-display text-xl font-bold text-ink sm:text-2xl">
              4. Wpływ polityczny: Jak metoda D'Hondta przelicza te głosy?
            </h2>
          </div>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
            <p>
              Przesunięcie mandatów w wyborach proporcjonalnych metodą D'Hondta nie jest neutralne
              politycznie. Wynika to z geografii poparcia partii politycznych w Polsce:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">
                  Aglomeracje miejskie i obwarzanki podmiejskie
                </strong>{" "}
                cechują się znacznie wyższym poparciem dla formacji centrowo-liberalnych i lewicowych
                (Koalicja Obywatelska, Nowa Lewica, Polska 2050, Razem). Zwiększenie liczby mandatów
                w Warszawie, pod Warszawą, we Wrocławiu czy Poznaniu oznacza, że te ugrupowania
                zdobywają tam kolejne, dodatkowe miejsca w parlamencie.
              </li>
              <li>
                <strong className="text-foreground">
                  Regiony tracące mandaty (prowincja, ściana wschodnia, Śląsk i Zagłębie)
                </strong>{" "}
                to tradycyjne obszary wyższego poparcia dla Prawa i Sprawiedliwości oraz Konfederacji.
                W mniejszym okręgu rośnie naturalny próg wejścia, a ostatni mandat, który wcześniej
                przypadał największej partii w regionie, po prostu znika.
              </li>
            </ul>
            <p>
              W symulacjach SejmSim przy obecnych średnich sondażowych wdrożenie korekty PKW
              skutkuje przesunięciem <strong className="text-foreground">od 3 do 5 mandatów</strong>{" "}
              od bloku prawicy w stronę koalicji rządowej (Koalicji 15X). W sytuacji, gdy o
              większości 231 mandatów decydują pojedyncze głosy posłów, taka korekta może bezpośrednio
              przesądzić o tym, kto utworzy rząd po wyborach 2027 roku.
            </p>
          </div>
        </section>

        {/* Sekcja 5: Call to action */}
        <section className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 md:p-8 text-center space-y-4">
          <h3 className="font-display text-2xl font-bold text-ink">
            Sprawdź wpływ korekty w symulatorze SejmSim
          </h3>
          <p className="max-w-xl mx-auto text-sm text-muted-foreground">
            Włącz jednym kliknięciem przełącznik korekty demograficznej na mapie 41 okręgów i zobacz,
            jak zmienią się mandaty partii i koalicji przy Twoich własnych ustawieniach poparcia.
          </p>
          <div className="pt-2">
            <Button size="lg" asChild className="gap-2 font-semibold">
              <Link to="/">
                <span>Otwórz kalkulator mandatów</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
