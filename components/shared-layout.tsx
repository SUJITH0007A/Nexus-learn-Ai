"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface SharedLayoutProps {
  children: React.ReactNode;
}

export default function SharedLayout({ children }: SharedLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [credits, setCredits] = useState(95);
  const [xp, setXp] = useState(650);
  const [level, setLevel] = useState(3);
  const [notifications, setNotifications] = useState([
    { id: 1, title: "Quiz Ready", text: "Quantum Physics quiz is ready to take.", read: false },
    { id: 2, title: "Document Processed", text: "Calculus Guide has been fully indexed.", read: true },
    { id: 3, title: "Achievement Unlocked", text: "You earned the Knowledge Explorer badge!", read: false },
  ]);

  // Handle Cmd+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        alert("NexusLearn Command Palette coming soon! Search documents, start chats, and run AI commands instantly.");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
    { label: "AI Chat", href: "/chat", icon: "smart_toy" },
    { label: "Study Planner", href: "/planner", icon: "calendar_month" },
    { label: "Documents", href: "/documents", icon: "description" },
    { label: "Interview Prep", href: "/interview", icon: "record_voice_over" },
    { label: "Code Lab", href: "/codelab", icon: "code" },
    { label: "Analytics", href: "/analytics", icon: "analytics" },
    { label: "Gamification", href: "/leaderboard", icon: "emoji_events" },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/");
  };

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-background text-on-surface font-sans selection:bg-primary-container selection:text-on-primary-container">
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-[240px] hidden md:flex flex-col bg-surface-container-low border-r border-outline-variant p-stack-md z-50">
        <div className="flex items-center gap-stack-sm mb-stack-lg px-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-white text-[20px]">psychology</span>
          </div>
          <div>
            <h1 className="font-geist font-bold text-lg text-primary leading-none">NexusLearn AI</h1>
            <p className="text-[10px] text-outline uppercase tracking-widest mt-1">Workspace</p>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-1 overflow-y-auto pr-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 active:scale-98 ${
                  isActive
                    ? "text-primary font-bold bg-primary-container"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                }`}
              >
                <span className={`material-symbols-outlined ${isActive ? "text-primary" : "text-outline"}`}>
                  {item.icon}
                </span>
                <span className="font-geist text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="mt-auto p-3 glass-panel rounded-2xl flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full overflow-hidden border border-outline-variant">
              <img
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAOIoT4IUbE9ARM7_qJlh0SCfgBQiJh22s6mSuCuWqdwej4BNagojdlqFC7byJp_vXBiVoz-gi03wp5BTbZ1CaUaPm7GO3ERE9Ks-0i9YI8MTCjbx_1fFhU0vKV91dU_ZN14qy3n5dJ90HKk-rNV3ifqccJlGiKRLaA04Tr8LegwOgWGUFLNz9ZMWS24gNFV_5CMCzCmBS9rZWu2aDFPFcBMaDbPn3h1OStezEpEZISl1-Ww9-XQbur"
                alt="Profile Avatar"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-geist text-sm font-semibold text-on-surface truncate">Alex Rivera</p>
              <p className="text-[10px] text-primary uppercase font-bold tracking-wider">Premium Plan</p>
            </div>
            <button onClick={handleLogout} className="text-outline hover:text-error transition-colors">
              <span className="material-symbols-outlined text-lg">logout</span>
            </button>
          </div>
          {/* Level Progress */}
          <div className="mt-1 space-y-1">
            <div className="flex justify-between text-[10px] text-outline font-semibold">
              <span>Lvl {level}</span>
              <span>{xp}/300 XP</span>
            </div>
            <div className="w-full bg-surface-container-high h-1 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full" style={{ width: `${(xp/300)*100}%` }}></div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-primary mt-1">
              <span>Credits Left:</span>
              <span className="font-bold">{credits}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Top Header */}
      <header className="fixed md:left-[240px] right-0 top-0 h-16 bg-surface-dim/80 backdrop-blur-md border-b border-outline-variant z-40 flex justify-between items-center px-container-padding-mobile md:px-container-padding-desktop">
        <div className="flex items-center gap-4 flex-1">
          {/* Search bar */}
          <div className="relative w-full max-w-xs hidden md:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">
              search
            </span>
            <input
              type="text"
              placeholder="Search base... (⌘K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-full pl-9 pr-4 py-1.5 text-xs focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
            />
          </div>

          {/* Mobile Brand */}
          <div className="md:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[18px]">psychology</span>
            </div>
            <span className="font-geist text-md font-bold text-primary">NexusLearn</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Active Model Indicator */}
          <div className="hidden lg:flex items-center px-3 py-1 bg-primary-container/10 rounded-full border border-primary/20">
            <span className="w-2 h-2 rounded-full bg-indigo-500 pulse-dot mr-2"></span>
            <span className="text-[10px] font-geist text-primary uppercase tracking-widest font-semibold">
              Nexus-4o Active
            </span>
          </div>

          {/* Notification Button */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="hover:bg-surface-container rounded-full p-2 transition-all group flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary">
                notifications
              </span>
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-purple-500 rounded-full"></span>
              )}
            </button>

            {/* Notification Drawer */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-72 glass-panel rounded-2xl p-4 shadow-xl z-50 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-outline-variant pb-2">
                    <h4 className="font-geist text-sm font-semibold">Notifications</h4>
                    <button onClick={markAllRead} className="text-[10px] text-primary hover:underline">
                      Mark all read
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-outline py-4 text-center">No notifications yet</p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className={`p-2 rounded-lg text-xs ${n.read ? "opacity-60" : "bg-primary-container/5 border border-primary/10"}`}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold text-on-surface">{n.title}</span>
                            {!n.read && <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>}
                          </div>
                          <p className="text-on-surface-variant">{n.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile settings shortcut */}
          <Link
            href="/settings"
            className="hover:bg-surface-container rounded-full p-2 transition-all flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-on-surface-variant hover:text-primary">settings</span>
          </Link>

          {/* Mobile hamburger menu */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden hover:bg-surface-container rounded-full p-2 transition-all flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-on-surface-variant">menu</span>
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            ></div>
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-full w-[240px] bg-surface-container-low border-r border-outline-variant p-stack-md z-50 flex flex-col md:hidden"
            >
              <div className="flex items-center gap-stack-sm mb-stack-lg px-2 justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">psychology</span>
                  <span className="font-geist font-bold text-lg text-primary">NexusLearn</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)}>
                  <span className="material-symbols-outlined text-outline">close</span>
                </button>
              </div>

              <nav className="flex-1 flex flex-col gap-1 overflow-y-auto">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                        isActive
                          ? "text-primary font-bold bg-primary-container"
                          : "text-on-surface-variant hover:bg-surface-container"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                      <span className="font-geist text-sm">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-auto p-3 glass-panel rounded-2xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden">
                  <img
                    className="w-full h-full object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAOIoT4IUbE9ARM7_qJlh0SCfgBQiJh22s6mSuCuWqdwej4BNagojdlqFC7byJp_vXBiVoz-gi03wp5BTbZ1CaUaPm7GO3ERE9Ks-0i9YI8MTCjbx_1fFhU0vKV91dU_ZN14qy3n5dJ90HKk-rNV3ifqccJlGiKRLaA04Tr8LegwOgWGUFLNz9ZMWS24gNFV_5CMCzCmBS9rZWu2aDFPFcBMaDbPn3h1OStezEpEZISl1-Ww9-XQbur"
                    alt="Alex Avatar"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-geist text-xs font-semibold text-on-surface truncate">Alex Rivera</p>
                  <p className="text-[9px] text-primary uppercase font-bold">Premium</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Layout */}
      <main className="md:pl-[240px] pt-16 min-h-screen">
        <div className="p-container-padding-mobile md:p-container-padding-desktop max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 w-full z-40 flex justify-around items-center h-16 pb-safe md:hidden bg-surface-container-low/90 backdrop-blur-xl border-t border-outline-variant shadow-lg">
        <Link href="/dashboard" className={`flex flex-col items-center justify-center ${pathname === "/dashboard" ? "text-primary font-bold" : "text-outline"}`}>
          <span className="material-symbols-outlined text-[20px]">home</span>
          <span className="text-[10px] font-geist mt-0.5">Home</span>
        </Link>
        <Link href="/chat" className={`flex flex-col items-center justify-center ${pathname === "/chat" ? "text-primary font-bold" : "text-outline"}`}>
          <span className="material-symbols-outlined text-[20px]">chat_bubble</span>
          <span className="text-[10px] font-geist mt-0.5">Chat</span>
        </Link>
        <Link href="/planner" className={`flex flex-col items-center justify-center ${pathname === "/planner" ? "text-primary font-bold" : "text-outline"}`}>
          <span className="material-symbols-outlined text-[20px]">calendar_month</span>
          <span className="text-[10px] font-geist mt-0.5">Planner</span>
        </Link>
        <Link href="/documents" className={`flex flex-col items-center justify-center ${pathname === "/documents" ? "text-primary font-bold" : "text-outline"}`}>
          <span className="material-symbols-outlined text-[20px]">folder_open</span>
          <span className="text-[10px] font-geist mt-0.5">Vault</span>
        </Link>
      </nav>
    </div>
  );
}
