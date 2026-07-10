from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    SECRET_KEY: str = "supersecret-change-in-production-12345678901234567890"
    SESSION_EXPIRE_HOURS: int = 24
    DATABASE_URL: str = "sqlite:///./route53_clone.db"
    CORS_ORIGINS: str = '["http://localhost:3000","http://127.0.0.1:3000"]'

    def get_cors_origins(self) -> List[str]:
        try:
            return json.loads(self.CORS_ORIGINS)
        except Exception:
            return ["http://localhost:3000"]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
