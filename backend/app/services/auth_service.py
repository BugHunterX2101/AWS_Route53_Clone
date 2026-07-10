from sqlalchemy.orm import Session
from fastapi import HTTPException
from datetime import datetime, timezone

from app.models.user import User
from app.models.session import Session as SessionModel
from app.core.security import hash_password, verify_password, generate_session_token, session_expires_at
from app.schemas.auth import LoginRequest


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def login(self, req: LoginRequest) -> tuple[User, str]:
        user = self.db.query(User).filter_by(email=req.email.lower()).first()
        if not user or not verify_password(req.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        token = generate_session_token()
        session = SessionModel(
            id=token,
            user_id=user.id,
            expires_at=session_expires_at(),
        )
        self.db.add(session)
        self.db.commit()
        return user, token

    def logout(self, session_id: str) -> None:
        session = self.db.query(SessionModel).filter_by(id=session_id).first()
        if session:
            self.db.delete(session)
            self.db.commit()

    def get_user_by_email(self, email: str) -> User | None:
        return self.db.query(User).filter_by(email=email.lower()).first()

    def create_user(self, email: str, password: str, name: str | None = None) -> User:
        user = User(
            email=email.lower(),
            password_hash=hash_password(password),
            name=name,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user
