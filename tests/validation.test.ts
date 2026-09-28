import { test } from "node:test";
import assert from "node:assert/strict";
import {
  collegeEmail,
  actionInput,
  finderInput,
  itemInput,
  safeRedirectPath,
} from "../lib/validation.ts";
test("only exact rvu.edu.in email domain is accepted", () => {
  assert.equal(
    collegeEmail.parse(" Student@RVU.edu.in "),
    "student@rvu.edu.in",
  );
  for (const email of [
    "x@evilrvu.edu.in",
    "x@rvu.edu.in.evil.test",
    "x@sub.rvu.edu.in",
    "x@gmail.com",
  ])
    assert.equal(collegeEmail.safeParse(email).success, false);
});
test("actions cannot smuggle arbitrary roles or RPC names", () => {
  assert.equal(
    actionInput.safeParse({ action: "confirm_finder_return" }).success,
    false,
  );
  assert.equal(
    actionInput.safeParse({
      action: "reward",
      recoveryId: "11111111-1111-4111-8111-111111111111",
      skip: false,
      upi: "x@upi?am=999",
    }).success,
    false,
  );
});
test("blank item names and weak private links are rejected", () => {
  assert.equal(
    itemInput.safeParse({
      name: " ",
      category: "Audio",
      detail: "long enough detail",
    }).success,
    false,
  );
  assert.equal(
    finderInput.safeParse({
      reportId: "11111111-1111-4111-8111-111111111111",
      token: "guess",
      action: "status",
    }).success,
    false,
  );
});
test("redirect utility does not allow external destinations", () => {
  assert.equal(safeRedirectPath("//evil.test"), "/campus");
  assert.equal(safeRedirectPath("/\\evil.test"), "/campus");
  assert.equal(safeRedirectPath("/campus"), "/campus");
});
