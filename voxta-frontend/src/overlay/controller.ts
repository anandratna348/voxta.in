import { isTauri } from "@/api/config";
import { EVT, SHORTCUTS, WINDOW_LABEL, type OverlaySnapshot } from "./types";

/**
 * Runs in the main window. Owns the floating overlay window: opens and closes it, sends it live
 * data, and handles the global shortcuts. The overlay itself only displays what it is sent.
 */
export interface OverlayState {
  open: boolean;
  /** Click through mode: mouse clicks go to the app underneath. */
  ghost: boolean;
  shortcuts: "unknown" | "ok" | "failed";
  error: string | null;
}

let state: OverlayState = { open: false, ghost: false, shortcuts: "unknown", error: null };
let latest: OverlaySnapshot | null = null;
let initialised = false;
const listeners = new Set<() => void>();

function update(patch: Partial<OverlayState>) {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
}
export const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export const getState = () => state;

const GEOMETRY_KEY = "voxta.overlay.geometry";
interface Geometry { x: number; y: number; width: number; height: number }

async function getOverlayWindow() {
  const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
  return WebviewWindow.getByLabel(WINDOW_LABEL);
}

async function startGeometry(): Promise<Geometry> {
  const width = 440;
  const height = 560;
  try {
    const { primaryMonitor } = await import("@tauri-apps/api/window");
    const monitor = await primaryMonitor();
    if (monitor) {
      const scale = monitor.scaleFactor;
      const mx = monitor.position.x / scale;
      const my = monitor.position.y / scale;
      const mw = monitor.size.width / scale;
      const mh = monitor.size.height / scale;
      const saved = JSON.parse(localStorage.getItem(GEOMETRY_KEY) ?? "null") as Geometry | null;
      // Reuse the last position only if it is still clearly on the main screen.
      if (saved && saved.x > mx - saved.width + 120 && saved.x < mx + mw - 120 && saved.y > my - 20 && saved.y < my + mh - 80) return saved;
      return { x: mx + mw - width - 24, y: my + 72, width, height: Math.min(height, mh - 140) };
    }
  } catch {
    /* fall through to a default */
  }
  return { x: 80, y: 80, width, height };
}

export async function openOverlay(): Promise<void> {
  if (!isTauri) return;
  try {
    const existing = await getOverlayWindow();
    if (existing) {
      await existing.show();
      await existing.setAlwaysOnTop(true);
      update({ open: true, error: null });
      return;
    }
    const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
    const g = await startGeometry();
    const win = new WebviewWindow(WINDOW_LABEL, {
      url: "index.html",
      title: "Voxta Overlay",
      ...g,
      minWidth: 300,
      minHeight: 140,
      decorations: false,
      transparent: true,
      alwaysOnTop: true,
      resizable: true,
      shadow: false,
      focus: false,
    });
    update({ open: true, ghost: false, error: null });
    void win.once("tauri://error", (e) => update({ open: false, error: `The overlay could not open. ${String(e.payload ?? "")}`.trim() }));
    void win.once("tauri://destroyed", () => update({ open: false, ghost: false }));
  } catch (error) {
    update({ open: false, error: error instanceof Error ? error.message : "The overlay could not open." });
  }
}

export async function closeOverlay(): Promise<void> {
  if (!isTauri) return;
  const win = await getOverlayWindow();
  await win?.close();
  update({ open: false, ghost: false });
}

export async function toggleOverlay(): Promise<void> {
  if (state.open) await closeOverlay();
  else await openOverlay();
}

export async function setGhost(on: boolean): Promise<void> {
  if (!isTauri || !state.open) return;
  const win = await getOverlayWindow();
  if (!win) return;
  await win.setIgnoreCursorEvents(on);
  update({ ghost: on });
  const { emit } = await import("@tauri-apps/api/event");
  await emit(EVT.ghostState, on);
}

/** Called by the meeting screen whenever its data changes. null means no meeting is live. */
export async function publishSnapshot(snapshot: OverlaySnapshot | null): Promise<void> {
  latest = snapshot;
  if (!isTauri || !state.open) return;
  const { emit } = await import("@tauri-apps/api/event");
  await emit(EVT.snapshot, snapshot);
}

/** Wires up events and shortcuts once, from the signed in app shell. */
export async function initOverlayController(): Promise<void> {
  if (!isTauri || initialised) return;
  initialised = true;
  try {
    const { listen, emit } = await import("@tauri-apps/api/event");
    const { getCurrentWebviewWindow } = await import("@tauri-apps/api/webviewWindow");

    await listen(EVT.ready, () => {
      void emit(EVT.snapshot, latest);
      void emit(EVT.ghostState, state.ghost);
    });
    await listen<boolean>(EVT.ghostRequest, (e) => void setGhost(e.payload));
    await listen(EVT.focusMain, async () => {
      const main = getCurrentWebviewWindow();
      await main.unminimize();
      await main.show();
      await main.setFocus();
    });
    // Closing the main window closes the overlay with it.
    await getCurrentWebviewWindow().onCloseRequested(async () => {
      const win = await getOverlayWindow();
      await win?.close();
    });
  } catch (error) {
    update({ error: error instanceof Error ? error.message : "The overlay could not start." });
  }

  try {
    const { register } = await import("@tauri-apps/plugin-global-shortcut");
    await register(SHORTCUTS.toggle.keys, (e) => {
      if (e.state === "Pressed") void toggleOverlay();
    });
    await register(SHORTCUTS.ghost.keys, (e) => {
      if (e.state === "Pressed") void setGhost(!state.ghost);
    });
    update({ shortcuts: "ok" });
  } catch {
    update({ shortcuts: "failed" });
  }
}