import { drawCourt } from "./court.js";
import { drawPlayers } from "./render.js";
import { createEmptyPlay } from "./state.js";
import { createPlacementEditor } from "./editor.js";

const canvas = document.getElementById("court");
const ctx = canvas.getContext("2d");
const play = createEmptyPlay();
const placement = createPlacementEditor(play, canvas);

function render() {
  drawCourt(ctx, canvas.width, canvas.height);
  const offense = {};
  for (const p of play.offense) offense[p.id] = p.start_pos;
  drawPlayers(ctx, canvas.width, canvas.height, {
    offense,
    defense: placement.getDefensePositions(),
  });
  requestAnimationFrame(render);
}
render();
