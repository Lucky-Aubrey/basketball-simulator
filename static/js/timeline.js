import { addAction, removeAction, reorderAction, History } from "./state.js";

export function createTimelineEditor(play, history, onChange) {
  let selectedPlayerId = "O1";

  function refresh() {
    const list = document.getElementById("action-list");
    list.innerHTML = "";
    const player = play.offense.find((p) => p.id === selectedPlayerId);
    player.actions.forEach((action, index) => {
      const li = document.createElement("li");
      li.textContent = `${action.type} @ t=${action.start_t} (${action.duration}s) -> [${action.target_pos}]`;

      const removeBtn = document.createElement("button");
      removeBtn.textContent = "Remove";
      removeBtn.addEventListener("click", () => {
        history.push(play);
        removeAction(play, selectedPlayerId, index);
        refresh();
        onChange();
      });
      li.appendChild(removeBtn);

      if (index > 0) {
        const upBtn = document.createElement("button");
        upBtn.textContent = "Move up";
        upBtn.addEventListener("click", () => {
          history.push(play);
          reorderAction(play, selectedPlayerId, index, index - 1);
          refresh();
          onChange();
        });
        li.appendChild(upBtn);
      }

      list.appendChild(li);
    });
  }

  document.getElementById("player-select").addEventListener("change", (event) => {
    selectedPlayerId = event.target.value;
    refresh();
  });

  document.getElementById("add-action-form").addEventListener("submit", (event) => {
    event.preventDefault();
    history.push(play);
    addAction(play, selectedPlayerId, {
      type: document.getElementById("action-type").value,
      start_t: parseFloat(document.getElementById("action-start-t").value),
      duration: parseFloat(document.getElementById("action-duration").value),
      target_pos: [
        parseFloat(document.getElementById("action-target-x").value),
        parseFloat(document.getElementById("action-target-y").value),
      ],
    });
    refresh();
    onChange();
  });

  document.getElementById("undo-btn").addEventListener("click", () => {
    Object.assign(play, history.undo(play));
    refresh();
    onChange();
  });

  document.getElementById("redo-btn").addEventListener("click", () => {
    Object.assign(play, history.redo(play));
    refresh();
    onChange();
  });

  refresh();
  return { selectPlayer: (id) => { selectedPlayerId = id; refresh(); }, refresh };
}
