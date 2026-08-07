"use client";

import { useEffect, useState, useCallback } from "react";
import ThemeModal from "@/components/ThemeModal";
import {
  TrendingUp,
  AlertTriangle,
  Layers,
  ChevronRight,
  RefreshCw,
  Smile,
  Frown,
} from "lucide-react";
import type { ThemeData } from "@/lib/types";

export default function TrendsPage() {
  const [themes, setThemes] = useState<ThemeData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTheme, setSelectedTheme] = useState<ThemeData | null>(null);

  const fetchThemes = useCallback(() => {
    fetch("/api/themes")
      .then((res) => res.json())
      .then((data) => {
        setThemes(data.themes || []);
      })
      .catch((e) => {
        console.error("Fetch themes error:", e);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchThemes();
  }, [fetchThemes]);

  const spikingThemes = themes.filter((t) => t.isSpiking);
  const totalVolume = themes.reduce((acc, curr) => acc + curr.totalCount, 0);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Theme Clustering & Volume Trends</span>
            <span className="text-xs bg-purple-500/10 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded-full font-mono">
              AI Cluster Analysis
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Detect growing feedback patterns, sentiment deltas, and week-over-week issue spikes.
          </p>
        </div>

        <button
          onClick={fetchThemes}
          className="self-start sm:self-auto bg-slate-900 border border-slate-800 hover:border-slate-700 px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 flex items-center space-x-2 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Re-cluster Themes</span>
        </button>
      </div>

      {/* Spike Alert Banner (Acceptance Criteria AI2 item 2) */}
      {spikingThemes.length > 0 && (
        <div className="p-5 bg-gradient-to-r from-rose-950/50 via-slate-900 to-slate-900 border border-rose-500/40 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-300">
                Spike Alert Detected: {spikingThemes.length} Theme(s) Spiking Week-over-Week
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                {spikingThemes.map((t) => `'${t.name}' (+${t.spikePercentage}% WoW)`).join(", ")}{" "}
                experienced significant negative sentiment volume spikes.
              </p>
            </div>
          </div>

          <button
            onClick={() => setSelectedTheme(spikingThemes[0])}
            className="self-start md:self-auto bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-lg shadow-rose-600/30 transition-all cursor-pointer whitespace-nowrap"
          >
            Investigate Spiking Theme
          </button>
        </div>
      )}

      {/* Themes Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
          Clustering feedback items into themes...
        </div>
      ) : themes.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <Layers className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-200">No Themes Found</h3>
          <p className="text-xs text-slate-500 mt-1">Ingest customer feedback items to trigger AI theme clustering.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {themes.map((theme) => {
            const percentage = totalVolume > 0 ? Math.round((theme.totalCount / totalVolume) * 100) : 0;

            return (
              <div
                key={theme.id}
                onClick={() => setSelectedTheme(theme)}
                className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 shadow-xl transition-all hover:scale-[1.01] cursor-pointer flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Accent Color Line */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: theme.color || "#6366F1" }}
                />

                <div>
                  {/* Title & Spike Badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-bold text-white text-base tracking-tight group-hover:text-indigo-300 transition-colors">
                      {theme.name}
                    </h3>
                    {theme.isSpiking ? (
                      <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-mono font-semibold flex items-center space-x-1 shrink-0">
                        <TrendingUp className="w-3 h-3" />
                        <span>+{theme.spikePercentage}% WoW</span>
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                        {theme.spikePercentage >= 0 ? `+${theme.spikePercentage}%` : `${theme.spikePercentage}%`}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed mb-4 line-clamp-2">
                    {theme.description}
                  </p>

                  {/* Volume progress bar */}
                  <div className="space-y-1.5 mb-5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-400">Volume Share</span>
                      <span className="text-slate-200 font-bold">
                        {theme.totalCount} items ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.max(percentage, 5)}%`,
                          backgroundColor: theme.color || "#6366F1",
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer breakdown */}
                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center space-x-1 text-emerald-400 font-semibold">
                      <Smile className="w-3.5 h-3.5" />
                      <span>{theme.posCount}</span>
                    </span>
                    <span className="flex items-center space-x-1 text-rose-400 font-semibold">
                      <Frown className="w-3.5 h-3.5" />
                      <span>{theme.negCount}</span>
                    </span>
                  </div>

                  <span className="text-indigo-400 font-semibold flex items-center space-x-1 group-hover:translate-x-0.5 transition-transform text-[11px]">
                    <span>Drill Down</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Theme Drill-down Modal (Acceptance Criteria AI2 item 3) */}
      <ThemeModal theme={selectedTheme} onClose={() => setSelectedTheme(null)} />
    </div>
  );
}
