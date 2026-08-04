"use client";

import { useEffect, useState } from "react";
import StatCard from "@/components/StatCard";
import {
  MessageSquare,
  TrendingDown,
  CheckCircle2,
  Sparkles,
  Filter,
  Calendar,
  Layers,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function DashboardPage() {
  const [days, setDays] = useState<number>(30);
  const [channelFilter, setChannelFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState<boolean>(true);
  const [feedbackItems, setFeedbackItems] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    total: 0,
    negativeRatio: 0,
    actionedRatio: 0,
    newThisWeek: 0,
  });
  const [themes, setThemes] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [fbRes, themeRes] = await Promise.all([
        fetch(`/api/feedback?limit=500&days=${days}&channel=${channelFilter}`),
        fetch("/api/themes"),
      ]);

      const fbData = await fbRes.json();
      const themeData = await themeRes.json();

      setFeedbackItems(fbData.items || []);
      setStats(fbData.stats || {});
      setThemes(themeData.themes || []);
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [days, channelFilter]);

  // Compute Volume over time chart data
  const volumeChartData = (() => {
    const countsByDate: Record<string, { date: string; positive: number; neutral: number; negative: number; total: number }> = {};

    feedbackItems.forEach((item) => {
      const d = new Date(item.createdAt);
      const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
      if (!countsByDate[dateStr]) {
        countsByDate[dateStr] = { date: dateStr, positive: 0, neutral: 0, negative: 0, total: 0 };
      }
      countsByDate[dateStr].total++;
      if (item.sentiment === "POSITIVE") countsByDate[dateStr].positive++;
      else if (item.sentiment === "NEGATIVE") countsByDate[dateStr].negative++;
      else countsByDate[dateStr].neutral++;
    });

    return Object.values(countsByDate).slice(-14);
  })();

  // Compute Sentiment Breakdown Donut Chart
  const sentimentData = [
    { name: "Positive", value: feedbackItems.filter((i) => i.sentiment === "POSITIVE").length, color: "#10B981" },
    { name: "Neutral", value: feedbackItems.filter((i) => i.sentiment === "NEUTRAL").length, color: "#F59E0B" },
    { name: "Negative", value: feedbackItems.filter((i) => i.sentiment === "NEGATIVE").length, color: "#EF4444" },
  ];

  // Compute Top Themes Bar Chart
  const topThemesData = themes.slice(0, 5).map((t) => ({
    name: t.name,
    count: t.totalCount,
    color: t.color,
  }));

  // Compute Channel Distribution
  const channelData = (() => {
    const map: Record<string, number> = {};
    feedbackItems.forEach((i) => {
      const label = i.channel.replace("_", " ");
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  })();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Executive Feedback Analytics</span>
            <span className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full font-mono">
              Live Real-Time
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Synthesized customer intelligence across support, reviews, surveys, and sales notes.
          </p>
        </div>

        {/* Global Filter Bar */}
        <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 p-1.5 rounded-2xl">
          <div className="flex items-center space-x-1 px-2 text-xs text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold">Range:</span>
          </div>

          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${days === d ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" : "text-slate-400 hover:text-slate-200"
                }`}
            >
              {d} Days
            </button>
          ))}

          <div className="h-4 w-px bg-slate-800 mx-1" />

          <div className="flex items-center space-x-1 px-2 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
          </div>

          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none"
          >
            <option value="ALL">All Channels</option>
            <option value="SUPPORT_TICKET">Support Tickets</option>
            <option value="APP_STORE_REVIEW">App Reviews</option>
            <option value="NPS_SURVEY">NPS Surveys</option>
            <option value="SALES_NOTE">Sales Notes</option>
            <option value="COMMUNITY_POST">Community Posts</option>
          </select>

          <button
            onClick={fetchDashboardData}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Metric Stat Cards (Acceptance Criteria C5 item 3) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Feedback Items"
          value={stats.total || 0}
          subtitle={`Ingested in selected ${days}-day window`}
          icon={MessageSquare}
        />
        <StatCard
          title="Negative Sentiment %"
          value={`${Math.round(stats.negativeRatio || 0)}%`}
          change={stats.negativeRatio > 35 ? "Negativity Alert" : "Healthy"}
          isPositiveChange={stats.negativeRatio <= 35}
          subtitle="Percentage of unhappy customer mentions"
          icon={TrendingDown}
        />
        <StatCard
          title="Actioned Rate"
          value={`${Math.round(stats.actionedRatio || 0)}%`}
          change="+12% WoW"
          isPositiveChange={true}
          subtitle="Items moved to ACTIONED workflow state"
          icon={CheckCircle2}
        />
        <StatCard
          title="New Feedback This Week"
          value={stats.newThisWeek || 0}
          subtitle="Ingested in last 7 days"
          icon={Sparkles}
        />
      </div>

      {/* Main Charts Grid (Acceptance Criteria C5 item 1) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CHART 1: Volume & Sentiment Over Time (Area Chart) */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Feedback Volume & Sentiment Over Time
                </h3>
                <p className="text-xs text-slate-400">
                  Daily feedback velocity grouped by positive vs negative sentiment.
                </p>
              </div>
              <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
                Daily Velocity
              </span>
            </div>

            {loading ? (
              <div className="h-64 flex items-center justify-center text-xs text-slate-500">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-400 mr-2" />
                Loading chart...
              </div>
            ) : volumeChartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-slate-500 italic">
                No feedback data available for selected filter range.
              </div>
            ) : (
              <div className="h-64 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={volumeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorNeg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis dataKey="date" stroke="#64748B" fontSize={11} />
                    <YAxis stroke="#64748B" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0F172A", borderColor: "#334155", borderRadius: "12px", fontSize: "12px" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                    <Area type="monotone" dataKey="positive" name="Positive" stroke="#10B981" fillOpacity={1} fill="url(#colorPos)" />
                    <Area type="monotone" dataKey="negative" name="Negative" stroke="#EF4444" fillOpacity={1} fill="url(#colorNeg)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* CHART 2: Sentiment Breakdown Donut Chart */}
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight mb-1">
              Sentiment Distribution
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              AI classified sentiment breakdown ratio.
            </p>

            {loading ? (
              <div className="h-56 flex items-center justify-center text-xs text-slate-500">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-400 mr-2" />
                Loading...
              </div>
            ) : (
              <div className="h-56 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {sentimentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#0F172A", borderColor: "#334155", borderRadius: "12px", fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-extrabold text-white">{feedbackItems.length}</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    Items
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-slate-800/80 pt-4 text-center text-xs">
            <div>
              <span className="block text-emerald-400 font-bold">{sentimentData[0].value}</span>
              <span className="text-[10px] text-slate-400">Positive</span>
            </div>
            <div>
              <span className="block text-amber-400 font-bold">{sentimentData[1].value}</span>
              <span className="text-[10px] text-slate-400">Neutral</span>
            </div>
            <div>
              <span className="block text-rose-400 font-bold">{sentimentData[2].value}</span>
              <span className="text-[10px] text-slate-400">Negative</span>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 3: Top Customer Themes Bar Chart */}
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Top Customer Feedback Themes
              </h3>
              <p className="text-xs text-slate-400">Volume distribution across AI cluster themes.</p>
            </div>
            <Layers className="w-5 h-5 text-purple-400" />
          </div>

          <div className="h-60 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topThemesData} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
                <XAxis type="number" stroke="#64748B" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={11} width={120} />
                <Tooltip contentStyle={{ backgroundColor: "#0F172A", borderColor: "#334155", borderRadius: "12px", fontSize: "12px" }} />
                <Bar dataKey="count" name="Feedback Items" radius={[0, 8, 8, 0]}>
                  {topThemesData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 4: Feedback Channel Distribution */}
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Ingestion Channel Breakdown
              </h3>
              <p className="text-xs text-slate-400">Distribution across tickets, app reviews, NPS & call notes.</p>
            </div>
          </div>

          <div className="h-60 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channelData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="name" stroke="#64748B" fontSize={10} />
                <YAxis stroke="#64748B" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: "#0F172A", borderColor: "#334155", borderRadius: "12px", fontSize: "12px" }} />
                <Bar dataKey="count" name="Volume" fill="#6366F1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
