import { test } from "node:test";
import assert from "node:assert/strict";
import { capMovement } from "../movement.js";

test("returns targetPos when within reach", () => {
  const result = capMovement([0, 0], [1, 0], 10, 1);
  assert.deepEqual(result, [1, 0]);
});

test("caps movement to maxSpeed * dt when target is far", () => {
  const result = capMovement([0, 0], [100, 0], 5, 1);
  assert.deepEqual(result, [5, 0]);
});

test("caps movement along the correct direction for diagonal targets", () => {
  const result = capMovement([0, 0], [3, 4], 2.5, 1);
  assert.ok(Math.abs(result[0] - 1.5) < 1e-9);
  assert.ok(Math.abs(result[1] - 2) < 1e-9);
});
