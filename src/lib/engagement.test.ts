import assert from "node:assert/strict";
import { FEEDBACK_INVITATION_DELAY, invitationDue } from "./engagement";
assert.equal(FEEDBACK_INVITATION_DELAY, 240000);
assert.equal(invitationDue(1000, 240999, false), false);
assert.equal(invitationDue(1000, 241000, false), true);
assert.equal(invitationDue(1000, 999999, true), false);
console.log("Feedback invitation timing and one-time rule passed");