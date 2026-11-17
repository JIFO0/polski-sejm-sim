import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { defaultScenario, simulate } from "@/lib/simulation";
import { DISTRICTS } from "@/data/districts";
import { PARTY_MAP } from "@/data/parties";
import { MapLibrePolandMap } from "@/components/MapLibrePolandMap";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/mapa-test")({
  component: MapaTestPage,
});

function MapaTestPage() {
  const [selected, setSelected] = useState<number | null>(null);
  const result = useMemo(() => simulate(defaultScenario()), []);
  const selectedDistrict = useMemo(
    () => (selected != null ? result.districts.find((d) => d.id === selected) : null),
    [result, selected],
  );
  const selectedMeta = useMemo(
    () => (selected != null ? DISTRICTS.find((d) => d.id === selected) : null),
    [selected],
  );

  const sortedParties = useMemo(() => {
    if (!selectedDistrict) return [];
    return Object.entries(selectedDistrict.shares)
      .filter(([, share]) => share > 0.5)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [selectedDistrict]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#060911] dark:text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Wersja testowa (ukryta) • MapLibre GL (WebGL)
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              Test płynnego przybliżania mapy okręgów (efekt CNN)
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Przybliżaj kółkiem myszy, gestem szczypania lub kliknij dowolny okręg, aby płynnie do niego przelecieć.
            </p>
          </div>
          <ThemeToggle />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <MapLibrePolandMap
            result={result}
            selected={selected}
            onSelect={setSelected}
          />

          <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            {selectedDistrict && selectedMeta ? (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Okręg nr {selectedMeta.id}
                </div>
                <h2 className="mt-0.5 text-xl font-bold">{selectedMeta.name}</h2>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Mandaty do Sejmu: <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedDistrict.seats}</span>
                </div>

                <div className="mt-4 space-y-2.5">
                  {sortedParties.map(([partyId, share]) => {
                    const party = PARTY_MAP[partyId];
                    const seats = selectedDistrict.seatsByParty[partyId] ?? 0;
                    return (
                      <div key={partyId} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 font-medium">
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: party?.color ?? "#64748B" }}
                            />
                            {party?.short ?? partyId}
                          </span>
                          <span className="tabular-nums text-slate-600 dark:text-slate-300">
                            {share.toFixed(1)}% {seats > 0 ? `(${seats} m.)` : ""}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, share * 2)}%`,
                              backgroundColor: party?.color ?? "#64748B",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col justify-center py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                <p className="font-medium text-slate-700 dark:text-slate-300">
                  Wybierz okręg na mapie
                </p>
                <p className="mt-1 text-xs">
                  Kliknięcie okręgu płynnie przybliży kamerę i wyświetli podgląd wyników.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
