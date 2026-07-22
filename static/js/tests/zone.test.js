import { test } from "node:test";
import assert from "node:assert/strict";
import { zoneDefenderTargets, ZONE_PRESETS } from "../defense/zone.js";

function makePlay(type, extra = {}) {
  return {
    offense: [
      { id: "O1", start_pos: [0, 20], actions: [] },
      { id: "O2", start_pos: [-15, 4], actions: [] },
      { id: "O3", start_pos: [15, 4], actions: [] },
    ],
    ball: { start_holder: "O1", events: [] },
    defense: {
      mode: "zone",
      man: null,
      zone: {
        type,
        home_points: ZONE_PRESETS[type],
        params: { ball_shade_weight: 0.5, gap_shade_weight: 0, max_shade: 100 },
        ...extra,
      },
    },
  };
}

test("2-3 zone defenders shade from home point toward the ball", () => {
  const play = makePlay("2-3");
  const targets = zoneDefenderTargets(play, 0);
  const home = ZONE_PRESETS["2-3"].D1;
  const ballPos = [0, 20];
  const expected = [
    home[0] + 0.5 * (ballPos[0] - home[0]),
    home[1] + 0.5 * (ballPos[1] - home[1]),
  ];
  assert.deepEqual(targets.D1, expected);
});

test("shade is clamped to max_shade distance from home", () => {
  const play = makePlay("2-3");
  play.defense.zone.params.max_shade = 1;
  const targets = zoneDefenderTargets(play, 0);
  const home = ZONE_PRESETS["2-3"].D1;
  const d = Math.hypot(targets.D1[0] - home[0], targets.D1[1] - home[1]);
  assert.ok(d <= 1 + 1e-9);
});

test("box-and-1 tracks the man_mark assignment directly instead of a home point", () => {
  const play = makePlay("box-and-1", { man_mark: { D5: "O1" } });
  const targets = zoneDefenderTargets(play, 0);
  assert.deepEqual(targets.D5, [0, 20]);
});

test("gap shade (current behavior) shades toward the offensive player nearest THIS defender's home point, not toward an uncovered player", () => {
  const play = makePlay("2-3");
  play.defense.zone.params.gap_shade_weight = 0.4;
  play.defense.zone.params.ball_shade_weight = 0;
  // D3's home point is [-15, 4]. O2 at [-15, 4] is exactly on D3's home
  // point (distance 0, nearest); O1 at [0, 20] and O3 at [15, 4] are much
  // farther. Current implementation shades D3 toward O2 (the nearest to
  // D3's own home point), even though O2 is the *most* covered player, not
  // an uncovered gap.
  const targets = zoneDefenderTargets(play, 0);
  const home = ZONE_PRESETS["2-3"].D3;
  const nearest = [-15, 4]; // O2's position
  const expected = [
    home[0] + 0.4 * (nearest[0] - home[0]),
    home[1] + 0.4 * (nearest[1] - home[1]),
  ];
  assert.deepEqual(targets.D3, expected);
});

test("all four zone presets define exactly 5 defender entries", () => {
  for (const type of ["2-3", "3-2", "1-3-1", "box-and-1"]) {
    assert.equal(Object.keys(ZONE_PRESETS[type]).length, 5);
  }
});
