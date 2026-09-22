from __future__ import annotations

import os
import shutil
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.config import settings
from app.models import SightingCreate, SightingOut

_lock = threading.Lock()

HUB_DB_DIR = Path("/var/lib/snakespotter")
HUB_DB = HUB_DB_DIR / "sightings.db"


def _configured_path() -> Path:
    path = Path(settings.database_path)
    if not path.is_absolute():
        path = Path(__file__).resolve().parent.parent / path
    return path


def _db_path() -> Path:
    # Hub deploys rsync --delete into /opt/snakespotter. Keep sightings in the
    # data directory that systemd already marks writable.
    if HUB_DB_DIR.is_dir() and os.access(HUB_DB_DIR, os.W_OK):
        return HUB_DB
    return _configured_path()


def _copy_sqlite(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dest)
    for suffix in ("-wal", "-shm", "-journal"):
        extra = Path(f"{src}{suffix}")
        if extra.exists():
            shutil.copy2(extra, Path(f"{dest}{suffix}"))


def init_db() -> None:
    path = _db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    legacy = _configured_path()
    if path != legacy and legacy.exists() and not path.exists():
        _copy_sqlite(legacy, path)
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sightings (
                id TEXT PRIMARY KEY,
                species TEXT NOT NULL,
                notes TEXT NOT NULL DEFAULT '',
                observed_at TEXT NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_sightings_observed_at
            ON sightings (observed_at DESC)
            """
        )
        conn.commit()


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(_db_path(), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def _to_iso(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat()


def _parse_iso(value: str) -> datetime:
    return datetime.fromisoformat(value)


def _row_to_sighting(row: sqlite3.Row) -> SightingOut:
    return SightingOut(
        id=row["id"],
        species=row["species"],
        notes=row["notes"],
        observed_at=_parse_iso(row["observed_at"]),
        latitude=row["latitude"],
        longitude=row["longitude"],
        created_at=_parse_iso(row["created_at"]),
    )


def list_sightings() -> list[SightingOut]:
    with _lock, _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM sightings ORDER BY observed_at DESC, created_at DESC"
        ).fetchall()
    return [_row_to_sighting(row) for row in rows]


def get_sighting(sighting_id: str) -> SightingOut | None:
    with _lock, _connect() as conn:
        row = conn.execute(
            "SELECT * FROM sightings WHERE id = ?", (sighting_id,)
        ).fetchone()
    if row is None:
        return None
    return _row_to_sighting(row)


def create_sighting(payload: SightingCreate) -> SightingOut:
    now = datetime.now(timezone.utc)
    sighting = SightingOut(
        id=str(uuid.uuid4()),
        species=payload.species,
        notes=payload.notes,
        observed_at=payload.observed_at,
        latitude=payload.latitude,
        longitude=payload.longitude,
        created_at=now,
    )
    with _lock, _connect() as conn:
        conn.execute(
            """
            INSERT INTO sightings (
                id, species, notes, observed_at, latitude, longitude, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                sighting.id,
                sighting.species,
                sighting.notes,
                _to_iso(sighting.observed_at),
                sighting.latitude,
                sighting.longitude,
                _to_iso(sighting.created_at),
            ),
        )
        conn.commit()
    return sighting


def delete_sighting(sighting_id: str) -> bool:
    with _lock, _connect() as conn:
        cursor = conn.execute("DELETE FROM sightings WHERE id = ?", (sighting_id,))
        conn.commit()
        return cursor.rowcount > 0
