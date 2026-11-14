// Voxta MOCK license server. FOR DEVELOPMENT ONLY. It is not the real Voxta License API.
// It follows LICENSE_API.md so the desktop app can be tested end to end.
//
// Run:  node tools/mock-license-server.mjs
// It creates tools/mock-license-keys.json on first run (a throwaway test key pair).

import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT ?? 8790);
const TOKEN_SECONDS = Math.round(Number(process.env.VOXTA_MOCK_TOKEN_MINUTES ?? 60 * 24 * 7) * 60);
const REFRESH_GRACE_SECONDS = 30 * 86400;
const here = path.dirname(fileURLToPath(import.meta.url));
const keyFile = path.join(here, "mock-license-keys.json");

// ---- throwaway signing keys ------------------------------------------------
let keys;
if (fs.existsSync(keyFile)) {
  keys = JSON.parse(fs.readFileSync(keyFile, "utf8"));
} else {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  keys = {
    privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }),
    publicKey: publicKey.export({ type: "spki", format: "der" }).subarray(-32).toString("base64url"),
  };
  fs.writeFileSync(keyFile, JSON.stringify(keys, null, 2));
}
const privateKey = crypto.createPrivateKey(keys.privateKeyPem);
const publicKeyObj = crypto.createPublicKey(privateKey);

const now = () => Math.floor(Date.now() / 1000);
const DAY = 86400;

// ---- test licenses ---------------------------------------------------------
const licenses = {
  "VOXTA-TEST-PRO1-0000-0001": { lic: "lic_test_pro", plan: "pro", plan_name: "Pro", holder: "Test User", features: ["meetings", "ai_copilot", "pdf_export"], expires: now() + 365 * DAY, limit: 2, revoked: false },
  "VOXTA-TEST-BASC-0000-0002": { lic: "lic_test_basic", plan: "basic", plan_name: "Basic", holder: "Basic Tester", features: ["meetings"], expires: now() + 365 * DAY, limit: 2, revoked: false },
  "VOXTA-TEST-EXPD-0000-0003": { lic: "lic_test_expired", plan: "pro", plan_name: "Pro", holder: "Expired Tester", features: ["meetings", "ai_copilot", "pdf_export"], expires: now() - DAY, limit: 2, revoked: false },
  "VOXTA-TEST-REVK-0000-0004": { lic: "lic_test_revoked", plan: "pro", plan_name: "Pro", holder: "Revoked Tester", features: ["meetings", "ai_copilot", "pdf_export"], expires: now() + 365 * DAY, limit: 2, revoked: true },
  "VOXTA-TEST-LIMT-0000-0005": { lic: "lic_test_limit", plan: "pro", plan_name: "Pro", holder: "Limit Tester", features: ["meetings", "ai_copilot", "pdf_export"], expires: now() + 365 * DAY, limit: 1, revoked: false },
};
const byId = Object.fromEntries(Object.values(licenses).map((l) => [l.lic, l])); // same objects, so live revoke applies
const activations = {}; // lic id -> Set of device hashes
const seats = (lic) => (activations[lic] ??= new Set());

// ---- helpers ---------------------------------------------------------------
class ApiFailure extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const normalizeKey = (k) => String(k ?? "").toUpperCase().replace(/\s+/g, "");

function issue(license, device) {
  const iat = now();
  const payload = Buffer.from(JSON.stringify({
    v: 1, lic: license.lic, plan: license.plan, plan_name: license.plan_name, holder: license.holder,
    features: license.features, device, iat,
    exp: Math.min(iat + TOKEN_SECONDS, license.expires), license_expires: license.expires,
  }));
  const signature = crypto.sign(null, payload, privateKey);
  return `${payload.toString("base64url")}.${signature.toString("base64url")}`;
}

function readToken(token) {
  const [p, s, extra] = String(token ?? "").split(".");
  if (!p || !s || extra !== undefined) throw new ApiFailure(401, "invalid_token", "Invalid token.");
  const payload = Buffer.from(p, "base64url");
  if (!crypto.verify(null, payload, publicKeyObj, Buffer.from(s, "base64url"))) throw new ApiFailure(401, "invalid_token", "Invalid token.");
  return JSON.parse(payload.toString("utf8"));
}

function checkUsable(license) {
  if (license.revoked) throw new ApiFailure(403, "revoked", "This license has been revoked.");
  if (license.expires <= now()) throw new ApiFailure(403, "expired", "This license has expired.");
}

function claimSeat(license, device) {
  const set = seats(license.lic);
  if (!set.has(device) && set.size >= license.limit) {
    throw new ApiFailure(409, "activation_limit_reached", "Activation limit reached.");
  }
  set.add(device);
}

const routes = {
  "POST /v1/licenses/activate": (body) => {
    if (!body.device_id || !body.license_key) throw new ApiFailure(400, "bad_request", "license_key and device_id are required.");
    const license = licenses[normalizeKey(body.license_key)];
    if (!license) throw new ApiFailure(404, "invalid_key", "License key not found.");
    checkUsable(license);
    claimSeat(license, body.device_id);
    return { token: issue(license, body.device_id) };
  },
  "POST /v1/licenses/refresh": (body) => {
    const claims = readToken(body.token);
    if (now() - claims.exp > REFRESH_GRACE_SECONDS) throw new ApiFailure(401, "invalid_token", "Token is too old to refresh.");
    const license = byId[claims.lic];
    if (!license) throw new ApiFailure(401, "invalid_token", "Unknown license.");
    if (claims.device !== body.device_id) throw new ApiFailure(403, "device_mismatch", "Token belongs to another device.");
    checkUsable(license);
    claimSeat(license, claims.device);
    return { token: issue(license, claims.device) };
  },
  "POST /v1/licenses/deactivate": (body) => {
    const claims = readToken(body.token);
    if (claims.device !== body.device_id) throw new ApiFailure(403, "device_mismatch", "Token belongs to another device.");
    seats(claims.lic).delete(claims.device);
    return { deactivated: true };
  },
};

const initialRevoked = Object.fromEntries(Object.entries(licenses).map(([k, l]) => [k, l.revoked]));
function resetAll() {
  for (const [k, l] of Object.entries(licenses)) l.revoked = initialRevoked[k];
  for (const id of Object.keys(activations)) delete activations[id];
}

// Dev helpers so revocation can be tried live: /dev/revoke?key=KEY and /dev/restore?key=KEY
// /dev/reset puts every test license back to its starting state and frees all activations.
const devRoutes = {
  "/dev/revoke": (l) => { l.revoked = true; },
  "/dev/restore": (l) => { l.revoked = false; },
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const send = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json", ...cors });
  res.end(JSON.stringify(body));
};

// node tools/mock-license-server.mjs --write-env   updates ../.env with the two license settings
if (process.argv.includes("--write-env")) {
  const envFile = path.join(here, "..", ".env");
  const wanted = { VITE_LICENSE_API_URL: `http://127.0.0.1:${PORT}/v1`, VITE_LICENSE_PUBLIC_KEY: keys.publicKey };
  let text = fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8") : "";
  for (const [name, value] of Object.entries(wanted)) {
    const line = `${name}=${value}`;
    const pattern = new RegExp(`^${name}=.*$`, "m");
    text = pattern.test(text) ? text.replace(pattern, line) : text.replace(/\s*$/, "\n") + line + "\n";
  }
  fs.writeFileSync(envFile, text);
  console.log("Updated .env with the license server address and public key.\n");
}

http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }

  if (url.pathname === "/dev/reset") {
    resetAll();
    console.log("  /dev/reset");
    return send(res, 200, { reset: true });
  }

  const dev = devRoutes[url.pathname];
  if (dev) {
    const license = licenses[normalizeKey(url.searchParams.get("key"))];
    if (!license) return send(res, 404, { error: { code: "invalid_key", message: "Unknown test key." } });
    dev(license);
    console.log(`  ${url.pathname} ${license.lic} -> revoked=${license.revoked}`);
    return send(res, 200, { lic: license.lic, revoked: license.revoked });
  }

  const handler = routes[`${req.method} ${url.pathname}`];
  if (!handler) return send(res, 404, { error: { code: "not_found", message: "Not found." } });

  let raw = "";
  req.on("data", (chunk) => { raw += chunk; });
  req.on("end", () => {
    try {
      const result = handler(raw ? JSON.parse(raw) : {});
      console.log(`${req.method} ${url.pathname} 200`);
      send(res, 200, result);
    } catch (error) {
      if (error instanceof ApiFailure) {
        console.log(`${req.method} ${url.pathname} ${error.status} ${error.code}`);
        return send(res, error.status, { error: { code: error.code, message: error.message } });
      }
      console.log(`${req.method} ${url.pathname} 400 bad_request`);
      send(res, 400, { error: { code: "bad_request", message: "Bad request." } });
    }
  });
}).listen(PORT, "127.0.0.1", () => {
  console.log("Voxta MOCK license server (development only)");
  console.log(`Listening on http://127.0.0.1:${PORT}/v1\n`);
  console.log("These two lines belong in voxta-frontend/.env (run with --write-env to add them for you):");
  console.log(`VITE_LICENSE_API_URL=http://127.0.0.1:${PORT}/v1`);
  console.log(`VITE_LICENSE_PUBLIC_KEY=${keys.publicKey}\n`);
  console.log("Test license keys:");
  for (const [key, l] of Object.entries(licenses)) {
    const note = l.revoked ? "revoked" : l.expires <= now() ? "expired" : `${l.features.join(", ")} (${l.limit} computer${l.limit > 1 ? "s" : ""})`;
    console.log(`  ${key}  ${l.plan_name}: ${note}`);
  }
  console.log(`\nRevoke live:  http://127.0.0.1:${PORT}/dev/revoke?key=VOXTA-TEST-PRO1-0000-0001`);
  console.log(`Restore:      http://127.0.0.1:${PORT}/dev/restore?key=VOXTA-TEST-PRO1-0000-0001`);
  console.log(`Reset all:    http://127.0.0.1:${PORT}/dev/reset\n`);
});