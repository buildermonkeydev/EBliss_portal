"use client";

import { useState } from "react";
import Link from "next/link";
import api from "@/lib/api/auth";
import { 
  Cpu, MemoryStick, HardDrive, Power, RotateCw, 
  Trash2, Terminal, Server, Activity, MoreVertical,
  Play, Circle, Box, Loader2, Wifi, Clock, Zap
} from "lucide-react";

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
  type?: "qemu" | "lxc";
}

interface VPSCardProps {
  vm: VM;
  onRefresh: () => void;
}

export default function VPSCard({ vm, onRefresh }: VPSCardProps) {
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showDestroyConfirm, setShowDestroyConfirm] = useState(false);

  const formatUptime = (seconds?: number) => {
    if (!seconds || seconds === 0) return "N/A";
    const hours = Math.floor(seconds / 3600);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    return `${hours}h`;
  };

  const runAction = async (action: string) => {
    setIsActionLoading(action);
    
    try {
      let endpoint = "";
      let method = "POST";
      
      switch (action) {
        case "start":
          endpoint = `/vms/${vm.vmid}/start`;
          break;
        case "stop":
          endpoint = `/vms/${vm.vmid}/stop`;
          break;
        case "reboot":
          endpoint = `/vms/${vm.vmid}/restart`;
          break;
        case "destroy":
          endpoint = `/vms/${vm.vmid}`;
          method = "DELETE";
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      
      await api.request({
        method,
        url: endpoint,
        params: { node: vm.node }
      });
      
      // Refresh the VM list
      setTimeout(() => onRefresh(), 2000);
      
    } catch (err) {
      console.error("Action error:", err);
    } finally {
      setTimeout(() => setIsActionLoading(null), 2000);
      setShowMenu(false);
      setShowDestroyConfirm(false);
    }
  };

  const getStatusColor = () => {
    switch (vm.status) {
      case "running":
        return "bg-emerald-500";
      case "stopped":
        return "bg-red-500";
      default:
        return "bg-yellow-500";
    }
  };

  const getStatusTextColor = () => {
    switch (vm.status) {
      case "running":
        return "text-emerald-400";
      case "stopped":
        return "text-red-400";
      default:
        return "text-yellow-400";
    }
  };

  return (
    <>
      <div className="group relative overflow-hidden bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl hover:border-slate-600/50 transition-all duration-300 hover:shadow-xl hover:shadow-black/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-2xl" />
        
        <div className="relative p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                  vm.type === "lxc" 
                    ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20"
                    : "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/20"
                }`}>
                  {vm.type === "lxc" ? (
                    <Box className="w-6 h-6 text-white" />
                  ) : (
                    <Server className="w-6 h-6 text-white" />
                  )}
                </div>
                <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${getStatusColor()} ${
                  vm.status === "running" ? "animate-pulse" : ""
                }`} />
              </div>
              <div>
                <Link href={`/vps/${vm.vmid}`}>
                  <h3 className="text-white font-semibold text-lg hover:text-indigo-400 transition-colors">
                    {vm.name}
                  </h3>
                </Link>
                <div className="flex items-center gap-2">
                  <p className="text-slate-500 text-xs font-mono">ID: {vm.vmid}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    vm.type === "lxc" 
                      ? "bg-emerald-500/20 text-emerald-400" 
                      : "bg-indigo-500/20 text-indigo-400"
                  }`}>
                    {vm.type === "lxc" ? "LXC" : "KVM"}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <MoreVertical className="w-4 h-4 text-slate-400" />
              </button>
              
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden">
                    <button
                      onClick={() => runAction("start")}
                      disabled={vm.status === "running" || isActionLoading === "start"}
                      className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {isActionLoading === "start" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      Start
                    </button>
                    <button
                      onClick={() => runAction("stop")}
                      disabled={vm.status !== "running" || isActionLoading === "stop"}
                      className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {isActionLoading === "stop" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Power className="w-4 h-4" />
                      )}
                      Stop
                    </button>
                    <button
                      onClick={() => runAction("reboot")}
                      disabled={vm.status !== "running" || isActionLoading === "reboot"}
                      className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {isActionLoading === "reboot" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RotateCw className="w-4 h-4" />
                      )}
                      Reboot
                    </button>
                    <div className="h-px bg-slate-700 my-1" />
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowDestroyConfirm(true);
                      }}
                      disabled={isActionLoading === "destroy"}
                      className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                    >
                      {isActionLoading === "destroy" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      Destroy
                    </button>
                  </div>
                </>
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
                  <code key={idx} className="text-xs font-mono text-indigo-400 bg-slate-800/50 px-2 py-1 rounded-lg">
                    {ip}
                  </code>
                ))}
              </div>
            </div>
          )}
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-slate-800/50 rounded-xl p-2 text-center">
              <Cpu className="w-4 h-4 text-slate-400 mx-auto mb-1" />
              <p className="text-white text-sm font-bold">{vm.vcpu}</p>
              <p className="text-slate-500 text-xs">vCPUs</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-2 text-center">
              <MemoryStick className="w-4 h-4 text-slate-400 mx-auto mb-1" />
              <p className="text-white text-sm font-bold">{vm.ram_gb} GB</p>
              <p className="text-slate-500 text-xs">RAM</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-2 text-center">
              <HardDrive className="w-4 h-4 text-slate-400 mx-auto mb-1" />
              <p className="text-white text-sm font-bold">{vm.ssd_gb} GB</p>
              <p className="text-slate-500 text-xs">Storage</p>
            </div>
          </div>
          
          {/* Additional Info */}
          <div className="flex items-center justify-between mb-4 text-xs">
            <div className="flex items-center gap-1 text-slate-500">
              <Clock className="w-3 h-3" />
              <span>Created: {new Date(vm.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1 text-slate-500">
              <Zap className="w-3 h-3" />
              <span>${vm.hourly_rate}/hr</span>
            </div>
          </div>
          
          {/* Status Bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5">
              <Circle className={`w-2 h-2 ${getStatusColor()} fill-current`} />
              <span className={`text-xs font-medium ${getStatusTextColor()}`}>
                {vm.status === "running" ? "Running" : "Stopped"}
              </span>
            </div>
            {vm.status === "running" && vm.uptime && vm.uptime > 0 && (
              <div className="flex items-center gap-1 text-slate-500 text-xs">
                <Activity className="w-3 h-3" />
                <span>Uptime: {formatUptime(vm.uptime)}</span>
              </div>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex gap-2">
            <Link 
              href={`/vps/${vm.vmid}`}
              className="flex-1 text-center px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors"
            >
              Manage
            </Link>
            <button
              onClick={() => runAction(vm.status === "running" ? "stop" : "start")}
              disabled={isActionLoading === "stop" || isActionLoading === "start"}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-1.5 ${
                vm.status === "running"
                  ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              } disabled:opacity-50`}
            >
              {isActionLoading === "stop" || isActionLoading === "start" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : vm.status === "running" ? (
                <Power className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>
          </div>
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
              <h3 className="text-white font-bold text-lg">Destroy {vm.name}?</h3>
            </div>
            <p className="text-slate-300 text-sm">
              This action cannot be undone. All data will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => runAction("destroy")}
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
          </div>
        </div>
      )}
    </>
  );
}