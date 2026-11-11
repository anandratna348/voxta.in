
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.db.database import upsert_google_user
from app.services.google_auth_service import (
    GoogleAuthError,
    verify_google_token,
)
from app.services.google_oauth_flow import get_google_login_result, start_google_login
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

@router.get("/google/start")
def google_login_start():
    try:
        return start_google_login()
    except ValueError as exc:
        raise HTTPException(
            status_code=500,
            detail="Google OAuth is not configured.",
        ) from exc


@router.get("/google/result")
def google_login_result(state: str = Query(min_length=20, max_length=200)):
    """Lets the desktop app collect the outcome of the browser sign-in it started."""
    result = get_google_login_result(state)
    if result is None:
        return {"status": "pending"}
    if result["status"] == "success":
        return {"status": "success", "user": result["user"]}
    return {"status": "error", "message": result.get("message", "Google sign-in failed.")}
