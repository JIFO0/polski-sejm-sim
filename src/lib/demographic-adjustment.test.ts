import assert from "node:assert/strict";
import { DISTRICTS, TOTAL_SEATS } from "../data/districts";
import {
  PKW_2022_DELTA,
  CRW_2026_DELTA,
  getAdjustedSeats,
  getDistrictDelta,
} from "../data/demographicAdjustment";

// 1. Verify statutory total seats is 460
assert.equal(TOTAL_SEATS, 460);

// 2. Verify PKW 2022 proposal seat deltas sum to 0
const pkwDeltaSum = Object.values(PKW_2022_DELTA).reduce((acc, v) => acc + v, 0);
assert.equal(pkwDeltaSum, 0, "PKW 2022 delta sum must be exactly 0");

// 3. Verify CRW 2026 proposal seat deltas sum to 0
const crwDeltaSum = Object.values(CRW_2026_DELTA).reduce((acc, v) => acc + v, 0);
assert.equal(crwDeltaSum, 0, "CRW 2026 delta sum must be exactly 0");

// 4. Verify total seats for all 41 districts in PKW mode is 460
const pkwTotalSeats = DISTRICTS.reduce(
  (acc, d) => acc + getAdjustedSeats(d.id, d.seats, "pkw"),
  0,
);
assert.equal(pkwTotalSeats, 460, "Total seats under PKW adjustment must be 460");

// 5. Verify total seats for all 41 districts in CRW mode is 460
const crwTotalSeats = DISTRICTS.reduce(
  (acc, d) => acc + getAdjustedSeats(d.id, d.seats, "crw"),
  0,
);
assert.equal(crwTotalSeats, 460, "Total seats under CRW adjustment must be 460");

// 6. Verify key specific districts
// Warsaw II (obwarzanek) gains 2 seats under PKW, 3 under CRW
assert.equal(getDistrictDelta(20, "pkw"), 2);
assert.equal(getAdjustedSeats(20, 12, "pkw"), 14);
assert.equal(getDistrictDelta(20, "crw"), 3);
assert.equal(getAdjustedSeats(20, 12, "crw"), 15);

// Warsaw city gains 1 seat
assert.equal(getDistrictDelta(19, "pkw"), 1);
assert.equal(getAdjustedSeats(19, 20, "pkw"), 21);

// Wrocław gains 1 seat under PKW, 2 under CRW
assert.equal(getDistrictDelta(3, "pkw"), 1);
assert.equal(getAdjustedSeats(3, 14, "pkw"), 15);
assert.equal(getDistrictDelta(3, "crw"), 2);
assert.equal(getAdjustedSeats(3, 14, "crw"), 16);

// Wałbrzych loses 1 seat
assert.equal(getDistrictDelta(2, "pkw"), -1);
assert.equal(getAdjustedSeats(2, 8, "pkw"), 7);

// Koszalin loses 1 seat
assert.equal(getDistrictDelta(40, "pkw"), -1);
assert.equal(getAdjustedSeats(40, 8, "pkw"), 7);

// Neutral district (Bydgoszcz) has 0 delta
assert.equal(getDistrictDelta(4, "pkw"), 0);
assert.equal(getAdjustedSeats(4, 12, "pkw"), 12);

// 7. Verify simulation integration
import { defaultScenario, simulate } from "./simulation";
const scenarioStandard = defaultScenario();
const resStandard = simulate(scenarioStandard);
assert.equal(resStandard.demographicAdjustmentActive, false);
const totalSeatsStandard = Object.values(resStandard.seatsByParty).reduce((a, b) => a + b, 0);
assert.equal(totalSeatsStandard, 460);

const scenarioAdjusted = { ...defaultScenario(), demographicAdjustment: "pkw" as const };
const resAdjusted = simulate(scenarioAdjusted);
assert.equal(resAdjusted.demographicAdjustmentActive, true);
assert.equal(resAdjusted.demographicAdjustmentMode, "pkw");
const totalSeatsAdjusted = Object.values(resAdjusted.seatsByParty).reduce((a, b) => a + b, 0);
assert.equal(totalSeatsAdjusted, 460);

// Verify partySeatDeltas exists and sums to 0
assert.ok(resAdjusted.partySeatDeltas);
const sumDeltas = Object.values(resAdjusted.partySeatDeltas).reduce((a, b) => a + b, 0);
assert.equal(sumDeltas, 0, "Party seat deltas must sum to 0");

console.log("Party seat deltas under default scenario PKW adjustment:", resAdjusted.partySeatDeltas);
console.log("Demographic adjustment test passed successfully!");
