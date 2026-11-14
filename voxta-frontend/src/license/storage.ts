/**
 * The token is signed and tied to this computer, so it is safe to keep locally. The license key
 * itself is never stored after activation.
 */
const TOKEN = "voxta.license.token.v1";
const SEEN = "voxta.license.seen.v1";
const CHECKED = "voxta.license.checked.v1";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

export const readToken = () => read(TOKEN);
export const writeToken = (token: string | null) => write(TOKEN, token);
/** Latest time this app has ever seen. Used to notice the clock being turned back. */
export const readLastSeen = () => Number(read(SEEN) ?? 0);
export const writeLastSeen = (ms: number) => write(SEEN, String(ms));
export const readLastChecked = () => {
  const value = Number(read(CHECKED) ?? 0);
  return value > 0 ? value : null;
};
export const writeLastChecked = (ms: number) => write(CHECKED, String(ms));