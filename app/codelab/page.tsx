"use client";
import { API_BASE_URL } from "@/lib/utils";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SharedLayout from "@/components/shared-layout";
import Editor from "@monaco-editor/react";

interface Snippet {
  id: number;
  title: string;
  language: string;
  code: string;
  explanation?: string;
}

export default function CodeLabPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [code, setCode] = useState(`def add_numbers(a, b):\n    # TODO: write your logic\n    return a + b\n\nprint(add_numbers(10, 32))`);
  const [language, setLanguage] = useState("python");
  const [consoleOutput, setConsoleOutput] = useState("");
  const [consoleError, setConsoleError] = useState("");
  const [aiOutput, setAiOutput] = useState("");
  
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [snippetTitle, setSnippetTitle] = useState("");
  
  const [running, setRunning] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchSnippets();
  }, [router]);

  const fetchSnippets = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/codelab/snippets`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSnippets(data);
      }
    } catch {}
  };

  const handleRunCode = async () => {
    setRunning(true);
    setConsoleOutput("");
    setConsoleError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/codelab/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language })
      });
      if (response.ok) {
        const data = await response.json();
        setConsoleOutput(data.stdout || "");
        setConsoleError(data.stderr || "");
      }
    } catch {
      setConsoleError("Execution error: Cannot connect to sandbox backend.");
    } finally {
      setRunning(false);
    }
  };

  const handleAIAction = async (action: "explain" | "optimize") => {
    setAnalyzing(true);
    setAiOutput("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/codelab/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language })
      });
      if (response.ok) {
        const data = await response.json();
        setAiOutput(data.explanation || data.optimized || "");
      }
    } catch {
      setAiOutput("AI error: Failed to retrieve optimization guidelines.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveSnippet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!snippetTitle.trim()) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/codelab/snippets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          title: snippetTitle,
          language,
          code
        })
      });
      if (response.ok) {
        setSnippetTitle("");
        fetchSnippets();
      }
    } catch {}
  };

  const handleLoadSnippet = (sn: Snippet) => {
    setCode(sn.code);
    setLanguage(sn.language.toLowerCase());
  };

  const handleDeleteSnippet = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/codelab/snippets/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (response.ok) {
        setSnippets(snippets.filter(s => s.id !== id));
      }
    } catch {}
  };

  if (!isMounted) return null;

  return (
    <SharedLayout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter h-[calc(100vh-80px)] rounded-2xl overflow-hidden glass-panel border border-outline-variant bg-[#13131b]">
        {/* Left Side: Monaco Editor & Output Console (8 columns) */}
        <div className="lg:col-span-8 flex flex-col h-full">
          {/* Controls Bar */}
          <div className="h-14 border-b border-outline-variant px-6 flex justify-between items-center bg-[#13131b]">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-xl">code</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-primary focus:ring-0 outline-none cursor-pointer appearance-none uppercase"
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="cpp">C++</option>
                <option value="java">Java</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRunCode}
                disabled={running}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white px-4 py-1.5 rounded-xl font-geist text-xs font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 shadow-lg"
              >
                <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                {running ? "Running..." : "Run Code"}
              </button>
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-1 border-b border-outline-variant relative">
            <Editor
              height="100%"
              language={language === "cpp" ? "cpp" : language === "javascript" ? "javascript" : "python"}
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || "")}
              options={{
                fontSize: 13,
                fontFamily: "Geist Mono, monospace",
                minimap: { enabled: false },
                lineNumbersMinChars: 3,
                scrollbar: { verticalScrollbarSize: 4, horizontalScrollbarSize: 4 }
              }}
            />
          </div>

          {/* Terminal Output Console */}
          <div className="h-44 bg-black/40 p-4 flex flex-col font-mono text-xs">
            <div className="flex justify-between items-center border-b border-outline-variant pb-1.5 mb-2 text-outline text-[10px] font-bold uppercase">
              <span>Execution Output</span>
              <button onClick={() => { setConsoleOutput(""); setConsoleError(""); }} className="text-primary hover:underline">
                Clear
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin">
              {consoleOutput && <pre className="text-primary whitespace-pre-wrap">{consoleOutput}</pre>}
              {consoleError && <pre className="text-error whitespace-pre-wrap">{consoleError}</pre>}
              {!consoleOutput && !consoleError && <span className="text-outline">Terminal ready...</span>}
            </div>
          </div>
        </div>

        {/* Right Side: AI Assistant & Snippet Vault (4 columns) */}
        <aside className="lg:col-span-4 border-l border-outline-variant bg-surface-container-low flex flex-col h-full">
          {/* Header tabs */}
          <header className="h-14 border-b border-outline-variant flex justify-around items-center px-4 bg-[#13131b]">
            <span className="font-geist text-xs font-bold text-on-surface">AI Code Mentor</span>
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleAIAction("explain")}
                disabled={analyzing}
                className="py-2.5 bg-[#1b1b23] border border-outline-variant hover:bg-surface-container rounded-xl text-xs font-bold text-on-surface flex items-center justify-center gap-1.5 active:scale-98 transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px] text-primary">psychology</span>
                Explain Logic
              </button>
              <button
                onClick={() => handleAIAction("optimize")}
                disabled={analyzing}
                className="py-2.5 bg-[#1b1b23] border border-outline-variant hover:bg-surface-container rounded-xl text-xs font-bold text-on-surface flex items-center justify-center gap-1.5 active:scale-98 transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px] text-purple-400">bolt</span>
                Optimize Complexity
              </button>
            </div>

            {/* AI Explanation Drawer Output */}
            {analyzing ? (
              <div className="glass-panel p-4 rounded-xl text-xs text-primary font-bold flex items-center justify-center gap-2">
                <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
                AI Reviewing stack...
              </div>
            ) : aiOutput ? (
              <div className="glass-panel p-4 rounded-xl text-xs leading-relaxed space-y-2 max-h-60 overflow-y-auto bg-gradient-to-br from-indigo-950/10 to-transparent">
                <div className="flex justify-between items-center text-[10px] text-outline font-bold uppercase border-b border-outline-variant pb-1">
                  <span>AI Feedback</span>
                  <button onClick={() => setAiOutput("")} className="text-primary hover:underline">Dismiss</button>
                </div>
                <div className="whitespace-pre-line text-on-surface-variant">{aiOutput}</div>
              </div>
            ) : null}

            {/* Snippets Vault Saver Form */}
            <div className="border-t border-outline-variant pt-4 space-y-3">
              <h5 className="text-[10px] font-bold text-outline uppercase tracking-widest">Vault Saver</h5>
              <form onSubmit={handleSaveSnippet} className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Snippet Title"
                  value={snippetTitle}
                  onChange={(e) => setSnippetTitle(e.target.value)}
                  className="flex-1 bg-[#13131b] border border-outline-variant rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:border-transparent outline-none text-on-surface"
                />
                <button
                  type="submit"
                  className="px-3 bg-primary-container text-primary font-geist font-bold text-xs rounded-xl hover:brightness-110 active:scale-95 transition-all"
                >
                  Save
                </button>
              </form>
            </div>

            {/* Snippets Lists */}
            <div className="space-y-3">
              <h5 className="text-[10px] font-bold text-outline uppercase tracking-widest">Stored Snippets</h5>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {snippets.length === 0 ? (
                  <p className="text-xs text-outline text-center py-2">No snippets saved yet</p>
                ) : (
                  snippets.map((sn) => (
                    <div
                      key={sn.id}
                      onClick={() => handleLoadSnippet(sn)}
                      className="p-3 bg-[#13131b]/50 border border-outline-variant hover:border-primary/40 rounded-xl cursor-pointer flex justify-between items-center transition-all"
                    >
                      <div className="truncate">
                        <h6 className="text-xs font-bold text-on-surface truncate">{sn.title}</h6>
                        <span className="text-[9px] text-primary uppercase font-bold">{sn.language}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSnippet(sn.id);
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
        </aside>
      </div>
    </SharedLayout>
  );
}
