import { test } from "node:test";
import assert from "node:assert/strict";
import { createEmptyPlay } from "../state.js";

test("createEmptyPlay has 5 offensive players O1-O5 with empty actions", () => {
  const play = createEmptyPlay();
  assert.equal(play.offense.length, 5);
  assert.deepEqual(
    play.offense.map((p) => p.id),
    ["O1", "O2", "O3", "O4", "O5"]
  );
  for (const p of play.offense) {
    assert.deepEqual(p.actions, []);
    assert.deepEqual(p.start_pos, [0, 0]);
  }
});

test("createEmptyPlay defaults ball and man-defense config", () => {
  const play = createEmptyPlay();
  assert.equal(play.ball.start_holder, "O1");
  assert.deepEqual(play.ball.events, []);
  assert.equal(play.defense.mode, "man");
  assert.equal(play.defense.man.help_scheme, "uniform");
  assert.equal(play.defense.zone, null);
});
