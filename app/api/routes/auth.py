
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.db.database import upsert_google_user
from app.services.google_auth_service import (
    GoogleAuthError,
    verify_google_token,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


class GoogleLoginRequest(BaseModel):
    id_token: str = Field(min_length=1, max_length=10000)


class UserResponse(BaseModel):
    id: str
    google_id: str
    email: str
    name: str
    picture: str
    created_at: str


@router.post("/google", response_model=UserResponse)
def google_login(payload: GoogleLoginRequest):
    try:
        profile = verify_google_token(payload.id_token)
        user = upsert_google_user(profile)
        return user
    except GoogleAuthError as exc:
        raise HTTPException(
            status_code=401,
            detail=str(exc),
        ) from exc
