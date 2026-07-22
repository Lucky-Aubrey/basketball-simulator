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

test("simulateFrame includes man-to-man defenseTargets when mode is man", () => {
  const manPlay = {
    offense: [{ id: "O1", start_pos: [0, 10], actions: [] }],
    ball: { start_holder: "O1", events: [] },
    defense: {
      mode: "man",
      man: { assignments: { O1: "D1" }, help_scheme: "uniform", params: { lag: 0, help_weight: 0, rim_bias: 0 } },
      zone: null,
    },
  };
  const frame = simulateFrame(manPlay, 0);
  assert.deepEqual(frame.defenseTargets.D1, [0, 10]);
});

test("simulateFrame includes zone defenseTargets when mode is zone", () => {
  const zonePlay = {
    offense: [{ id: "O1", start_pos: [0, 20], actions: [] }],
    ball: { start_holder: "O1", events: [] },
    defense: {
      mode: "zone",
      man: null,
      zone: {
        type: "2-3",
        home_points: { D1: [-10, 18], D2: [10, 18], D3: [-15, 4], D4: [0, 3], D5: [15, 4] },
        params: { ball_shade_weight: 0, gap_shade_weight: 0, max_shade: 100 },
      },
    },
  };
  const frame = simulateFrame(zonePlay, 0);
  assert.deepEqual(frame.defenseTargets.D1, [-10, 18]);
});
