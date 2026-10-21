
import keyring
from keyring.errors import KeyringError

SERVICE_NAME = "Voxta.Gemini"


class CredentialStorageError(Exception):
    """Raised when the operating-system credential store fails."""


def save_api_key(user_id: str, api_key: str) -> None:
    user_id = user_id.strip()
    api_key = api_key.strip()

    if not user_id:
        raise ValueError("User ID is required")

    if not api_key:
        raise ValueError("Gemini API key is required")

    try:
        keyring.set_password(SERVICE_NAME, user_id, api_key)
    except KeyringError as exc:
        raise CredentialStorageError(
            "Could not save the API key to the system credential store"
        ) from exc


def get_api_key(user_id: str) -> str | None:
    try:
        return keyring.get_password(SERVICE_NAME, user_id.strip())
    except KeyringError as exc:
        raise CredentialStorageError(
            "Could not access the system credential store"
        ) from exc


def delete_api_key(user_id: str) -> None:
    user_id = user_id.strip()

    try:
        if keyring.get_password(SERVICE_NAME, user_id) is not None:
            keyring.delete_password(SERVICE_NAME, user_id)
    except KeyringError as exc:
        raise CredentialStorageError(
            "Could not delete the API key from the system credential store"
        ) from exc
