from contextlib import asynccontextmanager
from json import dumps
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app import area, species
from app.admin import (
    COOKIE_NAME,
    AdminAuth,
    clear_session_cookie,
    password_matches,
    set_session_cookie,
    verify_session,
)
from app.config import settings
from app.db import create_sighting, delete_sighting, get_sighting, init_db, list_sightings
from app.models import (
    AdminLogin,
    AdminSession,
    AppConfig,
    ErrorMessage,
    SightingCreate,
    SightingList,
    SightingOut,
)

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
            "admin_enabled": settings.admin_enabled,
            "area": area,
            "species_names": species.NAMES,
            "species": species.SPECIES,
            "species_json": dumps(species.SPECIES),
            "reaches_json": dumps(area.REACHES),
        },
    )


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.get("/api/config", response_model=AppConfig)
def read_config() -> AppConfig:
    return AppConfig(
        maps_enabled=settings.maps_enabled,
        admin_enabled=settings.admin_enabled,
    )


@app.get("/api/admin/session", response_model=AdminSession)
def read_admin_session(request: Request) -> AdminSession:
    token = request.cookies.get(COOKIE_NAME)
    return AdminSession(signed_in=verify_session(token))


@app.post(
    "/api/admin/login",
    response_model=AdminSession,
    responses={401: {"model": ErrorMessage}, 403: {"model": ErrorMessage}},
)
def admin_login(payload: AdminLogin, request: Request, response: Response) -> AdminSession:
    if not settings.admin_enabled:
        raise HTTPException(status_code=403, detail="Admin is not configured")
    if not password_matches(payload.password):
        raise HTTPException(status_code=401, detail="Invalid password")
    set_session_cookie(response, request)
    return AdminSession(signed_in=True)


@app.post("/api/admin/logout", response_model=AdminSession)
def admin_logout(request: Request, response: Response) -> AdminSession:
    clear_session_cookie(response, request)
    return AdminSession(signed_in=False)


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


@app.delete(
    "/api/sightings/{sighting_id}",
    status_code=204,
    responses={
        401: {"model": ErrorMessage},
        403: {"model": ErrorMessage},
        404: {"model": ErrorMessage},
    },
)
def remove_sighting(sighting_id: str, _: AdminAuth) -> Response:
    if not delete_sighting(sighting_id):
        raise HTTPException(status_code=404, detail="Sighting not found")
    return Response(status_code=204)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=False,
    )
