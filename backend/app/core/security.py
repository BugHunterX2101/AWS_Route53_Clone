import secrets
import warnings
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from app.core.config import settings

# Suppress passlib warning that fires when bcrypt >= 4.x is installed.
# passlib 1.7.4 tries to read bcrypt.__about__.__version__ which was removed
# in bcrypt 4.x. The library still works correctly; this just silences the noise.
warnings.filterwarnings("ignore", message=".*error reading bcrypt version.*")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def generate_session_token() -> str:
    return secrets.token_urlsafe(32)


def session_expires_at() -> datetime:
    return datetime.now(timezone.utc) + timedelta(hours=settings.SESSION_EXPIRE_HOURS)
