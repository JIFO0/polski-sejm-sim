import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Calculator,
  CheckCircle2,
  HelpCircle,
  Layers,
  Scale,
  Sparkles,
  TrendingUp,
  AlertCircle,
  ExternalLink,
  UserRound,
} from "lucide-react";

import { useTranslation } from "@/lib/i18n";
import { track, trackPageViewOncePerSession } from "@/lib/analytics";
import { ParticleField } from "@/components/ParticleField";
import { FloatingNav } from "@/components/FloatingNav";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { SupportButton } from "@/components/SupportButton";
import { AccessibilityMenu } from "@/components/AccessibilityMenu";
import { Button } from "@/components/ui/button";

const TITLE = "Metoda D'Hondta w wyborach do Sejmu | Zasady, wzór i kalkulator mandatów (sejmsim.pl)";
const DESCRIPTION =
  "Jak działa metoda D'Hondta w Polsce? Dowiedz się, jak przelicza się głosy na mandaty w Sejmie, jak działają dzielniki (1, 2, 3...), progi 5% i 8% oraz dlaczego podział na 41 okręgów faworyzuje największe ugrupowania.";

const SCHEMA_FAQ = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Metoda D'Hondta w wyborach do Sejmu RP: Zasady, wzór i kalkulator",
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
      "mainEntityOfPage": "https://sejmsim.pl/metoda-dhondta",
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Jak działa metoda D'Hondta w wyborach do Sejmu?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Metoda D'Hondta polega na dzieleniu liczby głosów oddanych na każdy komitet wyborczy, który przekroczył ustawowy próg, przez kolejne liczby naturalne: 1, 2, 3, 4, itd. Otrzymane ilorazy szereguje się od największego do najmniejszego, a mandaty przypadają komitetom z najwyższymi wynikami aż do wyczerpania puli mandatów w danym okręgu.",
          },
        },
        {
          "@type": "Question",
          "name": "Ile mandatów potrzeba do większości w Sejmie?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "W polskim Sejmie zasiada 460 posłów. Większość bezwzględna wynosi 231 mandatów. Taka liczba pozwala na przegłosowanie wotum zaufania dla rządu oraz uchwalanie większości ustaw.",
          },
        },
        {
          "@type": "Question",
          "name": "Jakie są progi wyborcze w Polsce?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Ustawowy próg wyborczy w skali całego kraju wynosi 5% dla samodzielnych partii politycznych oraz 8% dla koalicyjnych komitetów wyborczych. Zarejestrowane komitety wyborcze organizacji mniejszości narodowych mogą być ustawowo zwolnione z wymogu przekroczenia progu.",
          },
        },
        {
          "@type": "Question",
          "name": "Dlaczego metoda D'Hondta premiuje duże partie?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Dzielniki D'Hondta (1, 2, 3, 4...) sprawiają, że partia z bardzo wysokim poparciem zdobywa kolejne mandaty przy relatywnie niższym koszcie głosów niż małe ugrupowanie. Dodatkowo podział Polski na 41 wielomandatowych okręgów wyborczych podnosi naturalny, efektywny próg wejścia w małych okręgach nawet do 10-15%, przez co małe partie nie zdobywają tam reprezentacji.",
          },
        },
      ],
    },
  ],
});

export const Route = createFileRoute("/metoda-dhondta")({
  staticData: { sitemap: true },
  head: () => ({
    links: [{ rel: "canonical", href: "https://sejmsim.pl/metoda-dhondta" }],
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://sejmsim.pl/metoda-dhondta" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
  }),
  component: DhondtMethodPage,
});

function DhondtMethodPage() {
  const tr = useTranslation();

  useEffect(() => {
    trackPageViewOncePerSession();
    track({ event: "dhondt_guide_view" });
  }, []);

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <ParticleField className="pointer-events-none fixed inset-0 z-0 h-dvh w-screen" />
      <FloatingNav mode="about" />

      {/* JSON-LD Schema for AI engines and Google rich snippets */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SCHEMA_FAQ }} />

      <header className="relative z-10 border-b border-border bg-surface/80 backdrop-blur-sm">
        <nav
          className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-5 py-3.5"
          aria-label="Nawigacja strony Metoda D'Hondta"
        >
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> {tr("Wróć do symulatora")}
            </Link>
          </Button>

          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <FeedbackDialog />
            <Button variant="outline" size="sm" asChild>
              <a
                href="https://jifo.dev/#kontakt"
                target="_blank"
                rel="noreferrer"
                onClick={() => track({ event: "contact_click" })}
              >
                {tr("Kontakt")}
                <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </a>
            </Button>
            <SupportButton size="sm" />
            <AccessibilityMenu />
          </div>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl space-y-12 px-5 py-8 md:py-12">
        <article className="space-y-12">
          {/* Hero Header */}
          <header className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-mono text-xs font-semibold text-primary">
              <Calculator className="h-3.5 w-3.5" />
              <span>Ordynacja wyborcza do Sejmu RP</span>
            </div>
            <h1 className="font-display text-3xl font-bold leading-tight text-ink sm:text-4xl md:text-5xl">
              Metoda D'Hondta: Jak w Polsce przelicza się głosy na mandaty w Sejmie?
            </h1>
            <p className="max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">
              Podział 460 mandatów poselskich w Polsce nie odbywa się przez proste mnożenie procentów poparcia.
              Decyduje o nim algorytm belgijskiego matematyka Victora D'Hondta stosowany osobno w każdym z{" "}
              <strong className="text-foreground">41 okręgów wyborczych</strong>. Zobacz, jak działa ten mechanizm,
              jakie znaczenie mają dzielniki oraz dlaczego zaledwie ułamek procenta może odebrać lub dać większość
              rządzącą (231 mandatów).
            </p>

            <div className="pt-2">
              <Button asChild size="lg" className="font-semibold shadow-md">
                <Link to="/">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Przetestuj metodę w symulatorze SejmSim
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </header>

          {/* Sekcja 1: Podstawy prawne i istota metody */}
          <section className="space-y-4 rounded-xl border border-border bg-surface/60 p-6 md:p-8 backdrop-blur-sm">
            <div className="flex items-center gap-2.5 text-primary">
              <Scale className="h-5 w-5" />
              <h2 className="font-display text-xl font-bold text-ink sm:text-2xl">
                Czym jest metoda D'Hondta i gdzie obowiązuje?
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
              Metoda D'Hondta została opracowana pod koniec XIX wieku przez Victora D'Hondta i należy do grupy
              matematycznych metod podziału mandatów opartych na ilorazach. W polskim prawie jest ona bezpośrednio
              zapisana w <strong className="text-foreground">Kodeksie wyborczym (art. 232)</strong> jako mechanizm
              obsadzania mandatów w wyborach do:
            </p>
            <ul className="grid gap-2 text-sm text-foreground md:grid-cols-3">
              <li className="flex items-center gap-2 rounded-lg border border-border/80 bg-background/50 p-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                <span>Sejmu RP (460 posłów)</span>
              </li>
              <li className="flex items-center gap-2 rounded-lg border border-border/80 bg-background/50 p-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                <span>Sejmików województw</span>
              </li>
              <li className="flex items-center gap-2 rounded-lg border border-border/80 bg-background/50 p-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                <span>Parlamentu Europejskiego</span>
              </li>
            </ul>
            <div className="rounded-lg border-l-4 border-amber-500 bg-amber-500/10 p-4 text-xs leading-relaxed text-muted-foreground md:text-sm">
              <strong className="text-foreground">Ważne rozróżnienie:</strong> Wybory do Senatu RP odbywają się w 100
              jednomandatowych okręgach wyborczych (JOW) według zasady większości względnej – tam metoda D'Hondta nie ma
              zastosowania.
            </div>
          </section>

          {/* Sekcja 2: Jak krok po kroku liczy się mandaty + Przykład tabelaryczny */}
          <section className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Calculator className="h-5 w-5" />
                <h2 className="font-display text-xl font-bold text-ink sm:text-2xl">
                  Krok po kroku: Jak działa wzór D'Hondta?
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                Zasada jest czysto arytmetyczna. W każdym okręgu wyborczym głosy każdego uprawnionego komitetu dzieli
                się przez kolejne liczby naturalne:
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface/80 p-5 md:p-6 text-center">
              <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
                Wzór na kolejne ilorazy wyborcze:
              </p>
              <div className="my-3 font-mono text-xl sm:text-2xl font-bold text-primary">
                Iloraz = Liczba głosów komitetu ÷ [ 1, 2, 3, 4, 5, ... ]
              </div>
              <p className="text-xs text-muted-foreground max-w-xl mx-auto">
                Wszystkie otrzymane ze wszystkich komitetów ilorazy układa się w jednym wspólnym rankingu od
                największego do najmniejszego. Pierwsze N ilorazów wyznacza mandaty.
              </p>
            </div>

            {/* Przykład tabelaryczny */}
            <div className="space-y-3">
              <h3 className="font-display text-base font-semibold text-ink">
                Przykład: Podział 5 mandatów w hipotetycznym okręgu
              </h3>
              <p className="text-xs text-muted-foreground">
                Trzy komitety przekroczyły próg wyborczy i uzyskały w okręgu odpowiednio: Komitet A – 120 000 głosów,
                Komitet B – 80 000 głosów, Komitet C – 40 000 głosów.
              </p>

              <div className="overflow-x-auto rounded-xl border border-border bg-surface">
                <table className="w-full text-left text-xs md:text-sm">
                  <thead className="border-b border-border bg-muted/60 text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-3">Dzielnik</th>
                      <th className="p-3">Komitet A (120 000 głosów)</th>
                      <th className="p-3">Komitet B (80 000 głosów)</th>
                      <th className="p-3">Komitet C (40 000 głosów)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr className="hover:bg-muted/30">
                      <td className="p-3 font-mono font-bold text-muted-foreground">÷ 1</td>
                      <td className="p-3 font-semibold text-primary">
                        120 000{" "}
                        <span className="ml-1 inline-block rounded bg-primary/20 px-1.5 py-0.5 text-[10px] text-primary">
                          1. mandat
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-primary">
                        80 000{" "}
                        <span className="ml-1 inline-block rounded bg-primary/20 px-1.5 py-0.5 text-[10px] text-primary">
                          2. mandat
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-primary">
                        40 000{" "}
                        <span className="ml-1 inline-block rounded bg-primary/20 px-1.5 py-0.5 text-[10px] text-primary">
                          4. mandat
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-muted/30">
                      <td className="p-3 font-mono font-bold text-muted-foreground">÷ 2</td>
                      <td className="p-3 font-semibold text-primary">
                        60 000{" "}
                        <span className="ml-1 inline-block rounded bg-primary/20 px-1.5 py-0.5 text-[10px] text-primary">
                          3. mandat
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-primary">
                        40 000{" "}
                        <span className="ml-1 inline-block rounded bg-primary/20 px-1.5 py-0.5 text-[10px] text-primary">
                          5. mandat
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">20 000</td>
                    </tr>
                    <tr className="hover:bg-muted/30">
                      <td className="p-3 font-mono font-bold text-muted-foreground">÷ 3</td>
                      <td className="p-3 text-muted-foreground">40 000</td>
                      <td className="p-3 text-muted-foreground">26 666</td>
                      <td className="p-3 text-muted-foreground">13 333</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground italic">
                Wynik podziału: <strong>Komitet A</strong> zdobywa 2 mandaty (ilorazy 120k i 60k),{" "}
                <strong>Komitet B</strong> zdobywa 2 mandaty (80k i 40k*), a <strong>Komitet C</strong> zdobywa 1 mandat
                (40k*). W przypadku równych ilorazów pierwszeństwo mają komitety z wyższą łączną liczbą głosów w okręgu.
              </p>
            </div>
          </section>

          {/* Sekcja 3: Progi wyborcze: 5% i 8% */}
          <section className="space-y-4 rounded-xl border border-border bg-surface/60 p-6 md:p-8 backdrop-blur-sm">
            <div className="flex items-center gap-2.5 text-primary">
              <TrendingUp className="h-5 w-5" />
              <h2 className="font-display text-xl font-bold text-ink sm:text-2xl">
                Progi wyborcze: 5% dla partii, 8% dla koalicji
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
              Zanim głosy zostaną podzielone metodą D'Hondta, PKW weryfikuje tzw. próg zaporowy w skali{" "}
              <strong className="text-foreground">całego kraju</strong>:
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-background/60 p-4">
                <span className="font-mono text-2xl font-bold text-primary">5%</span>
                <h4 className="mt-1 font-semibold text-ink">Samodzielna partia polityczna</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  Dotyczy komitetu wyborczego wyborców lub komitetu partii zgłaszającego samodzielną listę kandydatów.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-background/60 p-4">
                <span className="font-mono text-2xl font-bold text-amber-500">8%</span>
                <h4 className="mt-1 font-semibold text-ink">Koalicyjny komitet wyborczy</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  Gdy co najmniej dwie partie rejestrują formalną koalicję (np. Koalicja Obywatelska czy Trzecia Droga),
                  próg podnosi się do 8%.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-xs leading-relaxed text-muted-foreground md:text-sm">
              <strong className="text-foreground">Konsekwencja niezrozumienia ordynacji:</strong> Jeśli partia uzyska
              w kraju <strong className="text-foreground">4,99% głosów</strong>, to choćby w wybranym okręgu zdobyła
              nawet 25%, jej głosy zostają całkowicie wykluczone z podziału mandatów w całej Polsce.
            </div>
          </section>

          {/* Sekcja 4: Dlaczego 41 okręgów zmienia wszystko? (Efektywny próg wyborczy) */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 text-primary">
              <Layers className="h-5 w-5" />
              <h2 className="font-display text-xl font-bold text-ink sm:text-2xl">
                Tajemnica 41 okręgów: Czym jest „naturalny próg wyborczy”?
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
              Wielu komentatorów i wyborców zapomina o najważniejszym fakcie:{" "}
              <strong className="text-foreground">
                Polska nie jest jednym wielkim okręgiem liczącym 460 mandatów.
              </strong>{" "}
              Wybory odbywają się w 41 odrębnych okręgach, w których wybiera się od 7 do 20 posłów.
            </p>

            <div className="space-y-3 rounded-xl border border-border bg-surface/80 p-5 md:p-6">
              <h3 className="font-semibold text-ink">Dlaczego wielkość okręgu decyduje o wyniku?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                W dużym okręgu, takim jak Warszawa (okręg 19, 20 mandatów), aby zdobyć mandat, wystarczy około 4–5%
                głosów w tym okręgu. Ale w małym okręgu (np. Częstochowa z 7 mandatami lub Krosno z 11 mandatami),
                aby ostatni iloraz załapał się do podziału, ugrupowanie musi zdobyć w tym regionie często{" "}
                <strong className="text-foreground">od 11% do nawet 15% głosów</strong>!
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Zjawisko to politolodzy nazywają <em>naturalnym lub efektywnym progiem wyborczym</em>. Oznacza to, że
                partia ze stabilnym poparciem 6–7% w skali kraju, w mniejszych miastach i regionach wiejskich nie zdobędzie
                ani jednego mandatu, a wszystkie miejsca w okręgu zgarną dwa najsilniejsze komitety.
              </p>
            </div>
          </section>

          {/* Sekcja 5: D'Hondt vs Sainte-Laguë */}
          <section className="space-y-4 rounded-xl border border-border bg-surface/60 p-6 md:p-8 backdrop-blur-sm">
            <div className="flex items-center gap-2.5 text-primary">
              <BarChart3 className="h-5 w-5" />
              <h2 className="font-display text-xl font-bold text-ink sm:text-2xl">
                Dlaczego D'Hondt, a nie Sainte-Laguë?
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
              W historii Polski stosowano również metodę Sainte-Laguë (np. w wyborach w 2001 r.). Różnica tkwi w
              dzielnikach: Sainte-Laguë dzieli głosy przez liczby nieparzyste (1.4, 3, 5, 7...), co niemal idealnie
              odzwierciedla proporcje poparcia i pomaga mniejszym partiom.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
              Dlaczego więc w Polsce powrócono do D'Hondta? Ponieważ D'Hondt celowo{" "}
              <strong className="text-foreground">premiuje zwycięzcę i duże bloki polityczne</strong>. Celem
              ustawodawcy było ograniczenie rozdrobnienia parlamentu i ułatwienie sformowania stabilnej większości
              rządowej (minimum 231 posłów).
            </p>
          </section>

          {/* Sekcja 6: FAQ - Pytania i Odpowiedzi */}
          <section className="space-y-6">
            <div className="flex items-center gap-2.5 text-primary">
              <HelpCircle className="h-5 w-5" />
              <h2 className="font-display text-xl font-bold text-ink sm:text-2xl">
                Często zadawane pytania (FAQ)
              </h2>
            </div>

            <div className="space-y-3">
              <details className="group rounded-xl border border-border bg-surface p-4 transition-colors open:bg-surface/90">
                <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-ink">
                  <span>Ile mandatów potrzeba do większości w Sejmie?</span>
                  <span className="transition-transform group-open:rotate-180">↓</span>
                </summary>
                <div className="mt-3 text-sm leading-relaxed text-muted-foreground border-t border-border/60 pt-3">
                  Większość bezwzględna w Sejmie RP wynosi dokładnie <strong>231 mandatów</strong> (przy pełnym składzie
                  460 posłów). Taka większość jest kluczowa w procedurze powoływania Rady Ministrów oraz przy
                  odrzucaniu weta Senatu czy prezydenta.
                </div>
              </details>

              <details className="group rounded-xl border border-border bg-surface p-4 transition-colors open:bg-surface/90">
                <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-ink">
                  <span>Czy małym partiom opłaca się startować w koalicji?</span>
                  <summary className="hidden" />
                  <span className="transition-transform group-open:rotate-180">↓</span>
                </summary>
                <div className="mt-3 text-sm leading-relaxed text-muted-foreground border-t border-border/60 pt-3">
                  To zależy od poparcia i ryzyka. Z jednej strony połączenie sił pozwala skorzystać z premii D'Hondta
                  i pokonać naturalny próg w małych okręgach. Z drugiej strony formalna koalicja musi osiągnąć próg 8%,
                  co przy słabszym wyniku grozi całkowitą katastrofą (jak w przypadku Zjednoczonej Lewicy w 2015 roku,
                  która zdobyła 7,55% i nie weszła do Sejmu).
                </div>
              </details>

              <details className="group rounded-xl border border-border bg-surface p-4 transition-colors open:bg-surface/90">
                <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-ink">
                  <span>Jak SejmSim symuluje metodę D'Hondta?</span>
                  <span className="transition-transform group-open:rotate-180">↓</span>
                </summary>
                <div className="mt-3 text-sm leading-relaxed text-muted-foreground border-t border-border/60 pt-3">
                  SejmSim nie przelicza głosów uproszczonym przelicznikiem ogólnokrajowym. Algorytm w SejmSim wykonuje
                  pełną procedurę D'Hondta osobno dla każdego z 41 okręgów wyborczych, uwzględniając progi w skali
                  kraju, liczbę mandatów w okręgu oraz lokalną frekwencję i specyfikę poparcia.
                </div>
              </details>
            </div>
          </section>

          {/* CTA Banner na dole */}
          <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-surface to-surface p-8 text-center space-y-4">
            <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
              Sprawdź metodę D'Hondta na żywo w SejmSim 2027
            </h2>
            <p className="max-w-2xl mx-auto text-sm text-muted-foreground sm:text-base">
              Ustaw sondażowe poparcie dla partii, połącz je w koalicje i zobacz, jak rozkładają się mandaty w 41
              okręgach na interaktywnej mapie Polski.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="font-semibold shadow-md">
                <Link to="/">
                  <Calculator className="mr-2 h-4 w-4" />
                  Uruchom symulator Sejmu
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/o-projekcie">Dowiedz się więcej o projekcie</Link>
              </Button>
            </div>
          </section>
        </article>
      </main>
    </div>
  );
}
