"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import api from "@/lib/api/auth";
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Wifi,
  Server,
  CheckCircle,
  AlertCircle,
  Loader2,
  Cloud,
  Shield,
  Terminal,
  Key,
  ShieldCheck,
  Globe,
  Wallet,
  Clock,
  Zap,
  RefreshCw,
  Info,
  DollarSign,
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronLeft,
  Activity,
  Database,
  Network,
  X,
  Plus,
  Search,
  Filter,
  Star,
  TrendingUp,
  Layers,
  
  Gauge,
  Rocket,
  Sparkles,
  ArrowRight,
  Circle,
  CircleCheck,
  CircleDollarSign,
  CreditCard,
  BadgeCheck,
  MapPin,
  Flag,
  Github,
  Chrome
} from "lucide-react";

interface DeploymentConfig {
  hostname: string;
  password: string;
  sshKeyId: string;
  location: string;
  os: string;
  cores: number;
  memory: number;
  disk: number;
  bandwidth: number;
  firewallGroup: string;
  userData: string;
  enableBackup: boolean;
  enableMonitoring: boolean;
}

interface Location {
  id: string;
  name: string;
  displayName: string;
  flag: string;
  country: string;
  city: string;
  latency: number;
  priceMultiplier: number;
  available: boolean;
  features: string[];
  status: {
    online: boolean;
    cpu: number;
    memory: { total: number; used: number; free: number; usagePercent: number };
    disk: { total: number; used: number; free: number; usagePercent: number };
  };
}

interface OS {
  id: string;
  name: string;
  volumeId: string;
  description?: string;
  category: "linux" | "windows";
  minDisk: number;
  minMemory: number;
  recommended: boolean;
  version: string;
  family: string;
  size: number;
  contentType: string;
}

interface SSHKey {
  id: string;
  name: string;
  fingerprint: string;
}

interface PricingBreakdown {
  hourly: number;
  monthly: number;
}

export default function DeployVM() {
  const router = useRouter();
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [walletBalance, setWalletBalance] = useState(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [availableOS, setAvailableOS] = useState<OS[]>([]);
  const [sshKeys, setSSHKeys] = useState<SSHKey[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedOS, setSelectedOS] = useState<OS | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pricing, setPricing] = useState<PricingBreakdown>({ hourly: 0, monthly: 0 });
  
  const [config, setConfig] = useState<DeploymentConfig>({
    hostname: "",
    password: "",
    sshKeyId: "",
    location: "",
    os: "",
    cores: 2,
    memory: 4,
    disk: 40,
    bandwidth: 5,
    firewallGroup: "default",
    userData: "",
    enableBackup: false,
    enableMonitoring: true
  });

  useEffect(() => {
    fetchInitialData();
    fetchWalletBalance();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [locationsRes, osRes, sshRes] = await Promise.all([
        api.get("/locations"),
        api.get("/os-templates"),
        api.get("/ssh-keys"),
      ]);

      const availableLocations = (locationsRes.data.locations || []).filter((l: Location) => l.available);
      setLocations(availableLocations);
      
      const validTemplates = (osRes.data.templates || []).filter((os: OS) => 
        (os.contentType === 'iso' || os.contentType === 'vztmpl') && 
        !os.id.includes('vm-')
      );
      setAvailableOS(validTemplates);
      setSSHKeys(sshRes.data.keys || []);

      if (availableLocations.length > 0) {
        setSelectedLocation(availableLocations[0]);
        setConfig(prev => ({ ...prev, location: availableLocations[0].id }));
      }

      if (validTemplates.length > 0) {
        const ubuntu = validTemplates.find((os: OS) => os.name.toLowerCase().includes('ubuntu'));
        const defaultOS = ubuntu || validTemplates[0];
        setSelectedOS(defaultOS);
        setConfig(prev => ({ ...prev, os: defaultOS.id }));
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
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

  useEffect(() => {
    const location = locations.find(l => l.id === config.location);
    const basePrice = 0.12;
    const cpuPrice = config.cores * 0.10;
    const ramPrice = config.memory * 0.08;
    const diskPrice = config.disk * 0.012;
    const backupPrice = config.enableBackup ? 0.025 : 0;
    const locationMultiplier = location?.priceMultiplier || 1;
    
    const subtotal = (basePrice + cpuPrice + ramPrice + diskPrice + backupPrice) * locationMultiplier;
    setPricing({
      hourly: parseFloat(subtotal.toFixed(4)),
      monthly: parseFloat((subtotal * 720).toFixed(2))
    });
  }, [config.cores, config.memory, config.disk, config.location, config.enableBackup, locations]);

  const validateHostname = (hostname: string): boolean => {
    const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
    return hostnameRegex.test(hostname) && hostname.length <= 63;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 GB';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

 // Update the handleDeploy function in your DeployVM component

const handleDeploy = async () => {
  if (!config.hostname) {
    setError("Please enter a hostname");
    return;
  }
  if (!validateHostname(config.hostname)) {
    setError("Invalid hostname. Use only letters, numbers, and hyphens.");
    return;
  }
  
  if (!config.password && !config.sshKeyId) {
    setError("Please enter a root password or select an SSH key");
    return;
  }
  if (config.password && config.password.length < 8) {
    setError("Password must be at least 8 characters long");
    return;
  }

  // Check if wallet has sufficient balance
  const requiredBalance = pricing.monthly; // Minimum required for 1 month
  if (walletBalance < requiredBalance) {
    setError(`Insufficient balance. Required: $${requiredBalance.toFixed(2)}, Available: $${walletBalance.toFixed(2)}`);
    return;
  }

  setIsDeploying(true);
  setError(null);

  try {
    // First, check balance and reserve funds
    const checkResponse = await api.post("/vms/check-balance", {
      monthlyCost: pricing.monthly,
      hourlyRate: pricing.hourly
    });

    if (!checkResponse.data.sufficient) {
      setError(`Insufficient balance. Required: $${checkResponse.data.required.toFixed(2)}, Available: $${checkResponse.data.available.toFixed(2)}`);
      setIsDeploying(false);
      return;
    }

    // Deploy the VM
    const response = await api.post("/vms/deploy", {
      hostname: config.hostname,
      password: config.password,
      sshKeyId: config.sshKeyId || null,
      location: config.location,
      os: config.os,
      cores: config.cores,
      memory: config.memory * 1024, // Convert to MB
      disk: config.disk,
      bandwidth: config.bandwidth,
      firewallGroup: config.firewallGroup,
      userData: config.userData || null,
      enableBackup: config.enableBackup,
      enableMonitoring: config.enableMonitoring,
      hourlyRate: pricing.hourly,
      monthlyRate: pricing.monthly
    });

    // Update wallet balance after successful deployment
    const balanceRes = await api.get("/wallet/balance");
    setWalletBalance(parseFloat(balanceRes.data.balance) || 0);

    setSuccess(`VM "${config.hostname}" deployed successfully!`);
    setTimeout(() => router.push("/vps"), 2000);
  } catch (err: any) {
    setError(err.response?.data?.message || "Failed to deploy VM");
  } finally {
    setIsDeploying(false);
  }
};

  const steps = [
    { number: 1, title: "Choose OS & Location", icon: <Globe className="w-5 h-5" /> },
    { number: 2, title: "Configure Instance", icon: <Settings className="w-5 h-5" /> },
    { number: 3, title: "Review & Launch", icon: <CheckCircle className="w-5 h-5" /> }
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-[#0A0E27]">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-[#3B82F6] animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading deployment options...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0A0E27]">
      <Sidebar />
      <div className="flex-1">
        <Topbar />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">Launch an instance</h1>
                <p className="text-slate-400 mt-1">Create and configure your virtual machine</p>
              </div>
              <div className="flex items-center gap-4 px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-700">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-400 text-sm">Balance:</span>
                <span className="text-white font-bold">${walletBalance.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="mb-12">
            <div className="flex items-center justify-between max-w-2xl">
              {steps.map((step, idx) => (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      currentStep >= step.number 
                        ? "bg-[#3B82F6] text-white shadow-lg shadow-blue-500/20" 
                        : "bg-slate-800 text-slate-500"
                    }`}>
                      {currentStep > step.number ? <CheckCircle className="w-5 h-5" /> : step.number}
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-xs text-slate-500">Step {step.number}</p>
                      <p className="text-sm text-white font-medium">{step.title}</p>
                    </div>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-6 rounded-full transition-all ${
                      currentStep > step.number ? "bg-[#3B82F6]" : "bg-slate-700"
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-between text-red-400">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError(null)} className="hover:text-red-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-emerald-400">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5" />
                <span>{success}</span>
              </div>
            </div>
          )}

          {/* Step 1: Choose OS & Location */}
          {currentStep === 1 && (
            <div className="space-y-8">
              {/* OS Selection */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">1. Choose operating system</h2>
                  <span className="text-xs text-slate-500">Recommended</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {availableOS.slice(0, 8).map((os) => (
                    <button
                      key={os.id}
                      onClick={() => {
                        setSelectedOS(os);
                        setConfig(prev => ({ ...prev, os: os.id }));
                      }}
                      className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                        config.os === os.id
                          ? "border-[#3B82F6] bg-[#3B82F6]/10 shadow-lg shadow-blue-500/20"
                          : "border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                          <Terminal className={`w-5 h-5 ${os.category === "linux" ? "text-emerald-400" : "text-blue-400"}`} />
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium text-sm truncate">{os.name.replace(/\.iso$|\.tar\.gz$|\.tar\.zst$/, '').split('-').slice(0, 3).join('-')}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-500">{os.family}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                              {formatBytes(os.size)}
                            </span>
                          </div>
                        </div>
                      </div>
                      {config.os === os.id && (
                        <CheckCircle className="absolute top-3 right-3 w-4 h-4 text-[#3B82F6]" />
                      )}
                    </button>
                  ))}
                </div>
                {selectedOS && (
                  <div className="mt-4 p-3 bg-slate-800/30 rounded-lg">
                    <p className="text-sm text-slate-400">
                      <span className="font-medium text-white">{selectedOS.name.replace(/\.iso$|\.tar\.gz$|\.tar\.zst$/, '')}</span> — 
                      Requires minimum {selectedOS.minDisk}GB storage and {selectedOS.minMemory}GB RAM
                    </p>
                  </div>
                )}
              </div>

              {/* Location Selection */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">2. Choose region / location</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {locations.map((loc) => (
                    <button
                      key={loc.id}
                      onClick={() => {
                        setSelectedLocation(loc);
                        setConfig(prev => ({ ...prev, location: loc.id }));
                      }}
                      className={`relative p-5 rounded-xl border-2 transition-all text-left ${
                        config.location === loc.id
                          ? "border-[#3B82F6] bg-[#3B82F6]/5"
                          : "border-slate-700 bg-slate-800/30 hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{loc.flag || "🌍"}</span>
                          <div>
                            <p className="text-white font-semibold">{loc.displayName || loc.name}</p>
                            <p className="text-xs text-slate-400">{loc.city}, {loc.country}</p>
                          </div>
                        </div>
                        {config.location === loc.id && (
                          <CircleCheck className="w-5 h-5 text-[#3B82F6]" />
                        )}
                      </div>
                      <div className="mt-3 flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3 h-3" />
                          {loc.latency}ms
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Activity className="w-3 h-3" />
                          {loc.status.cpu.toFixed(0)}% CPU
                        </span>
                        {loc.priceMultiplier !== 1 && (
                          <span className="text-amber-400">+{((loc.priceMultiplier - 1) * 100)}%</span>
                        )}
                      </div>
                      <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${Math.min(loc.status.memory.usagePercent, 100)}%` }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Configure Instance */}
          {currentStep === 2 && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Configuration */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Hostname */}
                  <div className="bg-slate-800/30 rounded-xl border border-slate-700 p-6">
                    <label className="block text-white font-medium mb-2">
                      Instance name / Hostname
                    </label>
                    <input
                      type="text"
                      value={config.hostname}
                      onChange={(e) => {
                        const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                        setConfig({ ...config, hostname: value });
                      }}
                      placeholder="my-instance-01"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#3B82F6] font-mono"
                    />
                    <p className="text-xs text-slate-500 mt-2">Lowercase letters, numbers, and hyphens only</p>
                  </div>

                  {/* Authentication */}
                  <div className="bg-slate-800/30 rounded-xl border border-slate-700 p-6">
                    <label className="block text-white font-medium mb-3">
                      Authentication
                    </label>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-slate-400 text-sm mb-1">Root password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <input
                            type={showPassword ? "text" : "password"}
                            value={config.password}
                            onChange={(e) => setConfig({ ...config, password: e.target.value })}
                            placeholder="Enter secure password"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-10 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#3B82F6]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-slate-400 text-sm mb-1">SSH key (optional)</label>
                        <div className="flex gap-2">
                          <select
                            value={config.sshKeyId}
                            onChange={(e) => setConfig({ ...config, sshKeyId: e.target.value })}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#3B82F6]"
                          >
                            <option value="">None (use password)</option>
                            {sshKeys.map(key => (
                              <option key={key.id} value={key.id}>
                                {key.name} - {key.fingerprint?.slice(0, 16)}...
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => router.push("/ssh-keys")}
                            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm transition"
                          >
                            Manage
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hardware Configuration */}
                  <div className="bg-slate-800/30 rounded-xl border border-slate-700 p-6">
                    <h3 className="text-white font-medium mb-4">Hardware configuration</h3>
                    <div className="space-y-5">
                      {/* vCPUs */}
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="flex items-center gap-2 text-slate-300 text-sm">
                            <Cpu className="w-4 h-4 text-[#3B82F6]" />
                            vCPUs
                          </label>
                          <span className="text-white font-medium">{config.cores} cores</span>
                        </div>
                        <div className="flex gap-2">
                          {[1, 2, 4, 8, 12, 16].map(cores => (
                            <button
                              key={cores}
                              onClick={() => setConfig({ ...config, cores })}
                              className={`flex-1 py-2 rounded-lg transition-all ${
                                config.cores === cores
                                  ? "bg-[#3B82F6] text-white"
                                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                              }`}
                            >
                              {cores}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* RAM */}
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="flex items-center gap-2 text-slate-300 text-sm">
                            <MemoryStick className="w-4 h-4 text-[#3B82F6]" />
                            Memory (RAM)
                          </label>
                          <span className="text-white font-medium">{config.memory} GB</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {[1, 2, 4, 8, 16, 24, 32].map(ram => {
                            const minMemory = selectedOS?.minMemory || 1;
                            const isDisabled = ram < minMemory;
                            return (
                              <button
                                key={ram}
                                onClick={() => !isDisabled && setConfig({ ...config, memory: ram })}
                                disabled={isDisabled}
                                className={`px-4 py-2 rounded-lg transition-all ${
                                  config.memory === ram
                                    ? "bg-[#3B82F6] text-white"
                                    : isDisabled
                                      ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                }`}
                              >
                                {ram} GB
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Storage */}
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="flex items-center gap-2 text-slate-300 text-sm">
                            <HardDrive className="w-4 h-4 text-[#3B82F6]" />
                            Storage
                          </label>
                          <span className="text-white font-medium">{config.disk} GB NVMe</span>
                        </div>
                        <input
                          type="range"
                          min={Math.max(20, selectedOS?.minDisk || 20)}
                          max={500}
                          step={10}
                          value={config.disk}
                          onChange={(e) => setConfig({ ...config, disk: parseInt(e.target.value) })}
                          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#3B82F6]"
                        />
                        <div className="flex justify-between text-xs text-slate-500 mt-1">
                          <span>{Math.max(20, selectedOS?.minDisk || 20)} GB</span>
                          <span>500 GB</span>
                        </div>
                      </div>

                      {/* Bandwidth */}
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="flex items-center gap-2 text-slate-300 text-sm">
                            <Wifi className="w-4 h-4 text-[#3B82F6]" />
                            Bandwidth
                          </label>
                          <span className="text-white font-medium">{config.bandwidth} TB/month</span>
                        </div>
                        <select
                          value={config.bandwidth}
                          onChange={(e) => setConfig({ ...config, bandwidth: parseInt(e.target.value) })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#3B82F6]"
                        >
                          <option value={5}>5 TB - Included</option>
                          <option value={10}>10 TB - +$10/month</option>
                          <option value={20}>20 TB - +$25/month</option>
                          <option value={50}>50 TB - +$70/month</option>
                          <option value={100}>100 TB - +$150/month</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Advanced Options */}
                  <details className="bg-slate-800/30 rounded-xl border border-slate-700">
                    <summary className="cursor-pointer p-6 text-white font-medium hover:text-[#3B82F6] transition">
                      Advanced options
                    </summary>
                    <div className="px-6 pb-6 space-y-4">
                      <div>
                        <label className="block text-slate-300 text-sm mb-2">Cloud-Init user data</label>
                        <textarea
                          value={config.userData}
                          onChange={(e) => setConfig({ ...config, userData: e.target.value })}
                          rows={4}
                          placeholder="#cloud-config
packages:
  - nginx
  - docker.io"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-[#3B82F6]"
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.enableBackup}
                            onChange={(e) => setConfig({ ...config, enableBackup: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-[#3B82F6]"
                          />
                          <span className="text-slate-300 text-sm">Enable automated backups (+$0.025/hour)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.enableMonitoring}
                            onChange={(e) => setConfig({ ...config, enableMonitoring: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-[#3B82F6]"
                          />
                          <span className="text-slate-300 text-sm">Enable detailed monitoring (free)</span>
                        </label>
                      </div>
                    </div>
                  </details>
                </div>

                {/* Right Column - Pricing Summary */}
                <div className="lg:col-span-1">
                  <div className="sticky top-24 bg-gradient-to-br from-[#1E293B] to-[#0F172A] rounded-xl border border-slate-700 p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <DollarSign className="w-5 h-5 text-emerald-400" />
                      <h3 className="text-white font-semibold">Estimated cost</h3>
                    </div>
                    
                    <div className="space-y-3 pb-4 border-b border-slate-700">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Compute ({config.cores} vCPU, {config.memory} GB)</span>
                        <span className="text-white">${(config.cores * 0.10 + config.memory * 0.08).toFixed(2)}/hr</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Storage ({config.disk} GB NVMe)</span>
                        <span className="text-white">${(config.disk * 0.012).toFixed(2)}/hr</span>
                      </div>
                      {config.enableBackup && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Backups</span>
                          <span className="text-white">$0.025/hr</span>
                        </div>
                      )}
                      {selectedLocation?.priceMultiplier !== 1 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Region ({selectedLocation?.displayName})</span>
                          <span className="text-white">x{selectedLocation?.priceMultiplier}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-300 font-medium">Hourly total</span>
                        <span className="text-2xl font-bold text-white">${pricing.hourly}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 text-sm">Monthly estimate</span>
                        <span className="text-[#3B82F6] font-medium">${pricing.monthly}</span>
                      </div>
                      <div className="mt-4 p-3 bg-slate-900/50 rounded-lg">
                        <p className="text-xs text-slate-400 text-center">
                          Free tier included. You are charged only for what you use beyond free tier limits.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review & Launch */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <BadgeCheck className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-400">Your instance is ready to launch. Please review your configuration.</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Configuration Review */}
                <div className="space-y-4">
                  <div className="bg-slate-800/30 rounded-xl border border-slate-700 p-5">
                    <h3 className="text-white font-semibold mb-3">Instance details</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between py-2 border-b border-slate-700">
                        <span className="text-slate-400">Name</span>
                        <span className="text-white font-mono">{config.hostname}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-700">
                        <span className="text-slate-400">Operating system</span>
                        <span className="text-white">{selectedOS?.name.replace(/\.iso$|\.tar\.gz$|\.tar\.zst$/, '')}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-700">
                        <span className="text-slate-400">Region</span>
                        <span className="text-white">{selectedLocation?.displayName} ({selectedLocation?.city})</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-700">
                        <span className="text-slate-400">Authentication</span>
                        <span className="text-white">{config.sshKeyId ? "SSH Key" : "Password"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-800/30 rounded-xl border border-slate-700 p-5">
                    <h3 className="text-white font-semibold mb-3">Hardware</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between py-2 border-b border-slate-700">
                        <span className="text-slate-400">vCPUs</span>
                        <span className="text-white">{config.cores} cores</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-700">
                        <span className="text-slate-400">Memory</span>
                        <span className="text-white">{config.memory} GB</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-700">
                        <span className="text-slate-400">Storage</span>
                        <span className="text-white">{config.disk} GB NVMe SSD</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-slate-400">Bandwidth</span>
                        <span className="text-white">{config.bandwidth} TB / month</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cost Summary */}
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] rounded-xl border border-slate-700 p-6">
                    <h3 className="text-white font-semibold mb-4">Cost summary</h3>
                    <div className="space-y-3 pb-4 border-b border-slate-700">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Compute</span>
                        <span className="text-white">${(config.cores * 0.10 + config.memory * 0.08).toFixed(4)}/hr</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Storage</span>
                        <span className="text-white">${(config.disk * 0.012).toFixed(4)}/hr</span>
                      </div>
                      {config.enableBackup && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Backups</span>
                          <span className="text-white">$0.0250/hr</span>
                        </div>
                      )}
                    </div>
                    <div className="pt-4">
                      <div className="flex justify-between mb-2">
                        <span className="text-slate-300">Hourly total</span>
                        <span className="text-2xl font-bold text-white">${pricing.hourly}</span>
                      </div>
                      <div className="flex justify-between mb-4">
                        <span className="text-slate-500 text-sm">Monthly estimate</span>
                        <span className="text-[#3B82F6] font-medium">${pricing.monthly}</span>
                      </div>
                      <div className="p-3 bg-emerald-500/10 rounded-lg">
                        <p className="text-xs text-emerald-400 text-center">
                          Free tier: 750 hours/month included. You are charged for usage beyond free tier.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-800/30 rounded-xl border border-slate-700 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 text-sm">Your current balance</p>
                        <p className="text-2xl font-bold text-white">${walletBalance.toFixed(2)}</p>
                      </div>
                      {walletBalance < pricing.monthly * 1.2 && (
                        <div className="text-right">
                          <p className="text-red-400 text-xs">Insufficient balance</p>
                          <p className="text-slate-500 text-xs">Need ${(pricing.monthly * 1.2 - walletBalance).toFixed(2)} more</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between gap-4 mt-8 pt-6 border-t border-slate-700">
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-6 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            
            {currentStep < 3 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={currentStep === 1 && (!config.location || !config.os)}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white text-sm font-medium transition flex items-center gap-2 ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleDeploy}
                disabled={isDeploying || walletBalance < pricing.monthly * 1.2}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-sm font-medium transition flex items-center gap-2 ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeploying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Launching instance...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4" />
                    Launch instance
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Missing Settings component
function Settings(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}