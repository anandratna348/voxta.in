# Voxta License API contract

This is what the Voxta desktop app expects from the license server. The app side is finished and
tested against a mock server that follows this document (tools/mock-license-server.mjs). Build the
real server to match, and the app will work without changes.

## Flow

1. The person buys a plan on the Voxta website and receives a license key.
2. They enter the key in Voxta Desktop (activation screen).
3. The app calls `POST /licenses/activate`. The server checks the key, expiry, activation limit and
   revocation status.
4. The server returns a signed, time limited token (the entitlement).
5. The app verifies the signature with the public key built into it, stores the token, and unlocks
   the permitted features.
6. While running, the app renews the token with `POST /licenses/refresh` (on launch, every 6 hours
   and when the window regains focus after an hour). Revocation takes effect at the next renewal.

The license key is never stored by the app. Only the token is, and it works only on the computer it
was issued for.

## Base URL

Set in the app with `VITE_LICENSE_API_URL`, for example `https://license.example.com/v1`.
HTTPS is required in production. In development the mock server uses `http://127.0.0.1:8790/v1`.

## Token format

```
base64url(payload JSON bytes) + "." + base64url(signature)
```

The signature is Ed25519 over the exact payload bytes (not over the base64 text). The app embeds the
32 byte raw public key, base64url encoded, as `VITE_LICENSE_PUBLIC_KEY`. The private key stays on the
server only.

Payload claims (times are seconds since 1970):

| Claim | Type | Meaning |
| --- | --- | --- |
| `v` | number | Token version. Currently `1`. |
| `lic` | string | Stable license id. Not the key. The app uses it as the owner of local meetings. |
| `plan` | string | Plan code, for example `pro`. |
| `plan_name` | string, optional | Display name, for example `Pro`. |
| `holder` | string, optional | Name shown in the app. Do not send a full email address. |
| `features` | string[] | Granted features. Known values: `meetings`, `ai_copilot`, `pdf_export`. |
| `device` | string | The `device_id` sent by the app. The app rejects a token for another device. |
| `iat` | number | Issued at. |
| `exp` | number | Token expiry. Use `min(now + 7 days, license_expires)`. |
| `license_expires` | number or null, optional | When the purchased license ends. Null means no end date. |

Recommended token lifetime is 7 days. A shorter lifetime makes revocation faster. A longer one
allows longer offline use.

## Endpoints

All requests and responses are JSON. Errors use one shape (see Errors).

### POST /licenses/activate

```json
{ "license_key": "VOXTA-XXXX-XXXX-XXXX-XXXX", "device_id": "<sha256 hex>", "device_name": "Windows PC", "app_version": "0.1.0" }
```

Success `200`: `{ "token": "<token>" }`

Rules:
- Normalise the key (trim, upper case) before lookup.
- Refuse unknown, expired and revoked licenses.
- Activation is idempotent per `device_id`. A device that is already activated gets a new token and
  does not use another seat.
- If the license is at its activation limit and this device is new, refuse with
  `activation_limit_reached`.

### POST /licenses/refresh

```json
{ "token": "<current token>", "device_id": "<sha256 hex>", "app_version": "0.1.0" }
```

Success `200`: `{ "token": "<new token>" }`

Rules:
- Verify the signature on the presented token. Reject with `invalid_token` if it is bad.
- Accept tokens that expired up to 30 days ago, so a laptop that was offline can recover. Older
  tokens get `invalid_token` and the person must activate again.
- `device_id` must equal the token's `device` claim, otherwise `device_mismatch`.
- Check revocation and expiry again, so a revoked license is refused here.

### POST /licenses/deactivate

```json
{ "token": "<current token>", "device_id": "<sha256 hex>" }
```

Success `200`: `{ "deactivated": true }`. Frees the seat so the license can be used elsewhere.

## Errors

```json
{ "error": { "code": "revoked", "message": "This license has been revoked." } }
```

| HTTP | `code` | When |
| --- | --- | --- |
| 404 | `invalid_key` | The key does not exist. |
| 403 | `expired` | The license has expired. |
| 403 | `revoked` | The license was revoked. |
| 409 | `activation_limit_reached` | All seats are in use. |
| 401 | `invalid_token` | Bad signature, unknown license, or token too old to refresh. |
| 403 | `device_mismatch` | The token belongs to a different device. |
| 429 | `rate_limited` | Too many attempts. Rate limit by IP and by key. |
| 400 | `bad_request` | Missing or malformed fields. |

The app treats `invalid_key`, `expired`, `revoked`, `invalid_token` and `device_mismatch` as final and
locks. Network errors, timeouts, `429` and `5xx` are treated as temporary: the app keeps working until
the token's `exp`, then asks for an online check.

## Device id

The app sends a SHA-256 hash of the Windows machine id with an app specific prefix. It never sends the
raw machine id. Treat it as an opaque string.

## Signing keys

- Generate an Ed25519 key pair. Keep the private key in a secrets manager, never in the repository.
- Put the raw 32 byte public key, base64url encoded, in the app build as `VITE_LICENSE_PUBLIC_KEY`.
- To rotate keys later, add a `kid` claim and ship the app with several public keys. Version 1 has one.

## What the app enforces, and what it cannot

The app verifies the signature, the device, the expiry and the clock, and shows or hides features.
Because desktop code can be modified by its user, these checks are the user experience layer.
Real enforcement belongs in the local backend, which does the paid work.

Next phase, local backend: the app sends the token to the local Voxta backend (for example
`POST /api/v1/license/entitlement`). The backend verifies it with the same public key, checks `device`
and `exp`, and refuses gated routes (`ai_copilot`, `pdf_export`) without a valid entitlement.

## Local testing

```
node tools/mock-license-server.mjs --write-env
```

Test keys: `VOXTA-TEST-PRO1-0000-0001` (all features), `VOXTA-TEST-BASC-0000-0002` (meetings only),
`VOXTA-TEST-EXPD-0000-0003` (expired), `VOXTA-TEST-REVK-0000-0004` (revoked),
`VOXTA-TEST-LIMT-0000-0005` (one computer only).
Revoke live with `/dev/revoke?key=KEY`, restore with `/dev/restore?key=KEY`, reset all with `/dev/reset`.