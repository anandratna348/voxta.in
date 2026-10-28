import clsx from "clsx";
import { History, LayoutDashboard, LogOut, Mic, RefreshCw, Settings, Sparkles } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { BackendStatus } from "@/hooks/useBackendStatus";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/workspace", label: "Meeting", icon: Mic, end: false },
  { to: "/copilot", label: "AI Copilot", icon: Sparkles, end: false },
  { to: "/history", label: "History", icon: History, end: false },
  { to: "/settings", label: "Settings", icon: Settings, end: false },
];

const statusText = { checking: "Checking backend", online: "Backend connected", busy: "Backend busy", offline: "Backend offline" } as const;
const statusDot = { checking: "bg-amber-500", online: "bg-sage-500", busy: "bg-amber-500", offline: "bg-rose-500" } as const;

export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={clsx("flex items-center justify-center rounded-xl bg-brand-gradient font-display text-white shadow-card", className)}>
      V
    </div>
  );
}

export function Sidebar({ backend }: { backend: BackendStatus }) {
  const { user, signOut } = useAuth();
  const initial = (user?.name || "V").charAt(0).toUpperCase();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-paper-line bg-paper-raised px-4 py-6">
      <div className="flex items-center gap-3 px-2">
        <BrandMark className="h-9 w-9 text-xl" />
        <span className="font-display text-2xl text-indigo-900">Voxta</span>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Main">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                isActive ? "bg-lavender-100 text-indigo-800" : "text-indigo-500 hover:bg-lavender-50 hover:text-indigo-800",
              )
            }
          >
            <Icon className="h-[18px] w-[18px]" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-3">
        <button
          onClick={backend.recheck}
          title="Check connection again"
          className="flex w-full items-center justify-between rounded-xl border border-paper-line bg-paper px-3 py-2.5 text-left hover:bg-lavender-50"
        >
          <span className="flex items-center gap-2.5">
            <span className={clsx("h-2 w-2 rounded-full", statusDot[backend.state])} />
            <span className="text-xs font-semibold text-indigo-700">{statusText[backend.state]}</span>
          </span>
          <RefreshCw className="h-3.5 w-3.5 text-indigo-400" />
        </button>

        <div className="flex items-center gap-3 rounded-xl px-2 py-1">
          {user?.picture ? (
            <img src={user.picture} alt="" referrerPolicy="no-referrer" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-lavender-200 text-sm font-bold text-indigo-700">
              {initial}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-indigo-900">{user?.name || "Local user"}</p>
            <p className="truncate text-xs text-indigo-400">{user?.isDevSession ? "Development session" : user?.email}</p>
          </div>
          <button onClick={signOut} aria-label="Sign out" title="Sign out" className="rounded-lg p-2 text-indigo-400 hover:bg-lavender-100 hover:text-indigo-700">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}