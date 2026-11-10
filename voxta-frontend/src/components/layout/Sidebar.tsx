import clsx from "clsx";
import { History, LayoutDashboard, LogOut, Mic, Plus, RefreshCw, Settings, Sparkles } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { NewMeetingDialog } from "@/components/meetings/NewMeetingDialog";
import { Button } from "@/components/ui/Button";
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

export function Sidebar({ backend }: { backend: BackendStatus }) {
  const { user, signOut } = useAuth();
  const [dialog, setDialog] = useState(false);
  const initial = (user?.name || "V").charAt(0).toUpperCase();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-paper-line bg-paper-raised px-4 py-6">
      <BrandLogo className="px-2" />

      <Button className="mt-7 w-full" icon={<Plus className="h-4 w-4" />} onClick={() => setDialog(true)}>
        New Meeting
      </Button>

      <nav className="mt-6 flex flex-1 flex-col gap-1" aria-label="Main">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                isActive ? "bg-indigo-50 text-indigo-700" : "text-indigo-500 hover:bg-paper hover:text-indigo-800",
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute -left-4 top-2 bottom-2 w-1 rounded-r-full bg-brand-gradient" />}
                <Icon className={clsx("h-[18px] w-[18px]", isActive ? "text-indigo-600" : "text-indigo-400 group-hover:text-indigo-600")} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-3">
        <button
          onClick={backend.recheck}
          title="Check connection again"
          className="flex w-full items-center justify-between rounded-xl border border-paper-line bg-paper px-3 py-2.5 text-left transition-colors hover:bg-indigo-50"
        >
          <span className="flex items-center gap-2.5">
            <span className={clsx("h-2 w-2 rounded-full", statusDot[backend.state])} />
            <span className="text-xs font-semibold text-indigo-700">{statusText[backend.state]}</span>
          </span>
          <RefreshCw className="h-3.5 w-3.5 text-indigo-400" />
        </button>

        <div className="flex items-center gap-3 rounded-xl border-t border-paper-line px-2 pt-4">
          {user?.picture ? (
            <img src={user.picture} alt="" referrerPolicy="no-referrer" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gradient text-sm font-bold text-white">
              {initial}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-indigo-900">{user?.name || "Local user"}</p>
            <p className="truncate text-xs text-indigo-400">{user?.isDevSession ? "Development session" : user?.email}</p>
          </div>
          <button onClick={signOut} aria-label="Sign out" title="Sign out" className="rounded-lg p-2 text-indigo-400 transition-colors hover:bg-indigo-50 hover:text-indigo-700">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {dialog && <NewMeetingDialog onClose={() => setDialog(false)} />}
    </aside>
  );
}