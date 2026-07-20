"use client";
import { API_BASE_URL } from "@/lib/utils";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import SharedLayout from "@/components/shared-layout";

interface Message {
  id: number;
  sender: string;
  content: string;
  model_used?: string;
  reaction?: string;
  created_at?: string;
}

interface ChatSession {
  id: number;
  title: string;
  is_pinned: boolean;
  model_name: string;
  folder_id?: number;
}

interface Folder {
  id: number;
  name: string;
}

export default function ChatPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModel, setSelectedModel] = useState("GPT-4o (Default)");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial data
  useEffect(() => {
    setIsMounted(true);
    fetchFolders();
    fetchSessions();
  }, []);

  // Scroll to bottom on messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const fetchFolders = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/folders`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (response.ok) {
        const data = await response.json();
        setFolders(data);
      }
    } catch {}
  };

  const fetchSessions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/sessions`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
        if (data.length > 0 && !activeSession) {
          selectSession(data[0]);
        }
      }
    } catch {}
  };

  const fetchMessages = async (sessionId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/sessions/${sessionId}/messages`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch {}
  };

  const selectSession = (session: ChatSession) => {
    setActiveSession(session);
    fetchMessages(session.id);
  };

  const handleCreateSession = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          title: "New Conversation",
          model_name: selectedModel.replace(" (Default)", "")
        })
      });
      if (response.ok) {
        const data = await response.json();
        setSessions(prev => [data, ...prev]);
        setActiveSession(data);
        setMessages([]);
      }
    } catch {}
  };

  const handleTogglePin = async (session: ChatSession) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/sessions/${session.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ is_pinned: !session.is_pinned })
      });
      if (response.ok) {
        setSessions(sessions.map(s => s.id === session.id ? { ...s, is_pinned: !s.is_pinned } : s));
        if (activeSession?.id === session.id) {
          setActiveSession({ ...activeSession, is_pinned: !activeSession.is_pinned });
        }
      }
    } catch {}
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isStreaming) return;
    
    let currentSession = activeSession;
    if (!currentSession) {
      // Create a session first if none is active
      await handleCreateSession();
      // Fetch updated sessions to find the new active one
      const response = await fetch(`${API_BASE_URL}/api/chat/sessions`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
        currentSession = data[0];
      }
    }

    if (!currentSession) return;

    const userText = inputText;
    setInputText("");
    
    // Add user message to display
    const userMsg: Message = { id: Date.now(), sender: "user", content: userText };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/sessions/${currentSession.id}/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          content: userText,
          model_name: selectedModel.replace(" (Default)", "")
        })
      });

      if (!response.ok) {
        throw new Error();
      }

      // Read SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      
      // Add initial assistant bubble placeholder
      const assistantPlaceholder: Message = { id: Date.now() + 1, sender: "assistant", content: "" };
      setMessages(prev => [...prev, assistantPlaceholder]);

      while (true) {
        const result = await reader?.read();
        if (result?.done) break;
        const chunk = decoder.decode(result?.value, { stream: true });
        
        // Parse SSE lines
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const dataStr = line.substring(6).trim();
              const parsed = JSON.parse(dataStr);
              if (parsed.content) {
                assistantContent += parsed.content;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: assistantContent
                  };
                  return updated;
                });
              }
            } catch {}
          }
        }
      }
      
      // Refresh session titles
      fetchSessions();
    } catch {
      // Stream error fallback simulation
      setMessages(prev => [
        ...prev,
        { id: Date.now() + 2, sender: "assistant", content: "Error communicating with AI service. Please verify server endpoints." }
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleMessageReaction = async (messageId: number, reaction: "like" | "dislike") => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/messages/${messageId}/react`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ reaction })
      });
      if (response.ok) {
        setMessages(messages.map(m => m.id === messageId ? { ...m, reaction } : m));
      }
    } catch {}
  };

  const handleExportChat = async () => {
    if (!activeSession) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/sessions/${activeSession.id}/export`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (response.ok) {
        const data = await response.json();
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${activeSession.title.replace(/\s+/g, "_")}_history.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch {}
  };

  // Search local folders/sessions
  const filteredSessions = sessions.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedSessions = filteredSessions.filter(s => s.is_pinned);
  const unpinnedSessions = filteredSessions.filter(s => !s.is_pinned);

  if (!isMounted) return null;

  return (
    <SharedLayout>
      <div className="flex h-[calc(100vh-80px)] rounded-2xl overflow-hidden glass-panel border border-outline-variant bg-[#13131b]">
        {/* Left Conversation Panel */}
        <aside className="w-64 border-r border-outline-variant bg-surface-container-low flex flex-col p-4 space-y-4">
          <button
            onClick={handleCreateSession}
            className="flex items-center justify-center gap-2 w-full p-2.5 rounded-xl bg-primary text-on-primary font-geist font-bold text-xs shadow-lg hover:brightness-110 active:scale-98 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            New Session
          </button>

          {/* Search Trigger */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-md">
              search
            </span>
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#13131b] border border-outline-variant rounded-xl pl-9 pr-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:border-transparent outline-none transition-all text-on-surface"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Pinned Chats */}
            {pinnedSessions.length > 0 && (
              <div>
                <span className="text-[10px] font-bold text-outline uppercase tracking-widest px-2 mb-2 block">
                  Pinned
                </span>
                <div className="space-y-1">
                  {pinnedSessions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => selectSession(s)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        activeSession?.id === s.id
                          ? "bg-primary-container/10 text-primary border border-primary/20"
                          : "text-on-surface-variant hover:bg-surface-container"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="material-symbols-outlined text-[16px]">push_pin</span>
                        <span className="truncate">{s.title}</span>
                      </div>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePin(s);
                        }}
                        className="material-symbols-outlined text-[14px] text-primary hover:scale-115 cursor-pointer"
                      >
                        push_pin
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* General History */}
            <div>
              <span className="text-[10px] font-bold text-outline uppercase tracking-widest px-2 mb-2 block">
                History
              </span>
              <div className="space-y-1">
                {unpinnedSessions.length === 0 ? (
                  <p className="text-[10px] text-outline text-center py-4">No active sessions</p>
                ) : (
                  unpinnedSessions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => selectSession(s)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                        activeSession?.id === s.id
                          ? "bg-primary-container/10 text-primary border border-primary/20 font-semibold"
                          : "text-on-surface-variant hover:bg-surface-container"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="material-symbols-outlined text-[16px]">chat_bubble</span>
                        <span className="truncate">{s.title}</span>
                      </div>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePin(s);
                        }}
                        className="material-symbols-outlined text-[14px] text-outline hover:text-primary cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
                      >
                        push_pin
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Right Active Conversation Canvas */}
        <main className="flex-1 flex flex-col bg-surface-container-lowest">
          {/* Header Info */}
          <header className="h-14 border-b border-outline-variant bg-[#13131b] flex items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-xl">forum</span>
              <h3 className="font-geist text-sm font-semibold text-on-surface">
                {activeSession ? activeSession.title : "NexusLearn Interactive"}
              </h3>
            </div>
            {activeSession && (
              <button
                onClick={handleExportChat}
                className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">download</span> Export Chat
              </button>
            )}
          </header>

          {/* Messages Flow */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 && !isStreaming ? (
              <div className="h-full flex flex-col justify-center items-center text-center max-w-sm mx-auto space-y-4 opacity-80">
                <div className="w-16 h-16 rounded-3xl bg-surface-container flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[36px]">auto_awesome</span>
                </div>
                <h4 className="font-geist text-lg font-bold text-on-surface">How can I augment your learning today?</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Ask me to extract summaries from documents, compose exam timetables, compile Python code snippets, or evaluate technical interview templates.
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const isUser = m.sender === "user";
                return (
                  <div key={m.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1.5`}>
                    <div className="flex items-center gap-2">
                      {!isUser && (
                        <div className="w-5 h-5 rounded bg-primary-fixed text-on-primary-fixed flex items-center justify-center">
                          <span className="material-symbols-outlined text-[12px]">smart_toy</span>
                        </div>
                      )}
                      <span className="text-[10px] text-outline font-semibold">
                        {isUser ? "You" : `NexusLearn AI - ${m.model_used || "GPT-4o"}`}
                      </span>
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                        isUser
                          ? "bg-surface-container-high rounded-tr-none text-on-surface"
                          : "bg-surface rounded-tl-none border border-outline-variant text-on-surface/90"
                      }`}
                    >
                      {/* Simplistic formatting: Render code fences as code elements */}
                      {(m.content && m.content.includes("```")) ? (
                        m.content.split("```").map((block, idx) => {
                          if (idx % 2 === 1) {
                            const lines = block.split("\n");
                            const language = lines[0] || "code";
                            const codeStr = lines.slice(1).join("\n");
                            return (
                              <div key={idx} className="my-3 rounded-xl overflow-hidden border border-outline-variant bg-surface-container-lowest font-mono text-xs">
                                <div className="flex justify-between items-center px-4 py-1.5 bg-surface-variant/20 border-b border-outline-variant text-[10px] text-outline">
                                  <span>{language}</span>
                                  <button
                                    onClick={() => navigator.clipboard.writeText(codeStr)}
                                    className="text-primary hover:underline"
                                  >
                                    Copy Code
                                  </button>
                                </div>
                                <pre className="p-4 overflow-x-auto text-primary/90"><code>{codeStr}</code></pre>
                              </div>
                            );
                          }
                          return <p key={idx} className="whitespace-pre-line">{block}</p>;
                        })
                      ) : (
                        <p className="whitespace-pre-line">{m.content}</p>
                      )}
                    </div>

                    {/* Reactions & Actions Row */}
                    {!isUser && (
                      <div className="flex items-center gap-3 px-1 text-[11px] text-outline">
                        <button
                          onClick={() => handleMessageReaction(m.id, "like")}
                          className={`material-symbols-outlined text-[14px] hover:text-primary ${
                            m.reaction === "like" ? "text-primary" : ""
                          }`}
                        >
                          thumb_up
                        </button>
                        <button
                          onClick={() => handleMessageReaction(m.id, "dislike")}
                          className={`material-symbols-outlined text-[14px] hover:text-primary ${
                            m.reaction === "dislike" ? "text-primary" : ""
                          }`}
                        >
                          thumb_down
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Thinking / Streaming loader indicator */}
            {isStreaming && messages[messages.length - 1]?.sender === "user" && (
              <div className="flex items-center gap-4">
                <div className="w-6 h-6 rounded bg-primary-fixed text-on-primary-fixed flex items-center justify-center">
                  <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                </div>
                <div className="flex items-center gap-2 text-primary font-geist text-xs font-bold">
                  <span>Thinking</span>
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-primary rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Sticky Input Area */}
          <footer className="p-4 bg-[#13131b] border-t border-outline-variant flex flex-col gap-2">
            <div className="flex items-center justify-between px-3 text-[10px] text-outline font-semibold">
              <div className="flex items-center gap-3">
                <label className="text-primary font-bold">Model:</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-transparent border-none text-[10px] font-bold text-primary focus:ring-0 cursor-pointer appearance-none outline-none"
                >
                  <option value="GPT-4o (Default)">GPT-4o (Default)</option>
                  <option value="Claude 3.5 Sonnet">Claude 3.5 Sonnet</option>
                  <option value="Gemini 1.5 Pro">Gemini 1.5 Pro</option>
                  <option value="Groq Llama 3">Groq Llama 3</option>
                  <option value="Ollama Local">Ollama Local</option>
                </select>
              </div>
              <span>⌘+K to open shortcuts</span>
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2 items-end bg-[#1b1b23] border border-outline-variant rounded-2xl p-2 focus-within:ring-1 ring-primary/40">
              <button
                type="button"
                onClick={() => router.push("/documents")}
                className="p-2 text-outline hover:text-primary transition-colors flex items-center justify-center"
              >
                <span className="material-symbols-outlined">attach_file</span>
              </button>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Message NexusLearn AI..."
                rows={1}
                className="flex-1 bg-transparent border-none focus:ring-0 outline-none text-sm py-2 resize-none max-h-32 text-on-surface"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
              />
              <button
                type="submit"
                disabled={isStreaming || !inputText.trim()}
                className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-xl">arrow_upward</span>
              </button>
            </form>
          </footer>
        </main>
      </div>
    </SharedLayout>
  );
}
