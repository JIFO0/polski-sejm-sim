import assert from "node:assert/strict";

import {
  POLLS,
  computePollAverage,
  parsePollDataset,
  pollSchema,
  proportionMargin,
  scaleDistrictsToNational,
  type Poll,
  type SilencePeriod,
} from "./poll-average.ts";

const now = new Date("2026-10-15T12:00:00.000Z");

function poll(partial: Partial<Poll> & Pick<Poll, "id" | "publishedAt" | "results">): Poll {
  return {
    institute: "Ośrodek testowy",
    commissioner: null,
    fieldworkFrom: null,
    fieldworkTo: null,
    sampleSize: 1000,
    method: "CATI",
    sourceUrl: "https://example.com/zrodlo",
    ...partial,
  };
}

const older = poll({
  id: "older",
  publishedAt: "2026-10-01",
  sampleSize: 1000,
  results: { ko: 40, pis: 20 },
});
const newer = poll({
  id: "newer",
  publishedAt: "2026-10-15",
  sampleSize: 1000,
  results: { ko: 20, pis: 30 },
});

const average = computePollAverage(now, [older, newer], []);
assert.ok(average);
assert.equal(average.polls.length, 2);
assert.equal(average.results["ko"], 26.7);
assert.equal(average.results["pis"], 26.7);

const missingParty = computePollAverage(
  now,
  [
    poll({ id: "a", publishedAt: "2026-10-15", sampleSize: 1000, results: { ko: 40 } }),
    poll({ id: "b", publishedAt: "2026-10-15", sampleSize: 1000, results: { pis: 30 } }),
  ],
  [],
);
assert.equal(missingParty?.results["ko"], 40);
assert.equal(missingParty?.results["pis"], 30);

const incomplete = poll({
  id: "brak",
  publishedAt: null,
  results: { ko: 99 },
  institute: null,
  sampleSize: null,
  method: null,
  sourceUrl: null,
});
assert.equal(computePollAverage(now, [incomplete], []), null);

const silence: SilencePeriod[] = [
  { label: "Wybory testowe", from: "2026-10-14T22:00:00.000Z", until: "2026-10-16T19:00:00.000Z" },
];
const during = computePollAverage(
  now,
  [older, poll({ id: "w-ciszy", publishedAt: "2026-10-15", results: { ko: 1 } })],
  silence,
);
assert.ok(during);
assert.deepEqual(
  during.polls.map((item) => item.id),
  ["older"],
);
assert.equal(during.silence?.label, "Wybory testowe");

const scaled = scaleDistrictsToNational(null);
assert.equal(scaled[19]?.["ko"], 44);

assert.equal(proportionMargin(50, 1000), 3.1);
assert.equal(proportionMargin(50, null), null);

const dataset = parsePollDataset(POLLS);
assert.equal(dataset.length, POLLS.length);
assert.ok(dataset.length >= 13);

const pollsterLatest = dataset.find((item) => item.id === "pollster-se-2026-10-26");
assert.equal(pollsterLatest?.results?.["ko"], 33.44);
assert.equal(pollsterLatest?.results?.["pis"], 22.35);
assert.equal(pollsterLatest?.results?.["konf"], 12.24);
assert.equal(pollsterLatest?.results?.["kkp"], 7.84);
assert.equal(pollsterLatest?.results?.["nl"], 7.1);
assert.equal(pollsterLatest?.results?.["rp"], 5.19);
assert.equal(pollsterLatest?.results?.["razem"], 4.27);
assert.equal(pollsterLatest?.results?.["psl"], 3.49);
assert.equal(pollsterLatest?.results?.["pl2050"], 2.65);
assert.equal(pollsterLatest?.results?.["inne"], 0.88);
assert.equal(pollsterLatest?.institute, "Instytut Badań Pollster dla Super Expressu");
assert.equal(pollsterLatest?.commissioner, "Super Express");
assert.equal(pollsterLatest?.method, "CAWI");
assert.equal(pollsterLatest?.sampleSize, 1029);
assert.equal(
  pollsterLatest?.sourceUrl,
  "https://polityka.se.pl/wiadomosci/po-tym-sondazu-prawica-moze-przymierzac-sie-rzadzenia-aa-C8zz-7bZR-mcT1.html",
);

const ogb = dataset.find((item) => item.id === "ogb-stan360-2026-10-01");
assert.equal(ogb?.results?.["ko"], 35.91);
assert.equal(ogb?.results?.["pis"], 25.03);
assert.equal(ogb?.results?.["konf"], 11.8);
assert.equal(ogb?.results?.["kkp"], 11.31);
assert.equal(ogb?.results?.["nl"], 6.12);
assert.equal(ogb?.results?.["rp"], 3.63);
assert.equal(ogb?.results?.["razem"], 2.75);
assert.equal(ogb?.results?.["psl"], 2.16);
assert.equal(ogb?.results?.["pl2050"], 1.29);
assert.equal(ogb?.institute, "OGB dla Stan360");
assert.equal(ogb?.commissioner, "Stan360");
assert.equal(ogb?.sampleSize, 2000);
assert.equal(ogb?.publishedAt, "2026-10-15");
assert.equal(ogb?.sourceUrl, "https://stan360.pl/");

const pollsterPolls = dataset.filter((item) => (item.institute ?? "").includes("Pollster"));
assert.ok(pollsterPolls.length >= 4);
for (const p of pollsterPolls) {
  assert.ok(
    p.institute?.startsWith("Instytut Badań Pollster dla "),
    `Nazwa Pollstera bez zamawiającego: ${p.institute}`,
  );
  assert.ok(
    p.sourceUrl?.includes("se.pl") || p.sourceUrl?.includes("zero.pl"),
    `Link Pollstera nie prowadzi do zamawiającego: ${p.sourceUrl}`,
  );
  assert.ok(
    !p.sourceUrl?.includes("wp.pl"),
    `Link Pollstera prowadzi do agregatora wp.pl: ${p.sourceUrl}`,
  );
  assert.ok(
    !p.sourceUrl?.includes("rp.pl"),
    `Link Pollstera prowadzi do agregatora rp.pl: ${p.sourceUrl}`,
  );
}

const withClient = pollSchema.parse({
  ...dataset[0],
  client: "Zamawiający Testowy",
  commissioner: null,
});
assert.equal(withClient.client, "Zamawiający Testowy");
const parsedWithClient = parsePollDataset([
  {
    ...dataset[0],
    id: "test-client",
    client: "Zamawiający Testowy",
    commissioner: null,
  },
]);
assert.equal(parsedWithClient[0]?.commissioner, "Zamawiający Testowy");

const latest = dataset.find((item) => item.id === "pollster-2026-10-19");
assert.equal(latest?.results?.["ko"], 33.54);
assert.equal(latest?.sampleSize, 1014);
assert.equal(latest?.method, null);
const opinia = dataset.find((item) => item.id === "opinia24-2026-10-05");
assert.equal(opinia?.method, "mix");
assert.equal(opinia?.methodDetail?.includes("CATI"), true);
const cbos = dataset.find((item) => item.id === "cbos-2026-10-05");
assert.equal(cbos?.results?.["ko"], 28.6);
assert.equal(cbos?.institute, "Centrum Badania Opinii Społecznej (CBOS)");
assert.equal(cbos?.publicationTitle?.includes("CBOS Flash nr 35/2026"), true);
assert.equal(cbos?.methodDetail?.includes("CATI"), true);
assert.equal(cbos?.sampleSize, 1000);
assert.equal(
  cbos?.sourceUrl,
  "https://www.cbos.pl/PL/publikacje/flashe/pliki/2026/fl_035_2026.pdf",
);
const cbosSeptember = dataset.find((item) => item.id === "cbos-2026-09-07");
assert.equal(cbosSeptember?.publicationTitle?.includes("CBOS Flash nr 33/2026"), true);
assert.equal(cbosSeptember?.sampleSize, 1001);
assert.equal(cbosSeptember?.fieldworkFrom, "2026-09-07");
assert.equal(cbosSeptember?.fieldworkTo, "2026-09-09");
assert.equal(opinia?.publicationTitle?.includes("Opinia24"), true);
assert.equal(opinia?.institute, "Opinia24");
assert.throws(() => parsePollDataset([dataset[0], { ...dataset[0], id: dataset[0]?.id }]));
assert.throws(() =>
  parsePollDataset([
    {
      ...dataset[0],
      id: "zly-klucz",
      results: { nieznana: 1 },
    },
  ]),
);

console.log("poll-average.test.ts ok");
