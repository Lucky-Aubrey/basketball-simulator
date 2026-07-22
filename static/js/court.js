import { courtToPixel } from "./geometry.js";

export function drawCourt(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;

  // court outline
  ctx.strokeRect(0, 0, width, height);

  // half-court line (bottom edge, y=47)
  const [x1, y1] = courtToPixel(-25, 47, width, height);
  const [x2] = courtToPixel(25, 47, width, height);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y1);
  ctx.stroke();

  // free-throw lane (approx: 16ft wide, 19ft from baseline)
  const [lx1, ly1] = courtToPixel(-8, 0, width, height);
  const [lx2, ly2] = courtToPixel(8, 19, width, height);
  ctx.strokeRect(lx1, ly2, lx2 - lx1, ly1 - ly2);

  // three-point arc (approx radius 23.75ft from basket at origin)
  const [cx, cy] = courtToPixel(0, 0, width, height);
  const scale = width / (25 - -25);
  ctx.beginPath();
  ctx.arc(cx, cy, 23.75 * scale, 0, Math.PI);
  ctx.stroke();
}
