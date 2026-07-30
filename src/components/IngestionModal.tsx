"use client";

import { useState } from "react";
import { X, Upload, PlusCircle, RefreshCw, CheckCircle2, AlertCircle, FileSpreadsheet } from "lucide-react";

interface IngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function IngestionModal({ isOpen, onClose, onSuccess }: IngestionModalProps) {
  const [activeTab, setActiveTab] = useState<"single" | "csv" | "simulate">("single");

  // Single Form State
  const [content, setContent] = useState("");
  const [channel, setChannel] = useState("SUPPORT_TICKET");
  const [customerLabel, setCustomerLabel] = useState("");
  const [sourceRef, setSourceRef] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [singleError, setSingleError] = useState("");

  // CSV Form State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState("");
  const [csvResult, setCsvResult] = useState<any>(null);

  // Simulation State
  const [simulatingChannel, setSimulatingChannel] = useState<string | null>(null);
  const [simResult, setSimResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSingleError("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, channel, customerLabel, sourceRef }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSingleError(data.error || "Failed to submit feedback.");
      } else {
        setContent("");
        setCustomerLabel("");
        setSourceRef("");
        onSuccess();
        onClose();
      }
    } catch {
      setSingleError("Network error submitting feedback.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCsvSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setCsvResult(null);

    try {
      const formData = new FormData();
      if (csvFile) {
        formData.append("file", csvFile);
      } else if (csvText.trim()) {
        formData.append("csvText", csvText);
      } else {
        alert("Please select a CSV file or paste CSV text.");
        setIsSubmitting(false);
        return;
      }

      const res = await fetch("/api/feedback/csv", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setCsvResult(data);
      if (data.success) {
        onSuccess();
      }
    } catch {
      alert("Failed to process CSV file.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulate = async (sourceKey: string) => {
    setSimulatingChannel(sourceKey);
    setSimResult(null);

    try {
      const res = await fetch("/api/feedback/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: sourceKey }),
      });

      const data = await res.json();
      setSimResult(data);
      if (data.success) {
        onSuccess();
      }
    } catch {
      alert("Failed to simulate channel sync.");
    } finally {
      setSimulatingChannel(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <PlusCircle className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">Ingest Customer Feedback</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 bg-slate-950/40 border-b border-slate-800 flex space-x-2">
          <button
            onClick={() => setActiveTab("single")}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all border-b-2 ${
              activeTab === "single"
                ? "border-indigo-500 text-indigo-400 bg-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Single Entry
          </button>
          <button
            onClick={() => setActiveTab("csv")}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all border-b-2 ${
              activeTab === "csv"
                ? "border-indigo-500 text-indigo-400 bg-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Bulk CSV Upload
          </button>
          <button
            onClick={() => setActiveTab("simulate")}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all border-b-2 ${
              activeTab === "simulate"
                ? "border-indigo-500 text-indigo-400 bg-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Simulate Channels
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* TAB 1: SINGLE ENTRY */}
          {activeTab === "single" && (
            <form onSubmit={handleSingleSubmit} className="space-y-4">
              {singleError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{singleError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Channel Source *
                </label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="SUPPORT_TICKET">Support Ticket</option>
                  <option value="APP_STORE_REVIEW">App Store Review</option>
                  <option value="NPS_SURVEY">NPS Survey Response</option>
                  <option value="SALES_NOTE">Sales Call Note</option>
                  <option value="COMMUNITY_POST">Community Post</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Feedback Content *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Paste customer feedback text here (e.g. 'Onboarding process took forever, could not invite my team members...')"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Customer Label / Email
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Corp (Enterprise)"
                    value={customerLabel}
                    onChange={(e) => setCustomerLabel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Source Reference ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ZD-9041"
                    value={sourceRef}
                    onChange={(e) => setSourceRef(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || !content.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Classifying with AI...</span>
                    </>
                  ) : (
                    <span>Submit & Classify</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: BULK CSV UPLOAD */}
          {activeTab === "csv" && (
            <form onSubmit={handleCsvSubmit} className="space-y-4">
              <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500/50 rounded-2xl p-6 text-center transition-colors bg-slate-950/50">
                <FileSpreadsheet className="w-10 h-10 text-indigo-400 mx-auto mb-2" />
                <p className="text-sm text-slate-300 font-medium">Upload CSV File</p>
                <p className="text-xs text-slate-500 mt-1">
                  CSV must contain headers: <code className="text-indigo-300 font-mono">content, channel, customerLabel</code>
                </p>

                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="mt-4 text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                />
              </div>

              <div className="text-center text-xs text-slate-500 uppercase tracking-wider font-semibold">
                OR Paste Raw CSV Text
              </div>

              <textarea
                rows={4}
                placeholder="content,channel,customerLabel&#10;Onboarding was slow,SUPPORT_TICKET,Acme Corp&#10;Love the fast dashboard,APP_STORE_REVIEW,Jane Doe"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
              />

              {csvResult && (
                <div
                  className={`p-4 rounded-xl text-xs border ${
                    csvResult.success
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  }`}
                >
                  {csvResult.success ? (
                    <div>
                      <div className="flex items-center space-x-2 font-semibold text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>CSV Import Completed!</span>
                      </div>
                      <p className="mt-1">
                        Processed: {csvResult.summary?.totalProcessed} | Imported:{" "}
                        <strong className="text-white">{csvResult.summary?.importedCount}</strong> |
                        Failed: {csvResult.summary?.failedCount}
                      </p>
                    </div>
                  ) : (
                    <p>{csvResult.error}</p>
                  )}
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || (!csvFile && !csvText.trim())}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Parsing & Classifying CSV...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Import CSV</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: SIMULATED CHANNELS */}
          {activeTab === "simulate" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Click any integration source below to trigger simulated customer feedback ingestion.
                Items are auto-classified by AI into themes & sentiment upon sync.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleSimulate("zendesk")}
                  disabled={simulatingChannel !== null}
                  className="bg-slate-950 border border-slate-800 hover:border-indigo-500/50 p-4 rounded-xl text-left transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-200 group-hover:text-indigo-400">
                      Zendesk Support
                    </span>
                    <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-mono">
                      Tickets
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Sync 5 realistic support tickets (2FA reset, 504 timeouts, dark mode request).
                  </p>
                </button>

                <button
                  onClick={() => handleSimulate("appstore")}
                  disabled={simulatingChannel !== null}
                  className="bg-slate-950 border border-slate-800 hover:border-emerald-500/50 p-4 rounded-xl text-left transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-200 group-hover:text-emerald-400">
                      App Store Ratings
                    </span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">
                      Reviews
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Sync 5 user app reviews (mobile crashes, UI feedback, star ratings).
                  </p>
                </button>

                <button
                  onClick={() => handleSimulate("surveymonkey")}
                  disabled={simulatingChannel !== null}
                  className="bg-slate-950 border border-slate-800 hover:border-purple-500/50 p-4 rounded-xl text-left transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-200 group-hover:text-purple-400">
                      SurveyMonkey NPS
                    </span>
                    <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded font-mono">
                      Surveys
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Sync 5 NPS survey responses (Promoters, Passives, Detractors).
                  </p>
                </button>

                <button
                  onClick={() => handleSimulate("hubspot")}
                  disabled={simulatingChannel !== null}
                  className="bg-slate-950 border border-slate-800 hover:border-amber-500/50 p-4 rounded-xl text-left transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-200 group-hover:text-amber-400">
                      HubSpot Sales Notes
                    </span>
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-mono">
                      Call Notes
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Sync 5 sales deal notes (Okta SSO blocker, SOC2 compliance, competitor comparisons).
                  </p>
                </button>
              </div>

              {simResult && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Successfully synced {simResult.count} items from {simResult.channel}!
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
