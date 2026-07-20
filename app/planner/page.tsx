"use client";
import { API_BASE_URL } from "@/lib/utils";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SharedLayout from "@/components/shared-layout";

interface StudyPlan {
  id: number;
  title: string;
  schedule: { day: number; topics: string[]; time_allocation: string }[];
  goals: {
    target_date: string;
    days_countdown: number;
    hours_per_day: number;
    user_goals: string;
  };
  created_at: string;
}

export default function PlannerPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [activePlan, setActivePlan] = useState<StudyPlan | null>(null);
  
  const [title, setTitle] = useState("");
  const [subjects, setSubjects] = useState("");
  const [hours, setHours] = useState(2);
  const [examDate, setExamDate] = useState("");
  const [goals, setGoals] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [checklist, setChecklist] = useState<{ id: number; text: string; done: boolean }[]>([
    { id: 1, text: "Revise Quantum mechanics section 2", done: true },
    { id: 2, text: "Read neural network backpropagation lecture notes", done: false },
    { id: 3, text: "Generate 5 MCQs on calculus", done: false },
  ]);

  useEffect(() => {
    setIsMounted(true);
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/planner/plans`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPlans(data);
        if (data.length > 0 && !activePlan) {
          setActivePlan(data[0]);
        }
      }
    } catch {}
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const subjectsArray = subjects.split(",").map(s => s.trim());
      const response = await fetch(`${API_BASE_URL}/api/planner/plans`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          title,
          subjects: subjectsArray,
          hours_per_day: hours,
          target_exam_date: examDate,
          goals
        })
      });
      if (response.ok) {
        const data = await response.json();
        setPlans(prev => [data, ...prev]);
        setActivePlan(data);
        // Clear fields
        setTitle("");
        setSubjects("");
        setExamDate("");
        setGoals("");
      }
    } catch {
      alert("Failed to build schedule via AI. Sandbox backup index triggered.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlan = async (planId: number) => {
    if (!confirm("Are you sure you want to delete this study plan?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/planner/plans/${planId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (response.ok) {
        setPlans(plans.filter(p => p.id !== planId));
        if (activePlan?.id === planId) {
          setActivePlan(plans[0] || null);
        }
      }
    } catch {}
  };

  const toggleChecklist = (id: number) => {
    setChecklist(checklist.map(item => item.id === id ? { ...item, done: !item.done } : item));
  };

  if (!isMounted) return null;

  return (
    <SharedLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        {/* Left Side: Create Planner Form & Lists */}
        <div className="space-y-gutter">
          <div className="glass-panel p-6 rounded-3xl space-y-4">
            <h3 className="font-geist font-bold text-lg text-primary flex items-center gap-2">
              <span className="material-symbols-outlined">auto_awesome</span>
              AI Planner Architect
            </h3>
            <p className="text-xs text-outline leading-relaxed">
              Generate custom structured study templates and daily timetables synced to your calendar goals.
            </p>
            <form onSubmit={handleCreatePlan} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Plan Name</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Midterm Physics Prep"
                  className="w-full bg-[#13131b] border border-outline-variant rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-transparent outline-none text-on-surface"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Subjects (comma separated)</label>
                <input
                  type="text"
                  required
                  value={subjects}
                  onChange={(e) => setSubjects(e.target.value)}
                  placeholder="Quantum, Calculus, Stats"
                  className="w-full bg-[#13131b] border border-outline-variant rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-transparent outline-none text-on-surface"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Hours / Day</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={hours}
                    onChange={(e) => setHours(Number(e.target.value))}
                    className="w-full bg-[#13131b] border border-outline-variant rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-transparent outline-none text-on-surface"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Exam Target</label>
                  <input
                    type="date"
                    required
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full bg-[#13131b] border border-outline-variant rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-transparent outline-none text-on-surface"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Learning Goals</label>
                <textarea
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  placeholder="Understand core concepts and score >90% on MCQs."
                  rows={2}
                  className="w-full bg-[#13131b] border border-outline-variant rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-transparent outline-none text-on-surface resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white font-geist font-bold text-xs py-2.5 rounded-xl transition-all active:scale-98 disabled:opacity-50 mt-2 shadow-lg"
              >
                {loading ? "Generating Schedule..." : "Architect Study Plan"}
              </button>
            </form>
          </div>

          {/* Past Plans List */}
          <div className="glass-panel p-6 rounded-3xl space-y-4">
            <h4 className="font-geist font-bold text-sm text-on-surface">Stored Planners</h4>
            <div className="space-y-2">
              {plans.length === 0 ? (
                <p className="text-xs text-outline text-center py-4">No schedules generated yet</p>
              ) : (
                plans.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setActivePlan(p)}
                    className={`p-3 rounded-xl cursor-pointer border flex justify-between items-center transition-all ${
                      activePlan?.id === p.id
                        ? "border-primary bg-primary-container/5"
                        : "border-outline-variant bg-[#18181b]/30 hover:border-primary/45"
                    }`}
                  >
                    <div>
                      <h5 className="text-xs font-bold text-on-surface">{p.title}</h5>
                      <p className="text-[10px] text-outline mt-0.5">Exam Target: {p.goals?.target_date}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePlan(p.id);
                      }}
                      className="material-symbols-outlined text-outline hover:text-error text-lg"
                    >
                      delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Active Schedule details & Checklists */}
        <div className="lg:col-span-2 space-y-gutter">
          {activePlan ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Countdown metrics */}
              <div className="glass-panel p-4 rounded-2xl flex flex-col items-center justify-center text-center ai-glow border-primary/20">
                <span className="material-symbols-outlined text-primary text-2xl mb-1">hourglass_empty</span>
                <p className="text-[10px] text-outline font-semibold uppercase">Days Countdown</p>
                <h3 className="font-geist font-bold text-2xl text-on-surface mt-1">{activePlan.goals?.days_countdown} Days</h3>
              </div>
              <div className="glass-panel p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-purple-400 text-2xl mb-1">event_available</span>
                <p className="text-[10px] text-outline font-semibold uppercase">Exam Date</p>
                <h3 className="font-geist font-bold text-xs text-on-surface mt-1.5 truncate max-w-full">
                  {activePlan.goals?.target_date}
                </h3>
              </div>
              <div className="glass-panel p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-orange-400 text-2xl mb-1">alarm</span>
                <p className="text-[10px] text-outline font-semibold uppercase">Daily target</p>
                <h3 className="font-geist font-bold text-2xl text-on-surface mt-1">
                  {activePlan.goals?.hours_per_day}h
                </h3>
              </div>

              {/* Main Calendar Daily list */}
              <div className="md:col-span-2 glass-panel p-6 rounded-3xl space-y-4">
                <h4 className="font-geist font-bold text-sm text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">calendar_today</span>
                  AI Daily Agenda
                </h4>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {activePlan.schedule?.map((day) => (
                    <div key={day.day} className="p-3 bg-surface border border-outline-variant rounded-xl flex items-start gap-4">
                      <div className="w-8 h-8 rounded-lg bg-primary-container/20 flex items-center justify-center font-geist font-bold text-xs text-primary border border-primary/20">
                        D{day.day}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                          <span className="text-on-surface">Day {day.day} Targets</span>
                          <span className="text-[10px] text-primary">{day.time_allocation}</span>
                        </div>
                        <ul className="list-disc pl-4 text-xs text-on-surface-variant space-y-1">
                          {day.topics?.map((t, idx) => (
                            <li key={idx}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Today Checklist */}
              <div className="glass-panel p-6 rounded-3xl space-y-4">
                <h4 className="font-geist font-bold text-sm text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">done_all</span>
                  Daily Tasks
                </h4>
                <div className="space-y-3">
                  {checklist.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => toggleChecklist(item.id)}
                      className="flex items-center gap-3 p-2 bg-[#1b1b23] border border-outline-variant rounded-xl cursor-pointer hover:bg-surface-container transition-all"
                    >
                      <span className="material-symbols-outlined text-md text-primary">
                        {item.done ? "check_box" : "check_box_outline_blank"}
                      </span>
                      <span className={`text-xs ${item.done ? "line-through text-outline" : "text-on-surface-variant"}`}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel rounded-3xl p-12 text-center flex flex-col justify-center items-center h-96 max-w-md mx-auto space-y-4 opacity-80">
              <span className="material-symbols-outlined text-[48px] text-primary">calendar_month</span>
              <h4 className="font-geist text-lg font-bold text-on-surface">Generate Study Planner</h4>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Provide subjects, daily limits, and test targets in the architect panel to draft customized day-by-day exam schedules.
              </p>
            </div>
          )}
        </div>
      </div>
    </SharedLayout>
  );
}
