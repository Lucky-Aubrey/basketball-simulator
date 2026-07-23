import { addAction, removeAction, reorderAction, History } from "./state.js";
import { playerPositionAt } from "./offense.js";
import { computeDuration } from "./action-defaults.js";

function describeTarget(target) {
  if (!target) return "No target set";
  if (target.target_player) return `Target: pass/handoff to ${target.target_player}`;
  if (target.facing_pos) {
    return `Target: screen at [${target.target_pos.map((n) => n.toFixed(1))}] facing [${target.facing_pos.map((n) => n.toFixed(1))}]`;
  }
  return `Target: [${target.target_pos.map((n) => n.toFixed(1))}]`;
}

function describeAction(action) {
  if (action.target_player) return `-> pass/handoff to ${action.target_player}`;
  if (action.facing_pos) return `-> [${action.target_pos}] facing [${action.facing_pos}]`;
  return `-> [${action.target_pos}]`;
}

export function createTimelineEditor(play, history, actionPicker, onChange) {
  let selectedPlayerId = "O1";
  let pendingTarget = null;
  let pendingAction = null; // { actingPlayerId, actionType, startT } locked in at "Set Target" click time

  function refresh() {
    const list = document.getElementById("action-list");
    list.innerHTML = "";
    const player = play.offense.find((p) => p.id === selectedPlayerId);
    player.actions.forEach((action, index) => {
      const li = document.createElement("li");
      li.textContent = `${action.type} @ t=${action.start_t} (${action.duration}s) ${describeAction(action)}`;

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

  function setDropdownsDisabled(disabled) {
    document.getElementById("player-select").disabled = disabled;
    document.getElementById("action-type").disabled = disabled;
  }

  function cancelPlacement() {
    actionPicker.cancel();
    pendingTarget = null;
    pendingAction = null;
    document.getElementById("target-status").textContent = "No target set";
    setDropdownsDisabled(false);
  }

  document.getElementById("set-target-btn").addEventListener("click", () => {
    const actingPlayerId = selectedPlayerId;
    const actionType = document.getElementById("action-type").value;
    const startT = parseFloat(document.getElementById("action-start-t").value);
    const statusEl = document.getElementById("target-status");
    if (Number.isNaN(startT)) {
      statusEl.textContent = "Set a start time first";
      return;
    }
    pendingTarget = null;
    pendingAction = null;
    statusEl.textContent =
      actionType === "screen"
        ? "Click the plant position, then the facing point"
        : actionType === "pass" || actionType === "handoff"
        ? "Click the teammate to target"
        : "Click the court";

    setDropdownsDisabled(true);

    actionPicker.startPlacing(actingPlayerId, actionType, startT, (result) => {
      pendingTarget = result;
      pendingAction = { actingPlayerId, actionType, startT };
      statusEl.textContent = describeTarget(result);

      const actingPlayer = play.offense.find((p) => p.id === actingPlayerId);
      const fromPos = playerPositionAt(actingPlayer, startT);
      const toPos = result.target_pos || fromPos;
      const duration = computeDuration(actionType, fromPos, toPos);
      document.getElementById("action-duration").value = duration.toFixed(2);

      setDropdownsDisabled(false);
    });
  });

  document.getElementById("cancel-target-btn").addEventListener("click", () => {
    cancelPlacement();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && actionPicker.isPlacing()) {
      cancelPlacement();
    }
  });

  document.getElementById("add-action-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const statusEl = document.getElementById("target-status");
    if (!pendingTarget || !pendingAction) {
      statusEl.textContent = "Set a target before adding";
      return;
    }
    history.push(play);
    addAction(play, pendingAction.actingPlayerId, {
      type: pendingAction.actionType,
      start_t: pendingAction.startT,
      duration: parseFloat(document.getElementById("action-duration").value),
      ...pendingTarget,
    });
    pendingTarget = null;
    pendingAction = null;
    statusEl.textContent = "No target set";
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
  return {
    selectPlayer: (id) => {
      selectedPlayerId = id;
      document.getElementById("player-select").value = id;
      refresh();
    },
    refresh,
  };
}
