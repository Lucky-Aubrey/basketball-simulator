import { test } from "node:test";
import assert from "node:assert/strict";
import { screenerRadiusMultiplier } from "../screen-visual.js";

const screenerWithFollowUp = {
  id: "O3",
  start_pos: [0, 0],
  actions: [
    { type: "screen", start_t: 1.0, duration: 1.0, target_pos: [5, 5], facing_pos: [5, 10] },
    { type: "relocate", start_t: 4.0, duration: 1.0, target_pos: [10, 10] },
  ],
};

const screenerWithNoFollowUp = {
  id: "O4",
  start_pos: [0, 0],
  actions: [{ type: "screen", start_t: 1.0, duration: 1.0, target_pos: [5, 5], facing_pos: [5, 10] }],
};

test("normal size while still moving toward the screen", () => {
  assert.equal(screenerRadiusMultiplier(screenerWithFollowUp, 1.5), 1);
});

test("enlarged once arrived, until the next action starts", () => {
  assert.equal(screenerRadiusMultiplier(screenerWithFollowUp, 2.0), 1.5);
  assert.equal(screenerRadiusMultiplier(screenerWithFollowUp, 3.9), 1.5);
});

test("back to normal once the next action begins", () => {
  assert.equal(screenerRadiusMultiplier(screenerWithFollowUp, 4.0), 1);
  assert.equal(screenerRadiusMultiplier(screenerWithFollowUp, 5.0), 1);
});

test("stays enlarged indefinitely if there is no follow-up action", () => {
  assert.equal(screenerRadiusMultiplier(screenerWithNoFollowUp, 2.0), 1.5);
  assert.equal(screenerRadiusMultiplier(screenerWithNoFollowUp, 1000), 1.5);
});

test("normal size for a player with no screen action at all", () => {
  const player = { id: "O1", start_pos: [0, 0], actions: [] };
  assert.equal(screenerRadiusMultiplier(player, 5), 1);
});
