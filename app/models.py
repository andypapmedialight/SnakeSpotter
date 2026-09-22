from datetime import datetime

from pydantic import BaseModel, Field, field_validator

UNSURE_SPECIES = "Unsure"


class SightingCreate(BaseModel):
    species: str = Field(default=UNSURE_SPECIES, max_length=120)
    notes: str = Field(default="", max_length=4000)
    observed_at: datetime
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)

    @field_validator("species", mode="before")
    @classmethod
    def normalize_species(cls, value: object) -> str:
        if value is None:
            return UNSURE_SPECIES
        cleaned = str(value).strip()
        if not cleaned or cleaned.casefold() == UNSURE_SPECIES.casefold():
            return UNSURE_SPECIES
        return cleaned

    @field_validator("notes")
    @classmethod
    def strip_notes(cls, value: str) -> str:
        return value.strip()


class SightingOut(BaseModel):
    id: str
    species: str
    notes: str
    observed_at: datetime
    latitude: float
    longitude: float
    created_at: datetime


class SightingList(BaseModel):
    items: list[SightingOut]


class AppConfig(BaseModel):
    maps_enabled: bool


class ErrorMessage(BaseModel):
    detail: str
