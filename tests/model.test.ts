import test from "node:test";
import assert from "node:assert/strict";
import {
  confirmReturn,
  canOfferReward,
  routeCandidates,
  seed,
} from "../lib/model.ts";
test("both parties must confirm before return and reward", () => {
  const c = { ...seed.cases[0], status: "HANDOVER" as const };
  const owner = confirmReturn(c, "owner");
  assert.equal(owner.status, "HANDOVER");
  assert.equal(canOfferReward(owner), false);
  const both = confirmReturn(owner, "finder");
  assert.equal(both.status, "RETURNED");
  assert.equal(canOfferReward(both), true);
});
test("an unverified case cannot be returned by confirming", () => {
  assert.equal(confirmReturn(seed.cases[0], "owner").ownerConfirmed, false);
  assert.equal(canOfferReward(seed.cases[0]), false);
});
test("ambiguous scores include exact threshold and route to review", () => {
  assert.equal(routeCandidates([85, 85]), "AMBIGUOUS");
  assert.equal(routeCandidates([92, 70]), "POTENTIAL_MATCH");
  assert.equal(routeCandidates([84, 75]), "UNCLAIMED");
});
