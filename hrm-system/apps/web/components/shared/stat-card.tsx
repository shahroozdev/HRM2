"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function StatCard({ title, value, trend, icon, color, sparkline }: { title: string; value: number; trend: number; icon: React.ReactNode; color: string; sparkline?: number[] }): React.JSX.Element {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const duration = 800;
    const animate = (time: number) => {
      const progress = Math.min((time - start) / duration, 1);
      setDisplay(Math.floor(value * progress));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-3xl font-semibold">{display}</p>
        </div>
        <div className="rounded-lg p-3" style={{ background: color }}>{icon}</div>
      </div>
      <p className="mt-3 text-xs text-slate-500">Trend: {trend > 0 ? "+" : ""}{trend}%</p>
      {sparkline && (
        <div className="mt-3 flex h-10 items-end gap-1">
          {sparkline.map((n, i) => <span key={i} className="w-full rounded-sm bg-[var(--accent)]/60" style={{ height: `${Math.max(10, n)}%` }} />)}
        </div>
      )}
    </motion.div>
  );
}

export function StatCardSkeleton(): React.JSX.Element {
  return <div className="h-40 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />;
}