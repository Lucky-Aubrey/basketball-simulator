import { pixelToCourt } from "./geometry.js";
import { fetchPlayNames, fetchPlay, savePlay } from "./api.js";

const PLAYER_IDS = { offense: ["O1", "O2", "O3", "O4", "O5"], defense: ["D1", "D2", "D3", "D4", "D5"] };

export function createPlacementEditor(play, canvas, onPlace) {
  const defensePositions = {};
  let mode = "offense";
  let nextIndex = 0;

  canvas.addEventListener("click", (event) => {
    const rect = canvas.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    const [x, y] = pixelToCourt(px, py, canvas.width, canvas.height);

    const ids = PLAYER_IDS[mode];
    if (nextIndex >= ids.length) return;
    const id = ids[nextIndex];
    if (mode === "offense") {
      play.offense.find((p) => p.id === id).start_pos = [x, y];
    } else {
      defensePositions[id] = [x, y];
    }
    nextIndex += 1;
    if (nextIndex >= ids.length && mode === "offense") {
      mode = "defense";
      nextIndex = 0;
    }
    if (typeof onPlace === "function") onPlace();
  });

  return { getDefensePositions: () => defensePositions };
}

export function wireSaveLoad(play, onLoad) {
  document.getElementById("save-btn").addEventListener("click", async () => {
    const name = prompt("Play name?", play.name || "");
    if (!name) return;
    play.name = name;
    await savePlay(name, play);
  });

  const select = document.getElementById("load-select");
  fetchPlayNames().then((names) => {
    for (const name of names) {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    }
  });
  select.addEventListener("change", async () => {
    if (!select.value) return;
    const loaded = await fetchPlay(select.value);
    onLoad(loaded);
  });
}
