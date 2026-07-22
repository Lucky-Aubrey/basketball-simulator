import { simulateFrame } from "./simulate.js";

export function createPlaybackController(play, onFrame) {
  let t = 0;
  let speed = 1;
  let playing = false;
  let lastTimestamp = null;

  function tick(timestamp) {
    if (!playing) return;
    if (lastTimestamp !== null) {
      t += ((timestamp - lastTimestamp) / 1000) * speed;
    }
    lastTimestamp = timestamp;
    onFrame(simulateFrame(play, t), t);
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
      onFrame(simulateFrame(play, t), t);
    },
    scrubTo(newT) {
      t = Math.max(0, newT);
      onFrame(simulateFrame(play, t), t);
    },
    setSpeed(mult) {
      speed = mult;
    },
    getTime: () => t,
  };
}
