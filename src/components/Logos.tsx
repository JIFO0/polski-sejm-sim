import type { SVGProps } from "react";

export type LogoConceptId =
  | "concept-1"
  | "concept-2"
  | "concept-3"
  | "concept-4"
  | "concept-5"
  | "concept-6"
  | "concept-7";

export interface LogoConceptMeta {
  id: LogoConceptId;
  name: string;
  tagline: string;
  description: string;
  symbolism: string;
  highlights: string[];
  isWinner?: boolean;
}

export const LOGO_CONCEPTS: LogoConceptMeta[] = [
  {
    id: "concept-7",
    name: "Sejmometr (Miernik & Sala Plenarna — Oficjalne Logo)",
    tagline: "Oficjalne logo platformy Sejmowy Symulator (sejmsim.pl)",
    description:
      "Dwie komplementarne półkule tworzące idealne koło: lewa biała tarcza miernika z granatową podziałką i dynamiczną czerwoną wskazówką, zintegrowana z prawym półkolem 4 koncentrycznych ław sejmowych w karmazynowej czerwieni.",
    symbolism: "Idealna synteza pomiaru poparcia (miernik) oraz mandatu narodu (sala plenarna Sejmu RP) dopełniające się w harmonijne koło.",
    highlights: ["Oficjalne zwycięskie logo", "Idealne koło (miernik + sejm)", "Biel, granat i karmazynowa czerwień"],
    isWinner: true,
  },
  {
    id: "concept-1",
    name: "S-Hemicykl Klasyczny (Parallel Flow)",
    tagline: "Geometryczna litera S przechodząca w rzędy ław poselskich",
    description:
      "Minimalistyczna, płynna litera 'S' po lewej stronie, z której promieniuje klasyczne półkole sejmowe utworzone z 3 koncentrycznych łuków kropek.",
    symbolism: "Litera S (Sejm/Symulator) jako źródło i punkt wyjścia dla 460 reprezentantów narodu.",
    highlights: ["Czysty wektor SVG", "Trzy koncentryczne rzędy kropek", "Równowaga między monogramem a hemicyklem"],
  },
  {
    id: "concept-2",
    name: "S-Orbita 231 (Punkt Większości)",
    tagline: "Dynamiczne kropki o zmiennej skali z akcentem złotego mandatu",
    description:
      "Mocna litera 'S' ze ściętymi krawędziami. Po prawej stronie półkole sejmowe z kropek rosnących wielkością ze złotym punktem większości 231.",
    symbolism: "Electoral momentum — waga każdego głosu i poszukiwanie stabilnej większości koalicyjnej.",
    highlights: ["Kropki o progresywnej wielkości", "Złoty punkt większości 231", "Dynamiczny styl"],
  },
  {
    id: "concept-3",
    name: "S-Matrix Data (Siatka Analityczna)",
    tagline: "Monogram wyłaniający się z gęstej matrycy poselskiej",
    description:
      "Litera 'S' i półkole sejmowe tworzą spójny system siatki modułowej: linia S płynnie przekształca się w gęsty układ 4 łuków mikrokropek.",
    symbolism: "Otwarty kod, telemetria wyborcza, dokładność matematyczna algorytmu.",
    highlights: ["Styl computational design", "4 rzędy precyzyjnych kropek", "Świetna czytelność w dark mode"],
  },
  {
    id: "concept-4",
    name: "S-Embraced (Półkole w Objęciu S)",
    tagline: "Kompaktowy znak z półkolem wplecionym w dolny łuk S",
    description:
      "Litera 'S', której dolny łuk naturalnie otacza i obejmuje półkolistą salę obrad złożoną z kropek. Tworzy zwarty, monolitowy symbol o proporcjach 1:1.",
    symbolism: "Opieka nad procesem demokratycznym, jedność państwa i instytucji Sejmu.",
    highlights: ["Idealne proporcje 1:1 na favicon", "Maksymalna siła znaku w małych rozmiarach", "Płynna harmonia"],
  },
  {
    id: "concept-5",
    name: "S-Spektrum Barw (Wielobarwny Sejm)",
    tagline: "Monogram S z półkolem w barwach sił politycznych",
    description:
      "Elegancki monogram 'S' zestawiony z półkolem kropek zabarwionych w odcieniach spektrum parlamentarnego.",
    symbolism: "Pluralizm polityczny, koalicje, różnorodność polskiego parlamentu.",
    highlights: ["Wielobarwne kropki klubowe", "Wysoki walor estetyczny", "Nawiązanie do wykresu Hemicycle"],
  },
  {
    id: "concept-6",
    name: "S-Puls Symulatora (Radar Falowy)",
    tagline: "Dynamiczny, pochylony znak symulacji w czasie rzeczywistym",
    description:
      "Pochylona, kinetyczna litera 'S' generująca przed sobą półkolistą falę kropek niczym impuls radarowy.",
    symbolism: "Sondaże w ruchu, badanie trendów, ciągła zmiana nastrojów społecznych.",
    highlights: ["Kinetyczna dynamika", "Kropki w fali impulsowej", "Styl startup / civic-tech"],
  },
];

type SvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

/**
 * OFICJALNE LOGO: Koncept 7 (Orzeł Wektorowy & Sala Plenarna)
 * Przeniesiony 1:1 z oficjalnej tablicy projektowej logo-concepts-board.jpg
 */
export function OfficialLogoMark({ size = 40, className, ...props }: SvgProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <rect width="200" height="200" rx="44" fill="#0F172A" />

      <defs>
        {/* Cięcie lewej półkuli przy x <= 98.5 (równy odstęp od osi symetrii x=100) */}
        <clipPath id="left-hemisphere-clip">
          <rect x="0" y="0" width="98.5" height="200" />
        </clipPath>
      </defs>

      {/* Lewa Półkula: Białe Półkole Miernika (Tarcza Sejmometru, R=77.2, cx=100, cy=100) */}
      <g clipPath="url(#left-hemisphere-clip)">
        <circle cx="100" cy="100" r="77.2" fill="#FFFFFF" />
        {/* Granatowa skala obwodowa na tarczy */}
        <circle cx="100" cy="100" r="71" stroke="#0F172A" strokeWidth="2.5" fill="none" />
        {/* Granatowe indeksy podziałki (idealnie radialne ze środka 100, 100) */}
        <g id="dial-ticks">
          <line x1="93.62" y1="160.67" x2="92.58" y2="170.61" stroke="#0F172A" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="83.93" y1="149.45" x2="78.06" y2="167.53" stroke="#0F172A" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="69.50" y1="152.83" x2="64.50" y2="161.49" stroke="#0F172A" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="65.21" y1="138.64" x2="52.49" y2="152.76" stroke="#0F172A" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="50.65" y1="135.85" x2="42.56" y2="141.73" stroke="#0F172A" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="52.50" y1="121.15" x2="35.14" y2="128.88" stroke="#0F172A" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="40.33" y1="112.68" x2="30.55" y2="114.76" stroke="#0F172A" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="48.00" y1="100.00" x2="29.00" y2="100.00" stroke="#0F172A" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="40.33" y1="87.32" x2="30.55" y2="85.24" stroke="#0F172A" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="52.50" y1="78.85" x2="35.14" y2="71.12" stroke="#0F172A" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="50.65" y1="64.15" x2="42.56" y2="58.27" stroke="#0F172A" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="65.21" y1="61.36" x2="52.49" y2="47.24" stroke="#0F172A" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="69.50" y1="47.17" x2="64.50" y2="38.51" stroke="#0F172A" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="83.93" y1="50.55" x2="78.06" y2="32.47" stroke="#0F172A" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="93.62" y1="39.33" x2="92.58" y2="29.39" stroke="#0F172A" strokeWidth="1.2" strokeLinecap="round" />
        </g>
        {/* Centralne wycięcie piasty w białej tarczy */}
        <circle cx="100" cy="100" r="12" fill="#0F172A" />
      </g>

      {/* Czerwona Wskazówka Miernika (czysty, ostry trójkąt bez deformacji) */}
      <polygon points="42.84,133.00 98.40,97.23 101.60,102.77" fill="#E11D48" />
      {/* Centralny punkt obrotu wskazówki */}
      <circle cx="100" cy="100" r="5.5" fill="#E11D48" />
      <circle cx="100" cy="100" r="2.2" fill="#FFFFFF" />

      {/* Prawa Półkula: 4 Koncentryczne Ławy Sejmowe w 3 Sektorach (#E11D48, grubość 6.4) */}
      <g id="sejm-benches" stroke="#E11D48" strokeWidth="6.4" strokeLinecap="butt">
        {/* Sektor 1: Góra */}
        <path d="M 102.23 68.08 A 32 32 0 0 1 125.22 80.30" />
        <path d="M 103.21 54.11 A 46 46 0 0 1 136.25 71.68" />
        <path d="M 104.19 40.15 A 60 60 0 0 1 147.28 63.06" />
        <path d="M 105.16 26.18 A 74 74 0 0 1 158.31 54.44" />

        {/* Sektor 2: Środek */}
        <path d="M 127.71 84.00 A 32 32 0 0 1 127.71 116.00" />
        <path d="M 139.84 77.00 A 46 46 0 0 1 139.84 123.00" />
        <path d="M 151.96 70.00 A 60 60 0 0 1 151.96 130.00" />
        <path d="M 164.09 63.00 A 74 74 0 0 1 164.09 137.00" />

        {/* Sektor 3: Dół */}
        <path d="M 125.22 119.70 A 32 32 0 0 1 102.23 131.92" />
        <path d="M 136.25 128.32 A 46 46 0 0 1 103.21 145.89" />
        <path d="M 147.28 136.94 A 60 60 0 0 1 104.19 159.85" />
        <path d="M 158.31 145.56 A 74 74 0 0 1 105.16 173.82" />
      </g>
    </svg>
  );
}

export function LogoMark7(props: SvgProps) {
  return <OfficialLogoMark {...props} />;
}

/** Koncept 1: S-Hemicykl Klasyczny */
export function LogoMark1({ size = 40, className, ...props }: SvgProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <rect width="100" height="100" rx="22" fill="#0F172A" />
      <path
        d="M 36 28 C 36 24 33 22 27 22 C 20 22 17 26 17 31 C 17 41 36 41 36 53 C 36 60 30 64 24 64 C 18 64 15 60 15 56"
        stroke="#FFFFFF"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="15" cy="56" r="3.5" fill="#E11D48" />
      <circle cx="55" cy="43" r="3" fill="#E11D48" />
      <circle cx="68" cy="43" r="2.5" fill="#E2E8F0" />
      <circle cx="66" cy="34" r="2.5" fill="#E2E8F0" />
      <circle cx="61" cy="26" r="2.5" fill="#E2E8F0" />
      <circle cx="55" cy="30" r="2.5" fill="#E2E8F0" />
      <circle cx="66" cy="52" r="2.5" fill="#E2E8F0" />
      <circle cx="61" cy="60" r="2.5" fill="#E2E8F0" />
      <circle cx="77" cy="43" r="3" fill="#E11D48" />
      <circle cx="75" cy="31" r="3" fill="#E2E8F0" />
      <circle cx="69" cy="21" r="3" fill="#E2E8F0" />
      <circle cx="60" cy="14" r="3" fill="#E2E8F0" />
      <circle cx="75" cy="55" r="3" fill="#E11D48" />
      <circle cx="69" cy="65" r="3" fill="#E2E8F0" />
      <circle cx="60" cy="72" r="3" fill="#E2E8F0" />
      <circle cx="86" cy="43" r="3" fill="#E11D48" />
      <circle cx="84" cy="28" r="3" fill="#E11D48" />
      <circle cx="77" cy="15" r="3" fill="#E2E8F0" />
      <circle cx="66" cy="6" r="3" fill="#94A3B8" />
      <circle cx="84" cy="58" r="3" fill="#E11D48" />
      <circle cx="77" cy="71" r="3" fill="#E2E8F0" />
      <circle cx="66" cy="80" r="3" fill="#94A3B8" />
    </svg>
  );
}

/** Koncept 2: S-Orbita 231 */
export function LogoMark2({ size = 40, className, ...props }: SvgProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <rect width="100" height="100" rx="22" fill="#0F172A" />
      <path
        d="M 35 25 L 20 25 C 16 25 15 28 15 32 L 15 38 C 15 42 18 44 23 45 L 28 46 C 33 47 36 49 36 53 L 36 60 C 36 64 34 67 30 67 L 15 67"
        stroke="#FFFFFF"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="64" cy="46" r="2" fill="#94A3B8" />
      <circle cx="62" cy="36" r="2" fill="#94A3B8" />
      <circle cx="58" cy="28" r="2" fill="#94A3B8" />
      <circle cx="52" cy="24" r="2" fill="#94A3B8" />
      <circle cx="62" cy="56" r="2" fill="#94A3B8" />
      <circle cx="58" cy="64" r="2" fill="#94A3B8" />
      <circle cx="52" cy="68" r="2" fill="#94A3B8" />
      <circle cx="74" cy="46" r="3" fill="#E2E8F0" />
      <circle cx="71" cy="33" r="3" fill="#E2E8F0" />
      <circle cx="65" cy="22" r="3" fill="#E2E8F0" />
      <circle cx="56" cy="15" r="3" fill="#E2E8F0" />
      <circle cx="71" cy="59" r="3" fill="#E2E8F0" />
      <circle cx="65" cy="70" r="3" fill="#E2E8F0" />
      <circle cx="56" cy="77" r="3" fill="#E2E8F0" />
      <circle cx="85" cy="46" r="4.5" fill="#F59E0B" />
      <circle cx="85" cy="46" r="2" fill="#FFFFFF" />
      <circle cx="81" cy="30" r="3.8" fill="#E11D48" />
      <circle cx="73" cy="17" r="3.8" fill="#E11D48" />
      <circle cx="62" cy="8" r="3.5" fill="#E11D48" />
      <circle cx="81" cy="62" r="3.8" fill="#E11D48" />
      <circle cx="73" cy="75" r="3.8" fill="#E11D48" />
      <circle cx="62" cy="84" r="3.5" fill="#E11D48" />
    </svg>
  );
}

/** Koncept 3: S-Matrix Data */
export function LogoMark3({ size = 40, className, ...props }: SvgProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <rect width="100" height="100" rx="22" fill="#0F172A" />
      <path
        d="M 32 24 C 32 20 28 18 24 18 C 18 18 16 22 16 27 C 16 38 34 38 34 50 C 34 58 28 62 22 62 C 16 62 14 58 14 54"
        stroke="#E2E8F0"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="32" cy="24" r="3" fill="#E11D48" />
      <circle cx="14" cy="54" r="3" fill="#E11D48" />
      <circle cx="61.2" cy="48.1" r="2" fill="#94A3B8" />
      <circle cx="62" cy="44" r="2" fill="#94A3B8" />
      <circle cx="61.2" cy="39.8" r="2" fill="#94A3B8" />
      <circle cx="64.1" cy="58.1" r="2.2" fill="#CBD5E1" />
      <circle cx="68.1" cy="52.4" r="2.2" fill="#CBD5E1" />
      <circle cx="70" cy="44" r="2.2" fill="#CBD5E1" />
      <circle cx="68.1" cy="35.5" r="2.2" fill="#CBD5E1" />
      <circle cx="64.1" cy="29.8" r="2.2" fill="#CBD5E1" />
      <circle cx="64" cy="68.2" r="2.5" fill="#E2E8F0" />
      <circle cx="71.4" cy="61.9" r="2.5" fill="#E2E8F0" />
      <circle cx="76.3" cy="53.5" r="2.5" fill="#E11D48" />
      <circle cx="78" cy="44" r="2.5" fill="#E11D48" />
      <circle cx="76.3" cy="34.4" r="2.5" fill="#E11D48" />
      <circle cx="71.4" cy="26" r="2.5" fill="#E2E8F0" />
      <circle cx="64" cy="19.7" r="2.5" fill="#E2E8F0" />
      <circle cx="59.3" cy="78.7" r="2.7" fill="#64748B" />
      <circle cx="70.6" cy="73.4" r="2.7" fill="#64748B" />
      <circle cx="79.4" cy="64.6" r="2.7" fill="#F43F5E" />
      <circle cx="84.7" cy="53.3" r="2.7" fill="#F43F5E" />
      <circle cx="84.7" cy="34.6" r="2.7" fill="#F43F5E" />
      <circle cx="79.4" cy="23.3" r="2.7" fill="#F43F5E" />
      <circle cx="70.6" cy="14.5" r="2.7" fill="#64748B" />
      <circle cx="59.3" cy="9.2" r="2.7" fill="#64748B" />
    </svg>
  );
}

/** Koncept 4: S-Embraced */
export function LogoMark4({ size = 40, className, ...props }: SvgProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <rect width="100" height="100" rx="22" fill="#0F172A" />
      <path
        d="M 52 22 C 40 16 22 18 20 30 C 18 42 46 40 44 60 C 42 76 24 76 18 70"
        stroke="#FFFFFF"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <circle cx="55" cy="48" r="4" fill="#E11D48" />
      <circle cx="67" cy="48" r="3" fill="#E2E8F0" />
      <circle cx="65" cy="38" r="3" fill="#E2E8F0" />
      <circle cx="59" cy="30" r="3" fill="#E2E8F0" />
      <circle cx="65" cy="58" r="3" fill="#E2E8F0" />
      <circle cx="59" cy="66" r="3" fill="#E2E8F0" />
      <circle cx="78" cy="48" r="3.5" fill="#E11D48" />
      <circle cx="75" cy="35" r="3.5" fill="#E11D48" />
      <circle cx="68" cy="24" r="3.5" fill="#F43F5E" />
      <circle cx="58" cy="18" r="3.5" fill="#94A3B8" />
      <circle cx="75" cy="61" r="3.5" fill="#E11D48" />
      <circle cx="68" cy="72" r="3.5" fill="#F43F5E" />
      <circle cx="58" cy="78" r="3.5" fill="#94A3B8" />
      <circle cx="88" cy="48" r="3" fill="#F59E0B" />
      <circle cx="85" cy="36" r="3" fill="#E2E8F0" />
      <circle cx="85" cy="60" r="3" fill="#E2E8F0" />
    </svg>
  );
}

/** Koncept 5: S-Spektrum Barw */
export function LogoMark5({ size = 40, className, ...props }: SvgProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <rect width="100" height="100" rx="22" fill="#0F172A" />
      <path
        d="M 34 26 C 34 20 28 18 23 18 C 16 18 14 22 14 28 C 14 40 34 38 34 52 C 34 62 26 66 18 66 C 14 66 12 62 12 58"
        stroke="#FFFFFF"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="60" cy="15" r="3" fill="#0284C7" />
      <circle cx="69" cy="22" r="3.5" fill="#0284C7" />
      <circle cx="78" cy="17" r="3.5" fill="#0284C7" />
      <circle cx="65" cy="32" r="3" fill="#F59E0B" />
      <circle cx="75" cy="32" r="3.5" fill="#F59E0B" />
      <circle cx="84" cy="30" r="3.5" fill="#F59E0B" />
      <circle cx="56" cy="46" r="3.5" fill="#E11D48" />
      <circle cx="68" cy="46" r="4" fill="#E11D48" />
      <circle cx="79" cy="46" r="4.5" fill="#E11D48" />
      <circle cx="89" cy="46" r="4" fill="#E11D48" />
      <circle cx="65" cy="60" r="3" fill="#9333EA" />
      <circle cx="75" cy="60" r="3.5" fill="#9333EA" />
      <circle cx="84" cy="62" r="3.5" fill="#9333EA" />
      <circle cx="60" cy="77" r="3" fill="#10B981" />
      <circle cx="69" cy="70" r="3.5" fill="#10B981" />
      <circle cx="78" cy="75" r="3.5" fill="#10B981" />
    </svg>
  );
}

/** Koncept 6: S-Puls Symulatora */
export function LogoMark6({ size = 40, className, ...props }: SvgProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <rect width="100" height="100" rx="22" fill="#0F172A" />
      <g transform="skewX(-10)">
        <path
          d="M 38 28 C 38 22 34 20 28 20 C 20 20 18 24 18 30 C 18 42 38 42 38 54 C 38 62 30 66 24 66 C 18 66 16 62 16 56"
          stroke="#FFFFFF"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <circle cx="38" cy="28" r="3" fill="#E11D48" />
      </g>
      <circle cx="58" cy="46" r="3" fill="#E11D48" />
      <circle cx="56" cy="34" r="2.5" fill="#E11D48" />
      <circle cx="56" cy="58" r="2.5" fill="#E11D48" />
      <circle cx="69" cy="46" r="3.5" fill="#F43F5E" />
      <circle cx="66" cy="30" r="3" fill="#F43F5E" />
      <circle cx="66" cy="62" r="3" fill="#F43F5E" />
      <circle cx="60" cy="20" r="2.5" fill="#E2E8F0" />
      <circle cx="60" cy="72" r="2.5" fill="#E2E8F0" />
      <circle cx="81" cy="46" r="4" fill="#E2E8F0" />
      <circle cx="78" cy="28" r="3.5" fill="#E2E8F0" />
      <circle cx="78" cy="64" r="3.5" fill="#E2E8F0" />
      <circle cx="71" cy="16" r="3" fill="#94A3B8" />
      <circle cx="71" cy="76" r="3" fill="#94A3B8" />
      <circle cx="91" cy="46" r="3" fill="#F59E0B" />
      <circle cx="88" cy="32" r="2.5" fill="#64748B" />
      <circle cx="88" cy="60" r="2.5" fill="#64748B" />
    </svg>
  );
}

export function LogoMark({
  concept = "concept-7",
  size = 40,
  className,
  ...props
}: SvgProps & { concept?: LogoConceptId }) {
  switch (concept) {
    case "concept-7":
      return <OfficialLogoMark size={size} className={className} {...props} />;
    case "concept-1":
      return <LogoMark1 size={size} className={className} {...props} />;
    case "concept-2":
      return <LogoMark2 size={size} className={className} {...props} />;
    case "concept-3":
      return <LogoMark3 size={size} className={className} {...props} />;
    case "concept-4":
      return <LogoMark4 size={size} className={className} {...props} />;
    case "concept-5":
      return <LogoMark5 size={size} className={className} {...props} />;
    case "concept-6":
      return <LogoMark6 size={size} className={className} {...props} />;
    default:
      return <OfficialLogoMark size={size} className={className} {...props} />;
  }
}

export interface LogoProps extends SvgProps {
  concept?: LogoConceptId;
  showWordmark?: boolean;
  wordmarkClassName?: string;
}

export function Logo({
  concept = "concept-7",
  size = 36,
  showWordmark = true,
  className,
  wordmarkClassName = "",
  ...props
}: LogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoMark concept={concept} size={size} {...props} />
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span className={`font-display font-bold tracking-tight text-ink ${wordmarkClassName}`}>
            Sejmowy Symulator<span className="text-primary">.</span>
          </span>
          <span className="font-mono text-[10px] text-muted-foreground tracking-wide">sejmsim.pl</span>
        </div>
      )}
    </div>
  );
}
