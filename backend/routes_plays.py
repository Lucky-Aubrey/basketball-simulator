import re

from fastapi import APIRouter, HTTPException

from . import plays_store

router = APIRouter(prefix="/api/plays")
NAME_RE = re.compile(r"^[A-Za-z0-9_-]+$")


def _validate_name(name: str) -> None:
    if not NAME_RE.match(name):
        raise HTTPException(status_code=400, detail="invalid play name")


@router.get("")
def list_plays() -> list[str]:
    return plays_store.list_plays()


@router.get("/{name}")
def get_play(name: str) -> dict:
    _validate_name(name)
    try:
        return plays_store.load_play(name)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="play not found")


@router.post("/{name}")
def put_play(name: str, play: dict) -> dict:
    _validate_name(name)
    plays_store.save_play(name, play)
    return {"status": "saved"}
