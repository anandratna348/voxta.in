
import getpass
import keyring

service = "Voxta.Gemini"
user_id = "test-user"

api_key = getpass.getpass("paste your api key").strip()

if not api_key:
    print("No key entered.")
else:
    keyring.set_password(service, user_id, api_key)
    saved = keyring.get_password(service, user_id)

    print("Key found immediately:", saved is not None)
    print("Key matches:", saved == api_key)
