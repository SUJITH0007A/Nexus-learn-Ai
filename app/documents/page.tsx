"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SharedLayout from "@/components/shared-layout";

interface DocumentItem {
  id: number;
  filename: string;
  file_type: string;
  size_bytes: number;
  is_indexed: boolean;
  is_starred: boolean;
  summary?: string;
  created_at: string;
}

export default function DocumentsPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  
  const [activeUploads, setActiveUploads] = useState<{ filename: string; progress: number }[]>([]);
  const [dragging, setDragging] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [generatingCards, setGeneratingCards] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  
  const [showStarFilter, setShowStarFilter] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchDocuments();
  }, [router]);

  const fetchDocuments = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/documents/list", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
        if (data.length > 0 && !selectedDoc) {
          setSelectedDoc(data[0]);
        }
      }
    } catch {}
  };

  const handleUploadFile = async (file: File) => {
    // Add to active uploads loading progress simulator
    const newUpload = { filename: file.name, progress: 10 };
    setActiveUploads(prev => [...prev, newUpload]);

    // Simulate progress increments before SSE completes
    const interval = setInterval(() => {
      setActiveUploads(prev =>
        prev.map(u => (u.filename === file.name && u.progress < 90 ? { ...u, progress: u.progress + 15 } : u))
      );
    }, 400);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8000/api/documents/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: formData
      });
      if (response.ok) {
        clearInterval(interval);
        // Complete progress
        setActiveUploads(prev => prev.filter(u => u.filename !== file.name));
        fetchDocuments();
      }
    } catch {
      clearInterval(interval);
      setActiveUploads(prev => prev.filter(u => u.filename !== file.name));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUploadFile(e.target.files[0]);
    }
  };

  const handleToggleStar = async (doc: DocumentItem) => {
    try {
      const response = await fetch(`http://localhost:8000/api/documents/${doc.id}/star`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDocuments(documents.map(d => d.id === doc.id ? { ...d, is_starred: data.is_starred } : d));
        if (selectedDoc?.id === doc.id) {
          setSelectedDoc({ ...selectedDoc, is_starred: data.is_starred });
        }
      }
    } catch {}
  };

  const handleDeleteDoc = async (doc: DocumentItem) => {
    if (!confirm(`Are you sure you want to delete ${doc.filename}?`)) return;
    try {
      const response = await fetch(`http://localhost:8000/api/documents/${doc.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (response.ok) {
        setDocuments(documents.filter(d => d.id !== doc.id));
        if (selectedDoc?.id === doc.id) {
          setSelectedDoc(documents[0] || null);
        }
      }
    } catch {}
  };

  const handleGenerateSummary = async () => {
    if (!selectedDoc) return;
    setGeneratingSummary(true);
    try {
      const response = await fetch(`http://localhost:8000/api/documents/${selectedDoc.id}/features/summary`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedDoc({ ...selectedDoc, summary: data.summary });
        setDocuments(documents.map(d => d.id === selectedDoc.id ? { ...d, summary: data.summary } : d));
      }
    } catch {
      alert("Failed to summarize document. Sandbox mode fallback triggered.");
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!selectedDoc) return;
    setGeneratingQuiz(true);
    try {
      const response = await fetch(`http://localhost:8000/api/documents/${selectedDoc.id}/features/quiz`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (response.ok) {
        const data = await response.json();
        alert(`AI generated a new quiz containing ${data.questions.length} multiple choice questions! Access it from planner or gamification templates.`);
      }
    } catch {
      alert("Failed to create quiz templates.");
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const handleGenerateCards = async () => {
    if (!selectedDoc) return;
    setGeneratingCards(true);
    try {
      const response = await fetch(`http://localhost:8000/api/documents/${selectedDoc.id}/features/flashcards`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (response.ok) {
        const data = await response.json();
        alert(`Successfully generated a stack of ${data.cards.length} learning flashcards! check study history logs.`);
      }
    } catch {
      alert("Failed to generate cards.");
    } finally {
      setGeneratingCards(false);
    }
  };

  const filteredDocs = showStarFilter ? documents.filter(d => d.is_starred) : documents;

  // Formatting utils
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (!isMounted) return null;

  return (
    <SharedLayout>
      <div className="flex flex-col lg:flex-row gap-gutter">
        {/* Left Side: Vault Documents List */}
        <div className="flex-1 space-y-gutter">
          {/* Header */}
          <div className="flex justify-between items-end gap-4 border-b border-outline-variant pb-4">
            <div>
              <h2 className="font-geist font-bold text-3xl text-on-surface">Knowledge Vault</h2>
              <p className="text-sm text-on-surface-variant mt-1">
                Upload and index your lecture notes, PDFs, code slides, or screenshots.
              </p>
            </div>
            <label className="bg-primary hover:brightness-110 text-on-primary font-geist font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-lg active:scale-95 transition-all flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">upload</span>
              Upload File
              <input type="file" onChange={handleFileInputChange} className="hidden" />
            </label>
          </div>

          {/* Drag & Drop File Slot */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all ${
              dragging
                ? "border-primary bg-primary-container/10 scale-99"
                : "border-outline-variant bg-[#18181b]/30 hover:border-primary/50"
            }`}
          >
            <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-primary mb-4">
              <span className="material-symbols-outlined text-[28px]">upload_file</span>
            </div>
            <h4 className="font-geist text-md font-bold mb-1 text-on-surface">Drag & Drop Upload</h4>
            <p className="text-xs text-outline mb-4 text-center max-w-xs">
              Supports PDF, DOCX, PPTX, TXT, CSV, or whiteboard images (OCR). Max size 50MB.
            </p>
          </div>

          {/* Active Uploading indicators */}
          {activeUploads.length > 0 && (
            <div className="space-y-3">
              <h5 className="text-[10px] font-bold text-outline uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                Active Uploads
              </h5>
              {activeUploads.map((u, idx) => (
                <div key={idx} className="glass-panel p-4 rounded-xl flex items-center gap-4">
                  <span className="material-symbols-outlined text-primary text-xl">description</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center text-xs font-semibold mb-1">
                      <span className="truncate max-w-[200px]">{u.filename}</span>
                      <span className="text-primary">{u.progress}%</span>
                    </div>
                    <div className="w-full bg-surface-container h-1 rounded-full overflow-hidden">
                      <div className="bg-primary h-full transition-all" style={{ width: `${u.progress}%` }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* star Filter tabs */}
          <div className="flex items-center justify-between border-b border-outline-variant pb-2">
            <div className="flex gap-4">
              <button
                onClick={() => setShowStarFilter(false)}
                className={`text-xs font-bold font-geist pb-2 ${
                  !showStarFilter ? "text-primary border-b-2 border-primary" : "text-outline"
                }`}
              >
                All Documents
              </button>
              <button
                onClick={() => setShowStarFilter(true)}
                className={`text-xs font-bold font-geist pb-2 ${
                  showStarFilter ? "text-primary border-b-2 border-primary" : "text-outline"
                }`}
              >
                Starred Vault
              </button>
            </div>
          </div>

          {/* Documents Cards Grid */}
          {filteredDocs.length === 0 ? (
            <div className="text-center py-10 opacity-70 text-xs text-outline">
              No files stored in this vault section.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDocs.map((doc) => {
                const isSelected = selectedDoc?.id === doc.id;
                const fileIcon = doc.file_type === "PDF" ? "picture_as_pdf" : "description";
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className={`glass-panel p-4 rounded-2xl cursor-pointer flex flex-col justify-between h-36 transition-all hover:-translate-y-0.5 ${
                      isSelected ? "border-primary bg-primary-container/5 ring-1 ring-primary/20" : ""
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                          <span className="material-symbols-outlined text-lg">{fileIcon}</span>
                        </div>
                        <div className="truncate max-w-[150px]">
                          <h5 className="font-geist text-xs font-bold truncate text-on-surface">{doc.filename}</h5>
                          <p className="text-[10px] text-outline mt-0.5">{formatBytes(doc.size_bytes)}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStar(doc);
                          }}
                          className={`material-symbols-outlined text-[18px] hover:text-primary ${
                            doc.is_starred ? "text-primary fill-primary" : "text-outline"
                          }`}
                        >
                          star
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDoc(doc);
                          }}
                          className="material-symbols-outlined text-[18px] text-outline hover:text-error"
                        >
                          delete
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex gap-1.5">
                        <span className="text-[9px] bg-surface-container-high text-on-surface-variant border border-outline-variant px-2 py-0.5 rounded">
                          {doc.file_type}
                        </span>
                        {doc.is_indexed && (
                          <span className="text-[9px] bg-primary-container/20 text-primary border border-primary/20 px-2 py-0.5 rounded">
                            AI INDEXED
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-outline">{doc.created_at.split("T")[0]}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Document Preview Pane */}
        {selectedDoc && (
          <aside className="w-full lg:w-[380px] bg-surface-container-low border border-outline-variant rounded-3xl p-6 flex flex-col gap-6">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3">
              <h4 className="font-geist text-sm font-semibold truncate text-on-surface max-w-[250px]">
                {selectedDoc.filename}
              </h4>
            </div>

            {/* Document preview drawer box */}
            <div className="aspect-[4/3] rounded-xl overflow-hidden glass-panel relative group bg-black/40 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[42px]">visibility</span>
              <div className="absolute bottom-2 left-2 text-[10px] text-outline bg-black/60 px-2 py-0.5 rounded">
                Preview Drawer
              </div>
            </div>

            {/* AI Summary Section */}
            <div className="space-y-3">
              <h5 className="text-[10px] font-bold text-outline uppercase tracking-widest flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[16px]">auto_awesome</span>
                AI Intelligence
              </h5>
              <div className="glass-panel p-4 rounded-xl text-xs leading-relaxed space-y-2 max-h-48 overflow-y-auto">
                {selectedDoc.summary ? (
                  <p className="whitespace-pre-line text-on-surface-variant">{selectedDoc.summary}</p>
                ) : (
                  <div className="text-center py-4 space-y-3">
                    <p className="text-outline">No AI summary generated for this document yet.</p>
                    <button
                      onClick={handleGenerateSummary}
                      disabled={generatingSummary}
                      className="px-3 py-1.5 bg-primary-container text-primary rounded-lg font-bold hover:brightness-110 active:scale-95 transition-all"
                    >
                      {generatingSummary ? "Summarizing..." : "Generate AI Summary"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Action Triggers */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => router.push("/chat")}
                className="w-full text-center py-2.5 bg-[#1b1b23] border border-outline-variant rounded-xl text-xs font-semibold text-on-surface hover:bg-surface-container active:scale-98 transition-all"
              >
                Ask AI about this Doc
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleGenerateQuiz}
                  disabled={generatingQuiz}
                  className="py-2.5 bg-[#1b1b23] border border-outline-variant rounded-xl text-xs font-semibold text-on-surface hover:bg-surface-container active:scale-98 transition-all disabled:opacity-50"
                >
                  {generatingQuiz ? "Creating..." : "Quiz Me"}
                </button>
                <button
                  onClick={handleGenerateCards}
                  disabled={generatingCards}
                  className="py-2.5 bg-[#1b1b23] border border-outline-variant rounded-xl text-xs font-semibold text-on-surface hover:bg-surface-container active:scale-98 transition-all disabled:opacity-50"
                >
                  {generatingCards ? "Creating..." : "Flashcards"}
                </button>
              </div>
            </div>

            {/* Details Table */}
            <div className="border-t border-outline-variant pt-4 space-y-3">
              <h5 className="text-[10px] font-bold text-outline uppercase tracking-widest">Metadata Details</h5>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-[9px] text-outline uppercase font-semibold">Format</p>
                  <p className="font-semibold text-on-surface mt-0.5">{selectedDoc.file_type}</p>
                </div>
                <div>
                  <p className="text-[9px] text-outline uppercase font-semibold">Size</p>
                  <p className="font-semibold text-on-surface mt-0.5">{formatBytes(selectedDoc.size_bytes)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-outline uppercase font-semibold">Indexed</p>
                  <p className="font-semibold text-on-surface mt-0.5">{selectedDoc.is_indexed ? "Completed" : "Pending"}</p>
                </div>
                <div>
                  <p className="text-[9px] text-outline uppercase font-semibold">Upload Date</p>
                  <p className="font-semibold text-on-surface mt-0.5">{selectedDoc.created_at.split("T")[0]}</p>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </SharedLayout>
  );
}
