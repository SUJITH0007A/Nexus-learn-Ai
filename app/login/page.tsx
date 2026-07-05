"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:8000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Authentication failed");
      }

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("email", data.email);
      localStorage.setItem("fullName", data.full_name || "");
      
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    setLoading(true);
    // Simulate OAuth mapping to backend endpoint
    try {
      const mockPayload = {
        email: `${provider}_user@nexuslearn.ai`,
        name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Candidate`,
        picture: "https://lh3.googleusercontent.com/aida-public/AB6AXuAOIoT4IUbE9ARM7_qJlh0SCfgBQiJh22s6mSuCuWqdwej4BNagojdlqFC7byJp_vXBiVoz-gi03wp5BTbZ1CaUaPm7GO3ERE9Ks-0i9YI8MTCjbx_1fFhU0vKV91dU_ZN14qy3n5dJ90HKk-rNV3ifqccJlGiKRLaA04Tr8LegwOgWGUFLNz9ZMWS24gNFV_5CMCzCmBS9rZWu2aDFPFcBMaDbPn3h1OStezEpEZISl1-Ww9-XQbur"
      };
      const response = await fetch(`http://localhost:8000/api/auth/oauth/${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockPayload),
      });
      const data = await response.json();
      
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("email", data.email);
      router.push("/dashboard");
    } catch (err) {
      setError("OAuth connection failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#e4e1ed] flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans">
      {/* Background Video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none z-0 opacity-15"
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260525_052706_d2e390fd-1846-4fe7-a4d8-8d2f1c875358.mp4"
          type="video/mp4"
        />
      </video>

      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-purple-500/10 blur-[120px] pointer-events-none z-0"></div>

      <div className="w-full max-w-md glass-panel p-8 rounded-3xl ai-glow z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 items-center justify-center shadow-lg mb-2">
            <span className="material-symbols-outlined text-white text-[24px]">psychology</span>
          </div>
          <h2 className="font-geist font-bold text-2xl text-primary">Welcome to NexusLearn AI</h2>
          <p className="text-sm text-on-surface-variant">Log in to your premium study workspace</p>
        </div>

        {error && (
          <div className="p-3 bg-error-container/20 border border-error/30 text-error text-xs rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-outline">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#13131b] border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder="you@university.edu"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="text-xs font-semibold text-outline">Password</label>
              <Link href="/forgot-password" className="text-xs text-primary hover:underline">Forgot?</Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#13131b] border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white font-semibold py-3 rounded-xl transition-all shadow-lg active:scale-98 disabled:opacity-50 text-sm"
          >
            {loading ? "Authenticating..." : "Sign In with Email"}
          </button>
        </form>

        <div className="flex items-center gap-3">
          <div className="h-px bg-outline-variant flex-1"></div>
          <span className="text-xs text-outline font-semibold">OR CONTINUE WITH</span>
          <div className="h-px bg-outline-variant flex-1"></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleOAuth("google")}
            className="flex items-center justify-center gap-2 py-2.5 bg-[#13131b] border border-outline-variant rounded-xl hover:bg-surface-container transition-all text-xs font-semibold"
          >
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google Logo" />
            Google
          </button>
          <button
            onClick={() => handleOAuth("github")}
            className="flex items-center justify-center gap-2 py-2.5 bg-[#13131b] border border-outline-variant rounded-xl hover:bg-surface-container transition-all text-xs font-semibold"
          >
            <img src="https://github.com/favicon.ico" className="w-4 h-4 invert" alt="GitHub Logo" />
            GitHub
          </button>
        </div>

        <p className="text-center text-xs text-on-surface-variant">
          Don't have an account?{" "}
          <Link href="/register" className="text-primary font-bold hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
