import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { FeatureGate } from "@/components/license/FeatureGate";
import { RequireAuth } from "@/components/layout/AppShell";
import { LicenseProvider } from "@/license/LicenseContext";
import { FEATURES } from "@/license/types";
import ActivationPage from "@/pages/ActivationPage";
import CopilotPage from "@/pages/CopilotPage";
import DashboardPage from "@/pages/DashboardPage";
import HistoryPage from "@/pages/HistoryPage";
import SettingsPage from "@/pages/SettingsPage";
import WorkspacePage from "@/pages/WorkspacePage";

export default function App() {
  return (
    <LicenseProvider>
      <HashRouter>
        <Routes>
          <Route path="/activate" element={<ActivationPage />} />
          <Route element={<RequireAuth />}>
            <Route index element={<DashboardPage />} />
            {["/workspace", "/workspace/:sessionId"].map((p) => (
              <Route key={p} path={p} element={<WorkspacePage />} />
            ))}
            {["/copilot", "/copilot/:sessionId"].map((p) => (
              <Route
                key={p}
                path={p}
                element={
                  <FeatureGate feature={FEATURES.aiCopilot} title="AI Copilot">
                    <CopilotPage />
                  </FeatureGate>
                }
              />
            ))}
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </LicenseProvider>
  );
}