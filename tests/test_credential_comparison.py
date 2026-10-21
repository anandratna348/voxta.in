
import keyring

from app.services.gemini_credentials import (
    SERVICE_NAME,
    get_api_key,
)

user_id = "test-user"

direct_key = keyring.get_password("Voxta.Gemini", user_id)
service_key = get_api_key(user_id)

print("Direct lookup found key:", direct_key is not None)
print("Voxta lookup found key:", service_key is not None)
print("Both lookups match:", direct_key == service_key)
print("Configured service name matches:", SERVICE_NAME == "Voxta.Gemini")
