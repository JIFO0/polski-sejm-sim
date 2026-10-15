import assert from "node:assert/strict";
import { coalitionResult } from "./coalition-result";
const c = (id: string, members: string[]) => ({ id, name: id, color: "", members });
assert.equal(coalitionResult([c("below", ["a"])], { a: 230 }).winners.length, 0);
assert.equal(coalitionResult([c("majority", ["a", "b"])], { a: 200, b: 31 }).winners[0]?.seats, 231);
assert.deepEqual(coalitionResult([c("first", ["a"]), c("second", ["a", "b"])], { a: 231, b: 29 }).winners.map((x) => x.id), ["second", "first"]);
assert.equal(coalitionResult([], {}).winners.length, 0);
assert.equal(coalitionResult([c("duplicate", ["a", "a", "missing"])], { a: 130 }).winners.length, 0);
console.log("Coalition majority, no majority, multiple winners and unique seats passed");