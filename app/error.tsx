"use client";

import React, { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("NexusLearn Client Exception caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#09090b] text-[#e4e1ed] flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full glass-panel p-8 rounded-3xl text-center space-y-6 border border-indigo-500/20 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
          <span className="material-symbols-outlined text-[32px]">warning</span>
        </div>

        <div className="space-y-2">
          <h2 className="font-geist font-bold text-2xl text-on-surface">Application Workspace Exception</h2>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            NexusLearn encountered a temporary client-side error. You can refresh the workspace session or return to the landing page.
          </p>
        </div>

        {error?.message && (
          <div className="bg-[#13131b] p-3 rounded-xl border border-outline-variant text-[11px] font-mono text-rose-400 text-left overflow-x-auto">
            {error.message}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white font-geist font-bold text-xs py-3 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Try Again
          </button>
          <Link
            href="/"
            className="flex-1 bg-[#18181b] hover:bg-[#27272a] text-on-surface border border-outline-variant font-geist font-bold text-xs py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">home</span>
            Landing Page
          </Link>
        </div>
      </div>
    </div>
  );
}
