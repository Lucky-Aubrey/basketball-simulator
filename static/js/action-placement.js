import { pixelToCourt, courtToPixel } from "./geometry.js";
import { playerPositionAt } from "./offense.js";

const HIT_RADIUS_PX = 15;

export function createActionTargetPicker(play, canvas) {
  let capture = null; // { playerId, actionType, startT, step, targetPos, onCaptured }

  function clickToCourt(event) {
    const rect = canvas.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    return pixelToCourt(px, py, canvas.width, canvas.height);
  }

  function findClickedTeammate(event) {
    const rect = canvas.getBoundingClientRect();
    const clickPx = event.clientX - rect.left;
    const clickPy = event.clientY - rect.top;
    for (const p of play.offense) {
      if (p.id === capture.playerId) continue;
      const pos = playerPositionAt(p, capture.startT);
      const [px, py] = courtToPixel(pos[0], pos[1], canvas.width, canvas.height);
      if (Math.hypot(px - clickPx, py - clickPy) <= HIT_RADIUS_PX) return p.id;
    }
    return null;
  }

  canvas.addEventListener("click", (event) => {
    if (!capture) return;

    if (capture.actionType === "pass" || capture.actionType === "handoff") {
      const targetId = findClickedTeammate(event);
      if (!targetId) return;
      const onCaptured = capture.onCaptured;
      capture = null;
      onCaptured({ target_player: targetId });
      return;
    }

    const point = clickToCourt(event);

    if (capture.actionType === "screen") {
      if (capture.step === 0) {
        capture.targetPos = point;
        capture.step = 1;
        return;
      }
      const onCaptured = capture.onCaptured;
      const targetPos = capture.targetPos;
      capture = null;
      onCaptured({ target_pos: targetPos, facing_pos: point });
      return;
    }

    const onCaptured = capture.onCaptured;
    capture = null;
    onCaptured({ target_pos: point });
  });

  return {
    startPlacing(playerId, actionType, startT, onCaptured) {
      capture = { playerId, actionType, startT, step: 0, targetPos: null, onCaptured };
    },
    cancel() {
      capture = null;
    },
    isPlacing: () => capture !== null,
  };
}
