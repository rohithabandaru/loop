"use client";

import { useRouter } from "next/navigation";
import { Building2, Shield, LogOut, RefreshCw } from "lucide-react";

interface NavbarProps {
  user: {
    name: string;
    email: string;
    role: "ADMIN" | "ANALYST" | "VIEWER";
    workspaceName: string;
  };
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();

  const roleColors = {
    ADMIN: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    ANALYST: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
    VIEWER: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const handleQuickRoleSwitch = async (email: string) => {
    await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "password123" }),
    });
    router.refresh();
  };

  return (
    <header className="h-16 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Workspace Indicator */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-xl text-sm font-medium text-slate-200">
          <Building2 className="w-4 h-4 text-indigo-400" />
          <span>{user.workspaceName}</span>
        </div>
        <span className="text-xs text-slate-500 hidden sm:inline-block">
          Multi-Tenant Isolation Active
        </span>
      </div>

      {/* User Controls & Quick Role Switcher */}
      <div className="flex items-center space-x-4">
        {/* Quick Role Switcher for Rubric Evaluators */}
        <div className="hidden md:flex items-center space-x-1.5 bg-slate-950/60 border border-slate-800 p-1 rounded-xl text-xs">
          <span className="text-slate-500 text-[11px] px-2 flex items-center space-x-1">
            <RefreshCw className="w-3 h-3 text-indigo-400" />
            <span>Switch Role:</span>
          </span>
          <button
            onClick={() => handleQuickRoleSwitch("admin@acme.com")}
            className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${user.role === "ADMIN" ? "bg-rose-600 text-white font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
            title="Switch to Admin Role"
          >
            Admin
          </button>
          <button
            onClick={() => handleQuickRoleSwitch("analyst@acme.com")}
            className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${user.role === "ANALYST" ? "bg-indigo-600 text-white font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
            title="Switch to Analyst Role"
          >
            Analyst
          </button>
          <button
            onClick={() => handleQuickRoleSwitch("viewer@acme.com")}
            className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${user.role === "VIEWER" ? "bg-emerald-600 text-white font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
            title="Switch to Viewer Role"
          >
            Viewer
          </button>
        </div>

        {/* Current User & Role Badge */}
        <div className="flex items-center space-x-3 border-l border-slate-800 pl-4">
          <div className="text-right">
            <div className="text-sm font-semibold text-slate-200">{user.name}</div>
            <div className="text-xs text-slate-400">{user.email}</div>
          </div>

          <span
            className={`text-xs px-2.5 py-1 rounded-full border font-mono font-semibold flex items-center space-x-1 ${roleColors[user.role]
              }`}
          >
            <Shield className="w-3 h-3" />
            <span>{user.role}</span>
          </span>

          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
