import { lerpPoint } from "./geometry.js";

export function playerPositionAt(playerData, t) {
  let pos = playerData.start_pos;
  for (const action of playerData.actions) {
    const end = action.start_t + action.duration;
    if (t <= action.start_t) {
      break;
    } else if (t >= end) {
      pos = action.target_pos;
    } else {
      const frac = (t - action.start_t) / action.duration;
      return lerpPoint(pos, action.target_pos, frac);
    }
  }
  return pos;
}
