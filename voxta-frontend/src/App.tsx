import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "@/components/layout/AppShell";
import { AuthProvider } from "@/context/AuthContext";
import DashboardPage from "@/pages/DashboardPage";
import LoginPage from "@/pages/LoginPage";
import PlaceholderPage from "@/pages/PlaceholderPage";
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
              <Route key={p} path={p} element={<PlaceholderPage title="AI Copilot" description="Detected questions, suggested answers and answer history." step="Built in step 4." />} />
            ))}
            <Route path="/history" element={<PlaceholderPage title="History" description="Search past meetings, reopen them and export PDF reports." step="Built in step 5." />} />
            <Route path="/settings" element={<PlaceholderPage title="Settings" description="Profile, audio preferences and application settings." step="Built in step 5." />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}