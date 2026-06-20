"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ATSScoreRingProps {
  score: number;
  size?: number;
  showLabel?: boolean;
}

export function ATSScoreRing({ score, size = 80, showLabel = true }: ATSScoreRingProps) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : score >= 40 ? "#f97316" : "#ef4444";

  return (
    <div className="ats-score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1e293b"
          strokeWidth={6}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={6}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold" style={{ color }}>
            {score}
          </span>
          <span className="text-[9px] text-slate-500 -mt-1">ATS</span>
        </div>
      )}
    </div>
  );
}

export function ScoreBadge({ score }: { score: number }) {
  const config =
    score >= 80
      ? { bg: "bg-green-500/20", text: "text-green-400", label: "Excellent" }
      : score >= 60
      ? { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "Good" }
      : score >= 40
      ? { bg: "bg-orange-500/20", text: "text-orange-400", label: "Fair" }
      : { bg: "bg-red-500/20", text: "text-red-400", label: "Low" };

  return (
    <span className={cn("badge", config.bg, config.text)}>
      {score}% · {config.label}
    </span>
  );
}
