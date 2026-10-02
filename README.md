# Basketball Defense Simulator

A browser-based half-court play designer. Place five offensive players, give each
a sequence of timed actions (cuts, screens, dribbles, passes, handoffs, shots,
relocations), pick a defense, and watch the defenders react frame by frame.

The defense is rule-based and tunable — simple geometric rules, no ML or
pathfinding — so you can see how a play stresses man-to-man or zone coverage.

## Features

- **Play editor** — click on the court to set action targets, pick pass/handoff
  receivers from a dropdown, undo/redo every edit.
- **Gantt timeline** — each player's actions shown on a shared time axis;
  double-click a block to delete it.
- **Playback** — play, pause, step, scrub, and 0.25x–2x speed.
- **Defense**
  - Man-to-man with configurable assignments, uniform or tiered help, and
    tunable lag, help weight, and rim bias.
  - Zones: 2-3, 3-2, 1-3-1, and box-and-1, with ball/gap shading parameters.
- **Save/load** — plays are stored as named JSON files in `plays/`.

## Requirements

- Python 3.13+ and [uv](https://docs.astral.sh/uv/)
- Node.js (only for running the frontend tests)

## Running

```sh
uv sync
uv run uvicorn backend.app:app --reload
```

Then open http://localhost:8000. Load `trigger-1-screens` from the dropdown for
an example play.

## Tests

```sh
# Backend (FastAPI routes and play storage)
uv run pytest

# Frontend (simulation, defense, geometry, state)
cd static && node --test 'js/tests/*.test.js'
```

## Project layout

```
backend/        FastAPI app: serves static/ and the /api/plays JSON store
static/         Frontend — plain HTML, Canvas, and vanilla ES modules (no build step)
  js/defense/   Man-to-man and zone defender logic
  js/tests/     node:test unit tests
plays/          Saved plays (JSON)
docs/           Design specs and implementation plans
```

All simulation runs client-side; the backend is only a static file server plus
a filesystem-backed JSON store.

### API

| Method | Path                 | Description            |
| ------ | -------------------- | ---------------------- |
| GET    | `/api/plays`         | List saved play names  |
| GET    | `/api/plays/{name}`  | Load a play            |
| POST   | `/api/plays/{name}`  | Save/overwrite a play  |

Play names must match `[A-Za-z0-9_-]+`.

## Coordinates

Half-court in feet, origin at the basket: `x ∈ [-25, 25]` (sideline to
sideline), `y ∈ [0, 47]` (baseline to half-court line).
