export function createEmptyPlay() {
  return {
    name: "",
    offense: ["O1", "O2", "O3", "O4", "O5"].map((id) => ({
      id,
      start_pos: [0, 0],
      actions: [],
    })),
    ball: { start_holder: "O1", events: [] },
    defense: {
      mode: "man",
      man: {
        assignments: {},
        help_scheme: "uniform",
        params: { lag: 0.3, help_weight: 0.4, rim_bias: 0.2 },
      },
      zone: null,
    },
  };
}

function ballEventForAction(playerId, action) {
  if (action.type !== "pass" && action.type !== "handoff") return null;
  return { t: action.start_t, action: action.type, from: playerId, to: action.target_player };
}

export function addAction(play, playerId, action) {
  const player = play.offense.find((p) => p.id === playerId);
  player.actions.push(action);
  player.actions.sort((a, b) => a.start_t - b.start_t);

  const event = ballEventForAction(playerId, action);
  if (event) {
    play.ball.events.push(event);
    play.ball.events.sort((a, b) => a.t - b.t);
  }
  return play;
}

export function removeAction(play, playerId, actionIndex) {
  const player = play.offense.find((p) => p.id === playerId);
  const [removed] = player.actions.splice(actionIndex, 1);

  if (removed && (removed.type === "pass" || removed.type === "handoff")) {
    const idx = play.ball.events.findIndex(
      (e) =>
        e.t === removed.start_t &&
        e.action === removed.type &&
        e.from === playerId &&
        e.to === removed.target_player
    );
    if (idx !== -1) play.ball.events.splice(idx, 1);
  }
  return play;
}

export function reorderAction(play, playerId, fromIndex, toIndex) {
  const player = play.offense.find((p) => p.id === playerId);
  const [action] = player.actions.splice(fromIndex, 1);
  player.actions.splice(toIndex, 0, action);
  return play;
}

export class History {
  constructor() {
    this.past = [];
    this.future = [];
  }

  push(snapshot) {
    this.past.push(structuredClone(snapshot));
    this.future = [];
  }

  undo(current) {
    if (this.past.length === 0) return current;
    this.future.push(structuredClone(current));
    return this.past.pop();
  }

  redo(current) {
    if (this.future.length === 0) return current;
    this.past.push(structuredClone(current));
    return this.future.pop();
  }
}
