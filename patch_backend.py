"""
Adds in-app Google sign-in support to the Voxta backend.

  1. GET /api/v1/auth/google/result?state=...   (lets the app collect the sign-in result)
  2. Sends the Google client secret in the token exchange when VOXTA_GOOGLE_CLIENT_SECRET is set
  3. Prints Google's real error if the token exchange fails

Run from the backend root (the folder that contains "app"):  python patch_backend.py
Safe to run twice. Original files are saved with a .bak extension.
"""
import pathlib
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parent
AUTH = ROOT / "app" / "api" / "routes" / "auth.py"
FLOW = ROOT / "app" / "services" / "google_oauth_flow.py"


def read(path):
    return path.read_text(encoding="utf-8").replace("\r\n", "\n")


def replace_once(text, old, new, label):
    if old not in text:
        sys.exit(f"Could not find the expected code for: {label}. Nothing was changed for this step.")
    return text.replace(old, new, 1)


for p in (AUTH, FLOW):
    if not p.exists():
        sys.exit(f"File not found: {p}. Run this script from the backend root folder.")

# ---- auth.py -------------------------------------------------------------
auth = read(AUTH)
if "get_google_login_result" in auth:
    print("auth.py already patched, skipping.")
else:
    shutil.copy(AUTH, str(AUTH) + ".bak")
    auth = replace_once(auth, "from fastapi import APIRouter, HTTPException", "from fastapi import APIRouter, HTTPException, Query", "fastapi import")
    auth = replace_once(
        auth,
        "from app.services.google_oauth_flow import start_google_login",
        "from app.services.google_oauth_flow import get_google_login_result, start_google_login",
        "oauth flow import",
    )
    auth = auth.rstrip("\n") + '''


@router.get("/google/result")
def google_login_result(state: str = Query(min_length=20, max_length=200)):
    """Lets the desktop app collect the outcome of the browser sign-in it started."""
    result = get_google_login_result(state)
    if result is None:
        return {"status": "pending"}
    if result["status"] == "success":
        return {"status": "success", "user": result["user"]}
    return {"status": "error", "message": result.get("message", "Google sign-in failed.")}
'''
    AUTH.write_text(auth, encoding="utf-8", newline="\n")
    print("auth.py patched.")

# ---- google_oauth_flow.py --------------------------------------------------
flow = read(FLOW)
if "client_secret" in flow:
    print("google_oauth_flow.py already patched, skipping.")
else:
    shutil.copy(FLOW, str(FLOW) + ".bak")
    flow = replace_once(
        flow,
        '        "redirect_uri": REDIRECT_URI,\n    }\n',
        '        "redirect_uri": REDIRECT_URI,\n    }\n    if settings.google_client_secret:\n        payload["client_secret"] = settings.google_client_secret\n',
        "token payload",
    )
    flow = replace_once(
        flow,
        '    except (HTTPError, URLError, TimeoutError, ValueError) as exc:\n        raise ValueError("Google authorization-code exchange failed.") from exc',
        '    except HTTPError as exc:\n        detail = exc.read().decode("utf-8", errors="replace")[:300]\n        print("Google token exchange error:", exc.code, detail)\n        raise ValueError("Google authorization-code exchange failed.") from exc\n    except (URLError, TimeoutError, ValueError) as exc:\n        raise ValueError("Google authorization-code exchange failed.") from exc',
        "token error handling",
    )
    FLOW.write_text(flow, encoding="utf-8", newline="\n")
    print("google_oauth_flow.py patched.")

print("Done. Restart the backend.")