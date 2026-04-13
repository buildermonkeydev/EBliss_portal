import { LucideIcon } from "lucide-react";

export type BillingCycle = "monthly" | "quarterly" | "halfyearly" | "yearly";


export interface Plan {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  price: number;
  yearlyPrice: number;
  description: string;
  specs: {
    cpu: number;
    ram: number;
    disk: number;
    bandwidth: number;
  };
  features: string[];
  popular?: boolean;
  icon: any;
}

export interface Location {
  id: string;
  name: string;
  displayName: string;
  flag: string;
  country: string;
  city: string;
  latency: number;
  priceMultiplier: number;
  available: boolean;
  status: {
    online: boolean;
    cpu: number;
    memory: { usagePercent: number };
  };
}

export interface OS {
  id: string;
  name: string;
  category: "linux" | "windows";
  version: string;
  minDisk: number;
  minMemory: number;
  size: number;
  recommended: boolean;
}

export interface PricingBreakdown {
  planPrice: number;
  ipPrice: number;
  bandwidthPrice: number;
  subtotal: number;
  tax: number;
  total: number;
}

export interface DeploymentConfig {
  planId: string;
  locationId: string;
  osId: string;
  additionalIPs: number;
  bandwidth: number;
  billingCycle: BillingCycle;  // Now supports all 4 types

}
export function cycleMultiplier(cycle: BillingCycle): number {
  switch (cycle) {
    case "monthly":    return 1;
    case "quarterly":  return 3 * 0.95;   // 3 months × 5% off
    case "halfyearly": return 6 * 0.90;   // 6 months × 10% off
    case "yearly":     return 12 * 0.85;  // 12 months × 15% off
  }
}
export function cycleSuffix(cycle: BillingCycle): string {
  switch (cycle) {
    case "monthly":    return "/mo";
    case "quarterly":  return "/3 mo";
    case "halfyearly": return "/6 mo";
    case "yearly":     return "/yr";
  }
}
 