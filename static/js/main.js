import { drawCourt } from "./court.js";
import { drawPlayers, drawBall } from "./render.js";
import { createEmptyPlay, History } from "./state.js";
import { createPlacementEditor, wireSaveLoad } from "./editor.js";
import { createTimelineEditor } from "./timeline.js";
import { createPlaybackController } from "./playback.js";
import { wireManDefenseUI, wireZoneDefenseUI } from "./defense-ui.js";
import { screenerRadiusMultiplier } from "./screen-visual.js";
import { createActionTargetPicker } from "./action-placement.js";

const canvas = document.getElementById("court");
const ctx = canvas.getContext("2d");
const play = createEmptyPlay();

const manDefenseUI = wireManDefenseUI(play);
const zoneDefenseUI = wireZoneDefenseUI(play);

const history = new History();
const actionPicker = createActionTargetPicker(play, canvas);
const timelineEditor = createTimelineEditor(play, history, actionPicker, () => {});

const playback = createPlaybackController(play, (frame, t) => {
  drawCourt(ctx, canvas.width, canvas.height);
  const offenseRadii = {};
  for (const p of play.offense) offenseRadii[p.id] = 10 * screenerRadiusMultiplier(p, t);
  drawPlayers(ctx, canvas.width, canvas.height, { offense: frame.offense, defense: frame.defense }, offenseRadii);
  drawBall(ctx, canvas.width, canvas.height, frame.ball && frame.ball.pos);
  document.getElementById("time-readout").textContent = t.toFixed(1) + "s";
});

wireSaveLoad(play, (loaded) => {
  Object.assign(play, loaded);
  // Resync all UI that mirrors `play` state before re-rendering.
  manDefenseUI.refresh();
  zoneDefenseUI.refresh();
  timelineEditor.refresh();
  // Reset to t=0 rather than preserving the scrub position: a freshly loaded
  // play is a new context for the user, and the previous play's timeline
  // position has no guaranteed meaning against the new play's actions/ball
  // events, so starting from the top is the least surprising behavior.
  playback.scrubTo(0);
});

const placement = createPlacementEditor(play, canvas, () => playback.scrubTo(playback.getTime()));

document.getElementById("play-btn").addEventListener("click", () => playback.play());
document.getElementById("pause-btn").addEventListener("click", () => playback.pause());
document.getElementById("step-back-btn").addEventListener("click", () => playback.step(-0.1));
document.getElementById("step-fwd-btn").addEventListener("click", () => playback.step(0.1));
document.getElementById("scrub").addEventListener("input", (event) => playback.scrubTo(parseFloat(event.target.value)));
document.getElementById("speed-select").addEventListener("change", (event) => playback.setSpeed(parseFloat(event.target.value)));
document.getElementById("reset-btn").addEventListener("click", () => playback.scrubTo(0));

playback.scrubTo(0);
