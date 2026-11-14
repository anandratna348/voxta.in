/** Features the app knows how to gate. A plan may include others, which are simply ignored. */
export const FEATURES = {
  meetings: "meetings",
  aiCopilot: "ai_copilot",
  pdfExport: "pdf_export",
} as const;

/** Claims inside the signed token. Times are seconds since 1970. */
export interface Entitlement {
  v: number;
  /** Stable license id. Used as the owner of local meetings. It is not the license key. */
  lic: string;
  plan: string;
  plan_name?: string;
  holder?: string;
  features: string[];
  /** Hash of the computer this token was issued for. */
  device: string;
  iat: number;
  /** When this token stops working without an online check. */
  exp: number;
  /** When the purchased license itself ends. Null or missing means no end date. */
  license_expires?: number | null;
}

export type BlockReason = "invalid" | "token_expired" | "license_expired" | "clock" | "rejected";
export type LicenseStatus = "loading" | "unlicensed" | "active" | "blocked";

export interface BlockInfo {
  reason: BlockReason;
  message: string;
}