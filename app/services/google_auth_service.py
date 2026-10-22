
from google.auth.transport import requests
from google.oauth2 import id_token

from app.core.config import get_settings


class GoogleAuthError(Exception):
    """Raised when Google authentication fails."""


def verify_google_token(token: str) -> dict:
    """Verify a Google ID token and return trusted user information."""
    settings = get_settings()

    if not settings.google_client_id:
        raise GoogleAuthError("Google authentication is not configured.")

    try:
        id_info = id_token.verify_oauth2_token(
            token,
            requests.Request(),
            settings.google_client_id,
        )
    except ValueError as exc:
        raise GoogleAuthError("Invalid or expired Google ID token.") from exc
    except Exception as exc:
        raise GoogleAuthError("Unable to verify Google ID token.") from exc

    if id_info.get("iss") not in (
        "accounts.google.com",
        "https://accounts.google.com",
    ):
        raise GoogleAuthError("Invalid token issuer.")

    if not id_info.get("sub") or not id_info.get("email"):
        raise GoogleAuthError("Google account information is incomplete.")

    if not id_info.get("email_verified", False):
        raise GoogleAuthError("Google email address is not verified.")

    return {
        "google_id": id_info["sub"],
        "email": id_info["email"],
        "name": id_info.get("name", ""),
        "picture": id_info.get("picture", ""),
    }
