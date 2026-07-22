import { courtToPixel } from "./geometry.js";

function drawDot(ctx, x, y, color, label, radius = 10) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.fillStyle = "#000";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, x, y + 3);
}

export function drawPlayers(ctx, width, height, positions, offenseRadii = {}) {
  for (const [id, [x, y]] of Object.entries(positions.offense || {})) {
    const [px, py] = courtToPixel(x, y, width, height);
    drawDot(ctx, px, py, "#1e88e5", id, offenseRadii[id] || 10);
  }
  for (const [id, [x, y]] of Object.entries(positions.defense || {})) {
    const [px, py] = courtToPixel(x, y, width, height);
    drawDot(ctx, px, py, "#e53935", id);
  }
}

export function drawBall(ctx, width, height, pos) {
  if (!pos) return;
  const [px, py] = courtToPixel(pos[0], pos[1], width, height);
  ctx.beginPath();
  ctx.arc(px, py, 5, 0, 2 * Math.PI);
  ctx.fillStyle = "#fb8c00";
  ctx.fill();
}
