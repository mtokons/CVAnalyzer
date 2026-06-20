"use client";

import { Loader2 } from "lucide-react";

export function LoadingSpinner({ size = 20, className = "" }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} />;
}

export function LoadingOverlay({ message }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <div className="glass-card px-8 py-6 flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-slate-700" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
        </div>
        {message && <p className="text-sm text-slate-300 font-medium">{message}</p>}
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="glass-card p-6 space-y-4">
      <div className="shimmer h-5 w-1/3 rounded-lg" />
      <div className="shimmer h-4 w-2/3 rounded-lg" />
      <div className="shimmer h-4 w-1/2 rounded-lg" />
    </div>
  );
}
