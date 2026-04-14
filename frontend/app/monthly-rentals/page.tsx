"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import api from "@/lib/api/auth";
import {
  Rocket, TrendingUp, Award, Star,
  Loader2, AlertCircle, CheckCircle,
  Calendar, Lock, Clock, ShieldCheck, Zap,
  Wallet, ArrowRight, ExternalLink, RefreshCw,
  CreditCard, Plus, X,
} from "lucide-react";
import { BillingToggle } from "../components/deploy/BillingToggle";
import { PlanCard } from "../components/deploy/PlanCard";
import { LocationSelector } from "../components/deploy/LocationSelector";
import { OSSelector } from "../components/deploy/OSSelector";
import { AddOns } from "../components/deploy/AddOns";
import { OrderSummary } from "../components/deploy/OrderSummary";
import {
  Plan, Location, OS, DeploymentConfig,
  BillingCycle, cycleMultiplier, cycleSuffix,
} from "../components/deploy/types";

const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    badge: "POPULAR",
    badgeColor: "from-indigo-500 to-purple-500",
    price: 649,
    yearlyPrice: 6490,
    description: "Perfect for small websites and personal projects",
    specs: { cpu: 2, ram: 4, disk: 40, bandwidth: 5 },
    features: ["Basic DDoS Protection", "1 Public IPv4", "24/7 Support", "99.9% Uptime SLA"],
    popular: true,
    icon: Rocket,
  },
  {
    id: "business",
    name: "Business",
    badge: "RECOMMENDED",
    badgeColor: "from-emerald-500 to-teal-500",
    price: 1199,
    yearlyPrice: 11990,
    description: "Ideal for growing businesses and e-commerce",
    specs: { cpu: 4, ram: 8, disk: 80, bandwidth: 10 },
    features: ["Advanced DDoS Protection", "2 Public IPv4", "Priority Support", "99.95% Uptime SLA", "Free Backups"],
    icon: TrendingUp,
  },
  {
    id: "pro",
    name: "Pro",
    badge: "PRO",
    badgeColor: "from-orange-500 to-red-500",
    price: 2199,
    yearlyPrice: 21990,
    description: "For demanding applications and databases",
    specs: { cpu: 8, ram: 16, disk: 160, bandwidth: 20 },
    features: ["Enterprise DDoS Protection", "4 Public IPv4", "24/7 Priority Support", "99.99% Uptime SLA", "Daily Backups", "Load Balancer"],
    icon: Award,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    badge: "ENTERPRISE",
    badgeColor: "from-purple-500 to-pink-500",
    price: 3999,
    yearlyPrice: 39990,
    description: "Mission-critical workloads and high traffic",
    specs: { cpu: 16, ram: 32, disk: 320, bandwidth: 50 },
    features: ["Custom DDoS Protection", "8 Public IPv4", "Dedicated Support Team", "99.999% Uptime SLA", "Hourly Backups", "Dedicated IPAM", "Private Network"],
    icon: Star,
  },
];

export default function DeployPage() {
  const router = useRouter();
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [addFundsAmount, setAddFundsAmount] = useState<number>(500);
  const [isAddingFunds, setIsAddingFunds] = useState(false);

  const [locations, setLocations] = useState<Location[]>([]);
  const [operatingSystems, setOperatingSystems] = useState<OS[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Wallet state
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [insufficientBalance, setInsufficientBalance] = useState(false);

  const [config, setConfig] = useState<DeploymentConfig>({
    planId: "starter",
    locationId: "",
    osId: "",
    additionalIPs: 0,
    bandwidth: 5,
    billingCycle: "monthly",
  });

  useEffect(() => { 
    fetchData(); 
    fetchWalletBalance();
  }, []);

  // Refresh balance periodically
  useEffect(() => {
    const interval = setInterval(() => {
      fetchWalletBalance();
    }, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [locationsRes, osRes] = await Promise.all([
        api.get("/locations"),
        api.get("/os-templates"),
      ]);

      const transformedLocations: Location[] = (locationsRes.data.locations || []).map((loc: any) => ({
        id: loc.id,
        name: loc.name,
        displayName: loc.displayName,
        flag: loc.flag,
        country: loc.country,
        city: loc.city,
        latency: loc.latency,
        priceMultiplier: loc.priceMultiplier,
        available: loc.available,
        status: loc.status,
      }));

      const transformedOS: OS[] = (osRes.data.templates || [])
        .filter((os: any) => os.contentType === "vztmpl" || os.contentType === "iso")
        .slice(0, 12)
        .map((os: any) => ({
          id: os.id,
          name: os.name.split("-")[0],
          category: os.category || "linux",
          version: os.version || "Latest",
          minDisk: os.minDisk,
          minMemory: os.minMemory,
          size: os.size,
          recommended: os.name.toLowerCase().includes("ubuntu"),
        }));

      setLocations(transformedLocations);
      setOperatingSystems(transformedOS);

      if (transformedLocations.length > 0)
        setConfig((prev) => ({ ...prev, locationId: transformedLocations[0].id }));
      if (transformedOS.length > 0) {
        const recommended = transformedOS.find((os) => os.recommended);
        setConfig((prev) => ({ ...prev, osId: recommended?.id || transformedOS[0].id }));
      }
    } catch {
      setError("Failed to load deployment configuration");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWalletBalance = async () => {
    setIsLoadingBalance(true);
    try {
      const res = await api.get("/wallet/balance");
      setWalletBalance(parseFloat(res.data.balance) || 0);
    } catch (error) {
      console.error("Failed to fetch wallet balance:", error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const selectedPlan     = plans.find((p) => p.id === config.planId)!;
  const selectedLocation = locations.find((l) => l.id === config.locationId);
  const selectedOS       = operatingSystems.find((os) => os.id === config.osId);

  const calculateTotal = () => {
    const mult = cycleMultiplier(config.billingCycle);

    const planPrice      = Math.round(selectedPlan.price * mult);
    const ipPrice        = Math.round(config.additionalIPs * 50 * mult);
    const extraBandwidth = Math.max(0, config.bandwidth - selectedPlan.specs.bandwidth);
    const bandwidthPrice = Math.round(extraBandwidth * 100 * mult);

    const subtotal = planPrice + ipPrice + bandwidthPrice;
    const tax      = Math.round(subtotal * 0.18);
    const total    = subtotal + tax;

    return { planPrice, ipPrice, bandwidthPrice, subtotal, tax, total };
  };

  const pricing = calculateTotal();
  const hasEnoughBalance = walletBalance >= pricing.total;
  const shortfall = pricing.total - walletBalance;

  // Check balance when pricing changes
  useEffect(() => {
    setInsufficientBalance(!hasEnoughBalance && !isLoadingBalance);
  }, [hasEnoughBalance, isLoadingBalance]);

  const handleAddFunds = async () => {
    if (addFundsAmount < 100) {
      setError("Minimum amount is ₹100");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsAddingFunds(true);
    setError(null);

    try {
      const orderResponse = await api.post("/payment/create-order", {
        amount: addFundsAmount,
        currency: "INR",
      });

      const { order, key_id } = orderResponse.data;

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => {
        const options = {
          key: key_id,
          amount: order.amount,
          currency: order.currency,
          name: "eBliss Cloud",
          description: `Add ₹${addFundsAmount} to wallet`,
          order_id: order.id,
          handler: async (response: any) => {
            try {
              const verifyResponse = await api.post("/payment/verify", {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });

              if (verifyResponse.data.success) {
                await fetchWalletBalance();
                setShowAddFundsModal(false);
                setAddFundsAmount(500);
                setSuccess("Funds added successfully! You can now deploy your VM.");
                setTimeout(() => setSuccess(null), 5000);
              }
            } catch (err: any) {
              setError(err.response?.data?.message || "Payment verification failed");
            } finally {
              setIsAddingFunds(false);
            }
          },
          theme: { color: "#4f46e5" },
          modal: {
            ondismiss: () => {
              setIsAddingFunds(false);
            },
          },
        };

        const razorpay = new (window as any).Razorpay(options);
        razorpay.open();
      };

      script.onerror = () => {
        setError("Failed to load payment gateway");
        setIsAddingFunds(false);
      };
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create payment order");
      setIsAddingFunds(false);
    }
  };

  const handleDeploy = async () => {
    if (!selectedLocation || !selectedOS) {
      setError("Please select a location and operating system");
      return;
    }

    if (!hasEnoughBalance) {
      setInsufficientBalance(true);
      setError(`Insufficient balance. You need ₹${shortfall.toLocaleString('en-IN')} more.`);
      return;
    }

    setIsDeploying(true);
    setError(null);
    setSuccess(null);

    try {
      const deployData = {
        hostname: `${selectedPlan.name.toLowerCase()}-${Date.now()}`,
        location: config.locationId,
        os: selectedOS.id,
        cores: selectedPlan.specs.cpu,
        memory: selectedPlan.specs.ram * 1024,
        disk: selectedPlan.specs.disk,
        password: "auto-generated",
        sshKeyId: null,
        hourlyRate: pricing.total / 720, // Approximate hourly rate
        monthlyRate: pricing.total,
        bandwidth: config.bandwidth,
        enableBackup: false,
        enableMonitoring: true,
      };

      const response = await api.post("/vms/deploy", deployData);

      if (response?.data?.success === false) {
        throw new Error(response.data.message || "Deployment failed");
      }

      // Refresh balance after deployment
      await fetchWalletBalance();
      
      setSuccess(`${selectedPlan.name} deployed successfully! Redirecting...`);
      setTimeout(() => router.push("/vps"), 2000);
      
    } catch (err: any) {
      console.error("Deployment error:", err);
      setError(err.response?.data?.message || err.message || "Failed to deploy VM");
    } finally {
      setIsDeploying(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-[#080c14]">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="relative mx-auto w-14 h-14">
              <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
              <div className="absolute inset-0 rounded-full border-t-2 border-indigo-400 animate-spin" />
              <Rocket className="absolute inset-0 m-auto w-5 h-5 text-indigo-400" />
            </div>
            <p className="text-slate-500 text-sm tracking-wide">Loading deployment options…</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Main ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-[#080c14]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar />

        {/* Wallet Balance Bar */}
        <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-14 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-emerald-400" />
                  <span className="text-slate-400 text-sm">Wallet Balance:</span>
                  {isLoadingBalance ? (
                    <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
                  ) : (
                    <span className={`text-lg font-bold ${hasEnoughBalance ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {formatCurrency(walletBalance)}
                    </span>
                  )}
                </div>
                <button
                  onClick={fetchWalletBalance}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition"
                  title="Refresh balance"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex items-center gap-3">
                {!hasEnoughBalance && !isLoadingBalance && (
                  <div className="flex items-center gap-2 text-amber-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>Shortfall: {formatCurrency(shortfall)}</span>
                  </div>
                )}
                <button
                  onClick={() => router.push("/billing")}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition"
                >
                  <Plus className="w-4 h-4" />
                  Add Funds
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Ambient background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-indigo-600/4 rounded-full blur-[140px]" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-purple-600/4 rounded-full blur-[120px]" />
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(99,102,241,0.8) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        <main className="relative flex-1 px-4 sm:px-8 lg:px-14 py-10 space-y-14 max-w-7xl mx-auto w-full">

          {/* Header */}
          <header className="text-center space-y-5">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/8 border border-indigo-500/15">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-[11px] text-indigo-400 font-semibold tracking-[0.18em] uppercase">
                Cloud Infrastructure
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight text-white">
              Deploy a{" "}
              <span className="relative">
                <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                  Virtual Machine
                </span>
                <span className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-indigo-500/0 via-violet-500/60 to-purple-500/0" />
              </span>
            </h1>
            <p className="text-slate-500 text-sm max-w-lg mx-auto leading-relaxed">
              Enterprise-grade compute, provisioned in under 60 seconds.
              Pick your plan, region, and OS — we handle the rest.
            </p>
          </header>

          {/* ── Step 1: Billing ── */}
          <StepSection step="01" title="Billing Cycle">
            <BillingToggle
              billingCycle={config.billingCycle}
              onChange={(cycle: BillingCycle) =>
                setConfig((prev) => ({ ...prev, billingCycle: cycle }))
              }
            />
          </StepSection>

          {/* Alerts */}
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/8 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError(null)} className="hover:text-red-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          {success && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/8 border border-emerald-500/20 text-emerald-400 text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{success}</span>
              <button onClick={() => setSuccess(null)} className="hover:text-emerald-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Insufficient Balance Warning */}
          {insufficientBalance && !error && (
            <div className="flex items-center gap-4 p-5 rounded-2xl bg-amber-500/8 border border-amber-500/20">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-amber-400 font-medium mb-1">Insufficient Balance</p>
                <p className="text-amber-400/80 text-sm">
                  You need {formatCurrency(shortfall)} more to deploy this VM. 
                  Add funds to your wallet to continue.
                </p>
              </div>
              <button
                onClick={() => router.push("/billing")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium transition"
              >
                <Plus className="w-4 h-4" />
                Add Funds
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Step 2: Plans ── */}
          <StepSection step="02" title="Choose Your Plan">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isActive={config.planId === plan.id}
                  billingCycle={config.billingCycle}
                  onSelect={() => setConfig((prev) => ({ ...prev, planId: plan.id }))}
                />
              ))}
            </div>
          </StepSection>

          {/* ── Step 3: Region ── */}
          <StepSection step="03" title="Select Region">
            <LocationSelector
              locations={locations}
              selectedId={config.locationId}
              onSelect={(id) => setConfig((prev) => ({ ...prev, locationId: id }))}
            />
          </StepSection>

          {/* ── Step 4: OS ── */}
          <StepSection step="04" title="Operating System">
            <OSSelector
              operatingSystems={operatingSystems}
              selectedId={config.osId}
              onSelect={(id) => setConfig((prev) => ({ ...prev, osId: id }))}
            />
          </StepSection>

          {/* ── Step 5: Add-ons ── */}
          <StepSection step="05" title="Add-ons & Extras">
            <AddOns
              additionalIPs={config.additionalIPs}
              bandwidth={config.bandwidth}
              includedBandwidth={selectedPlan.specs.bandwidth}
              onIPsChange={(value) => setConfig((prev) => ({ ...prev, additionalIPs: value }))}
              onBandwidthChange={(value) => setConfig((prev) => ({ ...prev, bandwidth: value }))}
            />
          </StepSection>

          {/* ── Order Summary ── */}
          <OrderSummary
            isOpen={showOrderSummary}
            onToggle={() => setShowOrderSummary(!showOrderSummary)}
            plan={selectedPlan}
            billingCycle={config.billingCycle}
            additionalIPs={config.additionalIPs}
            bandwidth={config.bandwidth}
            pricing={pricing}
          />

          {/* ── Deploy CTA ── */}
          <div className="flex flex-col items-center gap-5 pt-2 pb-14">
            {/* Live price display */}
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-white tabular-nums">
                  {formatCurrency(pricing.total)}
                </span>
                <span className="text-slate-500 text-sm font-medium self-end pb-1">
                  {cycleSuffix(config.billingCycle)}
                </span>
              </div>
              <span className="text-[11px] text-slate-600">
                {formatCurrency(pricing.subtotal)} + 18% GST · {selectedPlan.name} plan
              </span>
            </div>

            {/* Deploy button */}
            <button
              onClick={handleDeploy}
              disabled={isDeploying || !!success || !hasEnoughBalance}
              className={`
                relative group px-16 py-4 rounded-2xl font-bold text-base
                transition-all duration-300 overflow-hidden
                disabled:opacity-50 disabled:cursor-not-allowed
                ${!isDeploying && !success && hasEnoughBalance ? "hover:scale-105 active:scale-95" : ""}
              `}
            >
              {/* Gradient background */}
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-[length:200%_100%] transition-all duration-500 group-hover:bg-right" />
              {/* Shine */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-[linear-gradient(105deg,transparent_20%,rgba(255,255,255,0.08)_50%,transparent_80%)]" />
              {/* Border glow */}
              <div className="absolute inset-0 rounded-2xl shadow-[0_0_40px_-8px_rgba(99,102,241,0.6)] group-hover:shadow-[0_0_60px_-8px_rgba(99,102,241,0.8)] transition-shadow duration-500" />
              <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10" />

              <span className="relative flex items-center gap-3 text-white">
                {isDeploying ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Deploying your VM…
                  </>
                ) : success ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Deployed!
                  </>
                ) : !hasEnoughBalance ? (
                  <>
                    <AlertCircle className="w-5 h-5" />
                    Insufficient Balance
                  </>
                ) : (
                  <>
                    <Rocket className="w-5 h-5" />
                    Deploy Now
                  </>
                )}
              </span>
            </button>

            {/* Quick Add Funds (shown when balance is low) */}
            {!hasEnoughBalance && !isLoadingBalance && (
              <button
                onClick={() => router.push("/billing")}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition border border-slate-700"
              >
                <CreditCard className="w-4 h-4" />
                Add funds to continue
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {/* Trust strip */}
            <div className="flex flex-wrap justify-center items-center gap-x-5 gap-y-2 text-[11px] text-slate-600 font-medium">
              {[
                { icon: ShieldCheck, label: "256-bit SSL" },
                { icon: Zap,         label: "~60s Activation" },
                { icon: Clock,       label: "Cancel Anytime" },
                { icon: Lock,        label: "Secure Checkout" },
                { icon: Calendar,    label: "No Hidden Fees" },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="flex items-center gap-1.5">
                  <Icon className="w-3 h-3" />
                  {label}
                </span>
              ))}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}

// ── Reusable numbered section wrapper ─────────────────────────────────────────
function StepSection({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-[9px] font-black tabular-nums tracking-[0.3em] text-indigo-500 uppercase">
          {step}
        </span>
        <div className="h-px w-6 bg-indigo-500/30" />
        <h2 className="text-xs font-semibold tracking-widest uppercase text-slate-400">{title}</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-slate-700/50 to-transparent" />
      </div>
      {children}
    </section>
  );
}