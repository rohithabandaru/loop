"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Shield,
  UserPlus,
  Building,
  RefreshCw,
  Key,
  Webhook,
  Copy,
  Send,
  Code2,
} from "lucide-react";
import { useToast } from "@/components/ToastContext";
import type { MemberData } from "@/lib/types";
import type { SessionUser } from "@/lib/auth";

export default function SettingsPage() {
  const toast = useToast();
  const [members, setMembers] = useState<MemberData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);

  // Integration & API Key State
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState<string>("");
  const [generatingKey, setGeneratingKey] = useState<boolean>(false);
  const [savingSlack, setSavingSlack] = useState<boolean>(false);
  const [testingSlack, setTestingSlack] = useState<boolean>(false);

  // Invite Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("ANALYST");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchSettings = useCallback(() => {
    Promise.all([
      fetch("/api/members").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/settings/api-key").then((r) => r.json()),
    ])
      .then(([memData, meData, keyData]) => {
        setMembers(memData.members || []);
        setCurrentUser(meData.user || null);
        setApiKey(keyData.apiKey || null);
        setSlackWebhookUrl(keyData.slackWebhookUrl || "");
      })
      .catch((e) => {
        console.error("Fetch settings error:", e);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleGenerateKey = async () => {
    setGeneratingKey(true);
    try {
      const res = await fetch("/api/settings/api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "GENERATE_KEY" }),
      });
      const data = await res.json();
      if (res.ok) {
        setApiKey(data.apiKey);
        toast.success("API key generated successfully!");
      } else {
        toast.error(data.error || "Failed to generate key.");
      }
    } catch {
      toast.error("Error generating API key.");
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleSaveSlackUrl = async () => {
    setSavingSlack(true);
    try {
      const res = await fetch("/api/settings/api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "UPDATE_SLACK", slackWebhookUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Slack Webhook URL saved successfully!");
      } else {
        toast.error(data.error || "Failed to save Slack Webhook.");
      }
    } catch {
      toast.error("Error saving Slack Webhook.");
    } finally {
      setSavingSlack(false);
    }
  };

  const handleTestSlack = async () => {
    setTestingSlack(true);
    try {
      const res = await fetch("/api/integrations/slack", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Test alert sent to Slack!");
      } else {
        toast.error(data.error || "Failed to dispatch Slack test alert.");
      }
    } catch {
      toast.error("Error testing Slack alert.");
    } finally {
      setTestingSlack(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, password: password || "password123" }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to invite member.");
      } else {
        toast.success(`Successfully invited ${name} as ${role}!`);
        setName("");
        setEmail("");
        setPassword("");
        fetchSettings();
      }
    } catch {
      toast.error("Network error creating member.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const res = await fetch("/api/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, role: newRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Permission denied. Only Admins can change roles.");
      } else {
        toast.success("Member role updated.");
        fetchSettings();
      }
    } catch {
      toast.error("Role update failed.");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard!`);
  };

  const isAdmin = currentUser?.role === "ADMIN";

  const roleColors = {
    ADMIN: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    ANALYST: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
    VIEWER: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  };

  const sampleCurl = `curl -X POST "${typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/ingest" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey || "YOUR_API_KEY"}" \\
  -d '{
    "content": "The new dashboard report export button keeps timing out on large datasets.",
    "channel": "SUPPORT_TICKET",
    "customerLabel": "enterprise@acme.com",
    "sourceRef": "TICKET-8901"
  }'`;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
          <Users className="w-6 h-6 text-indigo-400" />
          <span>Workspace Settings & Live Webhooks</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage workspace RBAC roles, inbound Webhook API keys, outbound Slack alerts, and tenant settings.
        </p>
      </div>

      {/* Workspace Info Banner */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{currentUser?.workspaceName}</h2>
            <p className="text-xs text-slate-400 font-mono">
              Tenant Workspace ID: {currentUser?.workspaceId}
            </p>
          </div>
        </div>

        <span className="text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full font-mono font-semibold self-start sm:self-auto">
          Multi-Tenant Isolated
        </span>
      </div>

      {/* SECTION 1: Live Webhooks & Integrations */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2 text-base font-bold text-white">
            <Webhook className="w-5 h-5 text-indigo-400" />
            <span>Live Integrations & Webhook Ingestion Engine</span>
          </div>
          <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-mono font-semibold">
            API Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card A: Inbound Webhook API Key */}
          <div className="bg-slate-950 border border-slate-800/80 p-5 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
                <Key className="w-4 h-4 text-amber-400" />
                <span>Inbound Webhook API Key</span>
              </div>
              {isAdmin && (
                <button
                  onClick={handleGenerateKey}
                  disabled={generatingKey}
                  className="text-xs bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 px-3 py-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {generatingKey ? "Generating..." : apiKey ? "Rotate Key" : "Generate Key"}
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-400">
              Use this secret key in the `x-api-key` header to stream feedback into LOOP from Zendesk, Intercom, or custom APIs.
            </p>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={apiKey || "No API Key Generated Yet"}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono"
              />
              {apiKey && (
                <button
                  onClick={() => copyToClipboard(apiKey, "API Key")}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                  title="Copy API Key"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Card B: Outbound Slack/Discord Webhook Alert */}
          <div className="bg-slate-950 border border-slate-800/80 p-5 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
                <Send className="w-4 h-4 text-emerald-400" />
                <span>Outbound Slack Alert Webhook</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Dispatch real-time Slack notifications whenever negative customer feedback arrives or a theme volume spike occurs.
            </p>

            <div className="space-y-2">
              <input
                type="url"
                placeholder="https://hooks.slack.com/services/..."
                value={slackWebhookUrl}
                onChange={(e) => setSlackWebhookUrl(e.target.value)}
                disabled={!isAdmin}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
              />

              {isAdmin && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleSaveSlackUrl}
                    disabled={savingSlack}
                    className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {savingSlack ? "Saving..." : "Save Webhook URL"}
                  </button>

                  <button
                    onClick={handleTestSlack}
                    disabled={testingSlack || !slackWebhookUrl}
                    className="text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    {testingSlack ? "Sending..." : "Test Webhook"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* cURL Code Snippet Example */}
        <div className="bg-slate-950 border border-slate-800/80 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 flex items-center space-x-1.5">
              <Code2 className="w-4 h-4 text-indigo-400" />
              <span>Sample cURL Ingestion Request</span>
            </span>
            <button
              onClick={() => copyToClipboard(sampleCurl, "cURL Snippet")}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-mono flex items-center space-x-1 cursor-pointer"
            >
              <Copy className="w-3 h-3" />
              <span>Copy Code</span>
            </button>
          </div>
          <pre className="bg-slate-900 p-3 rounded-lg text-[11px] font-mono text-indigo-300 overflow-x-auto border border-slate-800/60 leading-relaxed">
            {sampleCurl}
          </pre>
        </div>
      </div>

      {/* SECTION 2: Grid for Invite Form + Team Directory */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Invite Member (Admin Only) */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4 h-fit">
          <div className="flex items-center space-x-2 text-sm font-bold text-white border-b border-slate-800 pb-3">
            <UserPlus className="w-4 h-4 text-indigo-400" />
            <span>Invite Team Member</span>
          </div>

          {!isAdmin ? (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl text-xs space-y-1">
              <p className="font-semibold">Admin Permission Required</p>
              <p className="text-amber-400/80">
                Your current role is <strong className="uppercase">{currentUser?.role}</strong>. Only Workspace Admins can invite or modify member roles.
              </p>
            </div>
          ) : (
            <form onSubmit={handleInvite} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Alex Rivera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="alex@acme.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Assigned RBAC Role *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ADMIN">ADMIN (Full Access)</option>
                  <option value="ANALYST">ANALYST (Ingest & Manage)</option>
                  <option value="VIEWER">VIEWER (Read-Only)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Default Password
                </label>
                <input
                  type="text"
                  placeholder="password123"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Inviting...</span>
                  </>
                ) : (
                  <span>Send Member Invite</span>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Member Directory */}
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white">
              Workspace Team Members ({members.length})
            </h3>
            <span className="text-xs text-slate-500">Enforced Server-Side</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin text-indigo-400 mx-auto mb-2" />
              Loading team directory...
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="bg-slate-950 border border-slate-800/80 p-4 rounded-xl flex items-center justify-between gap-4 hover:border-slate-700 transition-colors"
                >
                  <div>
                    <div className="font-semibold text-sm text-slate-200 flex items-center space-x-2">
                      <span>{member.name}</span>
                      {member.id === currentUser?.userId && (
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">{member.email}</div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {isAdmin && member.id !== currentUser?.userId ? (
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        className={`text-xs font-mono font-semibold border rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer ${
                          roleColors[member.role as keyof typeof roleColors]
                        }`}
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="ANALYST">ANALYST</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
                    ) : (
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full border font-mono font-semibold flex items-center space-x-1 ${
                          roleColors[member.role as keyof typeof roleColors]
                        }`}
                      >
                        <Shield className="w-3 h-3" />
                        <span>{member.role}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
