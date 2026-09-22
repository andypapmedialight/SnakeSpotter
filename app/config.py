from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    google_maps_api_key: str = ""
    admin_password: str = ""
    host: str = "0.0.0.0"
    port: int = 4867
    database_path: str = "data/sightings.db"

    @property
    def maps_enabled(self) -> bool:
        return bool(self.google_maps_api_key.strip())

    @property
    def admin_enabled(self) -> bool:
        return bool(self.admin_password.strip())


settings = Settings()
