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

import { addAction, removeAction, reorderAction, History } from "../state.js";

test("addAction appends and keeps actions sorted by start_t", () => {
  const play = createEmptyPlay();
  addAction(play, "O1", { type: "cut", start_t: 3, duration: 1, target_pos: [1, 1] });
  addAction(play, "O1", { type: "screen", start_t: 1, duration: 1, target_pos: [2, 2] });
  const player = play.offense.find((p) => p.id === "O1");
  assert.deepEqual(
    player.actions.map((a) => a.type),
    ["screen", "cut"]
  );
});

test("removeAction removes the action at the given index", () => {
  const play = createEmptyPlay();
  addAction(play, "O1", { type: "cut", start_t: 1, duration: 1, target_pos: [1, 1] });
  removeAction(play, "O1", 0);
  assert.equal(play.offense.find((p) => p.id === "O1").actions.length, 0);
});

test("reorderAction moves an action to a new index", () => {
  const play = createEmptyPlay();
  addAction(play, "O1", { type: "cut", start_t: 1, duration: 1, target_pos: [1, 1] });
  addAction(play, "O1", { type: "screen", start_t: 2, duration: 1, target_pos: [2, 2] });
  reorderAction(play, "O1", 0, 1);
  const player = play.offense.find((p) => p.id === "O1");
  assert.deepEqual(
    player.actions.map((a) => a.type),
    ["screen", "cut"]
  );
});

test("History push/undo/redo restores prior snapshots", () => {
  const history = new History();
  const v1 = { count: 1 };
  const v2 = { count: 2 };
  history.push(v1);
  let current = history.undo(v2);
  assert.deepEqual(current, v1);
  current = history.redo(current);
  assert.deepEqual(current, v2);
});

test("History undo with empty stack returns current unchanged", () => {
  const history = new History();
  const current = { count: 1 };
  assert.deepEqual(history.undo(current), current);
});
