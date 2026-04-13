"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import api from "@/lib/api/auth";
import {
  Cpu, MemoryStick, HardDrive, Wifi, Power, RotateCw, 
  Trash2, Terminal, Copy, Eye, EyeOff, Server, MapPin,
  Clock, DollarSign, Activity, Zap, Shield, Network,
  Play, AlertCircle, CheckCircle, X, Loader2,
  TrendingUp, ArrowUpDown, Database, Cloud, Lock,
  Key, User, Calendar, Globe, ChevronRight
} from "lucide-react";

interface VMData {
  id: number;
  vmid: number;
  name: string;
  status: string;
  vcpu: number;
  ram_gb: number;
  ssd_gb: number;
  uptime?: number;
  node: string;
  plan_type: string;
  created_at: string;
  hourly_rate: number;
  ip_addresses?: string[];
  disk_read?: number;
  disk_write?: number;
  net_in?: number;
  net_out?: number;
}

interface VMStats {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_in: number;
  network_out: number;
  disk_read?: number;   //  add
  disk_write?: number;  //  add
}

export default function VPSDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vmid = params.vmid ? parseInt(params.vmid as string) : null;
  
  const [activeTab, setActiveTab] = useState("overview");
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vmData, setVmData] = useState<VMData | null>(null);
  const [vmStats, setVmStats] = useState<VMStats | null>(null);
  const [actionStates, setActionStates] = useState<Record<string, "idle" | "loading" | "success" | "error">>({
    start: "idle", stop: "idle", reboot: "idle", destroy: "idle",
  });
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [showDestroyConfirm, setShowDestroyConfirm] = useState(false);

  // Fetch VM details
  const fetchVMDetails = useCallback(async () => {
    if (!vmid) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/vms/${vmid}`);
      const data = response.data;
      
      if (data.success !== false) {
        setVmData(data.vm || data);
      } else {
        throw new Error(data.message || "Failed to fetch VM details");
      }
    } catch (err: any) {
      console.error("Failed to fetch VM details:", err);
      setError(err.response?.data?.message || "Failed to load VM details");
    } finally {
      setIsLoading(false);
    }
  }, [vmid]);

  // Fetch VM stats
  const fetchVMStats = useCallback(async () => {
    if (!vmid) return;
    
    setIsLoadingStats(true);
    
    try {
      const response = await api.get(`/vms/${vmid}/stats`);
      const data = response.data;
      
      if (data.success !== false) {
        setVmStats(data.stats || data);
      }
    } catch (err) {
      console.error("Failed to fetch VM stats:", err);
    } finally {
      setIsLoadingStats(false);
    }
  }, [vmid]);

  useEffect(() => {
    if (vmid) {
      fetchVMDetails();
      fetchVMStats();
      
      // Refresh stats every 10 seconds
      const interval = setInterval(fetchVMStats, 10000);
      return () => clearInterval(interval);
    }
  }, [vmid, fetchVMDetails, fetchVMStats]);

  const runAction = async (action: string) => {
    if (!vmid) return;
    
    setActionStates(prev => ({ ...prev, [action]: "loading" }));
    setActionMessage(null);

    try {
      let endpoint = "";
      let method = "POST";
      
      switch (action) {
        case "start":
          endpoint = `/vms/${vmid}/start`;
          break;
        case "stop":
          endpoint = `/vms/${vmid}/stop`;
          break;
        case "reboot":
          endpoint = `/vms/${vmid}/restart`;
          break;
        case "destroy":
          endpoint = `/vms/${vmid}`;
          method = "DELETE";
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      
      await api.request({ method, url: endpoint });
      
      setActionStates(prev => ({ ...prev, [action]: "success" }));
      
      const labels: Record<string, string> = {
        stop: "VM is stopping", 
        reboot: "VM is restarting",
        start: "VM is starting", 
        destroy: "VM has been destroyed",
      };
      
      setActionMessage({ type: "success", text: labels[action] });
      
      setTimeout(() => {
        fetchVMDetails();
        fetchVMStats();
      }, 2000);
      
      if (action === "destroy") {
        setTimeout(() => router.push("/"), 3000);
      }
      
    } catch (err: any) {
      console.error("Action error:", err);
      setActionStates(prev => ({ ...prev, [action]: "error" }));
      setActionMessage({ type: "error", text: err.response?.data?.message || "Action failed" });
    } finally {
      setTimeout(() => setActionStates(prev => ({ ...prev, [action]: "idle" })), 3000);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return "0 MB";
    const mb = bytes / (1024 * 1024);
    if (mb > 1024) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(2)} MB`;
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return "N/A";
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  if (!vmid) {
    return (
      <div className="flex min-h-screen bg-[#0A0E27]">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Topbar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">Invalid VM ID</p>
              <button onClick={() => router.push("/")} className="mt-4 px-4 py-2 bg-indigo-600 rounded-lg text-white">
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-[#0A0E27]">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Topbar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Loading VM details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !vmData) {
    return (
      <div className="flex min-h-screen bg-[#0A0E27]">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Topbar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md mx-auto p-6">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <p className="text-slate-400 text-lg mb-2">Failed to Load VM</p>
              <p className="text-slate-500 text-sm">{error}</p>
              <button 
                onClick={fetchVMDetails}
                className="mt-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const vps = {
    name: vmData?.name || `VM ${vmid}`,
    ip: vmData?.ip_addresses?.[0] || "No IP assigned",
    status: vmData?.status === "running" ? "Running" : vmData?.status === "stopped" ? "Stopped" : "Unknown",
    statusCode: vmData?.status,
    created_at: vmData?.created_at,
    cpu: vmStats?.cpu_usage?.toFixed(1) || "0",
    cpuCores: vmData?.vcpu || 0,
    ram: vmData?.ram_gb || 0,
    ramTotal: vmData?.ram_gb || 0,
    disk: vmStats?.disk_usage || 0,
    diskTotal: vmData?.ssd_gb || 0,
    bandwidthIn: formatBytes(vmStats?.network_in || 0),
    bandwidthOut: formatBytes(vmStats?.network_out || 0),
    specs: `${vmData?.vcpu || 0} cores / ${vmData?.ram_gb || 0} GB RAM / ${vmData?.ssd_gb || 0} GB SSD`,
    location: "Frankfurt, Germany",
    pricing: `$${vmData?.hourly_rate || 0}/hr`,
    uptime: formatUptime(vmData?.uptime),
    diskRead: formatBytes(vmStats?.disk_read || 0),
    diskWrite: formatBytes(vmStats?.disk_write || 0),
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "metrics", label: "Metrics", icon: TrendingUp },
    { id: "networking", label: "Networking", icon: Network },
    { id: "storage", label: "Storage", icon: Database },
  ];

  const StatCard = ({ label, value, unit, sub, color, percent, icon: Icon }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-slate-600/50 transition-all duration-300 hover:shadow-xl hover:shadow-black/20"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-2xl" />
      <div className="relative">
        <div className="flex justify-between items-start mb-4">
          <span className="text-slate-400 text-sm font-medium tracking-wide uppercase">{label}</span>
          <Icon className="w-5 h-5 text-slate-500 group-hover:text-slate-400 transition-colors" />
        </div>
        <div className="flex items-baseline gap-1 mb-4">
          <span className="text-4xl font-bold text-white tracking-tight">{value}</span>
          {unit && <span className="text-slate-400 text-sm">{unit}</span>}
        </div>
        <div className="relative">
          <div className="w-full bg-slate-700/50 rounded-full h-2 mb-3 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ${color}`} style={{ width: `${Math.min(percent, 100)}%` }} />
          </div>
        </div>
        <p className="text-slate-500 text-xs font-medium">{sub}</p>
      </div>
    </motion.div>
  );

  const ActionButton = ({ action, label, icon: Icon, className, disabled = false }: any) => {
    const state = actionStates[action];
    
    return (
      <button
        disabled={disabled || state === "loading"}
        onClick={() => action === "destroy" ? setShowDestroyConfirm(true) : runAction(action)}
        className={`relative overflow-hidden px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {state === "loading" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : state === "success" ? (
          <CheckCircle className="w-4 h-4" />
        ) : (
          <Icon className="w-4 h-4" />
        )}
        <span>{label}</span>
      </button>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#0A0E27]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar />
        
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto p-6 lg:p-8">
            {/* Animated background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            {/* Action Message */}
            <AnimatePresence>
              {actionMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                    actionMessage.type === "success"
                      ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                      : actionMessage.type === "info"
                      ? "bg-blue-500/10 border border-blue-500/30 text-blue-400"
                      : "bg-red-500/10 border border-red-500/30 text-red-400"
                  }`}
                >
                  {actionMessage.type === "success" ? <CheckCircle className="w-5 h-5" /> : 
                   actionMessage.type === "info" ? <AlertCircle className="w-5 h-5" /> : 
                   <AlertCircle className="w-5 h-5" />}
                  <span className="text-sm flex-1">{actionMessage.text}</span>
                  <button onClick={() => setActionMessage(null)}>✕</button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Header Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 mb-6"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-2xl" />
              
              <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <Server className="w-8 h-8 text-white" />
                    </div>
                    <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
                      vps.statusCode === "running" ? "bg-emerald-500 animate-pulse" : 
                      vps.statusCode === "stopped" ? "bg-red-500" : "bg-yellow-500"
                    }`} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">{vps.name}</h1>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Network className="w-3 h-3 text-slate-400" />
                        <code className="text-slate-300 text-sm font-mono">{vps.ip}</code>
                        <button onClick={() => handleCopy(vps.ip)} className="text-slate-500 hover:text-slate-300 transition">
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
                        vps.statusCode === "running" ? "bg-emerald-500/10 border border-emerald-500/20" :
                        vps.statusCode === "stopped" ? "bg-red-500/10 border border-red-500/20" :
                        "bg-yellow-500/10 border border-yellow-500/20"
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          vps.statusCode === "running" ? "bg-emerald-500 animate-pulse" : 
                          vps.statusCode === "stopped" ? "bg-red-500" : "bg-yellow-500"
                        }`} />
                        <span className={`text-xs font-medium ${
                          vps.statusCode === "running" ? "text-emerald-400" :
                          vps.statusCode === "stopped" ? "text-red-400" : "text-yellow-400"
                        }`}>
                          {vps.status}
                          {vps.statusCode === "running" && vps.uptime && ` • Uptime: ${vps.uptime}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <ActionButton action="start" label="Start" icon={Play} className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={vps.statusCode === "running"} />
                  <ActionButton action="stop" label="Stop" icon={Power} className="bg-slate-700 hover:bg-slate-600 text-slate-200" disabled={vps.statusCode !== "running"} />
                  <ActionButton action="reboot" label="Restart" icon={RotateCw} className="bg-slate-700 hover:bg-slate-600 text-slate-200" disabled={vps.statusCode !== "running"} />
                  <ActionButton action="destroy" label="Destroy" icon={Trash2} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30" />
                </div>
              </div>
            </motion.div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
              <StatCard 
                label="CPU Usage" value={vps.cpu} unit="%" 
                sub={`${vps.cpuCores} Cores Available`} 
                color="bg-gradient-to-r from-indigo-500 to-purple-500" 
                percent={parseFloat(vps.cpu)} icon={Cpu} 
              />
              <StatCard 
                label="Memory" value={vps.ram.toString()} unit="GB" 
                sub={`of ${vps.ramTotal} GB Used (${((vps.ram / vps.ramTotal) * 100).toFixed(1)}%)`} 
                color="bg-gradient-to-r from-violet-500 to-purple-500" 
                percent={(vps.ram / vps.ramTotal) * 100} icon={MemoryStick} 
              />
              <StatCard 
                label="Storage" value={vps.disk.toString()} unit="GB" 
                sub={`of ${vps.diskTotal} GB Used (${((vps.disk / vps.diskTotal) * 100).toFixed(1)}%)`} 
                color="bg-gradient-to-r from-amber-500 to-orange-500" 
                percent={(vps.disk / vps.diskTotal) * 100} icon={HardDrive} 
              />
              <StatCard 
                label="Network" value={vps.bandwidthIn} 
                sub={`In: ${vps.bandwidthIn} / Out: ${vps.bandwidthOut}`} 
                color="bg-gradient-to-r from-cyan-500 to-blue-500" 
                percent={50} icon={Wifi} 
              />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-1 w-fit mb-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button 
                    key={tab.id} 
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                      activeTab === tab.id 
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20" 
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Server Specs */}
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
                  <h2 className="text-sm font-semibold text-slate-300 tracking-wide uppercase flex items-center gap-2 mb-4">
                    <Server className="w-4 h-4" />
                    Server Specifications
                  </h2>
                  <div className="space-y-4">
                    {[
                      { icon: Cpu, label: "vCPUs", value: `${vps.cpuCores} cores` },
                      { icon: MemoryStick, label: "RAM", value: `${vps.ramTotal} GB` },
                      { icon: HardDrive, label: "Storage", value: `${vps.diskTotal} GB SSD` },
                      { icon: Activity, label: "Uptime", value: vps.uptime },
                      { icon: HardDrive, label: "Disk Read", value: vps.diskRead },
                      { icon: HardDrive, label: "Disk Write", value: vps.diskWrite },
                      { icon: Calendar, label: "Created", value: formatDate(vps.created_at) },
                      { icon: DollarSign, label: "Hourly Rate", value: vps.pricing },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-400 text-sm">{label}</span>
                        </div>
                        <span className="text-white text-sm font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Access & Billing */}
                <div className="space-y-6">
                  {/* Access Credentials */}
                  <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
                    <h2 className="text-sm font-semibold text-slate-300 tracking-wide uppercase flex items-center gap-2 mb-4">
                      <Shield className="w-4 h-4" />
                      Access Credentials
                    </h2>
                    <div className="space-y-4">
                      <div className="bg-slate-800/50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Network className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-300 text-sm">IP Address</span>
                          </div>
                          <button onClick={() => handleCopy(vps.ip)} className="text-indigo-400 hover:text-indigo-300 text-xs">
                            {copied ? "Copied!" : "Copy"}
                          </button>
                        </div>
                        <code className="text-white font-mono text-sm">{vps.ip}</code>
                      </div>
                      
                      <div className="bg-slate-800/50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Key className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-300 text-sm">Root Password</span>
                          </div>
                          <button onClick={() => setShowPassword(!showPassword)} className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1">
                            {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            {showPassword ? "Hide" : "Show"}
                          </button>
                        </div>
                        <p className="text-white font-mono text-sm">{showPassword ? "Password sent to email" : "••••••••••"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Billing Summary */}
                  <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
                    <h2 className="text-sm font-semibold text-slate-300 tracking-wide uppercase flex items-center gap-2 mb-4">
                      <DollarSign className="w-4 h-4" />
                      Billing Summary
                    </h2>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-300 text-sm">Hourly Rate</span>
                        </div>
                        <span className="text-white font-bold">{vps.pricing}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl border border-indigo-500/20">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-indigo-400" />
                          <span className="text-slate-300 text-sm">Estimated Monthly</span>
                        </div>
                        <span className="text-white font-bold text-lg">
                          ${(vmData?.hourly_rate || 0 * 720).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab !== "overview" && (
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-16 flex flex-col items-center justify-center text-slate-500 space-y-4">
                <TrendingUp className="w-12 h-12 text-slate-600" />
                <p className="text-lg font-medium">{tabs.find(t => t.id === activeTab)?.label} — Coming Soon</p>
                <p className="text-sm">We're working on bringing you more insights and controls</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Destroy Confirm Modal */}
      <AnimatePresence>
        {showDestroyConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-500/10 rounded-xl">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="text-white font-bold text-lg">Destroy VM?</h3>
              </div>
              <p className="text-slate-300 text-sm mb-6">
                This will permanently delete <span className="text-white font-semibold">{vps.name}</span> and all its data.
                <span className="block mt-2 text-red-400">This action cannot be undone.</span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDestroyConfirm(false); runAction("destroy"); }}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition"
                >
                  Yes, Destroy
                </button>
                <button
                  onClick={() => setShowDestroyConfirm(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}