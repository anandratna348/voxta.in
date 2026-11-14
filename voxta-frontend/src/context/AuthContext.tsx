import { useMemo } from "react";
import { useLicense } from "@/license/LicenseContext";

/**
 * The app used to sign in with Google. It now runs on a license. This keeps the small
 * `useAuth()` surface the screens already use: `user.id` owns local meetings and is the license id.
 */
export interface AppUser {
  id: string;
  name: string;
  email: string;
  picture: string;
}

export function useAuth(): { user: AppUser | null } {
  const { status, entitlement } = useLicense();
  const user = useMemo<AppUser | null>(() => {
    if (status !== "active" || !entitlement) return null;
    return {
      id: entitlement.lic,
      name: entitlement.holder || entitlement.plan_name || "Voxta license",
      email: entitlement.plan_name || entitlement.plan,
      picture: "",
    };
  }, [status, entitlement]);
  return { user };
}