import { lerpPoint } from "./geometry.js";

export function playerPositionAt(playerData, t) {
  let pos = playerData.start_pos;
  for (const action of playerData.actions) {
    const target = action.target_pos || pos;
    const end = action.start_t + action.duration;
    if (t <= action.start_t) {
      break;
    } else if (t >= end) {
      pos = target;
    } else {
      const frac = (t - action.start_t) / action.duration;
      return lerpPoint(pos, target, frac);
    }
  }
  return pos;
}
