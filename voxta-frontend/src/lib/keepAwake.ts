/**
 * While recording, the Voxta window may be hidden behind a meeting app. A held Web Lock tells the
 * browser engine not to freeze this window's tasks, so recording and uploads keep running.
 */
let wanted = false;
let release: (() => void) | null = null;

export function holdAwake(): void {
  if (wanted || typeof navigator === "undefined" || !navigator.locks) return;
  wanted = true;
  void navigator.locks.request("voxta-keep-awake", () =>
    wanted
      ? new Promise<void>((resolve) => {
          release = resolve;
        })
      : undefined,
  );
}

export function releaseAwake(): void {
  wanted = false;
  release?.();
  release = null;
}