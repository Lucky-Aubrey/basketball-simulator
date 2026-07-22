import { test } from "node:test";
import assert from "node:assert/strict";
import { ballStateAt } from "../ball.js";

const play = {
  ball: {
    start_holder: "O1",
    events: [
      { t: 2.0, action: "pass", from: "O1", to: "O2" },
      { t: 4.0, action: "dribble", from: "O2" },
      { t: 5.0, action: "handoff", from: "O2", to: "O3" },
    ],
  },
};

test("before any event, holder is start_holder", () => {
  assert.equal(ballStateAt(play, 0).holder, "O1");
  assert.equal(ballStateAt(play, 1.9).holder, "O1");
});

test("pass event changes holder at its time", () => {
  assert.equal(ballStateAt(play, 2.0).holder, "O2");
  assert.equal(ballStateAt(play, 3.9).holder, "O2");
});

test("dribble event does not change holder", () => {
  assert.equal(ballStateAt(play, 4.0).holder, "O2");
  assert.equal(ballStateAt(play, 4.9).holder, "O2");
});

test("handoff event changes holder at its time", () => {
  assert.equal(ballStateAt(play, 5.0).holder, "O3");
  assert.equal(ballStateAt(play, 100).holder, "O3");
});

test("lastEvent reflects the most recent applied event", () => {
  assert.equal(ballStateAt(play, 2.0).lastEvent.action, "pass");
  assert.equal(ballStateAt(play, 0).lastEvent, null);
});
