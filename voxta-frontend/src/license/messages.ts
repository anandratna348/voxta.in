import { ApiError } from "@/api/errors";

const BY_CODE: Record<string, string> = {
  invalid_key: "That license key was not recognised. Check it and try again.",
  expired: "This license has expired. Renew your plan to keep using Voxta.",
  revoked: "This license has been revoked. Contact support if you think this is a mistake.",
  activation_limit_reached: "This license is already active on the maximum number of computers. Deactivate one of them first.",
  invalid_token: "Your license could not be verified. Please activate again.",
  device_mismatch: "This license belongs to a different computer. Please activate again.",
  rate_limited: "Too many attempts. Wait a minute and try again.",
};

/** Codes that mean the server has decided this license cannot be used. */
export const DEFINITIVE_CODES = new Set(["expired", "revoked", "invalid_token", "device_mismatch", "invalid_key"]);

export function friendlyLicenseError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isOffline) return "Cannot reach the license server. Check your internet connection and try again.";
    if (error.code && BY_CODE[error.code]) return BY_CODE[error.code];
    if (error.status === 429) return BY_CODE.rate_limited;
    if (error.status !== null && error.status >= 500) return "The license server had a problem. Please try again in a moment.";
    return error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}