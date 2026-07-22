import { distance, lerpPoint } from "./geometry.js";

export function capMovement(prevPos, targetPos, maxSpeed, dt) {
  const maxDist = maxSpeed * dt;
  const d = distance(prevPos, targetPos);
  if (d <= maxDist) return targetPos;
  return lerpPoint(prevPos, targetPos, maxDist / d);
}
