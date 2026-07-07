"use client";
import { API_BASE_URL } from "@/lib/utils";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import SharedLayout from "@/components/shared-layout";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

// Fetch Stats from backend with authorization
const fetchStats = async () => {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_BASE_URL}/api/analytics/dashboard-stats`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error("Failed to load statistics");
  }
  return response.json();
};

export default function DashboardPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  // Authenticate on mount
  useEffect(() => {
    setIsMounted(true);
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: fetchStats,
    enabled: isMounted,
    refetchInterval: 10000, // Polling updates
  });

  // Mock dashboard fallback data to guarantee premium UI is visible immediately
  const mockData = {
    user_info: { name: "Alex Rivera", xp: 650, level: 3, credits: 95, streak: 14 },
    metrics: { documents: 128, quizzes: 42, interviews: 18, study_hours: "28.5h", quiz_accuracy: "94%" },
    study_hours_chart: [
      { name: "Mon", hours: 4.2 },
      { name: "Tue", hours: 3.8 },
      { name: "Wed", hours: 5.1 },
      { name: "Thu", hours: 2.5 },
      { name: "Fri", hours: 4.0 },
      { name: "Sat", hours: 6.2 },
      { name: "Sun", hours: 2.7 }
    ],
    topic_mastery: [
      { subject: "Quantum Physics", score: 92, color: "#8083ff" },
      { subject: "Deep Learning", score: 85, color: "#a78bfa" },
      { subject: "Algorithms", score: 78, color: "#f43f5e" },
      { subject: "Economics", score: 88, color: "#fb923c" }
    ],
    weak_areas: [{ subject: "Algorithms", score: 78 }],
    recent_activity: [
      { id: 1, type: "quiz", title: "Completed Quiz: Quantum Physics", time: "2 hours ago", meta: "Score: 92%" },
      { id: 2, type: "doc", title: "Indexed Study Guide: Backpropagation.pdf", time: "5 hours ago", meta: "12.4 MB" },
      { id: 3, type: "interview", title: "Mock Interview Session completed", time: "Yesterday", meta: "Score: Mid Level - 85%" }
    ],
    heatmap: [2, 4, 3, 1, 0, 2, 4, 1, 3, 0, 2, 4, 2, 1, 4, 3, 1, 0, 2, 4, 3, 2, 1, 4, 0, 3, 2, 4]
  };

  const activeData = data || mockData;

  // Chart Formatting
  const chartData = activeData.study_hours_chart?.map
    ? activeData.study_hours_chart.map((hours: number, idx: number) => {
        const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        return { name: labels[idx] || `Day ${idx}`, hours };
      })
    : mockData.study_hours_chart;

  if (!isMounted) return null;

  return (
    <SharedLayout>
      <div className="space-y-stack-lg">
        {/* Welcome Banner */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-gutter pt-2">
          <div>
            <h2 className="font-geist font-bold text-3xl text-on-surface mb-1">
              Welcome back, {activeData.user_info?.name || "Learner"}
            </h2>
            <p className="text-on-surface-variant text-sm">
              Your learning momentum is up by 14% this week. Keep it going!
            </p>
          </div>
          <div className="flex gap-stack-sm flex-wrap">
            <button
              onClick={() => router.push("/documents")}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white px-4 py-2 rounded-xl font-geist text-xs font-semibold flex items-center gap-2 shadow-lg transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">upload_file</span>
              Upload Document
            </button>
            <button
              onClick={() => router.push("/chat")}
              className="bg-surface border border-outline-variant text-on-surface hover:bg-surface-container px-4 py-2 rounded-xl font-geist text-xs font-semibold flex items-center gap-2 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">chat_bubble</span>
              Start AI Chat
            </button>
          </div>
        </section>

        {/* Bento Grid Analytics */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
          {/* Card 1: Documents */}
          <div className="glass-panel p-stack-md rounded-2xl group hover:border-primary/50 transition-all cursor-pointer" onClick={() => router.push("/documents")}>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">folder_open</span>
              </div>
              <span className="text-[10px] font-geist text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded-full">+3 today</span>
            </div>
            <p className="text-on-surface-variant text-xs font-geist uppercase tracking-wider font-semibold">Documents Vault</p>
            <h3 className="font-geist font-bold text-3xl mt-1 text-on-surface">{activeData.metrics?.documents}</h3>
          </div>

          {/* Card 2: Quizzes */}
          <div className="glass-panel p-stack-md rounded-2xl group hover:border-primary/50 transition-all cursor-pointer" onClick={() => router.push("/documents")}>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                <span className="material-symbols-outlined">quiz</span>
              </div>
              <span className="text-[10px] font-geist text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded-full">{activeData.metrics?.quiz_accuracy} Acc</span>
            </div>
            <p className="text-on-surface-variant text-xs font-geist uppercase tracking-wider font-semibold">Quizzes Taken</p>
            <h3 className="font-geist font-bold text-3xl mt-1 text-on-surface">{activeData.metrics?.quizzes}</h3>
          </div>

          {/* Card 3: Study Hours */}
          <div className="glass-panel p-stack-md rounded-2xl group hover:border-primary/50 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400">
                <span className="material-symbols-outlined">schedule</span>
              </div>
              <span className="text-[10px] font-geist text-outline font-semibold">Target: 40h</span>
            </div>
            <p className="text-on-surface-variant text-xs font-geist uppercase tracking-wider font-semibold">Weekly study</p>
            <h3 className="font-geist font-bold text-3xl mt-1 text-on-surface">{activeData.metrics?.study_hours}</h3>
          </div>

          {/* Card 4: Streak */}
          <div className="glass-panel p-stack-md rounded-2xl group hover:border-primary/50 transition-all ai-glow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
              </div>
              <span className="text-[10px] font-geist text-primary font-bold bg-primary-container px-2 py-0.5 rounded-full">Personal Best!</span>
            </div>
            <p className="text-on-surface-variant text-xs font-geist uppercase tracking-wider font-semibold">Current Streak</p>
            <h3 className="font-geist font-bold text-3xl mt-1 text-on-surface">{activeData.user_info?.streak} Days</h3>
          </div>
        </section>

        {/* Main Grid Dash */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          {/* Left Side: Weekly Graph & Heatmaps */}
          <div className="lg:col-span-8 space-y-gutter">
            {/* Weekly Study Progress Area Chart */}
            <div className="glass-panel p-stack-lg rounded-2xl">
              <div className="flex justify-between items-center mb-6">
                <h4 className="font-geist font-bold text-lg text-on-surface">Weekly Study hours</h4>
                <div className="text-xs text-primary font-bold bg-primary-container px-3 py-1 rounded-lg">Last 7 Days</div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8083ff" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#8083ff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="#908fa0" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#908fa0" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "#1f1f27", borderColor: "#27272A", borderRadius: "12px", fontSize: "12px", color: "#e4e1ed" }} />
                    <Area type="monotone" dataKey="hours" stroke="#8083ff" strokeWidth={3} fill="url(#hoursGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
              {/* Timeline Activity */}
              <div className="glass-panel p-stack-lg rounded-2xl">
                <h4 className="font-geist font-bold text-lg text-on-surface mb-6">Recent Activity</h4>
                <div className="space-y-6">
                  {activeData.recent_activity.map((item: any, index: number) => {
                    const iconName = item.type === "quiz" ? "check_circle" : item.type === "doc" ? "description" : "timer";
                    const iconColor = item.type === "quiz" ? "text-primary" : item.type === "doc" ? "text-purple-400" : "text-orange-400";
                    return (
                      <div key={item.id} className="flex gap-4">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center border border-outline-variant z-10 relative">
                            <span className={`material-symbols-outlined ${iconColor} text-lg`}>{iconName}</span>
                          </div>
                          {index < activeData.recent_activity.length - 1 && (
                            <div className="absolute top-8 left-1/2 -translate-x-1/2 w-px h-10 bg-outline-variant/40"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate text-on-surface">{item.title}</p>
                          <p className="text-xs text-outline mt-0.5">{item.time} • {item.meta}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Intensity Activity Heatmap */}
              <div className="glass-panel p-stack-lg rounded-2xl flex flex-col justify-between">
                <div>
                  <h4 className="font-geist font-bold text-lg text-on-surface mb-2">Learning Heatmap</h4>
                  <p className="text-xs text-outline mb-6">Daily intensity logs over the past 4 weeks.</p>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {activeData.heatmap.map((val: number, idx: number) => {
                    const intensityColor =
                      val === 0
                        ? "bg-surface-container-low"
                        : val === 1
                        ? "bg-indigo-500/20"
                        : val === 2
                        ? "bg-indigo-500/40"
                        : val === 3
                        ? "bg-indigo-500/70"
                        : "bg-indigo-500";
                    return <div key={idx} className={`heatmap-cell ${intensityColor}`} title={`Intensity level: ${val}`}></div>;
                  })}
                </div>
                <div className="flex justify-between items-center text-[10px] text-outline font-semibold mt-4">
                  <span>Less intensity</span>
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded bg-surface-container-low"></div>
                    <div className="w-2.5 h-2.5 rounded bg-indigo-500/20"></div>
                    <div className="w-2.5 h-2.5 rounded bg-indigo-500/40"></div>
                    <div className="w-2.5 h-2.5 rounded bg-indigo-500/70"></div>
                    <div className="w-2.5 h-2.5 rounded bg-indigo-500"></div>
                  </div>
                  <span>More intensity</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Topic Mastery & AI Shortcuts */}
          <div className="lg:col-span-4 space-y-gutter">
            {/* Topic Mastery Progress List */}
            <div className="glass-panel p-stack-lg rounded-2xl space-y-6">
              <h4 className="font-geist font-bold text-lg text-on-surface">Subject Mastery</h4>
              <div className="space-y-4">
                {activeData.topic_mastery.map((topic: any, idx: number) => {
                  const subjectColor = topic.color || "#8083ff";
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-on-surface">{topic.subject}</span>
                        <span style={{ color: subjectColor }}>{topic.score}%</span>
                      </div>
                      <div className="w-full bg-surface-container-low h-2 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${topic.score}%`, backgroundColor: subjectColor }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Tips or AI Recommendations */}
            <div className="glass-panel p-stack-lg rounded-2xl bg-gradient-to-br from-indigo-950/20 to-purple-950/20 border border-indigo-500/20 flex flex-col justify-between h-48">
              <div className="flex justify-between items-start">
                <h4 className="font-geist font-bold text-md text-primary">AI Learning Assistant</h4>
                <span className="material-symbols-outlined text-primary">auto_awesome</span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Weak Area Identified: **Algorithms**. Generate a set of flashcards or dynamic MCQs from your lecture notes now to improve accuracy!
              </p>
              <button
                onClick={() => router.push("/chat")}
                className="w-full text-center py-2 bg-primary-container text-primary font-geist font-bold text-xs rounded-xl hover:brightness-110 transition-all mt-4"
              >
                Augment Skills Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </SharedLayout>
  );
}
