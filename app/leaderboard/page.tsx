"use client";
import { API_BASE_URL } from "@/lib/utils";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SharedLayout from "@/components/shared-layout";

interface LeaderboardItem {
  rank: number;
  name: string;
  xp: number;
  level: number;
  avatar_url?: string;
}

interface Achievement {
  id: number;
  name: string;
  description: string;
  xp_value: number;
  unlocked: boolean;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    setIsMounted(true);
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const lbResp = await fetch(`${API_BASE_URL}/api/analytics/leaderboard`);
      const achResp = await fetch(`${API_BASE_URL}/api/analytics/achievements`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (lbResp.ok) setLeaderboard(await lbResp.json());
      if (achResp.ok) setAchievements(await achResp.json());
    } catch {}
  };

  // Mock list fallback
  const mockLeaderboard: LeaderboardItem[] = [
    { rank: 1, name: "Alex Rivera (You)", xp: 650, level: 3, avatar_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuAOIoT4IUbE9ARM7_qJlh0SCfgBQiJh22s6mSuCuWqdwej4BNagojdlqFC7byJp_vXBiVoz-gi03wp5BTbZ1CaUaPm7GO3ERE9Ks-0i9YI8MTCjbx_1fFhU0vKV91dU_ZN14qy3n5dJ90HKk-rNV3ifqccJlGiKRLaA04Tr8LegwOgWGUFLNz9ZMWS24gNFV_5CMCzCmBS9rZWu2aDFPFcBMaDbPn3h1OStezEpEZISl1-Ww9-XQbur" },
    { rank: 2, name: "Jordan Smith", xp: 520, level: 2 },
    { rank: 3, name: "Maria Davis", xp: 480, level: 2 },
    { rank: 4, name: "Taylor Chen", xp: 350, level: 1 }
  ];

  const mockAchievements: Achievement[] = [
    { id: 1, name: "Knowledge Explorer", description: "Upload your first study document.", xp_value: 50, unlocked: true },
    { id: 2, name: "Streak Master", description: "Maintain a study streak of 7 days.", xp_value: 100, unlocked: true },
    { id: 3, name: "AI Companion", description: "Chat with AI assistant for 10 messages.", xp_value: 75, unlocked: false },
    { id: 4, name: "Code Ninja", description: "Save your first optimized code snippet.", xp_value: 100, unlocked: false },
    { id: 5, name: "A+ Scholar", description: "Complete a generated quiz with >90% accuracy.", xp_value: 150, unlocked: false }
  ];

  const activeLeaderboard = leaderboard.length > 0 ? leaderboard : mockLeaderboard;
  const activeAchievements = achievements.length > 0 ? achievements : mockAchievements;

  if (!isMounted) return null;

  return (
    <SharedLayout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Left Side: Leaderboard Ranks (5 columns) */}
        <div className="lg:col-span-5 space-y-gutter">
          <div className="glass-panel p-6 rounded-3xl space-y-6">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3">
              <h3 className="font-geist font-bold text-lg text-primary flex items-center gap-2">
                <span className="material-symbols-outlined">leaderboard</span>
                Global Leaderboard
              </h3>
              <span className="text-[10px] text-primary uppercase font-bold bg-primary-container px-2.5 py-1 rounded">Weekly</span>
            </div>
            <div className="space-y-3">
              {activeLeaderboard.map((item) => {
                const isUser = item.name.includes("You");
                return (
                  <div
                    key={item.rank}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isUser
                        ? "border-primary bg-primary-container/10"
                        : "border-outline-variant bg-[#18181b]/20 hover:border-primary/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`font-geist font-bold text-xs ${item.rank === 1 ? "text-amber-400" : item.rank === 2 ? "text-slate-300" : "text-outline"}`}>
                        #{item.rank}
                      </span>
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant bg-surface-container">
                        <img
                          src={item.avatar_url || "https://www.gravatar.com/avatar?d=mp"}
                          className="w-full h-full object-cover"
                          alt="Avatar"
                        />
                      </div>
                      <span className="text-xs font-semibold text-on-surface truncate max-w-[120px]">
                        {item.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-primary">{item.xp} XP</p>
                      <p className="text-[9px] text-outline">Level {item.level}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Badges & Achievements Grid (7 columns) */}
        <div className="lg:col-span-7 space-y-gutter">
          <div className="glass-panel p-6 rounded-3xl space-y-6">
            <h3 className="font-geist font-bold text-lg text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">military_tech</span>
              Achievements & Badges
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeAchievements.map((ach) => (
                <div
                  key={ach.id}
                  className={`p-4 border rounded-2xl flex gap-3 transition-all ${
                    ach.unlocked
                      ? "border-primary/30 bg-primary-container/5 bg-gradient-to-br from-indigo-950/10 to-transparent shadow-sm ai-glow"
                      : "border-outline-variant bg-[#18181b]/10 opacity-60"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                    ach.unlocked ? "bg-primary-container text-primary border-primary/20" : "bg-surface border-outline-variant text-outline"
                  }`}>
                    <span className="material-symbols-outlined text-xl" style={ach.unlocked ? { fontVariationSettings: "'FILL' 1" } : {}}>
                      emoji_events
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className={`text-xs font-bold ${ach.unlocked ? "text-on-surface" : "text-outline"}`}>{ach.name}</h5>
                    <p className="text-[10px] text-on-surface-variant leading-relaxed mt-1">{ach.description}</p>
                    <span className="text-[9px] font-bold text-primary bg-primary-container/10 border border-primary/10 px-1.5 py-0.5 rounded mt-2 inline-block">
                      +{ach.xp_value} XP
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SharedLayout>
  );
}
