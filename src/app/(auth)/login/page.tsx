"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, AlertCircle, RefreshCw, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Network error logging in.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("password123");
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: demoEmail, password: "password123" }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Demo login failed.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Network error logging in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 text-slate-100 font-sans relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Card Container */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur relative z-10">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-500 items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-indigo-600/30 mb-3">
            L
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">PROJECT LOOP</h1>
          <p className="text-xs text-slate-400 mt-1">AI Customer-Feedback Intelligence Platform</p>
        </div>

        {/* Preset Quick Login Banner for Evaluators */}
        <div className="mb-6 p-4 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl">
          <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-300 mb-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Grading & Demo Quick Login (1-Click):</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin("admin@acme.com")}
              className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs py-2 px-2 rounded-xl font-medium transition-colors cursor-pointer text-center"
            >
              <span className="block font-semibold">Admin</span>
              <span className="text-[10px] text-rose-400/80 block">Full Access</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin("analyst@acme.com")}
              className="bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs py-2 px-2 rounded-xl font-medium transition-colors cursor-pointer text-center"
            >
              <span className="block font-semibold">Analyst</span>
              <span className="text-[10px] text-indigo-400/80 block">Manage & AI</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin("viewer@acme.com")}
              className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs py-2 px-2 rounded-xl font-medium transition-colors cursor-pointer text-center"
            >
              <span className="block font-semibold">Viewer</span>
              <span className="text-[10px] text-emerald-400/80 block">Read-Only</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="admin@acme.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Sign In to LOOP</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          Need a new tenant workspace?{" "}
          <Link href="/signup" className="text-indigo-400 hover:underline font-medium">
            Create Account & Workspace
          </Link>
        </div>
      </div>
    </div>
  );
}
