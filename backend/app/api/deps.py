from fastapi import Depends, HTTPException, Cookie, Header, Query
from sqlalchemy.orm import Session as DBSession
from datetime import datetime, timezone
from typing import Optional

from app.core.database import get_db
from app.models.session import Session
from app.models.user import User


def get_current_user(
    # Accept token from Authorization: Bearer <token> header (Vercel→Render proxy)
    authorization: Optional[str] = Header(default=None),
    # Also accept from cookie for direct backend access / local dev
    session_id: Optional[str] = Cookie(default=None),
    db: DBSession = Depends(get_db),
) -> User:
    # Extract token from Bearer header first, fall back to cookie
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
    elif session_id:
        token = session_id

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session = db.query(Session).filter_by(id=token).first()
    if not session:
        raise HTTPException(status_code=401, detail="Session not found")
    if session.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    return session.user


class PaginationParams:
    def __init__(
        self,
        page: int = Query(default=1, ge=1),
        page_size: int = Query(default=25, ge=1, le=100),
    ):
        self.page = page
        self.page_size = page_size
        self.offset = (page - 1) * page_size


class SearchParams:
    def __init__(self, q: Optional[str] = Query(default=None)):
        self.q = q
