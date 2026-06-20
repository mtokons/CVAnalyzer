"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  User,
  Briefcase,
  FileText,
  Mail,
  Zap,
  Settings,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profile", label: "My Profile", icon: User },
  { href: "/jobs", label: "Job Tracker", icon: Briefcase },
  { href: "/cv", label: "My CVs", icon: FileText },
  { href: "/cover-letters", label: "Cover Letters", icon: Mail },
  { href: "/apply", label: "Auto Apply", icon: Zap },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-slate-900 border-r border-slate-800">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-800">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">CV Creator</h1>
          <p className="text-xs text-slate-500">AI-Powered</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 2 }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer group",
                  isActive
                    ? "bg-brand-600/20 text-brand-300 border border-brand-500/30"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon
                  className={cn(
                    "w-4.5 h-4.5 flex-shrink-0",
                    isActive ? "text-brand-400" : "text-slate-500 group-hover:text-slate-300"
                  )}
                  size={18}
                />
                <span>{item.label}</span>
                {isActive && (
                  <ChevronRight className="w-4 h-4 ml-auto text-brand-400" size={14} />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom badge */}
      <div className="px-4 py-4 border-t border-slate-800">
        <div className="glass-card px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-semibold text-slate-300">AI Ready</span>
          </div>
          <p className="text-xs text-slate-500">Gemini Pro connected</p>
        </div>
      </div>
    </aside>
  );
}
