import type { SVGProps } from "react";

type SvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
  className?: string;
  concept?: string;
};

/**
 * Oficjalne logo platformy SejmSim (sejmsim.pl)
 * Tarcza miernika oraz sala plenarna Sejmu.
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
        {/* Cięcie lewej półkuli przy x <= 98.5 */}
        <clipPath id="left-hemisphere-clip">
          <rect x="0" y="0" width="98.5" height="200" />
        </clipPath>
      </defs>

      {/* Lewa Półkula: Białe Półkole Miernika (Tarcza Sejmometru, R=77.2, cx=100, cy=100) */}
      <g clipPath="url(#left-hemisphere-clip)">
        <circle cx="100" cy="100" r="77.2" fill="#FFFFFF" />
        {/* Granatowa skala obwodowa na tarczy */}
        <circle cx="100" cy="100" r="71" stroke="#0F172A" strokeWidth="2.5" fill="none" />
        {/* Granatowe indeksy podziałki */}
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
        <circle cx="100" cy="100" r="12" fill="#0F172A" />
      </g>

      {/* Czerwona Wskazówka Miernika */}
      <polygon points="42.84,133.00 98.40,97.23 101.60,102.77" fill="#E11D48" />
      <circle cx="100" cy="100" r="5.5" fill="#E11D48" />
      <circle cx="100" cy="100" r="2.2" fill="#FFFFFF" />

      {/* Prawa Półkula: 4 Koncentryczne Ławy Sejmowe (#E11D48) */}
      <g id="sejm-benches" stroke="#E11D48" strokeWidth="6.4" strokeLinecap="butt">
        {/* Sektor 1 */}
        <path d="M 102.23 68.08 A 32 32 0 0 1 125.22 80.30" />
        <path d="M 103.21 54.11 A 46 46 0 0 1 136.25 71.68" />
        <path d="M 104.19 40.15 A 60 60 0 0 1 147.28 63.06" />
        <path d="M 105.16 26.18 A 74 74 0 0 1 158.31 54.44" />

        {/* Sektor 2 */}
        <path d="M 127.71 84.00 A 32 32 0 0 1 127.71 116.00" />
        <path d="M 139.84 77.00 A 46 46 0 0 1 139.84 123.00" />
        <path d="M 151.96 70.00 A 60 60 0 0 1 151.96 130.00" />
        <path d="M 164.09 63.00 A 74 74 0 0 1 164.09 137.00" />

        {/* Sektor 3 */}
        <path d="M 125.22 119.70 A 32 32 0 0 1 102.23 131.92" />
        <path d="M 136.25 128.32 A 46 46 0 0 1 103.21 145.89" />
        <path d="M 147.28 136.94 A 60 60 0 0 1 104.19 159.85" />
        <path d="M 158.31 145.56 A 74 74 0 0 1 105.16 173.82" />
      </g>
    </svg>
  );
}

export function LogoMark(props: SvgProps) {
  return <OfficialLogoMark {...props} />;
}
