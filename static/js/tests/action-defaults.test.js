import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SPEED, DEFAULT_PASS_DURATION, computeDuration } from "../action-defaults.js";

test("computeDuration for a movement action is distance / DEFAULT_SPEED", () => {
  const duration = computeDuration("cut", [0, 0], [20, 0]);
  assert.ok(Math.abs(duration - 20 / DEFAULT_SPEED) < 1e-9);
});

test("computeDuration for relocate with zero distance is zero", () => {
  assert.equal(computeDuration("relocate", [5, 5], [5, 5]), 0);
});

test("computeDuration for pass/handoff is always the flat default, ignoring positions", () => {
  assert.equal(computeDuration("pass", [0, 0], [100, 100]), DEFAULT_PASS_DURATION);
  assert.equal(computeDuration("handoff", [3, 3], [3, 3]), DEFAULT_PASS_DURATION);
});

test("computeDuration works for screen and dribble the same way as cut", () => {
  const expected = Math.hypot(3, 4) / DEFAULT_SPEED;
  assert.ok(Math.abs(computeDuration("screen", [0, 0], [3, 4]) - expected) < 1e-9);
  assert.ok(Math.abs(computeDuration("dribble", [0, 0], [3, 4]) - expected) < 1e-9);
});
