"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("LOOP App Error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl max-w-md w-full text-center space-y-5">
        {/* Error Icon */}
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>

        {/* Title */}
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Something Went Wrong
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            An unexpected error occurred while loading this page.
          </p>
        </div>

        {/* Error Details */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-left">
          <p className="text-xs text-rose-300 font-mono break-all">
            {error.message || "Unknown error"}
          </p>
          {error.digest && (
            <p className="text-[10px] text-slate-500 font-mono mt-1">
              Digest: {error.digest}
            </p>
          )}
        </div>

        {/* Retry Button */}
        <button
          onClick={reset}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 mx-auto transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try Again</span>
        </button>

        {/* Fallback Link */}
        <p className="text-xs text-slate-500">
          If this persists, try{" "}
          <a
            href="/dashboard"
            className="text-indigo-400 hover:underline font-medium"
          >
            returning to Dashboard
          </a>
          .
        </p>
      </div>
    </div>
  );
}
