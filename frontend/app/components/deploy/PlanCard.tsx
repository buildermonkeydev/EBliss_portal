// components/deploy/PlanCard.tsx
"use client";

import { CheckCircle, Cpu, MemoryStick, HardDrive, Wifi } from "lucide-react";
import { Plan, BillingCycle, cycleMultiplier, cycleSuffix } from "./types";

interface PlanCardProps {
  plan: Plan;
  isActive: boolean;
  billingCycle: BillingCycle;
  onSelect: () => void;
}

export function PlanCard({ plan, isActive, billingCycle, onSelect }: PlanCardProps) {
  const multiplier = cycleMultiplier(billingCycle);
  const currentPrice = Math.round(plan.price * multiplier);
  const suffix = cycleSuffix(billingCycle);
  const Icon = plan.icon;

  // Determine if this is a yearly billing cycle (shows savings)
  const isYearly = billingCycle === "yearly";
  const yearlySavings = isYearly ? (plan.price * 12 - plan.yearlyPrice).toLocaleString() : 0;

  return (
    <div
      onClick={onSelect}
      className={`relative group cursor-pointer transition-all duration-300 ${
        isActive ? 'scale-105 z-10' : 'hover:scale-105'
      }`}
    >
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${plan.badgeColor} opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl ${isActive ? 'opacity-30' : ''}`} />
      <div className={`relative rounded-2xl p-6 border-2 transition-all duration-300 h-full ${
        isActive
          ? "border-indigo-500 bg-gradient-to-br from-slate-800/50 to-slate-900/50 shadow-2xl shadow-indigo-500/20"
          : "border-slate-700 bg-slate-800/50 hover:border-slate-500"
      }`}>
        
        {plan.popular && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <div className="px-4 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-semibold shadow-lg">
              ⭐ {plan.badge}
            </div>
          </div>
        )}
        
        <div className="text-center mb-4">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${plan.badgeColor} mx-auto mb-4 flex items-center justify-center shadow-lg`}>
            <Icon className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
          <p className="text-xs text-slate-400">{plan.description}</p>
        </div>
        
        <div className="text-center mb-4">
          <span className="text-4xl font-bold text-white">₹{currentPrice.toLocaleString()}</span>
          <span className="text-slate-400 text-sm ml-1">/{suffix}</span>
          {isYearly && (
            <p className="text-xs text-emerald-400 mt-1">Save ₹{yearlySavings}/year</p>
          )}
        </div>
        
        <div className="space-y-2 mb-4 border-t border-slate-700 pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400 flex items-center gap-2"><Cpu className="w-4 h-4" /> vCPU</span>
            <span className="text-white font-medium">{plan.specs.cpu} Cores</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400 flex items-center gap-2"><MemoryStick className="w-4 h-4" /> RAM</span>
            <span className="text-white font-medium">{plan.specs.ram} GB</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400 flex items-center gap-2"><HardDrive className="w-4 h-4" /> Storage</span>
            <span className="text-white font-medium">{plan.specs.disk} GB NVMe</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400 flex items-center gap-2"><Wifi className="w-4 h-4" /> Bandwidth</span>
            <span className="text-white font-medium">{plan.specs.bandwidth} TB</span>
          </div>
        </div>
        
        <div className="space-y-1.5 mb-5">
          {plan.features.slice(0, 3).map((feature, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs text-slate-400">
              <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />
              <span>{feature}</span>
            </div>
          ))}
          {plan.features.length > 3 && (
            <div className="text-xs text-indigo-400 mt-1">+{plan.features.length - 3} more features</div>
          )}
        </div>
        
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          className={`w-full py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
            isActive
              ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
        >
          {isActive ? "✓ Selected" : "Select Plan"}
        </button>
      </div>
    </div>
  );
}