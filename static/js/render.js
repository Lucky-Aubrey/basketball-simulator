import { courtToPixel } from "./geometry.js";

function drawDot(ctx, x, y, color, label) {
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.fillStyle = "#000";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, x, y + 3);
}

export function drawPlayers(ctx, width, height, positions) {
  for (const [id, [x, y]] of Object.entries(positions.offense || {})) {
    const [px, py] = courtToPixel(x, y, width, height);
    drawDot(ctx, px, py, "#1e88e5", id);
  }
  for (const [id, [x, y]] of Object.entries(positions.defense || {})) {
    const [px, py] = courtToPixel(x, y, width, height);
    drawDot(ctx, px, py, "#e53935", id);
  }
}
