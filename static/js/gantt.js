const ACTION_COLORS = {
  relocate: "#90a4ae",
  cut: "#42a5f5",
  dribble: "#66bb6a",
  pass: "#ffca28",
  screen: "#ab47bc",
  handoff: "#ef5350",
  shot: "#ff7043",
};

const PIXELS_PER_SECOND = 40;
const ROW_HEIGHT = 30;
const LABEL_WIDTH = 30;

function renderLegend() {
  const legend = document.createElement("div");
  legend.className = "gantt-legend";
  for (const [type, color] of Object.entries(ACTION_COLORS)) {
    const item = document.createElement("span");
    item.className = "gantt-legend-item";

    const swatch = document.createElement("span");
    swatch.className = "gantt-legend-swatch";
    swatch.style.background = color;
    item.appendChild(swatch);

    item.appendChild(document.createTextNode(type));
    legend.appendChild(item);
  }
  return legend;
}

export function createGanttView(play, container, onSelectPlayer) {
  function render() {
    container.innerHTML = "";
    for (const player of play.offense) {
      const row = document.createElement("div");
      row.className = "gantt-row";
      row.style.height = `${ROW_HEIGHT}px`;

      const label = document.createElement("span");
      label.textContent = player.id;
      label.style.position = "absolute";
      label.style.left = "0";
      label.style.top = `${(ROW_HEIGHT - 12) / 2}px`;
      row.appendChild(label);

      for (const action of player.actions) {
        const block = document.createElement("div");
        block.className = "gantt-block";
        block.textContent = action.type;
        block.style.position = "absolute";
        block.style.left = `${LABEL_WIDTH + action.start_t * PIXELS_PER_SECOND}px`;
        block.style.top = "2px";
        block.style.width = `${Math.max(4, action.duration * PIXELS_PER_SECOND)}px`;
        block.style.height = `${ROW_HEIGHT - 4}px`;
        block.style.background = ACTION_COLORS[action.type] || "#ccc";
        block.style.cursor = "pointer";
        block.addEventListener("click", () => onSelectPlayer(player.id));
        row.appendChild(block);
      }

      container.appendChild(row);
    }
    container.appendChild(renderLegend());
  }

  render();
  return { refresh: render };
}
