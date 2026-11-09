import { useTranslation } from "@/lib/i18n";
import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AccessibilityMenu } from "@/components/AccessibilityMenu";
import { FloatingNav } from "@/components/FloatingNav";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ParticleField } from "@/components/ParticleField";
import { ThemeToggle } from "@/components/ThemeToggle";
import { OwnWorkNotice } from "@/components/OwnWorkNotice";
import { Button } from "@/components/ui/button";
import { trackPageViewOncePerSession } from "@/lib/analytics";
import {
  POLL_HALF_LIFE_DAYS,
  POLL_MAX_COUNT,
  POLL_MIN_COUNT,
  POLL_SAMPLE_REFERENCE,
  POLL_WINDOW_DAYS,
} from "@/lib/poll-average";

const TITLE = "Źródła i metodologia | SejmSim 2027 (sejmsim.pl)";
const DESCRIPTION =
  "SejmSim jest niekomercyjnym serwisem obywatelskim. Średnią sondażową liczy sam z publicznie opublikowanych badań, z podaniem źródła. Symulacja mandatów nie jest sondażem.";

export const Route = createFileRoute("/zrodla")({
  staticData: { sitemap: true },
  head: () => ({
    links: [{ rel: "canonical", href: "https://sejmsim.pl/zrodla" }],
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://sejmsim.pl/zrodla" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
  }),
  component: SourcesPage,
});

function SourcesPage() {
  const tr = useTranslation();
  useEffect(() => {
    trackPageViewOncePerSession();
  }, []);

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <ParticleField className="pointer-events-none fixed inset-0 z-0 h-dvh w-screen" />
      <FloatingNav mode="about" />
      <header className="relative z-10 border-b border-border bg-surface/80 backdrop-blur-sm">
        <nav
          className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3 sm:px-5 sm:py-3.5"
          aria-label="Nawigacja źródeł"
        >
          <Button variant="ghost" size="sm" asChild className="h-9 px-2.5 sm:px-3">
            <Link to="/" title={tr("Wróć do symulatora")} aria-label={tr("Wróć do symulatora")}>
              <ArrowLeft className="h-4 w-4 sm:mr-1.5 shrink-0" />
              <span className="hidden sm:inline">{tr("Wróć do symulatora")}</span>
            </Link>
          </Button>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <AccessibilityMenu />
          </div>
        </nav>
      </header>
      <main className="relative z-10 mx-auto max-w-3xl space-y-8 px-5 py-10">
        <header>
          <p className="eyebrow">{tr("Prawo i dane")}</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-ink sm:text-4xl">
            {tr("Źródła i metodologia")}{" "}
          </h1>
        </header>

        <OwnWorkNotice />

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
          <h2 className="font-display text-xl font-bold text-ink">
            {tr("Centrum Badania Opinii Społecznej (CBOS)")}
          </h2>
          <p>
            {tr(
              "sejmsim.pl korzysta z wyników opublikowanych na cbos.pl za zgodą Centrum Badania Opinii Społecznej (CBOS), w celach niekomercyjnych. Przy każdym badaniu podajemy pełną nazwę ośrodka, tytuł i numer publikacji, termin, wielkość próby, metodę i bezpośredni link. Średnia liczona na tej stronie jest opracowaniem własnym sejmsim.pl, a nie oficjalnym wynikiem CBOS.",
            )}
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
          <h2 className="font-display text-xl font-bold text-ink">
            {tr("Instytut Badań Pollster")}
          </h2>
          <p>
            {tr(
              "sejmsim.pl korzysta z opublikowanych sondaży Instytutu Badań Pollster za zgodą ośrodka. Źródło podajemy razem z zamawiającym (np. „Instytut Badań Pollster dla Super Expressu”), a każdy sondaż linkuje bezpośrednio do oryginalnej publikacji zamawiającego.",
            )}
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
          <h2 className="font-display text-xl font-bold text-ink">
            {tr("Ogólnopolska Grupa Badawcza (OGB)")}
          </h2>
          <p>
            {tr(
              "Sondaże Ogólnopolskiej Grupy Badawczej publikowane są za zgodą ośrodka z oznaczeniem „OGB dla Stan360” i linkiem do serwisu stan360.pl.",
            )}
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
          <h2 className="font-display text-xl font-bold text-ink">
            {tr("Opinia24")}
          </h2>
          <p>
            {tr(
              "sejmsim.pl korzysta z publikacji i danych sondażowych pracowni Opinia24 publikowanych w serwisie Puls Opinii (puls.opinia24.pl) za zgodą ośrodka.",
            )}{" "}
            <a
              href="https://puls.opinia24.pl/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline underline-offset-4"
            >
              https://puls.opinia24.pl/
            </a>
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
          <h2 className="font-display text-xl font-bold text-ink">{tr("Skąd biorą się liczby")}</h2>
          <p>
            {tr(
              "SejmSim jest niekomercyjnym serwisem obywatelskim. Nie sprzedaje danych, nie prowadzi badań opinii i nie jest ośrodkiem sondażowym. Symulacja podziału mandatów metodą D'Hondta to narzędzie do scenariuszy „co by było, gdyby”. Nie jest sondażem, nie jest prognozą i nie zastępuje oficjalnych wyników PKW.",
            )}{" "}
          </p>
          <p>
            {tr(
              "Dane sondażowe pochodzą z publicznie opublikowanych badań. Każde badanie jest cytowane z podaniem źródła (ośrodek, zleceniodawca, daty, próba, metoda i link — o ile te informacje zostały opublikowane). Brakujących pól nie uzupełniamy domysłami. Serwis nie kopiuje gotowych średnich innych redakcji ani baz zestawień. Średnią, od której startuje symulator, liczy sam SejmSim.",
            )}{" "}
          </p>
          <p>
            {tr(
              "Wcześniejsza wersja przyjmowała jako punkt wyjścia średnią opisaną jako pochodzącą z ewybory.eu (stan na 30 września 2026), rozpisaną na okręgi. W repozytorium nie było przy tym pojedynczych sondaży. Tego zestawienia nie przenieśliśmy do zbioru badań i nie pokazujemy go jako średniej SejmSim. Profil różnic między okręgami został w modelu tylko po to, żeby krajowe poparcie dało się rozłożyć na 41 okręgów, gdy średnia już powstanie z własnego zbioru.",
            )}{" "}
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
          <h2 className="font-display text-xl font-bold text-ink">
            {tr("Jak liczona jest średnia")}
          </h2>
          <p>
            Bierzemy sondaże z ostatnich {POLL_WINDOW_DAYS} dni według daty publikacji. Gdy w tym
            oknie jest ich mniej niż {POLL_MIN_COUNT}, dokładamy starsze badania, aż do{" "}
            {POLL_MIN_COUNT}, i nigdy nie bierzemy więcej niż {POLL_MAX_COUNT} najnowszych. Do
            średniej nie wchodzi wpis bez daty publikacji albo bez wyników.
          </p>
          <p>
            Waga zależy od świeżości i próby. Świeżość spada o połowę co {POLL_HALF_LIFE_DAYS} dni.
            Liczebność próby porównujemy do {POLL_SAMPLE_REFERENCE} respondentów. Gdy próba nie
            została podana, waga próby wynosi 1 — nie wpisujemy wymyślonej liczby wywiadów. Wynik
            partii to średnia tylko z tych sondaży, które tę partię opublikowały. Data średniej jest
            ważoną średnią dat publikacji użytych badań.
          </p>
          <p>
            {tr(
              "Przy średniej pokazujemy przybliżony błąd 95% tak, jak przy losowaniu prostym. To komunikat o niepewności statystycznej, a nie przedział podany przez ośrodek. Odpowiedzi „nie wiem” nie wchodzą do wyników, bo nie są komitetem. Unia Centrum nie ma osobnej pozycji w symulatorze, więc jej ułamka procenta nie dopisujemy do „innych”.",
            )}{" "}
          </p>
          <p>
            {tr(
              "Próg 5% dotyczy komitetu partyjnego, a próg 8% koalicji wyborczej. W modelu SejmSim Koalicja Obywatelska ma próg 8%. Oznaczenie pod wynikiem mówi tylko, że średnia jest niższa od progu przyjętego w symulatorze.",
            )}{" "}
          </p>
          <p>
            {tr(
              "Gdy średnia istnieje, nakładamy ją na profil okręgowy: w każdym okręgu zachowujemy wzajemne proporcje partii, a po zsumowaniu głosów w kraju wychodzi ta średnia. Mandaty dalej liczymy osobno w 41 okręgach.",
            )}{" "}
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
          <h2 className="font-display text-xl font-bold text-ink">{tr("Cisza wyborcza")}</h2>
          <p>
            W czasie ciszy wyborczej SejmSim nie publikuje nowych wyników sondaży i nie przesuwa
            średniej o badania, które ukazałyby się w trakcie ciszy. Cisza zaczyna się na 24 godziny
            przed dniem głosowania i trwa do zakończenia głosowania (art. 107 ustawy z dnia 5
            stycznia 2011 r. — Kodeks wyborczy). Okresy ciszy wpisuje się w{" "}
            <code className="text-foreground">src/data/election-silence.json</code>. Poza tymi
            okresami strona pokazuje średnią i listę badań jak zwykle.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
          <h2 className="font-display text-xl font-bold text-ink">
            {tr("Czego ten serwis nie robi")}
          </h2>
          <p>
            {tr(
              "Nie pobieramy automatycznie cudzych stron z sondażami. Nie odtwarzamy baz danych zestawień. Historyczne wyniki wyborów w symulatorze są osobnym, tylko do odczytu odniesieniem do danych PKW i nie są presetem sondażowym. Logotypy partii pochodzą z Wikimedia Commons i należą do ich właścicieli.",
            )}{" "}
          </p>
        </section>
      </main>
    </div>
  );
}
