"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Sparkles,
  Printer,
  Calendar,
  RefreshCw,
  Quote,
  User,
} from "lucide-react";
import type { ReportData, ReportContent } from "@/lib/types";

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [activeReport, setActiveReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [days, setDays] = useState<number>(30);
  const [userRole, setUserRole] = useState<string>("ANALYST");

  useEffect(() => {
    let isCancelled = false;
    const fetchReports = async () => {
      try {
        const [repRes, meRes] = await Promise.all([fetch("/api/reports"), fetch("/api/auth/me")]);
        const repData = await repRes.json();
        const meData = await meRes.json();

        if (!isCancelled) {
          setReports(repData.reports || []);
          if (repData.reports && repData.reports.length > 0) {
            setActiveReport(repData.reports[0]);
          }
          if (meData.user) {
            setUserRole(meData.user.role);
          }
        }
      } catch (e) {
        console.error("Fetch reports error:", e);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchReports();
    return () => {
      isCancelled = true;
    };
  }, []);

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to generate report.");
      } else {
        setReports((prev) => [data.report, ...prev]);
        setActiveReport(data.report);
      }
    } catch {
      alert("Error generating report.");
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const parsedContent: ReportContent | null = activeReport?.contentJson
    ? JSON.parse(activeReport.contentJson)
    : null;

  const canGenerate = userRole === "ADMIN" || userRole === "ANALYST";

  return (
    <div className="space-y-8 animate-fade-in print:p-0">
      {/* Printable CSS style override */}
      <style jsx global>{`
        @media print {
          aside, header, .no-print {
            display: none !important;
          }
          main {
            padding: 0 !important;
          }
          body {
            background-color: white !important;
            color: black !important;
          }
          .print-card {
            background-color: white !important;
            color: black !important;
            border: 1px solid #cbd5e1 !important;
            box-shadow: none !important;
          }
          .print-text {
            color: black !important;
          }
        }
      `}</style>

      {/* Header Controls (Hidden during print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <FileText className="w-6 h-6 text-indigo-400" />
            <span>Voice-of-Customer (VoC) Executive Reports</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            One-click executive digests summarizing top themes, sentiment shifts, verbatim quotes, and actions.
          </p>
        </div>

        {canGenerate && (
          <div className="flex items-center space-x-3">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none"
            >
              <option value={7}>7-Day Digest</option>
              <option value={30}>30-Day Digest</option>
              <option value={90}>90-Day Digest</option>
            </select>

            <button
              onClick={handleGenerateReport}
              disabled={generating}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-all cursor-pointer"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Report...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate New Report</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Content Layout */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-400 mx-auto mb-2" />
          Loading reports archive...
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-200">No VoC Reports Generated Yet</h3>
          <p className="text-xs text-slate-500 mt-1">
            Click &apos;Generate New Report&apos; above to synthesize your workspace feedback into an executive digest.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Archive Timeline Sidebar */}
          <div className="no-print lg:col-span-1 bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3 h-fit">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">
              Report History ({reports.length})
            </h3>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
              {reports.map((rep) => {
                const isActive = activeReport?.id === rep.id;
                return (
                  <button
                    key={rep.id}
                    onClick={() => setActiveReport(rep)}
                    className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer border ${
                      isActive
                        ? "bg-indigo-600/20 border-indigo-500/50 text-white"
                        : "bg-slate-950/50 border-slate-800/80 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div className="text-xs font-semibold line-clamp-1">{rep.title}</div>
                    <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                      <span>{new Date(rep.createdAt).toLocaleDateString()}</span>
                      <span className="font-mono text-indigo-400">By {rep.generatedBy?.name.split(" ")[0]}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Report Reader View (Print Target) */}
          {activeReport && (
          <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 print-card">
            {/* Report Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-5 gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full font-semibold">
                  Executive Voice-of-Customer Digest
                </span>
                <h2 className="text-xl font-bold text-white tracking-tight mt-2 print-text">
                  {activeReport.title}
                </h2>
                <div className="flex items-center space-x-4 text-xs text-slate-400 mt-1">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    <span>
                      {new Date(activeReport.periodStart).toLocaleDateString()} –{" "}
                      {new Date(activeReport.periodEnd).toLocaleDateString()}
                    </span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Generated by {activeReport.generatedBy?.name}</span>
                  </span>
                </div>
              </div>

              <div className="no-print">
                <button
                  onClick={handlePrint}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2 rounded-xl flex items-center space-x-2 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-indigo-400" />
                  <span>Print / Export PDF</span>
                </button>
              </div>
            </div>

            {parsedContent && (
              <div className="space-y-6 text-sm">
                {/* 1. Executive Summary */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                    1. Executive Summary
                  </h3>
                  <p className="text-slate-200 leading-relaxed bg-slate-950/60 border border-slate-800 p-4 rounded-xl print-card print-text">
                    {parsedContent.summary}
                  </p>
                </div>

                {/* 2. Key Metrics Snapshot */}
                {parsedContent.metrics && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                      2. Period Key Metrics
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl print-card">
                        <span className="text-[10px] text-slate-400 uppercase">Total Items</span>
                        <span className="text-lg font-bold text-white block print-text">
                          {parsedContent.metrics.totalItems}
                        </span>
                      </div>
                      <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl print-card">
                        <span className="text-[10px] text-slate-400 uppercase">Negative Ratio</span>
                        <span className="text-lg font-bold text-rose-400 block">
                          {Math.round(parsedContent.metrics.negativeRatio * 100)}%
                        </span>
                      </div>
                      <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl print-card">
                        <span className="text-[10px] text-slate-400 uppercase">Positive Ratio</span>
                        <span className="text-lg font-bold text-emerald-400 block">
                          {Math.round(parsedContent.metrics.positiveRatio * 100)}%
                        </span>
                      </div>
                      <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl print-card">
                        <span className="text-[10px] text-slate-400 uppercase">Spiking Theme</span>
                        <span className="text-xs font-bold text-amber-400 block truncate">
                          {parsedContent.metrics.topSpikeTheme}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Verbatim Customer Quotes */}
                {parsedContent.quotes && parsedContent.quotes.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                      3. Notable Verbatim Quotes
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {parsedContent.quotes.map((q: string, idx: number) => (
                        <div
                          key={idx}
                          className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-xs text-slate-300 italic flex items-start space-x-2.5 print-card print-text"
                        >
                          <Quote className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                          <span>&quot;{q}&quot;</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Strategic Recommended Actions */}
                {parsedContent.recommendations && parsedContent.recommendations.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                      4. Strategic Recommended Actions
                    </h3>
                    <div className="space-y-2">
                      {parsedContent.recommendations.map((rec: string, idx: number) => (
                        <div
                          key={idx}
                          className="bg-indigo-950/30 border border-indigo-500/20 p-3.5 rounded-xl text-xs text-indigo-200 flex items-center space-x-3 print-card print-text"
                        >
                          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                            {idx + 1}
                          </span>
                          <span className="font-medium">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          )}
        </div>
      )}
    </div>
  );
}
