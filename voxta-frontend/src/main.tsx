import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/index.css";
import { isTauri } from "@/api/config";
import App from "./App";

async function isOverlayWindow(): Promise<boolean> {
  if (!isTauri) return false;
  try {
    const { getCurrentWebviewWindow } = await import("@tauri-apps/api/webviewWindow");
    return getCurrentWebviewWindow().label === "overlay";
  } catch {
    return false;
  }
}

async function boot() {
  const root = ReactDOM.createRoot(document.getElementById("root")!);
  if (await isOverlayWindow()) {
    document.documentElement.classList.add("overlay-window");
    const { OverlayApp } = await import("./overlay/OverlayApp");
    root.render(
      <React.StrictMode>
        <OverlayApp />
      </React.StrictMode>,
    );
    return;
  }
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void boot();