// Dane korekty demograficznej podziału mandatów w okręgach wyborczych do Sejmu RP.
// Zgodnie z art. 202–203 Kodeksu wyborczego, Państwowa Komisja Wyborcza przedkłada
// Marszałkowi Sejmu wnioski w sprawie korekty liczby posłów wybieranych w poszczególnych
// okręgach wyborczych w oparciu o jednolitą normę przedstawicielską (ludność / 460).
//
// Ze względu na migrację wewnętrzną (odpływ ludności z mniejszych ośrodków i prowincji
// do wielkich aglomeracji i tzw. obwarzanków podmiejskich), okręgi metropolitalne
// są niedoreprezentowane, a wyludniające się – nadreprezentowane.

export type DemographicAdjustmentMode = "none" | "pkw" | "crw";

/**
 * Oficjalny wniosek Państwowej Komisji Wyborczej (przedkładany Sejmowi):
 * Przesunięcie 11 mandatów pomiędzy 21 okręgami (10 okręgów zyskuje, 11 traci).
 * Suma mandatów w Sejmie pozostaje niezmienna: dokładnie 460.
 */
export const PKW_2022_DELTA: Record<number, number> = {
  // Okręgi tracące po 1 mandacie (-11)
  1: -1, // Legnica: 12 -> 11
  2: -1, // Wałbrzych: 8 -> 7
  5: -1, // Toruń: 13 -> 12
  6: -1, // Lublin: 15 -> 14
  7: -1, // Chełm: 12 -> 11
  9: -1, // Łódź: 10 -> 9
  31: -1, // Katowice: 12 -> 11
  32: -1, // Sosnowiec: 9 -> 8
  33: -1, // Kielce: 16 -> 15
  34: -1, // Elbląg: 8 -> 7
  40: -1, // Koszalin: 8 -> 7

  // Okręgi zyskujące mandaty (+11)
  3: 1, // Wrocław: 14 -> 15 (+1)
  13: 1, // Kraków: 14 -> 15 (+1)
  19: 1, // Warszawa I (miasto): 20 -> 21 (+1)
  20: 2, // Warszawa II (obwarzanek podwarszawski): 12 -> 14 (+2)
  23: 1, // Rzeszów: 15 -> 16 (+1)
  25: 1, // Gdańsk: 12 -> 13 (+1)
  26: 1, // Gdynia / Słupsk: 14 -> 15 (+1)
  37: 1, // Konin: 9 -> 10 (+1)
  38: 1, // Piła: 9 -> 10 (+1)
  39: 1, // Poznań: 10 -> 11 (+1)
};

/**
 * Szacunek wg Centralnego Rejestru Wyborców (CRW / nowelizacja 2024–2026):
 * Uwzględnia dalszy dynamiczny napływ mieszkańców do aglomeracji wrocławskiej
 * i podwarszawskiej oraz ubytek w woj. opolskim i olsztyńskim (13 mandatów, 23 okręgi).
 * Suma mandatów w Sejmie: dokładnie 460.
 */
export const CRW_2026_DELTA: Record<number, number> = {
  ...PKW_2022_DELTA,
  3: 2, // Wrocław: 14 -> 16 (+2)
  20: 3, // Warszawa II: 12 -> 15 (+3)
  21: -1, // Opole: 12 -> 11 (-1)
  35: -1, // Olsztyn: 10 -> 9 (-1)
};

/** Środki geometryczne okręgów (współrzędne SVG viewBox 0 0 1100 1000) do etykiet i plakietek */
export const DISTRICT_CENTROIDS: Record<number, { x: number; y: number }> = {
  1: { x: 165, y: 612 },
  2: { x: 262, y: 720 },
  3: { x: 311, y: 616 },
  4: { x: 416, y: 301 },
  5: { x: 508, y: 327 },
  6: { x: 867, y: 588 },
  7: { x: 950, y: 592 },
  8: { x: 156, y: 440 },
  9: { x: 580, y: 530 },
  10: { x: 590, y: 569 },
  11: { x: 522, y: 538 },
  12: { x: 582, y: 832 },
  13: { x: 600, y: 783 },
  14: { x: 670, y: 895 },
  15: { x: 687, y: 805 },
  16: { x: 635, y: 385 },
  17: { x: 731, y: 567 },
  18: { x: 806, y: 392 },
  19: { x: 721, y: 432 }, // Warszawa miasto
  20: { x: 745, y: 472 }, // Warszawa II obwarzanek (przesunięty lekko poza centrum)
  21: { x: 388, y: 720 },
  22: { x: 871, y: 851 },
  23: { x: 820, y: 761 },
  24: { x: 886, y: 254 },
  25: { x: 498, y: 155 },
  26: { x: 395, y: 131 },
  27: { x: 514, y: 856 },
  28: { x: 530, y: 685 },
  29: { x: 475, y: 740 },
  30: { x: 448, y: 800 },
  31: { x: 520, y: 775 },
  32: { x: 562, y: 745 },
  33: { x: 698, y: 688 },
  34: { x: 626, y: 192 },
  35: { x: 750, y: 188 },
  36: { x: 338, y: 541 },
  37: { x: 406, y: 440 },
  38: { x: 278, y: 353 },
  39: { x: 303, y: 417 },
  40: { x: 226, y: 194 },
  41: { x: 112, y: 249 },
};

/** Wyjaśnienia demograficzne dla okręgów o zmienionej liczbie mandatów */
export const DISTRICT_DEMOGRAPHIC_NOTES: Record<number, string> = {
  1: "Depopulacja subregionu miedziowego i ujemne saldo migracji.",
  2: "Znaczący spadek liczby mieszkańców dawnego okręgu sudeckiego.",
  3: "Szybki rozwój aglomeracji wrocławskiej i napływ nowych mieszkańców.",
  5: "Spadek liczby mieszkańców w subregionie toruńsko-włocławskim.",
  6: "Odpływ ludności z obszarów pozametropolitalnych Lubelszczyzny.",
  7: "Głęboki ubytek demograficzny we wschodniej części województwa.",
  9: "Długofalowa depopulacja Łodzi w stosunku do wskaźników ogólnokrajowych.",
  13: "Wzrost ludności Krakowa i przyległych gmin podmiejskich.",
  19: "Warszawa jest największym beneficjentem migracji wewnętrznej i zagranicznej.",
  20: "Tzw. obwarzanek warszawski – najszybciej zaludniający się obszar w Polsce.",
  21: "Trwały ubytek demograficzny i emigracja zarobkowa na Opolszczyźnie.",
  23: "Dynamiczny rozwój strefy metropolitalnej Rzeszowa i Podkarpacia.",
  25: "Napływ mieszkańców do aglomeracji Trójmiasta (Gdańsk i okolice).",
  26: "Rozwój pasa nadmorskiego Trójmiasta i powiatów wejherowskiego/kartuskiego.",
  31: "Zmiany strukturalne ludności w centralnej części konurbacji śląskiej.",
  32: "Spadek liczby mieszkańców w Zagłębiu Dąbrowskim.",
  33: "Ujemny przyrost naturalny i odpływ młodych z woj. świętokrzyskiego.",
  34: "Wyludnianie się subregionu elbląskiego i południowej Warmii.",
  35: "Depopulacja północno-wschodnich powiatów woj. warmińsko-mazurskiego.",
  37: "Relatywny wzrost udziału wyborców we wschodniej Wielkopolsce.",
  38: "Korekta reprezentacji w subregionie pilskim.",
  39: "Dynamiczny wzrost aglomeracji poznańskiej.",
  40: "Spadek liczby ludności na Pomorzu Środkowym (subregion koszaliński).",
};

export function getDistrictDelta(
  districtId: number,
  mode: DemographicAdjustmentMode | boolean = "none",
): number {
  if (!mode || mode === "none") return 0;
  if (mode === "crw") return CRW_2026_DELTA[districtId] ?? 0;
  return PKW_2022_DELTA[districtId] ?? 0;
}

export function getAdjustedSeats(
  districtId: number,
  baseSeats: number,
  mode: DemographicAdjustmentMode | boolean = "none",
): number {
  const delta = getDistrictDelta(districtId, mode);
  return Math.max(1, baseSeats + delta);
}
