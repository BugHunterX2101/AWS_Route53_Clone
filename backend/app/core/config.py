from pydantic_settings import BaseSettings
from typing import List
import json
import re


class Settings(BaseSettings):
    SECRET_KEY: str = "supersecret-change-in-production-12345678901234567890"
    SESSION_EXPIRE_HOURS: int = 24
    DATABASE_URL: str = "sqlite:///./route53_clone.db"

    # JSON array of allowed origins, e.g.:
    #   '["https://route53-clone-frontend.onrender.com","http://localhost:3000"]'
    # Set CORS_ALLOW_ALL=true to allow all origins (useful for initial Render testing)
    CORS_ORIGINS: str = '["http://localhost:3000","http://127.0.0.1:3000"]'
    CORS_ALLOW_ALL: bool = False

    def get_cors_origins(self) -> List[str]:
        if self.CORS_ALLOW_ALL:
            return ["*"]
        try:
            origins = json.loads(self.CORS_ORIGINS)
            # Always include localhost for local dev
            defaults = ["http://localhost:3000", "http://127.0.0.1:3000"]
            for d in defaults:
                if d not in origins:
                    origins.append(d)
            return origins
        except Exception:
            return ["http://localhost:3000"]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
