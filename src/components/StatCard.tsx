import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  isPositiveChange?: boolean;
  subtitle?: string;
  icon: LucideIcon;
  colorHex?: string;
}

export default function StatCard({
  title,
  value,
  change,
  isPositiveChange,
  subtitle,
  icon: Icon,
}: StatCardProps) {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-4 flex items-baseline space-x-3">
        <span className="text-3xl font-extrabold text-white tracking-tight">{value}</span>
        {change && (
          <span
            className={`text-xs px-2 py-0.5 rounded-md font-semibold font-mono border ${
              isPositiveChange
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-rose-500/10 text-rose-400 border-rose-500/30"
            }`}
          >
            {change}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-2 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
}
