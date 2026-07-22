import { distance, lerpPoint, clampPointToCourt } from "./geometry.js";

export function capMovement(prevPos, targetPos, maxSpeed, dt) {
  const maxDist = maxSpeed * dt;
  const d = distance(prevPos, targetPos);
  if (d <= maxDist) return targetPos;
  return lerpPoint(prevPos, targetPos, maxDist / d);
}

export function separateOverlaps(positions, minDistance) {
  const ids = Object.keys(positions);
  const result = {};
  for (const id of ids) result[id] = [...positions[id]];

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = result[ids[i]];
      const b = result[ids[j]];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const d = Math.hypot(dx, dy) || 1e-6;
      if (d < minDistance) {
        const push = (minDistance - d) / 2;
        const ux = dx / d;
        const uy = dy / d;
        result[ids[i]] = [a[0] - ux * push, a[1] - uy * push];
        result[ids[j]] = [b[0] + ux * push, b[1] + uy * push];
      }
    }
  }
  return result;
}

export function clampAllToCourt(positions) {
  const result = {};
  for (const [id, pos] of Object.entries(positions)) result[id] = clampPointToCourt(pos);
  return result;
}
