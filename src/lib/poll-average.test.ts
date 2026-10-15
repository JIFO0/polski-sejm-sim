import assert from "node:assert/strict";

import {
  computePollAverage,
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

console.log("poll-average.test.ts ok");
