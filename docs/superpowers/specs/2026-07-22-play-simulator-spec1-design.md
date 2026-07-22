# Basketball Play Simulator — Spec 1 Design

## Scope

This spec covers the core play editor, persistence, playback, and simple
rule-based defense (man-to-man and zone). It explicitly excludes
screen-interaction event logic (defenders choosing to go under/over/deny/
switch a screen, probabilistic outcomes, offense reactions to defense choice
including screener slips). That is Spec 2, to be designed after this ships,
once the core play/action data model exists for it to hook into.

## Goal

Let a user design a basketball play by placing 5 offensive players on a
half-court and giving each a sequence of timed actions (cuts, screens,
dribbles, passes, handoffs, shots, relocations). Configure a defense (man-to-
man or one of four zones) that reacts to the play using simple, tunable
geometric rules — no ML, no pathfinding search. Play back the result frame by
frame with full transport controls, and save/load plays as named JSON files.

## Architecture

- **Backend**: FastAPI + uvicorn.
  - Serves the static frontend (HTML/CSS/JS, no build step).
  - `GET /api/plays` — list saved play names.
  - `GET /api/plays/{name}` — load a play's JSON.
  - `POST /api/plays/{name}` — save/overwrite a play's JSON to a `plays/`
    directory on disk.
  - No simulation logic lives on the backend — it is a static file server
    plus a thin filesystem-backed JSON store.
- **Frontend**: Plain HTML + Canvas + vanilla JS.
  - A `<canvas>` renders the court, offensive/defensive player dots, and the
    ball, and drives playback.
  - A DOM-based timeline panel lets the user select a player and edit their
    ordered action list: add/remove/reorder actions, drag each action's
    start time and duration on a shared timeline.
  - All defense-reaction simulation math runs client-side in JS, computed
    per-frame from the play JSON. This keeps playback and scrubbing
    instantaneous (no round-trip per frame) at the cost of duplicating any
    rule logic that might otherwise be Python — acceptable since the rules
    are simple arithmetic, not heavy computation.
  - Undo/redo: every edit (add/remove/reorder an action, drag a waypoint,
    adjust a timing handle) pushes an entry onto an in-memory undo stack for
    the current editing session. Not persisted across reloads — saving to a
    named play is the durable checkpoint.

## Coordinate system

Half-court, in feet. Origin at the basket. `x ∈ [-25, 25]` (sideline to
sideline), `y ∈ [0, 47]` (baseline to half-court line). The canvas maps this
to pixels via one fixed scale factor computed from canvas dimensions at load
time.

## Data model

```json
{
  "name": "string",
  "offense": [
    {
      "id": "O1",
      "start_pos": [0.0, 5.0],
      "actions": [
        {
          "type": "cut | dribble | pass | screen | handoff | shot | relocate",
          "start_t": 2.0,
          "duration": 1.5,
          "target_pos": [5.0, 10.0],
          "target_player": "O2"
        }
      ]
    }
  ],
  "ball": {
    "start_holder": "O1",
    "events": [
      {"t": 2.0, "action": "pass | dribble | handoff | shot", "from": "O1", "to": "O2"}
    ]
  },
  "defense": {
    "mode": "man | zone",
    "man": {
      "assignments": {"O1": "D1", "O2": "D2", "O3": "D3", "O4": "D4", "O5": "D5"},
      "help_scheme": "tiered | uniform",
      "params": {"lag": 0.3, "help_weight": 0.4, "rim_bias": 0.2}
    },
    "zone": {
      "type": "2-3 | 3-2 | 1-3-1 | box-and-1",
      "home_points": {"D1": [-15.0, 15.0], "...": "..."},
      "params": {"ball_shade_weight": 0.5, "gap_shade_weight": 0.3, "max_shade": 8.0}
    }
  }
}
```

Rules:
- `offense` always has exactly 5 entries, ids `O1`-`O5`.
- Each player's `actions` list is strictly ordered by `start_t`; the editor
  enforces no gaps in causality (an action's start can be anywhere, but the
  UI sorts by time for display and playback).
- Ball `events` are the source of truth for who holds the ball at any time
  `t` — the most recent event with `t' <= t` determines the current holder
  (or `start_holder` if none has occurred yet). Pass/handoff/dribble/shot
  actions on the acting player must correspond to a matching ball event;
  the editor creates/updates the ball event automatically when such an
  action is added, so the two stay in sync without manual duplication.
- Only one of `defense.man` / `defense.zone` is populated, matching
  `defense.mode`.
- `defense.man.assignments` maps every offensive player to exactly one of
  `D1`-`D5`.
- `defense.zone.home_points` has exactly 5 entries, `D1`-`D5`, defaulted from
  a preset per zone `type` (user can drag to customize).

## Defense reaction rules

Both modes compute, per frame at time `t`, a **target position** for each
defender from pure functions of the current offense/ball state, then move
the defender toward that target at a capped max speed (so a defender can't
teleport when the target jumps — this cap is a `params` constant too).

### Man-to-man

Each defender's target = weighted blend of three vectors:

1. **Track**: assigned offensive player's position at `t - lag` (simple
   position lookup on a delay — creates a natural reaction lag).
2. **Help/hedge**: pull toward the ball's current position, weighted by
   `help_weight`.
3. **Rim bias**: pull toward the point on the line between the rim (0, 0)
   and the assigned player's *current* position, weighted by `rim_bias`
   (keeps defenders between their man and the basket rather than getting
   split by a straight track-only reaction).

`help_weight` depends on `help_scheme`:
- **`uniform`**: every non-ball-handling defender uses the flat
  `params.help_weight` value.
- **`tiered`**: each frame, offensive players (excluding the ball handler)
  are ranked by current distance from the ball handler (a proxy for "passes
  away" — nearest = 1 pass away, next = 2 passes away, etc., since there's
  no explicit passing-lane graph in Spec 1). The 1-pass-away defender's
  `help_weight` is a low constant (`params.help_weight * 0.4`, i.e. stays
  close/deny); 2+-passes-away defenders use the full `params.help_weight`
  (sag into the paint). The ball handler's own defender always uses
  `help_weight = 0` (no self-help).

### Zone

Each defender's target = their `home_point`, shaded by up to three
displacement vectors, summed and then clamped to `max_shade` distance from
the home point:

1. **Ball shade**: vector from home point toward the ball's current
   position, scaled by `ball_shade_weight`.
2. **Gap shade**: vector from home point toward the nearest offensive player
   who is currently not the closest offensive player to any defender's home
   point (i.e. an uncovered gap), scaled by `gap_shade_weight`.
3. Same shape of formula is reused for all four zone types (`2-3`, `3-2`,
   `1-3-1`, `box-and-1`); only the 5 `home_points` presets differ per type.
   `box-and-1` additionally assigns one defender (`D5` by convention) as a
   pure man defender on a designated offensive player instead of a zone
   home point — reuses the man-to-man `track` rule for that one defender.

## Playback

- Transport: play, pause, step (single frame forward/back), scrub (drag to
  any time), speed multiplier (0.25x–2x).
- Simulation is stateless per frame: given the play JSON and a time `t`,
  compute every offensive player's position (interpolated along their
  current action), the ball's holder/position, and every defender's target-
  then-capped position. This makes scrubbing to an arbitrary `t` just a
  pure function call, no incremental state to maintain.

## Save/load UX

- "Save" prompts for a play name (defaults to current name if editing an
  existing one) and POSTs to `/api/plays/{name}`.
- "Load" shows a list of saved plays (from `GET /api/plays`) to pick from,
  then GETs the full JSON and replaces the current editor state (clearing
  undo history).

## Milestones

1. Static court + player placement (canvas rendering, click-to-place 5
   offense + 5 defense, positions only — no actions/persistence yet).
2. Save/load JSON (backend endpoints, named saves, list/load UI).
3. Offense action editor + playback (add/edit/reorder/undo-redo actions,
   timeline UI, ball possession tracking, transport controls on offense
   alone, no defense reactions yet).
4. Man-to-man defense reactions (track/help/rim-bias blend, both help
   schemes, assignment UI).
5. Zone defense reactions (home points + shading formula for all four zone
   types, zone-type picker, box-and-1's hybrid defender).
6. Polish (scrub/speed refinement, visual polish, edge cases like defender/
   offense collisions and out-of-bounds clamping).

## Testing approach

- Defense-rule functions (man-to-man blend, zone shading) are pure functions
  of (play state, t) → target positions; write them so they're callable and
  testable outside the canvas rendering loop (plain JS functions taking
  plain data, no DOM dependency) so unit tests can assert on specific
  frames/scenarios without a browser.
- Backend save/load endpoints get basic request/response tests (round-trip
  a play through save then load, list includes it).
