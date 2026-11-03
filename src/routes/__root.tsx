import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { useDarkTheme } from "@/components/ThemeToggle";
import { FeedbackInvitation } from "@/components/FeedbackInvitation";
import { SupportInvitation } from "@/components/SupportInvitation";
import { useLanguage } from "@/lib/i18n";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { THEME_BOOT } from "@/lib/theme-preference";

const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const reportedError = error instanceof Error ? error : new Error(String(error));
  const router = useRouter();
  useEffect(() => {
    reportLovableError(reportedError, { boundary: "tanstack_root_error_component" });
  }, [reportedError]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SejmSim 2027 – Kalkulator mandatów i symulator wyborczy Sejmu (sejmsim.pl)" },
      {
        name: "description",
        content: "Sprawdź podział 460 mandatów w Sejmie metodą D'Hondta. Aktualna średnia sondażowa, symulacja koalicji większościowych (231 mandatów) i interaktywna mapa 41 okręgów wyborczych.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@jifo" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { rel: "icon", href: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { rel: "icon", href: "/favicon-192x192.png", sizes: "192x192", type: "image/png" },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "shortcut icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const SCHEMA_ORG = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "SejmSim 2027",
  alternateName: [
    "SejmSim",
    "sejmsim.pl",
    "Kalkulator mandatów Sejm",
    "Symulator wyborczy Sejmu",
    "Kalkulator D'Hondta",
  ],
  url: "https://sejmsim.pl/",
  applicationCategory: "UtilityApplication",
  operatingSystem: "All",
  description:
    "Kalkulator mandatów Sejmu i symulator wyborczy do Sejmu RP 2027. Interaktywna mapa 41 okręgów wyborczych, metoda D'Hondta, symulacja koalicji i badanie większości 231 mandatów.",
  author: {
    "@type": "Person",
    name: "Iwo Laskowski",
    url: "https://jifo.dev",
  },
  image: "https://sejmsim.pl/og-image.png",
});

function RootShell({ children }: { children: ReactNode }) {
  const lang = useLanguage();
  return (
    <html lang={lang}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preload" as="style" href={GOOGLE_FONTS_URL} />
        {/* Non-render-blocking font stylesheet swap */}
        <link
          rel="stylesheet"
          href={GOOGLE_FONTS_URL}
          media="print"
          // @ts-expect-error inline onload attribute for non-blocking swap in SSR
          onload="this.media='all'"
        />
        <noscript>
          <link rel="stylesheet" href={GOOGLE_FONTS_URL} />
        </noscript>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SCHEMA_ORG }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const dark = useDarkTheme();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <FeedbackInvitation />
      <SupportInvitation />
      <Toaster position="top-center" richColors theme={dark ? "dark" : "light"} />
    </QueryClientProvider>
  );
}
