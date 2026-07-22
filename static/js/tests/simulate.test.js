import { test } from "node:test";
import assert from "node:assert/strict";
import { simulateFrame } from "../simulate.js";

const play = {
  offense: [
    { id: "O1", start_pos: [0, 0], actions: [] },
    { id: "O2", start_pos: [10, 10], actions: [] },
  ],
  ball: { start_holder: "O1", events: [] },
  defense: { mode: "man", man: { assignments: {}, help_scheme: "uniform", params: { lag: 0, help_weight: 0, rim_bias: 0 } }, zone: null },
};

test("simulateFrame returns each offensive player's position and ball state", () => {
  const frame = simulateFrame(play, 0);
  assert.deepEqual(frame.offense.O1, [0, 0]);
  assert.deepEqual(frame.offense.O2, [10, 10]);
  assert.equal(frame.ball.holder, "O1");
  assert.deepEqual(frame.ball.pos, [0, 0]);
});
