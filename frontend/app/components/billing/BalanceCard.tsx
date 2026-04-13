"use client";

import { ArrowUpRight, TrendingUp } from "lucide-react";

interface BalanceCardProps {
  title: string;
  value: string;
  color?: string;
  subtitle?: string;
  trend?: number;
  onClick?: () => void;
}

export default function BalanceCard({ 
  title, 
  value, 
  color = "text-white", 
  subtitle,
  trend,
  onClick 
}: BalanceCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`group bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-slate-600/50 transition-all duration-300 hover:shadow-xl hover:shadow-black/20 ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 bg-slate-700/30 rounded-xl">
          {title === "Available Balance" && <WalletIcon />}
          {title === "Unbilled Amount" && <ReceiptIcon />}
          {title === "Next Invoice" && <CalendarIcon />}
        </div>
        {trend !== undefined && (
          <span className={`text-xs flex items-center gap-1 ${trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            <TrendingUp className="w-3 h-3" />
            {trend >= 0 ? "+" : ""}{trend}%
          </span>
        )}
      </div>
      <p className="text-slate-400 text-sm mb-1">{title}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {subtitle && (
        <p className="text-xs text-slate-500 mt-2">{subtitle}</p>
      )}
      {onClick && (
        <div className="mt-4 flex items-center gap-1 text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
          <span>View details</span>
          <ArrowUpRight className="w-3 h-3" />
        </div>
      )}
    </div>
  );
}

function WalletIcon() {
  return (
    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}