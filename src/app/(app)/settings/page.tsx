"use client";

import { useEffect, useState } from "react";
import { Users, Shield, UserPlus, Building, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export default function SettingsPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Invite Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("ANALYST");
  const [password, setPassword] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const [memRes, meRes] = await Promise.all([fetch("/api/members"), fetch("/api/auth/me")]);
      const memData = await memRes.json();
      const meData = await meRes.json();

      setMembers(memData.members || []);
      setCurrentUser(meData.user || null);
    } catch (e) {
      console.error("Fetch members error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    setInviteSuccess("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, password: password || "password123" }),
      });

      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error || "Failed to invite member.");
      } else {
        setInviteSuccess(`Successfully invited ${name} as ${role}!`);
        setName("");
        setEmail("");
        setPassword("");
        fetchMembers();
      }
    } catch {
      setInviteError("Network error creating member.");
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
        alert(data.error || "Permission denied (403). Only Admins can change roles.");
      } else {
        fetchMembers();
      }
    } catch {
      alert("Role update failed.");
    }
  };

  const isAdmin = currentUser?.role === "ADMIN";

  const roleColors = {
    ADMIN: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    ANALYST: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
    VIEWER: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
          <Users className="w-6 h-6 text-indigo-400" />
          <span>Workspace Team & Role-Based Access Control (RBAC)</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage workspace members, assign RBAC permissions (Admin, Analyst, Viewer), and review tenant settings.
        </p>
      </div>

      {/* Workspace Info Banner */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{currentUser?.workspaceName}</h2>
            <p className="text-xs text-slate-400 font-mono">
              Tenant ID: {currentUser?.workspaceId}
            </p>
          </div>
        </div>

        <span className="text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full font-mono font-semibold">
          Multi-Tenant Isolated
        </span>
      </div>

      {/* Grid: Invite Member Form + Member Directory */}
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
              {inviteError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs flex items-center space-x-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{inviteError}</span>
                </div>
              )}

              {inviteSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{inviteSuccess}</span>
                </div>
              )}

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
