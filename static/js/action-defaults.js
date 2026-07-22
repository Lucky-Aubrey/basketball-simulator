export const DEFAULT_SPEED = 10; // feet per second, for position-targeted actions
export const DEFAULT_PASS_DURATION = 0.3; // seconds, flat default for pass/handoff ball transfer

export function computeDuration(actionType, fromPos, toPos) {
  if (actionType === "pass" || actionType === "handoff") {
    return DEFAULT_PASS_DURATION;
  }
  return Math.hypot(toPos[0] - fromPos[0], toPos[1] - fromPos[1]) / DEFAULT_SPEED;
}
