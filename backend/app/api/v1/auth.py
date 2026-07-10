from fastapi import APIRouter, Depends, Response, Cookie, Header
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.schemas.auth import LoginRequest, UserResponse, LoginResponse
from app.services.auth_service import AuthService
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, response: Response, db: Session = Depends(get_db)):
    svc = AuthService(db)
    user, token = svc.login(req)

    # Always return token in the response body so the frontend can store it.
    # Also set an HTTP-only cookie for backward compatibility with direct access.
    response.set_cookie(
        key="session_id",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=86400,
    )
    return LoginResponse(
        user=UserResponse.model_validate(user),
        token=token,
    )


@router.post("/logout")
def logout(
    response: Response,
    authorization: Optional[str] = Header(default=None),
    session_id: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
):
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
    elif session_id:
        token = session_id

    if token:
        AuthService(db).logout(token)
    response.delete_cookie("session_id")
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)
