import secrets
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def generate_session_token() -> str:
    return secrets.token_urlsafe(32)


def session_expires_at() -> datetime:
    return datetime.now(timezone.utc) + timedelta(hours=settings.SESSION_EXPIRE_HOURS)
