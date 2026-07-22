import { drawCourt } from "./court.js";
import { drawPlayers } from "./render.js";
import { createEmptyPlay, History } from "./state.js";
import { createPlacementEditor, wireSaveLoad } from "./editor.js";
import { createTimelineEditor } from "./timeline.js";
import { createPlaybackController } from "./playback.js";
import { wireManDefenseUI, wireZoneDefenseUI } from "./defense-ui.js";

const canvas = document.getElementById("court");
const ctx = canvas.getContext("2d");
const play = createEmptyPlay();

wireManDefenseUI(play);
wireZoneDefenseUI(play);

const history = new History();
createTimelineEditor(play, history, () => {});

wireSaveLoad(play, (loaded) => {
  Object.assign(play, loaded);
});

const playback = createPlaybackController(play, (frame) => {
  drawCourt(ctx, canvas.width, canvas.height);
  drawPlayers(ctx, canvas.width, canvas.height, { offense: frame.offense, defense: frame.defense });
});

const placement = createPlacementEditor(play, canvas, () => playback.scrubTo(playback.getTime()));

document.getElementById("play-btn").addEventListener("click", () => playback.play());
document.getElementById("pause-btn").addEventListener("click", () => playback.pause());
document.getElementById("step-back-btn").addEventListener("click", () => playback.step(-0.1));
document.getElementById("step-fwd-btn").addEventListener("click", () => playback.step(0.1));
document.getElementById("scrub").addEventListener("input", (event) => playback.scrubTo(parseFloat(event.target.value)));
document.getElementById("speed-select").addEventListener("change", (event) => playback.setSpeed(parseFloat(event.target.value)));

playback.scrubTo(0);
