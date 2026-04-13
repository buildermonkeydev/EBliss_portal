// components/deploy/OrderSummary.tsx
"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { Plan, PricingBreakdown, BillingCycle, cycleSuffix } from "./types";

interface OrderSummaryProps {
  isOpen: boolean;
  onToggle: () => void;
  plan: Plan;
  billingCycle: BillingCycle;
  additionalIPs: number;
  bandwidth: number;
  pricing: PricingBreakdown;
}

export function OrderSummary({ 
  isOpen, 
  onToggle, 
  plan, 
  billingCycle, 
  additionalIPs, 
  bandwidth, 
  pricing 
}: OrderSummaryProps) {
  const periodDisplay = cycleSuffix(billingCycle);
  const periodFull = billingCycle === "monthly" ? "Monthly" : 
                     billingCycle === "quarterly" ? "Quarterly" :
                     billingCycle === "halfyearly" ? "Half-Yearly" : "Yearly";

  return (
    <div className="max-w-2xl mx-auto w-full">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition group"
      >
        <span className="text-white font-semibold flex items-center gap-2">
          📋 Order Summary
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
        <span className="text-2xl font-bold text-white">₹{pricing.total.toLocaleString()}</span>
      </button>

      {isOpen && (
        <div className="mt-4 p-5 bg-slate-800/30 rounded-xl space-y-3 animate-slideDown">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">{plan.name} Plan ({periodFull})</span>
            <span className="text-white font-medium">₹{pricing.planPrice.toLocaleString()}</span>
          </div>
          {additionalIPs > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Additional IPs ({additionalIPs})</span>
              <span className="text-white">₹{pricing.ipPrice.toLocaleString()}</span>
            </div>
          )}
          {bandwidth > plan.specs.bandwidth && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Extra Bandwidth</span>
              <span className="text-white">₹{pricing.bandwidthPrice.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between text-sm pt-3 border-t border-slate-700">
            <span className="text-slate-400">Subtotal</span>
            <span className="text-white">₹{pricing.subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">GST (18%)</span>
            <span className="text-white">₹{pricing.tax.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-3 border-t border-slate-700">
            <span className="text-white">Total</span>
            <span className="text-indigo-400 text-xl">₹{pricing.total.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}