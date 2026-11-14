import * as ed from "@noble/ed25519";
import { config } from "@/api/config";
import type { Entitlement } from "./types";

export class TokenError extends Error {}

export function b64urlToBytes(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (input.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text) as BufferSource);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Checks the Ed25519 signature on a token and returns its claims.
 * Token format: base64url(payload JSON) + "." + base64url(signature over the payload bytes).
 */
export async function verifyToken(token: string): Promise<Entitlement> {
  const parts = token.trim().split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw new TokenError("Malformed token");
  if (!config.licensePublicKey) throw new TokenError("No public key configured");

  let payload: Uint8Array;
  let signature: Uint8Array;
  let publicKey: Uint8Array;
  try {
    payload = b64urlToBytes(parts[0]);
    signature = b64urlToBytes(parts[1]);
    publicKey = b64urlToBytes(config.licensePublicKey);
  } catch {
    throw new TokenError("Malformed token");
  }

  const valid = await ed.verifyAsync(signature, payload, publicKey).catch(() => false);
  if (!valid) throw new TokenError("Bad signature");

  let claims: Entitlement;
  try {
    claims = JSON.parse(new TextDecoder().decode(payload)) as Entitlement;
  } catch {
    throw new TokenError("Unreadable claims");
  }
  if (claims.v !== 1 || typeof claims.lic !== "string" || typeof claims.device !== "string" || typeof claims.exp !== "number" || !Array.isArray(claims.features)) {
    throw new TokenError("Unexpected claims");
  }
  return claims;
}