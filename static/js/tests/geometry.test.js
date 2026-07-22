import { test } from "node:test";
import assert from "node:assert/strict";
import {
  courtToPixel,
  pixelToCourt,
  distance,
  lerp,
  lerpPoint,
  clampPointToCourt,
} from "../geometry.js";

test("courtToPixel maps court origin and bounds to canvas pixels", () => {
  assert.deepEqual(courtToPixel(0, 0, 500, 470), [250, 470]);
  assert.deepEqual(courtToPixel(-25, 47, 500, 470), [0, 0]);
});

test("pixelToCourt inverts courtToPixel", () => {
  const [px, py] = courtToPixel(10, 20, 500, 470);
  const [x, y] = pixelToCourt(px, py, 500, 470);
  assert.ok(Math.abs(x - 10) < 1e-9);
  assert.ok(Math.abs(y - 20) < 1e-9);
});

test("distance computes euclidean distance", () => {
  assert.equal(distance([0, 0], [3, 4]), 5);
});

test("lerp and lerpPoint interpolate linearly", () => {
  assert.equal(lerp(0, 10, 0.5), 5);
  assert.deepEqual(lerpPoint([0, 0], [10, 20], 0.5), [5, 10]);
});

test("clampPointToCourt clamps out-of-bounds points to court edges", () => {
  assert.deepEqual(clampPointToCourt([-30, 50]), [-25, 47]);
  assert.deepEqual(clampPointToCourt([10, 20]), [10, 20]);
});
