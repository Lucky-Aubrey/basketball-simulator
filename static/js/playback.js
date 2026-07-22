import { simulateFrame } from "./simulate.js";
import { capMovement } from "./movement.js";

const MAX_DEFENDER_SPEED = 15; // feet per second

export function createPlaybackController(play, onFrame) {
  let t = 0;
  let speed = 1;
  let playing = false;
  let lastTimestamp = null;
  let defenderPositions = {};

  function computeAndEmit(dt) {
    const frame = simulateFrame(play, t);
    const nextPositions = {};
    for (const [id, target] of Object.entries(frame.defenseTargets)) {
      const prev = defenderPositions[id] || target;
      nextPositions[id] = capMovement(prev, target, MAX_DEFENDER_SPEED, dt);
    }
    defenderPositions = nextPositions;
    onFrame({ offense: frame.offense, ball: frame.ball, defense: defenderPositions }, t);
  }

  function tick(timestamp) {
    if (!playing) return;
    const dt = lastTimestamp !== null ? (timestamp - lastTimestamp) / 1000 : 0;
    t += dt * speed;
    lastTimestamp = timestamp;
    computeAndEmit(dt);
    requestAnimationFrame(tick);
  }

  return {
    play() {
      playing = true;
      lastTimestamp = null;
      requestAnimationFrame(tick);
    },
    pause() {
      playing = false;
    },
    step(delta) {
      t = Math.max(0, t + delta);
      computeAndEmit(Math.abs(delta));
    },
    scrubTo(newT) {
      t = Math.max(0, newT);
      defenderPositions = {}; // scrubbing snaps defenders directly to their rule-computed targets
      computeAndEmit(Infinity);
    },
    setSpeed(mult) {
      speed = mult;
    },
    getTime: () => t,
  };
}
