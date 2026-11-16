/** What the main window sends to the floating overlay. Plain data only, no secrets. */
export type OverlayStatus = "ready" | "listening" | "paused" | "finished";

export interface OverlayLine {
  id: string;
  text: string;
  timeMs: number;
  /** False when the time is only approximate. */
  exact: boolean;
}

export interface OverlayAnswer {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
}

export interface OverlaySnapshot {
  title: string;
  status: OverlayStatus;
  analysing: boolean;
  autoDetect: boolean;
  /** False when the plan does not include AI Copilot. */
  copilotEnabled: boolean;
  lines: OverlayLine[];
  answer: OverlayAnswer | null;
}

export const WINDOW_LABEL = "overlay";

/** Tauri event names shared by both windows. */
export const EVT = {
  snapshot: "overlay-snapshot",
  ready: "overlay-ready",
  ghostRequest: "overlay-ghost-request",
  ghostState: "overlay-ghost-state",
  focusMain: "overlay-focus-main",
} as const;

/**
 * Global shortcuts, work even while another app has focus. Easy to change here.
 * They avoid common browser and meeting app shortcuts.
 */
export const SHORTCUTS = {
  toggle: { keys: "CommandOrControl+Shift+1", label: "Ctrl + Shift + 1" },
  ghost: { keys: "CommandOrControl+Shift+2", label: "Ctrl + Shift + 2" },
} as const;