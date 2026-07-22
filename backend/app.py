from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .routes_plays import router as plays_router

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"

app = FastAPI()
app.include_router(plays_router)
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
