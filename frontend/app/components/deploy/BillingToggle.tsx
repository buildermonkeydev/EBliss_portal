"use client";

import { Sparkles, Zap, TrendingDown, Crown } from "lucide-react";
import { BillingCycle } from "../../components/deploy/types";

interface BillingToggleProps {
  billingCycle: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
}

const options: {
  id: BillingCycle;
  label: string;
  sub: string;
  discount: string | null;
  saving: string | null;
  icon: React.ElementType;
  accentFrom: string;
  accentTo: string;
  ringColor: string;
}[] = [
  {
    id: "monthly",
    label: "Monthly",
    sub: "Pay as you go",
    discount: null,
    saving: null,
    icon: Zap,
    accentFrom: "from-slate-500",
    accentTo: "to-slate-400",
    ringColor: "ring-slate-500/30",
  },
  {
    id: "quarterly",
    label: "Quarterly",
    sub: "Every 3 months",
    discount: "5% off",
    saving: "Save 5%",
    icon: TrendingDown,
    accentFrom: "from-sky-500",
    accentTo: "to-cyan-400",
    ringColor: "ring-sky-500/30",
  },
  {
    id: "halfyearly",
    label: "Half-Yearly",
    sub: "Every 6 months",
    discount: "10% off",
    saving: "Save 10%",
    icon: Sparkles,
    accentFrom: "from-violet-500",
    accentTo: "to-purple-400",
    ringColor: "ring-violet-500/30",
  },
  {
    id: "yearly",
    label: "Yearly",
    sub: "Annual billing",
    discount: "15% off",
    saving: "Best Value",
    icon: Crown,
    accentFrom: "from-amber-400",
    accentTo: "to-orange-400",
    ringColor: "ring-amber-400/30",
  },
];

export function BillingToggle({ billingCycle, onChange }: BillingToggleProps) {
  const active = options.find((o) => o.id === billingCycle)!;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Eyebrow label */}
      <div className="flex items-center gap-2">
        <div className="h-px w-8 bg-gradient-to-r from-transparent to-slate-600" />
        <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-slate-500">
          Billing Cycle
        </span>
        <div className="h-px w-8 bg-gradient-to-l from-transparent to-slate-600" />
      </div>

      {/* Card grid toggle */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl">
        {options.map((opt) => {
          const isActive = billingCycle === opt.id;
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              onClick={() => onChange(opt.id)}
              className={`
                relative group flex flex-col items-center gap-1.5 px-3 py-4 rounded-2xl
                border transition-all duration-300 ease-out text-center
                ${
                  isActive
                    ? `border-white/10 bg-gradient-to-b from-slate-700/80 to-slate-800/80
                       shadow-2xl ring-2 ${opt.ringColor} scale-[1.04]`
                    : "border-slate-700/40 bg-slate-800/30 hover:bg-slate-800/60 hover:border-slate-600/60 hover:scale-[1.01]"
                }
              `}
            >
              {/* Yearly special top shine */}
              {isActive && opt.id === "yearly" && (
                <div className="absolute -top-px left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
              )}

              {/* Active top accent bar */}
              {isActive && (
                <div
                  className={`absolute top-0 left-4 right-4 h-0.5 rounded-full bg-gradient-to-r ${opt.accentFrom} ${opt.accentTo}`}
                />
              )}

              {/* Icon bubble */}
              <div
                className={`
                  w-8 h-8 rounded-xl flex items-center justify-center mb-0.5
                  transition-all duration-300
                  ${
                    isActive
                      ? `bg-gradient-to-br ${opt.accentFrom} ${opt.accentTo} shadow-lg`
                      : "bg-slate-700/60 group-hover:bg-slate-700"
                  }
                `}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? "text-white" : "text-slate-400 group-hover:text-slate-300"
                  }`}
                />
              </div>

              {/* Label */}
              <span
                className={`text-sm font-bold leading-none transition-colors ${
                  isActive ? "text-white" : "text-slate-300 group-hover:text-white"
                }`}
              >
                {opt.label}
              </span>

              {/* Sub */}
              <span
                className={`text-[10px] leading-none font-medium transition-colors ${
                  isActive ? "text-slate-400" : "text-slate-600"
                }`}
              >
                {opt.sub}
              </span>

              {/* Discount pill */}
              {opt.saving ? (
                <span
                  className={`
                    mt-1 text-[9px] font-bold tracking-wide px-2 py-0.5 rounded-full
                    transition-all duration-300
                    ${
                      isActive
                        ? `bg-gradient-to-r ${opt.accentFrom} ${opt.accentTo} text-white`
                        : "bg-slate-700/80 text-slate-500 group-hover:text-slate-400"
                    }
                  `}
                >
                  {opt.saving}
                </span>
              ) : (
                <span className="mt-1 text-[9px] text-slate-700 select-none">—</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Animated savings hint */}
      <div
        className={`
          flex items-center gap-2 text-xs font-medium
          transition-all duration-500 ease-out
          ${billingCycle !== "monthly" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 pointer-events-none"}
        `}
      >
        <div
          className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${active.accentFrom} ${active.accentTo}`}
        />
        <span className="text-slate-400">
          You&apos;re saving{" "}
          <span
            className={`font-bold bg-gradient-to-r ${active.accentFrom} ${active.accentTo} bg-clip-text text-transparent`}
          >
            {active.discount}
          </span>{" "}
          with <span className="text-slate-300">{active.label}</span> billing
        </span>
      </div>
    </div>
  );
}