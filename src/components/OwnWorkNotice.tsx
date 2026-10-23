import { useTranslation } from "@/lib/i18n";

const NOTICE =
  "Średnia i symulacja mandatów to opracowanie własne sejmsim.pl na podstawie opublikowanych sondaży, m.in. Centrum Badania Opinii Społecznej (CBOS). Nie są to oficjalne wyniki CBOS ani żadnego innego ośrodka.";

export function OwnWorkNotice({ className = "" }: { className?: string }) {
  const tr = useTranslation();
  return (
    <p
      className={`border-l-4 border-primary bg-primary/10 px-4 py-3 text-sm leading-relaxed text-ink ${className}`}
      role="note"
    >
      {tr(NOTICE)}
    </p>
  );
}
