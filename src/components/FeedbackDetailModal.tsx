"use client";

import { X, Smile, Meh, Frown, Tag, Calendar, Building, Sparkles, Shield, Hash, Layers } from "lucide-react";

interface FeedbackDetailModalProps {
  item: any | null;
  onClose: () => void;
  onStatusChange?: (id: string, newStatus: string) => void;
}

export default function FeedbackDetailModal({
  item,
  onClose,
  onStatusChange,
}: FeedbackDetailModalProps) {
  if (!item) return null;

  const sentimentBadge = {
    POSITIVE: { bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", icon: Smile },
    NEUTRAL: { bg: "bg-amber-500/10 text-amber-400 border-amber-500/30", icon: Meh },
    NEGATIVE: { bg: "bg-rose-500/10 text-rose-400 border-rose-500/30", icon: Frown },
  };

  const SentIcon = sentimentBadge[item.sentiment as keyof typeof sentimentBadge]?.icon || Meh;
  const sentClass =
    sentimentBadge[item.sentiment as keyof typeof sentimentBadge]?.bg ||
    "bg-slate-800 text-slate-400";

  return (
    <div className="fixed inset-0 z-[990] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full border text-xs font-mono font-semibold flex items-center space-x-1.5 ${sentClass}`}>
              <SentIcon className="w-4 h-4" />
              <span>{item.sentiment} ({item.sentimentScore > 0 ? `+${item.sentimentScore}` : item.sentimentScore})</span>
            </span>
            <span className="font-mono text-xs text-slate-300 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg uppercase tracking-wider">
              {item.channel.replace("_", " ")}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* Main Verbatim Text */}
          <div className="space-y-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Customer Feedback Content
            </span>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-slate-100 leading-relaxed font-normal">
              "{item.content}"
            </div>
          </div>

          {/* AI Intelligence Insights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-semibold text-indigo-400 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Feature Area</span>
              </span>
              <p className="text-sm font-semibold text-slate-200">{item.featureArea || "General / Core"}</p>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-semibold text-indigo-400 flex items-center space-x-1">
                <Layers className="w-3.5 h-3.5" />
                <span>Associated Theme</span>
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {item.themes && item.themes.length > 0 ? (
                  item.themes.map((t: any) => (
                    <span
                      key={t.id}
                      className="px-2.5 py-0.5 rounded-md text-[11px] font-medium text-white shadow-sm"
                      style={{ backgroundColor: t.color || "#6366F1" }}
                    >
                      {t.name}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500 italic">Unassigned</span>
                )}
              </div>
            </div>
          </div>

          {/* AI Rationale */}
          {item.rationale && (
            <div className="p-4 bg-indigo-950/20 border border-indigo-500/20 rounded-2xl space-y-1.5">
              <span className="text-[10px] uppercase font-semibold text-indigo-300 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Classification Rationale</span>
              </span>
              <p className="text-xs text-slate-300 italic leading-relaxed">{item.rationale}</p>
            </div>
          )}

          {/* Metadata Specs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-slate-800/80 pt-4 text-[11px] text-slate-400">
            <div>
              <span className="block text-slate-500 font-mono text-[10px]">Reference</span>
              <span className="font-mono text-slate-200 font-semibold">{item.sourceRef || item.id.slice(0, 8)}</span>
            </div>

            <div>
              <span className="block text-slate-500 font-mono text-[10px]">Customer Label</span>
              <span className="text-slate-200 font-semibold truncate block">{item.customerLabel || "Anonymous"}</span>
            </div>

            <div>
              <span className="block text-slate-500 font-mono text-[10px]">Date Ingested</span>
              <span className="text-slate-200 font-semibold">{new Date(item.createdAt).toLocaleDateString()}</span>
            </div>

            <div>
              <span className="block text-slate-500 font-mono text-[10px]">Triage Status</span>
              <span className="font-mono text-indigo-400 font-bold">{item.status}</span>
            </div>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400">Update Status:</span>
            {["NEW", "REVIEWED", "ACTIONED"].map((st) => (
              <button
                key={st}
                onClick={() => {
                  if (onStatusChange) onStatusChange(item.id, st);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                  item.status === st
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
