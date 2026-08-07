"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Inbox,
  TrendingUp,
  Sparkles,
  FileText,
  Settings,
  PlusCircle,
  Command,
  X,
} from "lucide-react";

interface CommandPaletteProps {
  onOpenIngestModal?: () => void;
}

export default function CommandPalette({ onOpenIngestModal }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!open) return null;

  const actions = [
    {
      id: "nav-dashboard",
      label: "Go to Analytics Dashboard",
      icon: LayoutDashboard,
      category: "Navigation",
      perform: () => router.push("/dashboard"),
    },
    {
      id: "nav-inbox",
      label: "Go to Feedback Triage Inbox",
      icon: Inbox,
      category: "Navigation",
      perform: () => router.push("/inbox"),
    },
    {
      id: "nav-trends",
      label: "Go to Theme Clustering & Trends",
      icon: TrendingUp,
      category: "Navigation",
      perform: () => router.push("/trends"),
    },
    {
      id: "nav-ask",
      label: "Ask LOOP AI (Semantic Vector RAG Q&A)",
      icon: Sparkles,
      category: "AI & Q&A",
      perform: () => router.push("/ask"),
    },
    {
      id: "nav-reports",
      label: "Go to Voice of Customer (VoC) Executive Reports",
      icon: FileText,
      category: "Reports",
      perform: () => router.push("/reports"),
    },
    {
      id: "nav-settings",
      label: "Go to Workspace Settings & Integrations",
      icon: Settings,
      category: "Settings",
      perform: () => router.push("/settings"),
    },
    {
      id: "action-ingest",
      label: "Ingest Customer Feedback (Form / CSV / Integration)",
      icon: PlusCircle,
      category: "Ingestion",
      perform: () => {
        if (onOpenIngestModal) onOpenIngestModal();
        else router.push("/inbox");
      },
    },
  ];

  const filtered = actions.filter(
    (a) =>
      a.label.toLowerCase().includes(query.toLowerCase()) ||
      a.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[999] bg-slate-950/80 backdrop-blur-md flex items-start justify-center pt-24 px-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col space-y-0">
        {/* Search Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800">
          <Search className="w-4 h-4 text-indigo-400 mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command or search page (e.g. 'Ask LOOP', 'Ingest', 'Settings')..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          <div className="flex items-center space-x-1.5 ml-2">
            <span className="text-[10px] bg-slate-800 text-slate-400 font-mono px-1.5 py-0.5 rounded border border-slate-700">
              ESC
            </span>
            <button
              onClick={() => setOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No matching actions found for &quot;{query}&quot;.
            </div>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    item.perform();
                    setOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-indigo-600/20 hover:border-indigo-500/30 border border-transparent flex items-center justify-between transition-all cursor-pointer group"
                >
                  <div className="flex items-center space-x-3 text-xs">
                    <div className="p-1.5 rounded-lg bg-slate-800 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-slate-200 group-hover:text-white font-medium">
                      {item.label}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-slate-500 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded">
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950/80 border-t border-slate-800 px-4 py-2 text-[10px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Command className="w-3 h-3 text-indigo-400" />
            <span>Navigation Command Palette</span>
          </div>
          <span>Press ↑ ↓ to navigate, Enter to select</span>
        </div>
      </div>
    </div>
  );
}
