import { WifiOff } from "lucide-react";
import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { config } from "@/api/config";
import { useBackendStatus } from "@/hooks/useBackendStatus";
import { useLicense } from "@/license/LicenseContext";
import { initOverlayController } from "@/overlay/controller";
import { Sidebar } from "./Sidebar";
import { Splash } from "./Splash";

/** Everything except the activation screen needs a valid license. */
export function RequireAuth() {
  const { status } = useLicense();
  if (status === "loading") return <Splash />;
  return status === "active" ? <AppShell /> : <Navigate to="/activate" replace />;
}

function AppShell() {
  const backend = useBackendStatus();
  const { warning } = useLicense();

  useEffect(() => {
    void initOverlayController();
  }, []);

  return (
    <div className="flex h-full app-backdrop">
      <Sidebar backend={backend} />
      <div className="flex min-w-0 flex-1 flex-col">
        {backend.state === "offline" && (
          <div role="status" className="flex items-center gap-3 border-b border-amber-100 bg-amber-50 px-8 py-3 text-sm text-amber-700">
            <WifiOff className="h-4 w-4 shrink-0" />
            <span className="flex-1">
              The Voxta backend is not reachable at {config.displayBackendUrl}. Start it, then your data will load again.
            </span>
            <button onClick={backend.recheck} className="font-semibold underline underline-offset-2">
              Check again
            </button>
          </div>
        )}
        {warning && (
          <div role="status" className="border-b border-amber-100 bg-amber-50 px-8 py-3 text-sm text-amber-700">
            {warning}
          </div>
        )}
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-8 py-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}