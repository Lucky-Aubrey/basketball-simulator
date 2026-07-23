# Editor Polish — Gantt Time Axis, Pass Dropdown, Coarser Start-Time Step, Gantt Delete

## Scope

Four small, independent usability fixes found from using the editor-v2
build. No data model changes, no new action types, no defense logic. Each
item is isolated enough that a single implementer task per item is
sufficient.

## 1. Gantt time axis

`static/js/gantt.js`'s `createGanttView` currently renders only the 5
player rows with positioned action blocks — there's no visible timescale,
so it's hard to tell what `start_t` a block corresponds to at a glance.

Add a thin ruler row above the player rows: one tick + text label per whole
second (`0s`, `1s`, `2s`, ...) up to the scrub range's max (currently 30s,
matching `#scrub`'s `max` attribute), positioned using the exact same
`LABEL_WIDTH + n * PIXELS_PER_SECOND` formula the action blocks already use,
so a tick at `5s` lines up exactly under any block whose `start_t = 5`.

## 2. Pass/handoff receiver dropdown

Clicking a teammate's dot to set `target_player` for a pass/handoff can be
unreliable: the hit-test in `action-placement.js`'s `findClickedTeammate`
computes each candidate's position via `playerPositionAt(p, capture.startT)`
— the player's position AT THE NEW ACTION'S START TIME — while the canvas
is rendering players at whatever time the playback is currently scrubbed
to. If a teammate has an earlier action that moves them before the new
pass's `start_t`, the dot the user sees on screen and the position the
hit-test checks against can differ, making the teammate hard or impossible
to click accurately.

Add a `<select>` dropdown, shown only when `action-type` is `pass` or
`handoff`, listing every offense player except the one currently selected
in `player-select`. Choosing an option immediately sets the pending target
to `{target_player: <chosen id>}` — going through the same code path
`action-placement.js`'s `onCaptured` callback already uses (auto-fills
duration via `computeDuration`, updates the status text, updates
`pendingAction`) — without requiring any canvas click. Clicking a
teammate's dot continues to work exactly as before, as an alternative;
whichever happens most recently is what gets committed on submit.

The dropdown's option list must exclude the acting player and must
refresh whenever `player-select` changes (so it never lists yourself as a
receiver).

## 3. Start-time step

`static/index.html`'s `#action-start-t` input changes its `step` attribute
from `0.1` to `0.5`. This only affects the browser's up/down-arrow
increment and keyboard-arrow behavior — the field still accepts typed
values at any precision (e.g. `2.3` remains a valid manual entry), matching
how `#action-duration`'s `step="any"` already permits free-form values
alongside a coarser default nudge.

## 4. Delete action via Gantt double-click

Each block rendered by `createGanttView` gets a `dblclick` listener that
removes that action: push to `history` (for undo), call `removeAction`
with the block's player id and its index within that player's `actions`
array, then call both the Gantt view's own `refresh()` and the timeline
editor's `refresh()` (so the per-player list and the Gantt view stay in
sync — this mirrors the existing "Remove" button's behavior in the
per-player list, including its immediate, no-confirmation deletion). Since
`createGanttView` is currently constructed with only
`(play, container, onSelectPlayer)`, it needs access to `history` and to
both refresh functions to do this — the constructor signature grows to
accept them.

## Testing approach

Gantt time axis and delete-via-double-click are DOM-dependent, verified
manually (per project convention, preferring a real headless-browser
session over code-tracing where available). The pass/handoff dropdown's
UI wiring is likewise DOM-dependent/manual; if any new pure logic is
extracted as part of building the dropdown (e.g. a "list of other
offense ids" helper), that piece gets a unit test. The start-time step
change has no automated test (Spec 1's plan didn't test HTML attribute
values, only pure JS behavior).
