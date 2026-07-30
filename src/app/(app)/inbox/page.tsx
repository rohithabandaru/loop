"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Smile,
  Meh,
  Frown,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Tag,
  Building,
} from "lucide-react";

export default function InboxPage() {
  const [items, setItems] = useState<any[]>([]);
  const [themes, setThemes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });

  // Filters
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState("ALL");
  const [sentiment, setSentiment] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [themeId, setThemeId] = useState("ALL");
  const [userRole, setUserRole] = useState<string>("ANALYST");

  const fetchInbox = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        search,
        channel,
        sentiment,
        status,
        themeId,
      });

      const [fbRes, themeRes, meRes] = await Promise.all([
        fetch(`/api/feedback?${params.toString()}`),
        fetch("/api/themes"),
        fetch("/api/auth/me"),
      ]);

      const fbData = await fbRes.json();
      const themeData = await themeRes.json();
      const meData = await meRes.json();

      setItems(fbData.items || []);
      setPagination(fbData.pagination || { page: 1, limit: 12, total: 0, totalPages: 1 });
      setThemes(themeData.themes || []);
      if (meData.user) {
        setUserRole(meData.user.role);
      }
    } catch (e) {
      console.error("Inbox fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox(1);
  }, [search, channel, sentiment, status, themeId]);

  // Status Workflow Change Handler (NEW -> REVIEWED -> ACTIONED)
  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
        );
      } else {
        const d = await res.json();
        alert(d.error || "Permission denied.");
      }
    } catch {
      alert("Failed to update status.");
    }
  };

  // Manual AI Re-classify Action Handler
  const handleReclassify = async (id: string) => {
    try {
      const res = await fetch(`/api/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reclassify: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setItems((prev) =>
          prev.map((item) => (item.id === id ? data.feedback : item))
        );
      } else {
        alert(data.error || "Reclassification failed.");
      }
    } catch {
      alert("Error triggering AI reclassification.");
    }
  };

  // Delete Action Handler (ADMIN ONLY)
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this feedback item?")) return;
    try {
      const res = await fetch(`/api/feedback/${id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id));
      } else {
        const d = await res.json();
        alert(d.error || "Delete failed.");
      }
    } catch {
      alert("Delete failed.");
    }
  };

  const sentimentBadge = {
    POSITIVE: { bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", icon: Smile },
    NEUTRAL: { bg: "bg-amber-500/10 text-amber-400 border-amber-500/30", icon: Meh },
    NEGATIVE: { bg: "bg-rose-500/10 text-rose-400 border-rose-500/30", icon: Frown },
  };

  const statusColors = {
    NEW: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    REVIEWED: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    ACTIONED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  };

  const canEdit = userRole === "ADMIN" || userRole === "ANALYST";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Feedback Triage Inbox</span>
            <span className="text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-mono">
              {pagination.total} Items
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Search, filter, auto-classify, and advance feedback through triage workflow.
          </p>
        </div>
      </div>

      {/* Filter Control Bar (Acceptance Criteria C4 item 2 & 3) */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search content, customer, or ticket ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Channel Filter */}
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Channels</option>
            <option value="SUPPORT_TICKET">Support Ticket</option>
            <option value="APP_STORE_REVIEW">App Store Review</option>
            <option value="NPS_SURVEY">NPS Survey</option>
            <option value="SALES_NOTE">Sales Call Note</option>
            <option value="COMMUNITY_POST">Community Post</option>
          </select>

          {/* Sentiment Filter */}
          <select
            value={sentiment}
            onChange={(e) => setSentiment(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Sentiments</option>
            <option value="POSITIVE">Positive</option>
            <option value="NEUTRAL">Neutral</option>
            <option value="NEGATIVE">Negative</option>
          </select>

          {/* Status Workflow Filter */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">Status: NEW</option>
            <option value="REVIEWED">Status: REVIEWED</option>
            <option value="ACTIONED">Status: ACTIONED</option>
          </select>

          {/* Theme Filter */}
          <select
            value={themeId}
            onChange={(e) => setThemeId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Themes</option>
            {themes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.totalCount})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Inbox Items Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-400 mx-auto mb-2" />
          Loading feedback inbox...
        </div>
      ) : items.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-200">No feedback items found</h3>
          <p className="text-xs text-slate-500 mt-1">Try resetting your filters or ingesting new items.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const SentIcon =
              sentimentBadge[item.sentiment as keyof typeof sentimentBadge]?.icon || Meh;
            const sentClass =
              sentimentBadge[item.sentiment as keyof typeof sentimentBadge]?.bg ||
              "bg-slate-800 text-slate-400";

            return (
              <div
                key={item.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg transition-all space-y-3 group"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center space-x-3 text-xs">
                    {/* Sentiment Badge */}
                    <span className={`px-2.5 py-1 rounded-full border font-mono font-semibold flex items-center space-x-1 ${sentClass}`}>
                      <SentIcon className="w-3.5 h-3.5" />
                      <span>{item.sentiment} ({item.sentimentScore > 0 ? `+${item.sentimentScore}` : item.sentimentScore})</span>
                    </span>

                    {/* Channel */}
                    <span className="font-mono text-slate-300 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg uppercase tracking-wider text-[11px]">
                      {item.channel.replace("_", " ")}
                    </span>

                    {/* Customer label */}
                    {item.customerLabel && (
                      <span className="text-slate-400 flex items-center space-x-1">
                        <Building className="w-3 h-3 text-slate-500" />
                        <span>{item.customerLabel}</span>
                      </span>
                    )}

                    <span className="text-slate-500 text-[11px] font-mono">
                      Ref: {item.sourceRef || item.id.slice(0, 8)}
                    </span>
                  </div>

                  {/* Status Workflow Selector (Acceptance Criteria C4 item 4) */}
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                      Status:
                    </span>
                    {canEdit ? (
                      <select
                        value={item.status}
                        onChange={(e) => handleStatusChange(item.id, e.target.value)}
                        className={`text-xs font-mono font-semibold border rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer ${
                          statusColors[item.status as keyof typeof statusColors] || "bg-slate-800"
                        }`}
                      >
                        <option value="NEW">NEW</option>
                        <option value="REVIEWED">REVIEWED</option>
                        <option value="ACTIONED">ACTIONED</option>
                      </select>
                    ) : (
                      <span
                        className={`text-xs font-mono font-semibold border rounded-lg px-2.5 py-1 ${
                          statusColors[item.status as keyof typeof statusColors] || "bg-slate-800"
                        }`}
                      >
                        {item.status}
                      </span>
                    )}

                    {/* Manual Re-classify trigger (Acceptance criteria AI1 item 4) */}
                    {canEdit && (
                      <button
                        onClick={() => handleReclassify(item.id)}
                        className="p-1.5 text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 rounded-lg transition-colors cursor-pointer flex items-center space-x-1 text-xs"
                        title="Re-classify with AI"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-[11px]">Re-classify</span>
                      </button>
                    )}

                    {/* Delete trigger (ADMIN ONLY) */}
                    {userRole === "ADMIN" && (
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Delete item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Content body */}
                <p className="text-sm text-slate-100 leading-relaxed font-normal">{item.content}</p>

                {/* Rationale & Themes Footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-400">
                  <div className="flex items-center space-x-2 flex-wrap">
                    {item.themes?.map((t: any) => (
                      <span
                        key={t.id}
                        className="text-[11px] font-medium px-2.5 py-0.5 rounded-md text-white shadow-sm flex items-center space-x-1"
                        style={{ backgroundColor: t.color || "#4F46E5" }}
                      >
                        <Tag className="w-3 h-3 opacity-70" />
                        <span>{t.name}</span>
                      </span>
                    ))}
                    {item.featureArea && (
                      <span className="text-[11px] text-slate-400 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded">
                        Area: {item.featureArea}
                      </span>
                    )}
                  </div>

                  {item.rationale && (
                    <span className="text-[11px] text-slate-500 italic max-w-md truncate">
                      AI: {item.rationale}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Bar (Acceptance Criteria C4 item 1: Server-side pagination) */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl text-xs text-slate-400">
        <div>
          Showing Page <strong className="text-white">{pagination.page}</strong> of{" "}
          <strong className="text-white">{pagination.totalPages}</strong> ({pagination.total} Total)
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => fetchInbox(pagination.page - 1)}
            disabled={pagination.page <= 1 || loading}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 disabled:opacity-40 rounded-xl flex items-center space-x-1 cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <button
            onClick={() => fetchInbox(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages || loading}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 disabled:opacity-40 rounded-xl flex items-center space-x-1 cursor-pointer transition-colors"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
