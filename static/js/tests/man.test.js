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

test("lag makes the defender track the assignee's lagged position, not its current position", () => {
  // O2 moves from [0,0] to [20,0] over t in [0,10]. O1 (ball handler) and O3 stay put.
  const play = {
    offense: [
      { id: "O1", start_pos: [0, 10], actions: [] },
      { id: "O2", start_pos: [0, 0], actions: [{ start_t: 0, duration: 10, target_pos: [20, 0] }] },
      { id: "O3", start_pos: [15, 10], actions: [] },
    ],
    ball: { start_holder: "O1", events: [] },
    defense: {
      mode: "man",
      man: {
        assignments: { O1: "D1", O2: "D2", O3: "D3" },
        help_scheme: "uniform",
        // help_weight=0 and rim_bias=0 isolate the lag term entirely.
        params: { lag: 2, help_weight: 0, rim_bias: 0 },
      },
      zone: null,
    },
  };
  const targets = manDefenderTargets(play, 6);
  // trackPos = playerPositionAt(O2, t-lag=4): frac=4/10=0.4 -> lerp([0,0],[20,0],0.4) = [8,0]
  // currentPos at t=6 would be frac=0.6 -> [12,0] (must NOT be what we get)
  // weight=0, rim_bias=0 -> target = trackPos = [8, 0]
  assert.deepEqual(targets.D2, [8, 0]);
  assert.notDeepEqual(targets.D2, [12, 0]); // would be the (wrong) unlagged current position
});

test("rim_bias pulls the defender's target toward the rim-denial point", () => {
  // O2 stands at [10, 20] the whole time; lag=0 and help_weight=0 isolate the rim_bias term.
  const play = {
    offense: [
      { id: "O1", start_pos: [0, 10], actions: [] },
      { id: "O2", start_pos: [10, 20], actions: [] },
      { id: "O3", start_pos: [15, 10], actions: [] },
    ],
    ball: { start_holder: "O1", events: [] },
    defense: {
      mode: "man",
      man: {
        assignments: { O1: "D1", O2: "D2", O3: "D3" },
        help_scheme: "uniform",
        params: { lag: 0, help_weight: 0, rim_bias: 0.5 },
      },
      zone: null,
    },
  };
  const targets = manDefenderTargets(play, 0);
  // trackPos = currentPos = [10, 20] (lag=0).
  // rimDenialPoint = lerpPoint([0,0], [10,20], 0.5) = [5, 10]
  // weight=0 (help_weight=0) -> target = trackPos + 0.5*(rimDenialPoint - trackPos)
  //   x: 10 + 0.5*(5-10) = 10 - 2.5 = 7.5
  //   y: 20 + 0.5*(10-20) = 20 - 5 = 15
  assert.deepEqual(targets.D2, [7.5, 15]);
  assert.notDeepEqual(targets.D2, [10, 20]); // would be trackPos if rim_bias had no effect
});
