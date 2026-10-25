
import base64
import hashlib
import json
import secrets
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlencode, urlparse
from urllib.request import Request, urlopen

from app.core.config import get_settings
from app.db.database import upsert_google_user
from app.services.google_auth_service import (
    GoogleAuthError,
    verify_google_token,
)

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
REDIRECT_URI = "http://127.0.0.1:8766/callback"
LOGIN_TIMEOUT = 300

_pending = {}
_results = {}
_lock = threading.Lock()
_server = None


def _base64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _exchange_code(code: str, verifier: str) -> dict:
    settings = get_settings()
    payload = {
        "client_id": settings.google_client_id,
        "code": code,
        "code_verifier": verifier,
        "grant_type": "authorization_code",
        "redirect_uri": REDIRECT_URI,
    }

    request = Request(
        GOOGLE_TOKEN_URL,
        data=urlencode(payload).encode("utf-8"),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=15) as response:
            token_data = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, ValueError) as exc:
        raise ValueError("Google authorization-code exchange failed.") from exc

    id_token_value = token_data.get("id_token")
    if not id_token_value:
        raise ValueError("Google did not return an ID token.")

    profile = verify_google_token(id_token_value)
    return upsert_google_user(profile)


def _ensure_callback_server():
    global _server

    with _lock:
        if _server is not None:
            return

        class CallbackHandler(BaseHTTPRequestHandler):
            def do_GET(self):
                parsed = urlparse(self.path)

                if parsed.path != "/callback":
                    self.send_error(404)
                    return

                params = parse_qs(parsed.query)
                state = params.get("state", [""])[0]
                code = params.get("code", [""])[0]
                error = params.get("error", [""])[0]
                print("DEBUG: Callback path:", parsed.path)
                print("DEBUG: State parameter present:", bool(state))
                print("DEBUG: Pending state prefixes:", [key[:8] for key in _pending])
                print("DEBUG: Callback state prefix:", state[:8] if state else "MISSING")

                with _lock:
                    print("DEBUG: Pending login count:", len(_pending))
                    print("DEBUG: Callback state length:", len(state))
                    print("DEBUG: Pending state lengths:", [len(key) for key in _pending])
                    print("DEBUG: Exact state match:", bool(state) and state in _pending)

                    if state and state not in _pending:
                        print(
                               "DEBUG: Similar state lengths:",
                            [
                               (len(key), sum(a == b for a, b in zip(key, state)))
                                 for key in _pending
                            ],
                            )

                    login = _pending.pop(state, None) if state else None
                    print("DEBUG: Matching pending login:", login is not None)

                if not login or time.time() - login["created_at"] > LOGIN_TIMEOUT:
                    self._respond(400, "Login expired or invalid. Return to Voxta and try again.")
                    return

                try:
                    if error:
                        raise ValueError("Google sign-in was cancelled or denied.")
                    if not code:
                        raise ValueError("Google did not return an authorization code.")

                    user = _exchange_code(code, login["verifier"])

                    with _lock:
                        _results[state] = {
                            "status": "success",
                            "user": user,
                            "created_at": time.time(),
                        }

                    self._respond(
                        200,
                        "Google sign-in successful. You can return to Voxta.",
                    )
                except (ValueError, GoogleAuthError) as exc:
                    with _lock:
                        _results[state] = {
                            "status": "error",
                            "message": str(exc),
                            "created_at": time.time(),
                        }
                    self._respond(
                        400,
                        "Google sign-in failed. Return to Voxta and try again.",
                    )
                except Exception:
                    with _lock:
                        _results[state] = {
                            "status": "error",
                            "message": "Google sign-in failed.",
                            "created_at": time.time(),
                        }
                    self._respond(
                        500,
                        "Google sign-in failed. Return to Voxta and try again.",
                    )

            def _respond(self, status_code, message):
                body = (
                    "<!doctype html><html><head><meta charset='utf-8'>"
                    "<title>Voxta sign-in</title></head><body>"
                    "<h2>Voxta sign-in</h2><p>"
                    + message
                    + "</p></body></html>"
                ).encode("utf-8")
                self.send_response(status_code)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(body)

            def log_message(self, format, *args):
                return

        try:
            _server = ThreadingHTTPServer(("127.0.0.1", 8766), CallbackHandler)
        except OSError as exc:
            raise ValueError(
                "Cannot start Google callback listener on 127.0.0.1:8766. "
                "Check whether the port is already in use."
            ) from exc

        threading.Thread(target=_server.serve_forever, daemon=True).start()


def start_google_login() -> dict:
    settings = get_settings()
    if not settings.google_client_id:
        raise ValueError("Google OAuth client ID is not configured.")

    _ensure_callback_server()

    verifier = _base64url(secrets.token_bytes(32))
    challenge = _base64url(hashlib.sha256(verifier.encode("ascii")).digest())
    state = secrets.token_urlsafe(32)

    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "state": state,
    }

    with _lock:
        _pending[state] = {
            "verifier": verifier,
            "created_at": time.time(),
        }
        print("DEBUG: Google login state stored:", state[:8])

    return {
        "authorization_url": f"{GOOGLE_AUTH_URL}?{urlencode(params)}",
        "state": state,
    }


def get_google_login_result(state: str) -> dict | None:
    """Return the result of a completed login attempt."""
    with _lock:
        result = _results.get(state)
        if result and time.time() - result["created_at"] > LOGIN_TIMEOUT:
            _results.pop(state, None)
            return None
        return result
