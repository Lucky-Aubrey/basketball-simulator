export const COURT_X_MIN = -25;
export const COURT_X_MAX = 25;
export const COURT_Y_MIN = 0;
export const COURT_Y_MAX = 47;

export function courtToPixel(x, y, canvasWidth, canvasHeight) {
  const scale = canvasWidth / (COURT_X_MAX - COURT_X_MIN);
  const px = (x - COURT_X_MIN) * scale;
  const py = canvasHeight - (y - COURT_Y_MIN) * scale;
  return [px, py];
}

export function pixelToCourt(px, py, canvasWidth, canvasHeight) {
  const scale = canvasWidth / (COURT_X_MAX - COURT_X_MIN);
  const x = px / scale + COURT_X_MIN;
  const y = (canvasHeight - py) / scale + COURT_Y_MIN;
  return [x, y];
}

export function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

export function lerp(a, b, frac) {
  return a + (b - a) * frac;
}

export function lerpPoint(a, b, frac) {
  return [lerp(a[0], b[0], frac), lerp(a[1], b[1], frac)];
}

export function clampPointToCourt([x, y]) {
  return [
    Math.min(COURT_X_MAX, Math.max(COURT_X_MIN, x)),
    Math.min(COURT_Y_MAX, Math.max(COURT_Y_MIN, y)),
  ];
}
