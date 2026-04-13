"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import api from "@/lib/api/auth";
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Wifi,
  Power,
  RotateCw,
  Trash2,
  Terminal,
  Server,
  Activity,
  MoreVertical,
  Play,
  Circle,
  Box,
  RefreshCw,
  Copy,
  CheckCircle,
  AlertCircle,
  Loader2,
  Clock,
  Plus,
  RefreshCcw
} from "lucide-react";

interface VM {
  id: number;
  vmid: number;
  name: string;
  status: string;
  cpu: number;
  memory: number;
  disk: number;
  uptime: number;
  type: "qemu" | "lxc";
  tags?: string[];
  node: string;
  ip_addresses?: string[];
}

interface VMStats {
  cpu: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    in: number;
    out: number;
  };
  uptime: number;
}

export default function VPSPage() {
  const [vms, setVms] = useState<VM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedVM, setSelectedVM] = useState<VM | null>(null);
  const [showDestroyConfirm, setShowDestroyConfirm] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<{ vmid: number; action: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "running" | "stopped">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "qemu" | "lxc">("all");
  const [vmStats, setVmStats] = useState<Record<number, VMStats>>({});
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Fetch all VMs from API
  const fetchVMs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get("/vms");
      const data = response.data;
      
      if (data.success !== false) {
        const vmList = Array.isArray(data) ? data : data.data || data.vms || [];
        setVms(vmList);
      } else {
        throw new Error(data.message || "Failed to fetch VMs");
      }
    } catch (err: any) {
      console.error("Failed to fetch VMs:", err);
      setError(err.response?.data?.message || err.message || "Failed to load virtual machines");
      setVms([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Sync VMs from Proxmox
  const syncVMs = async () => {
    setIsSyncing(true);
    setError(null);
    setSyncMessage(null);
    try {
      const response = await api.post("/vms/sync");
      const data = response.data;
      
      if (data.success) {
        setSyncMessage(`Synced ${data.syncedCount || 0} new VMs successfully!`);
        await fetchVMs();
        setTimeout(() => setSyncMessage(null), 5000);
      } else {
        throw new Error(data.message || "Failed to sync VMs");
      }
    } catch (err: any) {
      console.error("Failed to sync VMs:", err);
      setError(err.response?.data?.message || err.message || "Failed to sync VMs from Proxmox");
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Fetch single VM stats
  const fetchVMStats = async (vmid: number, node: string) => {
    try {
      const response = await api.get(`/vms/${vmid}/stats?node=${node}`);
      const data = response.data;
      
      if (data.success !== false) {
        const stats = data.data || data;
        setVmStats(prev => ({
          ...prev,
          [vmid]: stats
        }));
      }
    } catch (err) {
      console.error(`Failed to fetch stats for VM ${vmid}:`, err);
    }
  };

  // Fetch all VMs on mount
  useEffect(() => {
    fetchVMs();
  }, []);

  // Fetch stats for running VMs every 10 seconds
  useEffect(() => {
    const runningVMs = vms.filter(vm => vm.status === "running");
    
    runningVMs.forEach(vm => {
      if (vm.vmid && vm.node) {
        fetchVMStats(vm.vmid, vm.node);
      }
    });
    
    const interval = setInterval(() => {
      const currentRunningVMs = vms.filter(vm => vm.status === "running");
      currentRunningVMs.forEach(vm => {
        if (vm.vmid && vm.node) {
          fetchVMStats(vm.vmid, vm.node);
        }
      });
    }, 10000);
    
    return () => clearInterval(interval);
  }, [vms]);

  // Execute VM action (start, stop, reboot, destroy)
  const runAction = async (vmid: number, action: string, node: string) => {
    setActionLoading({ vmid, action });
    
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
      
      const response = await api.request({
        method,
        url: endpoint,
        params: { node }
      });
      
      if (response.data.success === false) {
        throw new Error(response.data.message || `${action} failed`);
      }
      
      setTimeout(() => fetchVMs(), 2000);
      
    } catch (err: any) {
      console.error(`${action} error:`, err);
      setError(err.response?.data?.message || err.message || `Failed to ${action} VM`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setTimeout(() => setActionLoading(null), 1000);
    }
  };

  const handleCopyIP = (ip: string) => {
    navigator.clipboard.writeText(ip);
    console.log(`IP ${ip} copied to clipboard`);
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0 || isNaN(bytes)) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    if (!seconds || seconds === 0 || isNaN(seconds)) return "N/A";
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getCPUPercentage = (vm: VM, stats: VMStats | undefined) => {
    if (stats && stats.cpu !== undefined) {
      return stats.cpu.toFixed(1);
    }
    if (vm.cpu !== undefined && vm.cpu !== null) {
      return vm.cpu.toFixed(0);
    }
    return "0";
  };

  const getRAMDisplay = (vm: VM, stats: VMStats | undefined) => {
    if (stats && stats.memory) {
      return `${(stats.memory.used / 1024).toFixed(1)}/${(stats.memory.total / 1024).toFixed(1)}`;
    }
    if (vm.memory !== undefined && vm.memory !== null) {
      return `${(vm.memory / 1024).toFixed(1)} GB`;
    }
    return "0 GB";
  };

  const getDiskDisplay = (vm: VM, stats: VMStats | undefined) => {
    if (stats && stats.disk) {
      return `${(stats.disk.used / 1024).toFixed(1)}/${(stats.disk.total / 1024).toFixed(1)}`;
    }
    if (vm.disk !== undefined && vm.disk !== null) {
      return `${(vm.disk / 1024).toFixed(1)} GB`;
    }
    return "0 GB";
  };

  const getUptime = (vm: VM, stats: VMStats | undefined) => {
    if (stats && stats.uptime) {
      return formatUptime(stats.uptime);
    }
    if (vm.uptime) {
      return formatUptime(vm.uptime);
    }
    return "N/A";
  };

  const filteredVMs = vms.filter(vm => {
    const matchesSearch = vm.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          vm.vmid?.toString().includes(searchTerm);
    const matchesStatus = statusFilter === "all" || vm.status === statusFilter;
    const matchesType = typeFilter === "all" || vm.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    total: vms.length,
    running: vms.filter(v => v.status === "running").length,
    stopped: vms.filter(v => v.status === "stopped").length,
    totalCPU: vms.reduce((sum, vm) => sum + (vm.cpu || 0), 0).toFixed(1),
    totalRAM: vms.reduce((sum, vm) => sum + (vm.memory || 0), 0) / 1024,
    totalDisk: vms.reduce((sum, vm) => sum + (vm.disk || 0), 0) / 1024,
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar />
        
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Animated background */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>

          {/* Header */}
          <div className="relative mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                Virtual Machines
              </h1>
              <p className="text-slate-400 text-sm mt-2">
                Manage and monitor your virtual servers
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={syncVMs}
                disabled={isSyncing}
                className="px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-all duration-300 flex items-center gap-2 shadow-lg"
              >
                {isSyncing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCcw className="w-4 h-4" />
                )}
                {isSyncing ? "Syncing..." : "Sync VMs"}
              </button>
              <Link href="/hourly-compute">
                <button className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-medium transition-all duration-300 flex items-center gap-2 shadow-lg shadow-indigo-500/20">
                  <Plus className="w-4 h-4" />
                  Deploy New VM
                </button>
              </Link>
            </div>
          </div>

          {/* Sync Message */}
          {syncMessage && (
            <div className="relative mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-400">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{syncMessage}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="relative mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
              <button onClick={() => setError(null)} className="ml-auto hover:text-red-300">✕</button>
            </div>
          )}

          {/* Stats Cards */}
          <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
              <p className="text-slate-400 text-xs">Total VMs</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
              <p className="text-slate-400 text-xs">Running</p>
              <p className="text-2xl font-bold text-emerald-400">{stats.running}</p>
            </div>
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
              <p className="text-slate-400 text-xs">Stopped</p>
              <p className="text-2xl font-bold text-red-400">{stats.stopped}</p>
            </div>
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
              <p className="text-slate-400 text-xs">Total vCPUs</p>
              <p className="text-2xl font-bold text-white">{stats.totalCPU}</p>
            </div>
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
              <p className="text-slate-400 text-xs">Total RAM</p>
              <p className="text-2xl font-bold text-white">{stats.totalRAM.toFixed(1)} GB</p>
            </div>
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
              <p className="text-slate-400 text-xs">Total Storage</p>
              <p className="text-2xl font-bold text-white">{stats.totalDisk.toFixed(1)} GB</p>
            </div>
          </div>

          {/* Filters */}
          <div className="relative mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or ID..."
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white"
              >
                <option value="all">All Status</option>
                <option value="running">Running</option>
                <option value="stopped">Stopped</option>
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white"
              >
                <option value="all">All Types</option>
                <option value="qemu">KVM VMs</option>
                <option value="lxc">LXC Containers</option>
              </select>
              <button
                onClick={() => fetchVMs()}
                className="px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-white transition"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* VM Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" />
                <p className="text-slate-400">Loading your virtual machines...</p>
              </div>
            </div>
          ) : filteredVMs.length === 0 ? (
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-16 flex flex-col items-center justify-center text-slate-500 space-y-4">
              <Server className="w-16 h-16 text-slate-600" />
              <p className="text-lg font-medium">No virtual machines found</p>
              <p className="text-sm">Click "Sync VMs" to import existing VMs or "Deploy New VM" to create one</p>
              <div className="flex gap-3">
                <button
                  onClick={syncVMs}
                  disabled={isSyncing}
                  className="px-6 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-all duration-300 flex items-center gap-2"
                >
                  {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                  Sync VMs
                </button>
                <Link href="/hourly-compute">
                  <button className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-medium transition-all duration-300">
                    Deploy New VM
                  </button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredVMs.map((vm) => {
                const stats = vmStats[vm.vmid];
                return (
                  <div key={vm.vmid} className="group relative overflow-hidden bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl hover:border-slate-600/50 transition-all duration-300 hover:shadow-xl hover:shadow-black/20">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-2xl" />
                    
                    <div className="relative p-5">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                              vm.type === 'lxc' 
                                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20'
                                : 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/20'
                            }`}>
                              {vm.type === 'lxc' ? (
                                <Box className="w-6 h-6 text-white" />
                              ) : (
                                <Server className="w-6 h-6 text-white" />
                              )}
                            </div>
                            <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${
                              vm.status === "running" ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                            }`} />
                          </div>
                          <div>
                            <Link href={`/vps/${vm.vmid}`}>
                              <h3 className="text-white font-semibold text-lg hover:text-indigo-400 transition-colors">
                                {vm.name || `VM-${vm.vmid}`}
                              </h3>
                            </Link>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-slate-500 font-mono">ID: {vm.vmid}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                vm.type === 'lxc' 
                                  ? 'bg-emerald-500/20 text-emerald-400' 
                                  : 'bg-indigo-500/20 text-indigo-400'
                              }`}>
                                {vm.type === 'lxc' ? 'LXC' : 'KVM'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="relative">
                          <button
                            onClick={() => setSelectedVM(selectedVM?.vmid === vm.vmid ? null : vm)}
                            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-4 h-4 text-slate-400" />
                          </button>
                          
                          {selectedVM?.vmid === vm.vmid && (
                            <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden">
                              <button
                                onClick={() => runAction(vm.vmid, "start", vm.node)}
                                disabled={vm.status === "running" || actionLoading?.vmid === vm.vmid}
                                className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                              >
                                <Play className="w-4 h-4" />
                                Start
                              </button>
                              <button
                                onClick={() => runAction(vm.vmid, "stop", vm.node)}
                                disabled={vm.status !== "running" || actionLoading?.vmid === vm.vmid}
                                className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                              >
                                <Power className="w-4 h-4" />
                                Stop
                              </button>
                              <button
                                onClick={() => runAction(vm.vmid, "reboot", vm.node)}
                                disabled={vm.status !== "running" || actionLoading?.vmid === vm.vmid}
                                className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                              >
                                <RotateCw className="w-4 h-4" />
                                Reboot
                              </button>
                              <div className="h-px bg-slate-700 my-1" />
                              <button
                                onClick={() => setShowDestroyConfirm(vm.vmid)}
                                className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                Destroy
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* IP Addresses */}
                      {vm.ip_addresses && vm.ip_addresses.length > 0 && (
                        <div className="mb-3">
                          <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                            <Wifi className="w-3 h-3" />
                            <span>IP Addresses</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {vm.ip_addresses.map((ip, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleCopyIP(ip)}
                                className="text-xs font-mono text-indigo-400 hover:text-indigo-300 bg-slate-800/50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                              >
                                {ip}
                                <Copy className="w-3 h-3" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-slate-800/50 rounded-xl p-2 text-center">
                          <Cpu className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                          <p className="text-white text-sm font-bold">{getCPUPercentage(vm, stats)}%</p>
                          <p className="text-slate-500 text-xs">CPU</p>
                        </div>
                        <div className="bg-slate-800/50 rounded-xl p-2 text-center">
                          <MemoryStick className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                          <p className="text-white text-sm font-bold">{getRAMDisplay(vm, stats)}</p>
                          <p className="text-slate-500 text-xs">RAM</p>
                        </div>
                        <div className="bg-slate-800/50 rounded-xl p-2 text-center">
                          <HardDrive className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                          <p className="text-white text-sm font-bold">{getDiskDisplay(vm, stats)}</p>
                          <p className="text-slate-500 text-xs">Disk</p>
                        </div>
                      </div>
                      
                      {/* Status & Uptime */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-1.5">
                          <Circle className={`w-2 h-2 ${vm.status === "running" ? "text-emerald-500 fill-emerald-500" : "text-red-500 fill-red-500"}`} />
                          <span className={`text-xs font-medium ${vm.status === "running" ? "text-emerald-400" : "text-red-400"}`}>
                            {vm.status === "running" ? "Running" : "Stopped"}
                          </span>
                        </div>
                        {vm.status === "running" && (
                          <div className="flex items-center gap-1 text-slate-500 text-xs">
                            <Clock className="w-3 h-3" />
                            <span>Uptime: {getUptime(vm, stats)}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Progress Bars */}
                      {stats && vm.status === "running" && (
                        <div className="space-y-2 mb-4">
                          <div className="relative">
                            <div className="w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                                style={{ width: `${Math.min(stats.cpu || 0, 100)}%` }}
                              />
                            </div>
                          </div>
                          <div className="relative">
                            <div className="w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                                style={{ width: `${Math.min(stats.memory?.percentage || 0, 100)}%` }}
                              />
                            </div>
                          </div>
                          <div className="relative">
                            <div className="w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                                style={{ width: `${Math.min(stats.disk?.percentage || 0, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Network Stats */}
                      {stats && vm.status === "running" && stats.network && (
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                          <div className="flex items-center gap-1">
                            <Wifi className="w-3 h-3" />
                            <span>↓ {formatBytes(stats.network.in || 0)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Wifi className="w-3 h-3 rotate-180" />
                            <span>↑ {formatBytes(stats.network.out || 0)}</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Actions */}
                      <div className="flex gap-2">
                        <Link 
                          href={`/vps/${vm.vmid}`}
                          className="flex-1 text-center px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors"
                        >
                          Manage
                        </Link>
                        <button
                          onClick={() => runAction(vm.vmid, vm.status === "running" ? "stop" : "start", vm.node)}
                          disabled={actionLoading?.vmid === vm.vmid}
                          className={`px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-1.5 ${
                            vm.status === "running"
                              ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30"
                              : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          } disabled:opacity-50`}
                        >
                          {actionLoading?.vmid === vm.vmid && actionLoading.action === (vm.status === "running" ? "stop" : "start") ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : vm.status === "running" ? (
                            <Power className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => runAction(vm.vmid, "reboot", vm.node)}
                          disabled={vm.status !== "running" || actionLoading?.vmid === vm.vmid}
                          className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          <RotateCw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Destroy Confirm Modal */}
      {showDestroyConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center animate-fadeIn">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full mx-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-xl">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-white font-bold text-lg">Destroy VM?</h3>
            </div>
            <p className="text-slate-300 text-sm">
              This action cannot be undone. All data will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const vm = vms.find(v => v.vmid === showDestroyConfirm);
                  if (vm) {
                    runAction(showDestroyConfirm, "destroy", vm.node);
                  }
                  setShowDestroyConfirm(null);
                }}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition"
              >
                Yes, Destroy
              </button>
              <button
                onClick={() => setShowDestroyConfirm(null)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}