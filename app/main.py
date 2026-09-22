from contextlib import asynccontextmanager
from json import dumps
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app import area, species
from app.config import settings
from app.db import create_sighting, get_sighting, init_db, list_sightings
from app.models import AppConfig, ErrorMessage, SightingCreate, SightingList, SightingOut

ROOT = Path(__file__).resolve().parent.parent


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="SnakeSpotter",
    description="A field log for snake sightings along Edgars Creek in Coburg North.",
    version="1.0.0",
    lifespan=lifespan,
)

app.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")
templates = Jinja2Templates(directory=str(ROOT / "templates"))


@app.get("/", response_class=HTMLResponse, include_in_schema=False)
def home(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "google_maps_api_key": settings.google_maps_api_key.strip(),
            "maps_enabled": settings.maps_enabled,
            "area": area,
            "species_names": species.NAMES,
            "species": species.SPECIES,
            "species_json": dumps(species.SPECIES),
        },
    )


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.get("/api/config", response_model=AppConfig)
def read_config() -> AppConfig:
    return AppConfig(maps_enabled=settings.maps_enabled)


@app.get("/api/sightings", response_model=SightingList)
def read_sightings() -> SightingList:
    return SightingList(items=list_sightings())


@app.post(
    "/api/sightings",
    response_model=SightingOut,
    status_code=201,
    responses={422: {"model": ErrorMessage}},
)
def add_sighting(payload: SightingCreate) -> SightingOut:
    return create_sighting(payload)


@app.get(
    "/api/sightings/{sighting_id}",
    response_model=SightingOut,
    responses={404: {"model": ErrorMessage}},
)
def read_sighting(sighting_id: str) -> SightingOut:
    sighting = get_sighting(sighting_id)
    if sighting is None:
        raise HTTPException(status_code=404, detail="Sighting not found")
    return sighting


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=False,
    )
