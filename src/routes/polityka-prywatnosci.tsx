import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Cookie,
  EyeOff,
  Globe,
  HeartHandshake,
  Lock,
  Mail,
  Server,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useTranslation } from "@/lib/i18n";
import { useEffect } from "react";
import { trackPageView } from "@/lib/analytics";

const TITLE = "Polityka prywatności i przejrzystości | SejmSim 2027 (sejmsim.pl)";
const DESCRIPTION =
  "Zasady poszanowania prywatności i przetwarzania danych w SejmSim.pl. Zero cookies śledzących, brak profilowania, brak łączenia symulacji z użytkownikami.";

export const Route = createFileRoute("/polityka-prywatnosci")({
  staticData: { sitemap: true },
  head: () => ({
    links: [{ rel: "canonical", href: "https://sejmsim.pl/polityka-prywatnosci" }],
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://sejmsim.pl/polityka-prywatnosci" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
  }),
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  const { tr } = useTranslation();

  useEffect(() => {
    trackPageView("/polityka-prywatnosci");
  }, []);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Pasek nawigacyjny */}
      <nav
        className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-5 py-3.5 border-b border-border/40"
        aria-label="Nawigacja strony polityki prywatności"
      >
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> {tr("Wróć do symulatora")}
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-5 py-10 sm:py-12 space-y-10">
        {/* Nagłówek strony */}
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Prywatność i transparentność</span>
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Polityka prywatności SejmSim.pl
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
            SejmSim to niezależny, obywatelski kalkulator wyborczy stworzony z poszanowaniem Twojej prywatności.
            Nie sprzedajemy danych, nie śledzimy Cię po sieci i nie powiązujemy tworzonych symulacji z Twoją tożsamością.
          </p>
          <p className="text-xs text-muted-foreground/80">
            Ostatnia aktualizacja: 19 listopada 2026 r.
          </p>
        </header>

        {/* Sekcje zasad */}
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Karta 1: Brak profilowania */}
          <section className="panel p-6 border-border/80 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <EyeOff className="h-5 w-5" />
            </div>
            <h2 className="font-display text-lg font-bold text-ink">
              1. Zero profilowania i tożsamości
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Serwis nie wymaga logowania, zakładania konta ani podawania jakichkolwiek danych osobowych (imienia, nazwiska, numeru telefonu czy adresu).
              Nigdy nie łączymy preferencji politycznych ani wprowadzonych liczb z konkretną osobą. Autor serwisu nie wie, kto stworzył dany scenariusz — wiemy jedynie, że jakaś symulacja została przeprowadzona lub zapisana.
            </p>
          </section>

          {/* Karta 2: Brak cookies śledzących */}
          <section className="panel p-6 border-border/80 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Cookie className="h-5 w-5" />
            </div>
            <h2 className="font-display text-lg font-bold text-ink">
              2. Brak ciasteczek reklamowych (No Tracking)
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Nie stosujemy ciasteczek śledzących (third-party tracking cookies) ani skryptów korporacyjnych sieci reklamowych czy analitycznych (Google Analytics, Meta Pixel, Hotjar itp.). Twoje ustawienia (np. motyw graficzny, język czy zapisane warianty) są bezpiecznie przechowywane lokalnie w pamięci podręcznej Twojej przeglądarki (<code>localStorage</code>).
            </p>
          </section>

          {/* Karta 3: Co zbieramy i po co */}
          <section className="panel p-6 border-border/80 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Server className="h-5 w-5" />
            </div>
            <h2 className="font-display text-lg font-bold text-ink">
              3. Dane analityczne i techniczne (IP)
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              W celu monitorowania obciążenia serwera, oceny stabilności oraz szacowania liczby unikalnych odwiedzin, system rejestruje techniczny adres IP oraz ogólne zdarzenia (np. odsłona podstrony, pobranie grafiki, wygenerowanie linku). Adresy IP nie są kojarzone z konkretnymi osobami ani sprzedawane podmiotom trzecim. Służą także do ochrony serwera przed atakami botów i spamem (limit 5 aktywnych linków na IP).
            </p>
          </section>

          {/* Karta 4: Lokalne obliczenia */}
          <section className="panel p-6 border-border/80 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Lock className="h-5 w-5" />
            </div>
            <h2 className="font-display text-lg font-bold text-ink">
              4. Lokalne obliczenia D'Hondta
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Wszystkie przeliczenia mandatów metodą D'Hondta dla 41 okręgów, progi wyborcze oraz generowanie grafik do postów w social mediach odbywają się w 100% bezpośrednio w Twojej przeglądarce (Client-Side). Żadne dane z Twoich suwaków nie są wysyłane na serwer, dopóki celowo nie klikniesz opcji „Udostępnij link”.
            </p>
          </section>
        </div>

        {/* Szczegółowe zasady w akapicie */}
        <section className="panel p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <h2 className="font-display text-xl font-bold text-ink">
              Udostępnianie scenariuszy i dobrowolny kontakt
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Dodatkowe informacje na temat specyficznych funkcji platformy SejmSim:
            </p>
          </div>

          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-primary mt-0.5" />
              <div>
                <strong className="text-foreground">Udostępnianie linków (Share links):</strong> Jeśli zdecydujesz się udostępnić swój scenariusz innym, jego parametry (procenty partii, progi, konfiguracja okręgów) zostają zapisane w lokalnej bazie serwera i powiązane z losowym identyfikatorem URL. Linki wygasają automatycznie po 7 dniach. Własne grafiki partii nigdy nie trafiają do udostępnianego linku.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-primary mt-0.5" />
              <div>
                <strong className="text-foreground">Formularz opinii (Feedback):</strong> Formularz zgłaszania uwag i błędów pozwala na przesłanie oceny i wiadomości tekstowej. Podanie adresu e-mail jest całkowicie opcjonalne i służy wyłącznie do ewentualnej odpowiedzi twórcy na zgłoszony problem.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-primary mt-0.5" />
              <div>
                <strong className="text-foreground">Wsparcie twórcy (Buy Me a Coffee):</strong> Wpłaty i dobrowolne wsparcie finansowe projektu są realizowane za pośrednictwem serwisu Buy Me a Coffee (BMC), który przetwarza transakcje zgodnie z własnymi standardami bezpieczeństwa i polityką prywatności.
              </div>
            </div>
          </div>

          {/* Kontakt */}
          <div className="rounded-xl border border-border/80 bg-background/50 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Administrator i kontakt
              </p>
              <p className="mt-1 text-base font-bold text-ink">
                Iwo Laskowski (@jifo)
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Gdynia, Polska · Twórca projektu SejmSim
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href="mailto:iwo@laskowski.edu.pl">
                  <Mail className="mr-1.5 h-4 w-4" /> Napisz e-mail
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="https://jifo.dev" target="_blank" rel="noopener noreferrer">
                  <Globe className="mr-1.5 h-4 w-4" /> jifo.dev
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* Dolna nawigacja */}
        <footer className="border-t border-border pt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} SejmSim.pl · Obywatelski symulator parlamentarny</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/" className="text-primary hover:underline">
              Symulator
            </Link>
            <Link to="/o-projekcie" className="text-primary hover:underline">
              O projekcie
            </Link>
            <Link to="/zrodla" className="text-primary hover:underline">
              Źródła i sondaże
            </Link>
            <Link to="/metoda-dhondta" className="text-primary hover:underline">
              Metoda D'Hondta
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
