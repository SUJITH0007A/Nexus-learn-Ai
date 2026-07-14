"use client";

import React, { useState, useEffect } from "react";
import SharedLayout from "@/components/shared-layout";

export default function AnalyticsPage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const mockAnalytics = {
    mastery: [
      { subject: "Quantum Physics", score: 92, status: "Mastered", color: "text-green-400 bg-green-500/10 border-green-500/20" },
      { subject: "Deep Learning", score: 85, status: "Proficient", color: "text-primary bg-primary-container/10 border-primary/20" },
      { subject: "Algorithms", score: 78, status: "Needs Practice", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
      { subject: "Economics", score: 88, status: "Proficient", color: "text-primary bg-primary-container/10 border-primary/20" }
    ],
    weakness_summary: "Your performance on **Algorithms** quizzes averaged 78%. We suggest review sessions utilizing code fixes inside Monaco Code Lab to boost performance.",
    quiz_scores: [
      { id: 1, title: "Quantum Physics quiz", accuracy: "92%", score: "9.2/10", date: "2 hours ago" },
      { id: 2, title: "Linear Algebra quiz", accuracy: "80%", score: "8.0/10", date: "3 days ago" },
      { id: 3, title: "Macroeconomics quiz", accuracy: "95%", score: "9.5/10", date: "4 days ago" }
    ]
  };

  if (!isMounted) return null;

  return (
    <SharedLayout>
      <div className="space-y-gutter">
        <div className="border-b border-outline-variant pb-4">
          <h2 className="font-geist font-bold text-3xl text-on-surface">Learning Analytics</h2>
          <p className="text-sm text-on-surface-variant mt-1">Detailed performance mapping over subject mastery grids.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          {/* Left panel: Mastery (7 columns) */}
          <div className="lg:col-span-7 glass-panel p-6 rounded-3xl space-y-6">
            <h4 className="font-geist font-bold text-sm text-on-surface">Subject Progress</h4>
            <div className="space-y-4">
              {mockAnalytics.mastery.map((item, idx) => (
                <div key={idx} className="p-4 bg-surface border border-outline-variant rounded-2xl flex justify-between items-center">
                  <div className="space-y-1.5 flex-1 mr-4">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-on-surface">{item.subject}</span>
                      <span className="text-primary font-bold">{item.score}%</span>
                    </div>
                    <div className="w-full bg-[#13131b] h-2 rounded-full overflow-hidden">
                      <div className="bg-primary h-full rounded-full" style={{ width: `${item.score}%` }}></div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${item.color}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel: Weak Areas (5 columns) */}
          <div className="lg:col-span-5 space-y-gutter">
            <div className="glass-panel p-6 rounded-3xl space-y-4 border-rose-500/20 bg-rose-950/5">
              <h4 className="font-geist font-bold text-sm text-rose-400 flex items-center gap-2">
                <span className="material-symbols-outlined">warning</span>
                Weakness Diagnostics
              </h4>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Your performance in **Algorithms** quizzes averaged 78%. We suggest review sessions using the explain & run compilers inside the Code Lab window.
              </p>
              <button
                onClick={() => router.push("/codelab")}
                className="w-full text-center py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-geist font-bold text-xs rounded-xl transition-all"
              >
                Go to Code Lab
              </button>
            </div>

            {/* Quiz logs history */}
            <div className="glass-panel p-6 rounded-3xl space-y-4">
              <h4 className="font-geist font-bold text-sm text-on-surface">Quiz History logs</h4>
              <div className="space-y-2">
                {mockAnalytics.quiz_scores.map((q) => (
                  <div key={q.id} className="p-3 bg-[#13131b]/50 border border-outline-variant rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-on-surface truncate max-w-[150px]">{q.title}</p>
                      <p className="text-[10px] text-outline mt-0.5">{q.date}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-primary font-bold">{q.accuracy}</span>
                      <p className="text-[10px] text-outline">{q.score}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SharedLayout>
  );
}
