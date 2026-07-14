"use client";
import { API_BASE_URL } from "@/lib/utils";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SharedLayout from "@/components/shared-layout";

interface Transcript {
  role: string;
  content: string;
}

interface InterviewSession {
  id: number;
  title: string;
  difficulty: string;
  interview_type: string;
  score?: number;
  feedback?: string;
  timer_seconds: number;
  transcripts: Transcript[];
  created_at: string;
}

export default function InterviewPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [history, setHistory] = useState<InterviewSession[]>([]);
  const [activeSession, setActiveSession] = useState<InterviewSession | null>(null);
  
  const [title, setTitle] = useState("Software Engineer Mock");
  const [difficulty, setDifficulty] = useState("Mid");
  const [type, setType] = useState("Technical");
  
  const [loading, setLoading] = useState(false);
  const [candidateAnswer, setCandidateAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(1800);
  const [timerActive, setTimerActive] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    fetchHistory();
  }, []);

  // Countdown timer loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/interview/history`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch {}
  };

  const handleStartInterview = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/interview/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          title,
          difficulty,
          interview_type: type,
          timer_seconds: 1800
        })
      });
      if (response.ok) {
        const data = await response.json();
        const fullSession: InterviewSession = {
          id: data.id,
          title: data.title,
          difficulty,
          interview_type: type,
          timer_seconds: 1800,
          transcripts: data.transcripts,
          created_at: new Date().toISOString()
        };
        setActiveSession(fullSession);
        setTimeLeft(1800);
        setTimerActive(true);
        fetchHistory();
      }
    } catch {
      alert("Failed to start mock interview. Sandbox fallback triggered.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateAnswer.trim() || loading || !activeSession) return;
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/interview/${activeSession.id}/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ answer: candidateAnswer })
      });
      if (response.ok) {
        const data = await response.json();
        setActiveSession(prev => {
          if (!prev) return null;
          return {
            ...prev,
            score: data.score,
            feedback: data.feedback,
            transcripts: data.transcripts
          };
        });
        setCandidateAnswer("");
        if (data.status === "concluded") {
          setTimerActive(false);
          fetchHistory();
        }
      }
    } catch {
      alert("Failed to process answer.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (id: number) => {
    if (!confirm("Are you sure you want to delete this session?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/interview/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (response.ok) {
        setHistory(history.filter(h => h.id !== id));
        if (activeSession?.id === id) {
          setActiveSession(null);
          setTimerActive(false);
        }
      }
    } catch {}
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  if (!isMounted) return null;

  return (
    <SharedLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        {/* Left Config Panel & History list */}
        <div className="space-y-gutter">
          {/* Start panel */}
          <div className="glass-panel p-6 rounded-3xl space-y-4">
            <h3 className="font-geist font-bold text-lg text-primary flex items-center gap-2">
              <span className="material-symbols-outlined">auto_awesome</span>
              AI Recruiter Prep
            </h3>
            <p className="text-xs text-outline leading-relaxed">
              Launch real-time technical, behavioral, or coding mocks scored by senior staff AI evaluators.
            </p>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Role Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#13131b] border border-outline-variant rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-transparent outline-none text-on-surface"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full bg-[#13131b] border border-outline-variant rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-transparent outline-none text-primary font-semibold"
                  >
                    <option value="Junior">Junior</option>
                    <option value="Mid">Mid Level</option>
                    <option value="Senior">Senior Staff</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-[#13131b] border border-outline-variant rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-transparent outline-none text-primary font-semibold"
                  >
                    <option value="Technical">Technical</option>
                    <option value="Behavioral">Behavioral</option>
                    <option value="Coding">Coding</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handleStartInterview}
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white font-geist font-bold text-xs py-2.5 rounded-xl transition-all active:scale-98 disabled:opacity-50 mt-2 shadow-lg"
              >
                {loading && !activeSession ? "Launching Prep..." : "Start Mock Interview"}
              </button>
            </div>
          </div>

          {/* Past Mock list */}
          <div className="glass-panel p-6 rounded-3xl space-y-4">
            <h4 className="font-geist font-bold text-sm text-on-surface">Interview Log Vault</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {history.length === 0 ? (
                <p className="text-xs text-outline text-center py-4">No evaluations logged yet</p>
              ) : (
                history.map((h) => (
                  <div
                    key={h.id}
                    onClick={() => setActiveSession(h)}
                    className={`p-3 rounded-xl cursor-pointer border flex justify-between items-center transition-all ${
                      activeSession?.id === h.id
                        ? "border-primary bg-primary-container/5"
                        : "border-outline-variant bg-[#18181b]/30 hover:border-primary/45"
                    }`}
                  >
                    <div>
                      <h5 className="text-xs font-bold text-on-surface truncate max-w-[150px]">{h.title}</h5>
                      <p className="text-[10px] text-outline mt-0.5">{h.interview_type} • {h.difficulty}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {h.score !== null && h.score !== undefined && (
                        <span className="text-xs font-bold text-primary bg-primary-container/10 px-2 py-0.5 rounded border border-primary/20">
                          {h.score}%
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(h.id);
                        }}
                        className="material-symbols-outlined text-outline hover:text-error text-lg"
                      >
                        delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Active Room Panel */}
        <div className="lg:col-span-2 space-y-gutter">
          {activeSession ? (
            <div className="space-y-4">
              {/* Header metrics */}
              <div className="flex justify-between items-center bg-[#13131b] border border-outline-variant p-4 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 pulse-dot"></div>
                  <h4 className="font-geist text-sm font-bold text-on-surface truncate max-w-[200px]">
                    {activeSession.title}
                  </h4>
                  <span className="text-[10px] bg-primary-container/20 text-primary border border-primary/20 px-2 py-0.5 rounded">
                    {activeSession.interview_type}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-outline text-md">alarm</span>
                  <span className="font-geist text-sm font-bold text-primary">{formatTime(timeLeft)}</span>
                </div>
              </div>

              {/* Chat Transcripts Loop */}
              <div className="glass-panel p-6 rounded-3xl h-[300px] overflow-y-auto space-y-4">
                {activeSession.transcripts.map((t, idx) => {
                  const isRecruiter = t.role === "interviewer";
                  const isEval = t.role === "system_evaluation";
                  if (isEval) return null; // Render evaluation in separate dashboard block below
                  return (
                    <div key={idx} className={`flex flex-col ${isRecruiter ? "items-start" : "items-end"} space-y-1`}>
                      <span className="text-[10px] text-outline font-semibold">
                        {isRecruiter ? "Staff AI Recruiter" : "You (Candidate)"}
                      </span>
                      <div
                        className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed ${
                          isRecruiter
                            ? "bg-surface border border-outline-variant rounded-tl-none text-on-surface/90"
                            : "bg-surface-container-high rounded-tr-none text-on-surface"
                        }`}
                      >
                        <p>{t.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Evaluation score panel (concluded state) */}
              {activeSession.score !== null && activeSession.score !== undefined && (
                <div className="glass-panel p-6 rounded-3xl ai-glow border-primary/30 space-y-4 bg-gradient-to-br from-indigo-950/10 to-transparent">
                  <div className="flex justify-between items-center border-b border-outline-variant pb-3">
                    <h5 className="font-geist font-bold text-sm text-primary flex items-center gap-2">
                      <span className="material-symbols-outlined">verified</span>
                      AI Evaluation score
                    </h5>
                    <span className="text-xl font-geist font-bold text-primary bg-primary-container px-3 py-1 rounded-xl">
                      {activeSession.score}%
                    </span>
                  </div>
                  <div className="text-xs text-on-surface-variant leading-relaxed whitespace-pre-line">
                    {activeSession.feedback}
                  </div>
                </div>
              )}

              {/* Answer submission block */}
              {(!activeSession.score) && (
                <form onSubmit={handleSubmitAnswer} className="glass-panel p-4 rounded-3xl space-y-3">
                  <textarea
                    required
                    value={candidateAnswer}
                    onChange={(e) => setCandidateAnswer(e.target.value)}
                    placeholder="Compose your technical response here..."
                    rows={4}
                    className="w-full bg-[#13131b] border border-outline-variant rounded-xl p-3 text-xs focus:ring-1 focus:ring-primary focus:border-transparent outline-none text-on-surface resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading || !candidateAnswer.trim()}
                      className="bg-primary text-on-primary font-geist font-bold text-xs px-5 py-2.5 rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg disabled:opacity-50"
                    >
                      {loading ? "Evaluating Answer..." : "Submit Answer"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="glass-panel rounded-3xl p-12 text-center flex flex-col justify-center items-center h-96 max-w-md mx-auto space-y-4 opacity-80">
              <span className="material-symbols-outlined text-[48px] text-primary">record_voice_over</span>
              <h4 className="font-geist text-lg font-bold text-on-surface">Start Mock Interview Session</h4>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Choose mock configs, click Start, and test your skills. Review score ratings and detailed grading reports when finished.
              </p>
            </div>
          )}
        </div>
      </div>
    </SharedLayout>
  );
}
