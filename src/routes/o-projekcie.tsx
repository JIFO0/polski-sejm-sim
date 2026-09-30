import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BarChart3, ExternalLink, Globe, Mail, MapPinned, Save, Sparkles, UsersRound } from "lucide-react";

import { FeedbackDialog } from "@/components/FeedbackDialog";
import { ParticleField } from "@/components/ParticleField";
import { Button } from "@/components/ui/button";
import { LogoConceptsShowcase, useActiveLogo } from "@/components/LogoConceptsShowcase";
import { LogoMark } from "@/components/Logos";
import { SupportButton, SupportCard } from "@/components/SupportButton";

const TITLE = "O projekcie i twórcy | Sejmowy Symulator 2027 (sejmsim.pl) — Iwo Laskowski";
const DESCRIPTION =
  "Poznaj historię Sejmowego Symulatora 2027 (sejmsim.pl), twórcę projektu Iwo Laskowskiego (@jifo) oraz 7 oficjalnych konceptów identyfikacji wizualnej i logo platformy.";

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
  const activeLogo = useActiveLogo();

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <ParticleField className="pointer-events-none fixed inset-0 z-0 h-dvh w-screen" />
      <header className="relative z-10 border-b border-border bg-surface/80 backdrop-blur-sm">
        <nav
          className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-4"
          aria-label="Nawigacja strony O projekcie"
        >
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Wróć do symulatora
              </Link>
            </Button>
            <div className="hidden items-center gap-2 border-l border-border pl-3 sm:flex">
              <LogoMark concept={activeLogo} size={28} />
              <div className="flex flex-col leading-none">
                <span className="font-display text-sm font-bold text-ink">
                  Sejmowy Symulator<span className="text-primary">.</span>
                </span>
                <span className="font-mono text-[9px] text-muted-foreground">sejmsim.pl</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <FeedbackDialog />
            <Button variant="outline" size="sm" asChild>
              <a href="https://jifo.dev/#kontakt" target="_blank" rel="noreferrer">
                Kontakt <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </a>
            </Button>
            <SupportButton size="sm" />
          </div>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl space-y-16 px-5 py-10 md:py-16">
        <article className="space-y-14">
          {/* BANER AUTORA */}
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-md">
            <div className="relative aspect-[4.8/1] w-full min-h-[140px] bg-slate-950 sm:min-h-[180px]">
              <img
                src="/images/iwo-banner.png"
                alt="Iwo Laskowski @jifo - A reliable pair of hands"
                className="h-full w-full object-cover object-center"
              />
            </div>

            {/* KARTA TWÓRCY ZE ZDJĘCIEM */}
            <div className="relative -mt-12 px-6 pb-6 pt-0 sm:-mt-16 sm:px-8 sm:pb-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-background bg-card shadow-lg sm:h-28 sm:w-28">
                    <img
                      src="/images/iwo-photo.png"
                      alt="Iwo Laskowski - twórca Sejmometru"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
                        Iwo Laskowski
                      </h2>
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-xs font-semibold text-primary">
                        @jifo
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm font-medium text-muted-foreground">
                      Twórca & Architekt platformy Sejmowy Symulator (sejmsim.pl) • Gdynia
                    </p>
                    <p className="mt-1 font-mono text-xs italic text-ink/80">
                      „A reliable pair of hands”
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <SupportButton size="sm" />
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://jifo.dev" target="_blank" rel="noreferrer">
                      <Globe className="mr-1.5 h-3.5 w-3.5" /> jifo.dev
                    </a>
                  </Button>
                  <Button size="sm" asChild>
                    <a href="https://jifo.dev/#kontakt" target="_blank" rel="noreferrer">
                      <Mail className="mr-1.5 h-3.5 w-3.5" /> Skontaktuj się
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* GŁÓWNA HISTORIA / MOTYWACJA */}
          <header className="max-w-3xl">
            <p className="eyebrow">O projekcie i misji</p>
            <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-ink md:text-5xl">
              Sejmowy Symulator powstał z ciekawości polityki, matematyki i mechanizmów społecznych
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-foreground md:text-xl">
              Jestem Iwo. Od zawsze fascynują mnie mechanizmy społeczne, socjologia wyborcza
              oraz to, jak drobne przesunięcia nastrojów przekładają się na arytmetykę większości parlamentarnej.
              Chciałem stworzyć otwarte, precyzyjne narzędzie na <strong className="text-foreground">sejmsim.pl</strong>,
              w którym każdy obywatel, analityk i pasjonat może samodzielnie sprawdzić własne pytania o wybory do Sejmu w 2027 roku.
            </p>
          </header>

          {/* SEKCJA: SKĄD TEN POMYSŁ */}
          <section className="grid gap-8 border-y border-border py-12 md:grid-cols-[0.7fr_1.3fr]">
            <div>
              <p className="eyebrow">Skąd ten pomysł</p>
              <h2 className="mt-2 font-display text-3xl font-bold text-ink">Od rozmowy do narzędzia</h2>
            </div>
            <div className="space-y-5 text-base leading-8 text-muted-foreground">
              <p>
                Po długiej rozmowie z przyjacielem zdałem sobie sprawę, że w polskiej przestrzeni publicznej
                brakuje bezpłatnego, nowoczesnego symulatora, który pozwalałby sprawdzić własne scenariusze
                wyborcze na 2027 rok. Co stanie się przy niższej lub wyższej frekwencji? Jak zmieni się Sejm,
                jeśli partia X osiągnie wynik wyższy o 2 punkty procentowe, partia Y nie przekroczy progu,
                a potencjalni koalicjanci uzyskają łącznie 231 mandatów?
              </p>
              <p>
                Pierwszą wersję napisałem w Pythonie, wyłącznie dla siebie. Stopniowo ulepszałem algorytmy
                i rozkład okręgowy, aż uznałem, że prawdopodobnie nie tylko ja potrzebuję takiego sposobu
                analizowania wyborów. Pierwsza publiczna wersja zajęła mi tydzień intensywnej pracy.
              </p>
              <p>
                Dzięki rozmowom ze świetnymi ludźmi rozwijam Sejmowy Symulator (sejmsim.pl) tak, aby był najbardziej rzetelnym
                i intuicyjnym narzędziem analitycznym przed najbliższymi wyborami. Chcę, by więcej osób
                w Polsce mogło z równą ciekawością badać ordynację wyborczą, algorytm D&apos;Hondta i dynamikę demokracji.
              </p>
            </div>
          </section>

          {/* CO POTRAFI SEJMOWY SYMULATOR */}
          <section aria-labelledby="funkcje-projektu">
            <p className="eyebrow">Co potrafi Sejmowy Symulator</p>
            <h2 id="funkcje-projektu" className="mt-2 max-w-2xl font-display text-3xl font-bold text-ink">
              Symulator wyborów do Sejmu z analizą 41 okręgów, frekwencji i koalicji
            </h2>
            <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">
              Punktem wyjścia są dane sondażowe, ale każdy parametr możesz zmienić. Wyniki są
              przeliczane osobno dla 41 okręgów metodą D&apos;Hondta, dlatego ten sam wynik ogólnokrajowy może
              prowadzić do diametralnie różnych podziałów mandatów w zależności od geografii poparcia.
            </p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {features.map(({ icon: Icon, title, text }) => (
                <li key={title} className="panel p-5 transition-shadow hover:shadow-md">
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h3 className="mt-4 font-display text-lg font-bold text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* SEKCJA: 7 KONCEPTÓW LOGO */}
          <div className="border-t border-border pt-12">
            <LogoConceptsShowcase />
          </div>

          {/* WAŻNE ZASTRZEŻENIE */}
          <section className="rounded-2xl border border-border bg-surface/80 px-6 py-10 text-center backdrop-blur-sm md:px-12">
            <p className="eyebrow">Ważne zastrzeżenie</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-ink">Narzędzie do analizy, nie prognoza</h2>
            <p className="mx-auto mt-3 max-w-2xl leading-7 text-muted-foreground">
              Sejmowy Symulator (sejmsim.pl) pokazuje matematyczne i symulacyjne skutki przyjętych założeń. Nie przewiduje wyniku wyborów
              i nie zastępuje oficjalnych sondaży. Ma ułatwiać zrozumienie mechaniki ordynacji oraz testowanie własnych hipotez.
            </p>
          </section>

          {/* WESPRZYJ ROZWÓJ PROJEKTU */}
          <section aria-labelledby="wesprzyj-projekt">
            <SupportCard />
          </section>

          {/* STOPKA */}
          <footer className="border-t border-border py-12 text-center">
            <p className="font-display text-2xl font-bold text-ink">Pomyślnych analiz życzy JIFO!</p>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Projekt stworzył <strong>Iwo Laskowski</strong>, twórca z Gdyni łączący ekonomię, technologię,
              rozwiązania webowe, DevOps, UI/UX i fotografię.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link to="/">Uruchom Sejmowy Symulator</Link>
              </Button>
              <SupportButton size="default" />
              <Button variant="outline" asChild>
                <a href="https://jifo.dev" target="_blank" rel="noreferrer">
                  Poznaj JIFO <ExternalLink className="ml-1 h-3.5 w-3.5" />
                </a>
              </Button>
              <Button variant="ghost" asChild>
                <a href="https://jifo.dev/#kontakt" target="_blank" rel="noreferrer">
                  Kontakt z Iwo
                </a>
              </Button>
            </div>
          </footer>
        </article>
      </main>
    </div>
  );
}