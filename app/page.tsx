"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/dashboard");
    }
  }, [router]);

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-[#09090b] text-[#e4e1ed] relative overflow-hidden font-sans flex flex-col justify-between">
      {/* Background Video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none z-0 opacity-20"
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260525_052706_d2e390fd-1846-4fe7-a4d8-8d2f1c875358.mp4"
          type="video/mp4"
        />
      </video>

      {/* Background Mesh glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] rounded-full bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent blur-[120px] pointer-events-none z-0"></div>

      {/* Top Navigation */}
      <header className="max-w-6xl mx-auto w-full px-6 h-20 flex justify-between items-center z-10 relative">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[18px]">psychology</span>
          </div>
          <span className="font-geist font-bold text-lg text-primary">NexusLearn AI</span>
        </div>
        <div className="flex gap-4">
          <Link href="/login" className="text-xs font-semibold text-outline hover:text-on-surface transition-colors py-2 px-3">
            Sign In
          </Link>
          <Link href="/register" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white font-geist font-bold text-xs py-2 px-4 rounded-xl shadow-lg transition-all active:scale-95">
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-6 text-center space-y-8 z-10 relative py-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-container/10 border border-primary/20 rounded-full text-[10px] font-bold text-primary tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 pulse-dot"></span>
          Now Augmented with GPT-4o & Claude 3.5
        </div>

        <h1 className="font-geist font-bold text-4xl md:text-6xl text-on-surface leading-tight tracking-tight max-w-2xl mx-auto">
          The Premium AI Workspace for <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">Engineering Learners</span>
        </h1>
        
        <p className="text-sm md:text-base text-on-surface-variant max-w-xl mx-auto leading-relaxed">
          Index study vaults, solve auto-generated quizzes, practice coding mocks, and evaluate behavioral interviews in a single production-ready dashboard.
        </p>

        <div className="flex justify-center gap-4 pt-4">
          <Link href="/register" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white font-geist font-bold text-xs md:text-sm py-3 px-8 rounded-xl shadow-lg transition-all active:scale-95">
            Start Free Trial
          </Link>
          <Link href="/login" className="bg-surface border border-outline-variant hover:bg-surface-container text-on-surface font-geist font-bold text-xs md:text-sm py-3 px-8 rounded-xl transition-all active:scale-95">
            Log In
          </Link>
        </div>

        {/* Feature Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-20 text-left">
          <div className="glass-panel p-6 rounded-2xl space-y-3">
            <span className="material-symbols-outlined text-primary text-2xl">folder_zip</span>
            <h3 className="font-geist font-bold text-sm text-on-surface">Knowledge Vault</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Index course PDFs, DOCX guides, and whiteboard captures with OCR indexing and semantic RAG search.
            </p>
          </div>
          <div className="glass-panel p-6 rounded-2xl space-y-3">
            <span className="material-symbols-outlined text-purple-400 text-2xl">record_voice_over</span>
            <h3 className="font-geist font-bold text-sm text-on-surface">Mock Interviews</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Simulate technical interview pipelines with timed audio/text rounds and AI assessment scoreboards.
            </p>
          </div>
          <div className="glass-panel p-6 rounded-2xl space-y-3">
            <span className="material-symbols-outlined text-orange-400 text-2xl">code</span>
            <h3 className="font-geist font-bold text-sm text-on-surface">Monaco Code Lab</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Compile Python or JS scripts, optimize complex nested loops, and save snippets with staff AI review.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="h-16 border-t border-outline-variant flex items-center justify-center text-[10px] text-outline z-10 relative">
        <span>© 2026 NexusLearn AI Inc. All rights reserved. Premium educational suite.</span>
      </footer>
    </div>
  );
}
