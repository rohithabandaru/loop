"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  TrendingUp,
  Sparkles,
  FileText,
  Users,
  PlusCircle,
} from "lucide-react";

interface SidebarProps {
  onOpenIngest?: () => void;
  userRole?: string;
}

export default function Sidebar({ onOpenIngest, userRole }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Feedback Inbox", href: "/inbox", icon: Inbox },
    { name: "Themes & Trends", href: "/trends", icon: TrendingUp },
    { name: "Ask LOOP (AI)", href: "/ask", icon: Sparkles, badge: "RAG" },
    { name: "VoC Reports", href: "/reports", icon: FileText },
    { name: "Team & RBAC", href: "/settings", icon: Users },
  ];

  const canIngest = userRole === "ADMIN" || userRole === "ANALYST";

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-screen sticky top-0 text-slate-300 select-none z-30">
      <div>
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800">
          <Link href="/dashboard" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              L
            </div>
            <div>
              <span className="font-bold text-white tracking-wide text-lg">PROJECT LOOP</span>
              <span className="block text-[10px] text-indigo-400 font-mono tracking-wider uppercase">
                AI Intelligence Platform
              </span>
            </div>
          </Link>
        </div>

        {/* Quick Ingest Button */}
        {canIngest && onOpenIngest && (
          <div className="p-4">
            <button
              onClick={onOpenIngest}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium py-2.5 px-4 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all active:scale-[0.98] cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Ingest Feedback</span>
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded font-mono font-semibold">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-between">
        <span>Zidio Internship Brief</span>
        <span className="font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px]">
          v1.0 Corporate
        </span>
      </div>
    </aside>
  );
}
