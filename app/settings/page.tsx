"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SharedLayout from "@/components/shared-layout";

export default function SettingsPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [openaiKey, setOpenaiKey] = useState("");
  const [claudeKey, setClaudeKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [emailNotif, setEmailNotif] = useState(true);
  const [studyReminders, setStudyReminders] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState("English");

  useEffect(() => {
    setIsMounted(true);
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("openai_key", openaiKey);
    localStorage.setItem("claude_key", claudeKey);
    localStorage.setItem("gemini_key", geminiKey);
    alert("Preferences saved successfully!");
  };

  if (!isMounted) return null;

  return (
    <SharedLayout>
      <div className="max-w-2xl mx-auto space-y-gutter">
        <div className="border-b border-outline-variant pb-4">
          <h2 className="font-geist font-bold text-3xl text-on-surface">Settings</h2>
          <p className="text-sm text-on-surface-variant mt-1">Configure theme preferences, notification criteria, and API keys.</p>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* API keys mapping */}
          <div className="glass-panel p-6 rounded-3xl space-y-4">
            <h4 className="font-geist font-bold text-sm text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">key</span>
              Custom API Keys
            </h4>
            <p className="text-xs text-outline">Provide your personal credentials to query LLMs without consuming local credits.</p>
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-on-surface-variant">OpenAI API Key</label>
                <input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-[#13131b] border border-outline-variant rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-transparent outline-none text-on-surface"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-on-surface-variant">Claude / Anthropic Key</label>
                <input
                  type="password"
                  value={claudeKey}
                  onChange={(e) => setClaudeKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="w-full bg-[#13131b] border border-outline-variant rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-transparent outline-none text-on-surface"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-on-surface-variant">Gemini API Key</label>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-[#13131b] border border-outline-variant rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-transparent outline-none text-on-surface"
                />
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="glass-panel p-6 rounded-3xl space-y-4">
            <h4 className="font-geist font-bold text-sm text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">settings</span>
              Workspace Preferences
            </h4>
            <div className="space-y-4 text-xs font-semibold">
              <div className="flex justify-between items-center">
                <div>
                  <h6 className="text-on-surface">Email Notifications</h6>
                  <p className="text-[10px] text-outline font-normal mt-0.5">Receive processed document briefs and reminders.</p>
                </div>
                <input
                  type="checkbox"
                  checked={emailNotif}
                  onChange={() => setEmailNotif(!emailNotif)}
                  className="rounded bg-[#13131b] border-outline-variant text-primary focus:ring-0"
                />
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <h6 className="text-on-surface">Daily Study Reminders</h6>
                  <p className="text-[10px] text-outline font-normal mt-0.5">Alert on streak countdowns and exam milestones.</p>
                </div>
                <input
                  type="checkbox"
                  checked={studyReminders}
                  onChange={() => setStudyReminders(!studyReminders)}
                  className="rounded bg-[#13131b] border-outline-variant text-primary focus:ring-0"
                />
              </div>
              <div className="space-y-1 pt-2">
                <label className="text-on-surface">Default Language</label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full bg-[#13131b] border border-outline-variant rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-transparent outline-none text-primary font-semibold mt-1"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-primary text-on-primary font-geist font-bold text-xs px-5 py-2.5 rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg"
            >
              Save Preferences
            </button>
          </div>
        </form>
      </div>
    </SharedLayout>
  );
}
