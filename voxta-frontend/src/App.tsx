import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "@/components/layout/AppShell";
import { AuthProvider } from "@/context/AuthContext";
import CopilotPage from "@/pages/CopilotPage";
import HistoryPage from "@/pages/HistoryPage";
import SettingsPage from "@/pages/SettingsPage";
import DashboardPage from "@/pages/DashboardPage";
import LoginPage from "@/pages/LoginPage";
import WorkspacePage from "@/pages/WorkspacePage";

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route index element={<DashboardPage />} />
            {["/workspace", "/workspace/:sessionId"].map((p) => (
              <Route key={p} path={p} element={<WorkspacePage />} />
            ))}
            {["/copilot", "/copilot/:sessionId"].map((p) => (
              <Route key={p} path={p} element={<CopilotPage />} />
            ))}
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}