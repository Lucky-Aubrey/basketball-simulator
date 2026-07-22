import { test } from "node:test";
import assert from "node:assert/strict";
import { manDefenderTargets } from "../defense/man.js";

function makePlay({ helpScheme, o2Pos, o3Pos }) {
  return {
    offense: [
      { id: "O1", start_pos: [0, 10], actions: [] },
      { id: "O2", start_pos: o2Pos, actions: [] },
      { id: "O3", start_pos: o3Pos, actions: [] },
    ],
    ball: { start_holder: "O1", events: [] },
    defense: {
      mode: "man",
      man: {
        assignments: { O1: "D1", O2: "D2", O3: "D3" },
        help_scheme: helpScheme,
        params: { lag: 0, help_weight: 0.5, rim_bias: 0 },
      },
      zone: null,
    },
  };
}

test("ball handler's defender tracks with zero help weight", () => {
  const play = makePlay({ helpScheme: "uniform", o2Pos: [10, 10], o3Pos: [15, 10] });
  const targets = manDefenderTargets(play, 0);
  assert.deepEqual(targets.D1, [0, 10]);
});

test("uniform scheme applies the same help_weight to every non-ball defender", () => {
  const play = makePlay({ helpScheme: "uniform", o2Pos: [10, 10], o3Pos: [20, 10] });
  const targets = manDefenderTargets(play, 0);
  // D2 track=[10,10], ball=[0,10]: target = [10,10] + 0.5*([0,10]-[10,10]) = [5,10]
  assert.deepEqual(targets.D2, [5, 10]);
  // D3 track=[20,10], ball=[0,10]: target = [20,10] + 0.5*([0,10]-[20,10]) = [10,10]
  assert.deepEqual(targets.D3, [10, 10]);
});

test("tiered scheme gives the nearest (1-pass-away) defender a reduced help_weight", () => {
  // O2 is closer to the ball handler O1 than O3 is -> O2 is "1 pass away", O3 is "2 passes away"
  const play = makePlay({ helpScheme: "tiered", o2Pos: [5, 10], o3Pos: [20, 10] });
  const targets = manDefenderTargets(play, 0);
  // D2 (1 pass away): weight = 0.5 * 0.4 = 0.2. track=[5,10], ball=[0,10]: target = [5,10] + 0.2*([0,10]-[5,10]) = [4,10]
  assert.deepEqual(targets.D2, [4, 10]);
  // D3 (2 passes away): weight = 0.5 (full). track=[20,10], ball=[0,10]: target = [20,10] + 0.5*([0,10]-[20,10]) = [10,10]
  assert.deepEqual(targets.D3, [10, 10]);
});
