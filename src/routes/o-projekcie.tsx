import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BarChart3, ExternalLink, MapPinned, Save, UsersRound } from "lucide-react";

import { FeedbackDialog } from "@/components/FeedbackDialog";
import { ParticleField } from "@/components/ParticleField";
import { Button } from "@/components/ui/button";

const TITLE = "O projekcie Sejmometr 2027 | Iwo Laskowski, JIFO";
const DESCRIPTION =
  "Poznaj historię Sejmometru 2027, polskiego symulatora wyborów do Sejmu. Sprawdzaj wyniki w 41 okręgach, frekwencję, progi, mandaty i koalicje.";

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
    text: "Zmieniaj poparcie i frekwencję osobno w każdym okręgu, zamiast opierać analizę wyłącznie na wyniku krajowym.",
  },
  {
    icon: BarChart3,
    title: "Mandaty metodą D'Hondta",
    text: "Obserwuj, jak progi wyborcze, lokalne różnice i rozkład głosów przekładają się na 460 miejsc w Sejmie.",
  },
  {
    icon: UsersRound,
    title: "Frekwencja i koalicje",
    text: "Sprawdzaj, które komitety mogą zyskać na zmianie frekwencji i jakie układy osiągają większość 231 mandatów.",
  },
  {
    icon: Save,
    title: "Własne scenariusze",
    text: "Zapisuj do 10 wariantów w przeglądarce, pobieraj je jako pliki i udostępniaj gotową analizę przez link.",
  },
];

function AboutProject() {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <ParticleField className="pointer-events-none fixed inset-0 z-0 h-dvh w-screen" />
      <header className="relative z-10 border-b border-border bg-surface/80 backdrop-blur-sm">
        <nav
          className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-4"
          aria-label="Nawigacja strony O projekcie"
        >
          <Button variant="ghost" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4" /> Wróć do symulatora
            </Link>
          </Button>
          <div className="flex gap-2">
            <FeedbackDialog />
            <Button variant="outline" size="sm" asChild>
              <a href="https://jifo.dev/#kontakt" target="_blank" rel="noreferrer">
                Kontakt <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-5 py-12 md:py-20">
        <article>
          <header className="max-w-3xl">
            <p className="eyebrow">O projekcie</p>
            <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-ink md:text-6xl">
              Sejmometr powstał z ciekawości polityki i ludzi
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-foreground md:text-xl">
              Jestem Iwo. Od zawsze interesuję się polityką, socjologią i mechanizmami
              społecznymi. Chciałem stworzyć miejsce, w którym można nie tylko zobaczyć jeden
              wynik wyborów, ale naprawdę sprawdzić własne pytania o wybory do Sejmu w 2027 roku.
            </p>
          </header>

          <section className="mt-14 grid gap-8 border-y border-border py-12 md:grid-cols-[0.7fr_1.3fr]">
            <div>
              <p className="eyebrow">Skąd ten pomysł</p>
              <h2 className="mt-2 font-display text-3xl font-bold text-ink">Od rozmowy do narzędzia</h2>
            </div>
            <div className="space-y-5 text-base leading-8 text-muted-foreground">
              <p>
                Po długiej rozmowie z przyjacielem zdałem sobie sprawę, że nie mam jak dokładnie
                sprawdzić własnych scenariuszy na wybory w 2027 roku. Co stanie się przy niższej
                frekwencji? Jak zmieni się Sejm, jeśli partia X osiągnie wynik wyższy od
                oczekiwanego, partia Y nie przekroczy progu, a partia Z się rozpadnie?
              </p>
              <p>
                Pierwszą wersję napisałem w Pythonie, wyłącznie dla siebie. Później stopniowo ją
                ulepszałem, aż uznałem, że prawdopodobnie nie tylko ja potrzebuję takiego sposobu
                analizowania wyborów. Pierwsza publiczna wersja zajęła mi tydzień.
              </p>
              <p>
                Dzięki rozmowom z ludźmi mądrzejszymi ode mnie rozwijam Sejmometr tak, aby był
                naprawdę użytecznym narzędziem podczas najbliższych wyborów. Chcę, by więcej osób
                w Polsce mogło z podobną ciekawością analizować politykę, system wyborczy i
                mechanizmy społeczne.
              </p>
            </div>
          </section>

          <section className="py-14" aria-labelledby="funkcje-projektu">
            <p className="eyebrow">Co potrafi Sejmometr</p>
            <h2 id="funkcje-projektu" className="mt-2 max-w-2xl font-display text-3xl font-bold text-ink">
              Symulator wyborów do Sejmu z analizą okręgów, frekwencji i koalicji
            </h2>
            <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">
              Punktem wyjścia są dane sondażowe, ale każdy parametr możesz zmienić. Wyniki są
              przeliczane osobno dla okręgów metodą D'Hondta, dlatego ten sam wynik krajowy może
              prowadzić do różnych podziałów mandatów.
            </p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {features.map(({ icon: Icon, title, text }) => (
                <li key={title} className="panel p-5">
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h3 className="mt-4 font-display text-lg font-bold text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="border-y border-border bg-surface/80 px-5 py-10 text-center backdrop-blur-sm md:px-10">
            <p className="eyebrow">Ważne zastrzeżenie</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-ink">Narzędzie do analizy, nie prognoza</h2>
            <p className="mx-auto mt-3 max-w-2xl leading-7 text-muted-foreground">
              Sejmometr pokazuje skutki przyjętych założeń. Nie przewiduje wyniku wyborów i nie
              zastępuje sondaży. Ma pomagać rozumieć zależności oraz porównywać własne warianty.
            </p>
          </section>

          <footer className="py-14 text-center">
            <p className="font-display text-2xl font-bold text-ink">Pomyślnych analiz życzy JIFO!</p>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Projekt stworzył Iwo Laskowski, twórca z Gdyni łączący ekonomię, technologię,
              rozwiązania webowe, DevOps, UI/UX i fotografię.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link to="/">Uruchom Sejmometr</Link>
              </Button>
              <Button variant="outline" asChild>
                <a href="https://jifo.dev" target="_blank" rel="noreferrer">
                  Poznaj JIFO <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </footer>
        </article>
      </main>
    </div>
  );
}