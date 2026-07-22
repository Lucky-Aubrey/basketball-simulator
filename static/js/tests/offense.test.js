import { test } from "node:test";
import assert from "node:assert/strict";
import { playerPositionAt } from "../offense.js";

const player = {
  id: "O1",
  start_pos: [0, 0],
  actions: [
    { type: "cut", start_t: 2.0, duration: 2.0, target_pos: [10, 0] },
    { type: "relocate", start_t: 6.0, duration: 1.0, target_pos: [10, 10] },
  ],
};

test("before the first action, position is start_pos", () => {
  assert.deepEqual(playerPositionAt(player, 0), [0, 0]);
  assert.deepEqual(playerPositionAt(player, 2.0), [0, 0]);
});

test("mid-action, position is linearly interpolated", () => {
  assert.deepEqual(playerPositionAt(player, 3.0), [5, 0]);
});

test("between actions, position holds at the last action's target", () => {
  assert.deepEqual(playerPositionAt(player, 5.0), [10, 0]);
});

test("during the second action, interpolates from its own start", () => {
  assert.deepEqual(playerPositionAt(player, 6.5), [10, 5]);
});

test("after the last action, position holds at its target", () => {
  assert.deepEqual(playerPositionAt(player, 100), [10, 10]);
});

const passingPlayer = {
  id: "O2",
  start_pos: [5, 5],
  actions: [
    { type: "pass", start_t: 1.0, duration: 0.3, target_player: "O3" },
    { type: "cut", start_t: 2.0, duration: 2.0, target_pos: [15, 5] },
  ],
};

test("a pass/handoff action (no target_pos) does not move the player", () => {
  assert.deepEqual(playerPositionAt(passingPlayer, 0), [5, 5]);
  assert.deepEqual(playerPositionAt(passingPlayer, 1.0), [5, 5]);
  assert.deepEqual(playerPositionAt(passingPlayer, 1.15), [5, 5]);
  assert.deepEqual(playerPositionAt(passingPlayer, 1.3), [5, 5]);
});

test("an action after a pass/handoff continues from the pre-pass position", () => {
  assert.deepEqual(playerPositionAt(passingPlayer, 2.0), [5, 5]);
  assert.deepEqual(playerPositionAt(passingPlayer, 3.0), [10, 5]);
  assert.deepEqual(playerPositionAt(passingPlayer, 4.0), [15, 5]);
});
