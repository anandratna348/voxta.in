import { config } from "@/api/config";
import { request } from "@/api/http";
import { deviceLabel } from "./device";

interface TokenResponse {
  token: string;
}

const url = (path: string) => `${config.licenseApiUrl.replace(/\/+$/, "")}${path}`;
const TIMEOUT = 30000;

/** Client for the Voxta License API. See LICENSE_API.md for the contract the server must follow. */
export const licenseApi = {
  activate: (licenseKey: string, deviceId: string) =>
    request<TokenResponse>("", {
      absoluteUrl: url("/licenses/activate"),
      method: "POST",
      timeoutMs: TIMEOUT,
      json: { license_key: licenseKey, device_id: deviceId, device_name: deviceLabel(), app_version: config.appVersion },
    }),

  refresh: (token: string, deviceId: string) =>
    request<TokenResponse>("", {
      absoluteUrl: url("/licenses/refresh"),
      method: "POST",
      timeoutMs: TIMEOUT,
      json: { token, device_id: deviceId, app_version: config.appVersion },
    }),

  deactivate: (token: string, deviceId: string) =>
    request<{ deactivated: boolean }>("", {
      absoluteUrl: url("/licenses/deactivate"),
      method: "POST",
      timeoutMs: TIMEOUT,
      json: { token, device_id: deviceId },
    }),
};