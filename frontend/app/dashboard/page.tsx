"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import VPSCard from "../components/VPScard";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import api from "@/lib/api/auth";
import { Plus, Server, Activity, Zap, Loader2, AlertCircle, CheckCircle, Clock, Cpu, HardDrive, MemoryStick, Wifi, Rocket, Sparkles, TrendingUp, Shield, Globe } from "lucide-react";

interface VM {
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
}

interface Stats {
  total: number;
  running: number;
  stopped: number;
  totalCPU: number;
  totalRAM: number;
  totalDisk: number;
}

export default function Home() {
  const router = useRouter();
  const [vms, setVms] = useState<VM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    running: 0,
    stopped: 0,
    totalCPU: 0,
    totalRAM: 0,
    totalDisk: 0,
  });

  // Fetch all VMs
  const fetchVMs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get("/vms");
      const data = response.data;
      
      if (data.success !== false) {
        const vmList = data.data || data.vms || [];
        setVms(vmList);
        
        // Calculate stats
        const running = vmList.filter((vm: VM) => vm.status === "running").length;
        const stopped = vmList.filter((vm: VM) => vm.status === "stopped").length;
        const totalCPU = vmList.reduce((sum: number, vm: VM) => sum + (vm.vcpu || 0), 0);
        const totalRAM = vmList.reduce((sum: number, vm: VM) => sum + (vm.ram_gb || 0), 0);
        const totalDisk = vmList.reduce((sum: number, vm: VM) => sum + (vm.ssd_gb || 0), 0);
        
        setStats({
          total: vmList.length,
          running,
          stopped,
          totalCPU,
          totalRAM,
          totalDisk,
        });
      } else {
        throw new Error(data.message || "Failed to fetch VMs");
      }
    } catch (err: any) {
      console.error("Failed to fetch VMs:", err);
      setError(err.response?.data?.message || "Failed to load virtual machines");
      setVms([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVMs();
    // Refresh every 30 seconds
    const interval = setInterval(fetchVMs, 30000);
    return () => clearInterval(interval);
  }, [fetchVMs]);

  const statCards = [
    { label: "Total Instances", value: stats.total, icon: Server, color: "from-indigo-500 to-purple-500", bgColor: "bg-indigo-500/10", textColor: "text-indigo-400" },
    { label: "Running", value: stats.running, icon: Activity, color: "from-emerald-500 to-teal-500", bgColor: "bg-emerald-500/10", textColor: "text-emerald-400" },
    { label: "Stopped", value: stats.stopped, icon: Zap, color: "from-amber-500 to-orange-500", bgColor: "bg-amber-500/10", textColor: "text-amber-400" },
    { label: "Total vCPUs", value: stats.totalCPU, icon: Cpu, color: "from-blue-500 to-cyan-500", bgColor: "bg-blue-500/10", textColor: "text-blue-400" },
    { label: "Total RAM", value: `${stats.totalRAM} GB`, icon: MemoryStick, color: "from-purple-500 to-pink-500", bgColor: "bg-purple-500/10", textColor: "text-purple-400" },
    { label: "Total Storage", value: `${stats.totalDisk} GB`, icon: HardDrive, color: "from-cyan-500 to-blue-500", bgColor: "bg-cyan-500/10", textColor: "text-cyan-400" },
  ];

  if (isLoading && vms.length === 0) {
    return (
      <div className="flex min-h-screen bg-[#0A0E27]">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Topbar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Loading your virtual machines...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0A0E27]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar />
        
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[1600px] mx-auto p-6 lg:p-8">
            {/* Animated background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            {/* Header Section */}
            <div className="relative mb-8">
              <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-8 overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-emerald-500/5 to-cyan-500/5 rounded-full blur-3xl" />
                
                <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                  <div>
                    
                    <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                      Virtual Machines
                    </h1>
                    <p className="text-slate-400 text-base max-w-2xl">
                      Manage and monitor your virtual server instances
                    </p>
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push("/hourly-compute")}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium transition-all duration-300 flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                  >
                    <Plus className="w-4 h-4" />
                    Deploy New VM
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm flex-1">{error}</span>
                <button onClick={() => setError(null)} className="hover:text-red-300">✕</button>
              </div>
            )}

            {/* Stats Overview */}
            {!isLoading && vms.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                {statCards.map((stat, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="relative group overflow-hidden bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4 hover:border-slate-600/50 transition-all duration-300"
                  >
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br opacity-10 rounded-full blur-2xl" />
                    <div className="relative flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 text-xs">{stat.label}</p>
                        <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                      </div>
                      <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                        <stat.icon className={`w-5 h-5 ${stat.textColor}`} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* VPS Cards Grid */}
            {isLoading && vms.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-slate-400">Loading your VPS instances...</p>
                </div>
              </div>
            ) : vms.length === 0 ? (
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-16 flex flex-col items-center justify-center">
                <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6">
                  <Server className="w-12 h-12 text-slate-600" />
                </div>
                <p className="text-slate-400 text-lg font-medium mb-2">No Virtual Machines Found</p>
                <p className="text-slate-500 text-sm text-center max-w-md">
                  Get started by deploying your first virtual machine
                </p>
                <button
                  onClick={() => router.push("/hourly-compute")}
                  className="mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium flex items-center gap-2 transition-all duration-300"
                >
                  Deploy Your First VM
                </button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence>
                  {vms.map((vm, idx) => (
                    <motion.div
                      key={vm.vmid}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <VPSCard vm={vm} onRefresh={fetchVMs} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Footer Info */}
            {!isLoading && vms.length > 0 && (
              <div className="mt-8 text-center">
                <p className="text-xs text-slate-500">
                  Showing {vms.length} virtual machine{vms.length !== 1 ? 's' : ''} • 
                  <span className="text-emerald-400 ml-1">{stats.running} running</span>
                  <span className="text-amber-400 ml-1">{stats.stopped} stopped</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}