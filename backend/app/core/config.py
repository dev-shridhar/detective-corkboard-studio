from typing import List, Union, Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application-wide configuration loaded from environment variables.
    All secrets (DB URL, secret key) must be set via .env or deployment env vars.
    Never hardcode secrets here.
    """

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Application
    APP_NAME: str = "Detective Corkboard Studio"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"  # development | production

    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/corkboard_db"

    # JWT Authentication
    SECRET_KEY: str = "change-this-to-a-long-random-secret-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # SMTP Email Configuration
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: Optional[str] = None

    ALLOWED_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://localhost:8080",
        "https://detectivecorkboard.com",
        "https://www.detectivecorkboard.com",
        "https://board.learnwitharies.com",
        "https://learnwitharies.com",
    ]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v: Union[str, List[str]]) -> List[str]:
        origins = []
        if isinstance(v, str):
            v_stripped = v.strip()
            if v_stripped.startswith("[") and v_stripped.endswith("]"):
                import json
                try:
                    origins = json.loads(v_stripped)
                except Exception:
                    pass
            if not origins:
                origins = [origin.strip() for origin in v_stripped.split(",") if origin.strip()]
        else:
            origins = list(v)

        # Guarantee that our primary live custom domains are always in the CORS whitelist
        extra_origins = [
            "https://board.learnwitharies.com",
            "https://learnwitharies.com",
            "https://detectivecorkboard.com",
            "https://www.detectivecorkboard.com",
            "https://detectiveboard.com",
            "https://www.detectiveboard.com",
            "https://detective-corkboard-studio.vercel.app",
        ]
        for origin in extra_origins:
            if origin not in origins:
                origins.append(origin)
        return origins


# Singleton settings instance — import this everywhere
settings = Settings()
