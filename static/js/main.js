import { drawCourt } from "./court.js";
import { drawPlayers } from "./render.js";
import { createEmptyPlay, History } from "./state.js";
import { createPlacementEditor, wireSaveLoad } from "./editor.js";
import { createTimelineEditor } from "./timeline.js";

const canvas = document.getElementById("court");
const ctx = canvas.getContext("2d");
const play = createEmptyPlay();
const placement = createPlacementEditor(play, canvas);

const history = new History();
createTimelineEditor(play, history, () => {});

wireSaveLoad(play, (loaded) => {
  Object.assign(play, loaded);
});

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
