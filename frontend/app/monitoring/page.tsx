"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import api from "@/lib/api/auth";
import {
  Activity,
  Cpu,
  MemoryStick,
  HardDrive,
  Wifi,
  Server,
  Clock,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Zap,
  Thermometer,
  Gauge,
  BarChart3,
  LineChart,
  PieChart,
  Bell,
  Calendar,
  Download,
  Eye,
  EyeOff,
  Maximize2,
  Loader2,
  XCircle,
  Globe,
  Database,
  Shield,
  Users,
  DollarSign
} from "lucide-react";
import {
  LineChart as RechartsLineChart,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

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
  created_at: string;
  hourly_rate: number;
  ip_addresses?: string[];
}

interface VMStats {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_in: number;
  network_out: number;
  uptime: number;
}

interface Metric {
  timestamp: string;
  value: number;
}

interface SystemHealth {
  api: boolean;
  database: boolean;
  storage: boolean;
  proxmox: boolean;
  redis: boolean;
}

interface Alert {
  id: number;
  type: "warning" | "error" | "info" | "success";
  title: string;
  message: string;
  timestamp: string;
  vm_id?: number;
  vm_name?: string;
}

export default function MonitoringPage() {
  const [vms, setVms] = useState<VM[]>([]);
  const [selectedVM, setSelectedVM] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<"1h" | "6h" | "24h" | "7d" | "30d">("24h");
  const [isLoading, setIsLoading] = useState(true);
  const [vmStats, setVmStats] = useState<Record<number, VMStats>>({});
  const [historicalData, setHistoricalData] = useState<Record<number, Metric[]>>({});
  const [showFullScreen, setShowFullScreen] = useState<number | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    api: true,
    database: true,
    storage: true,
    proxmox: true,
    redis: true,
  });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch all VMs
  const fetchVMs = useCallback(async () => {
    try {
      const response = await api.get("/vms");
      const data = response.data;
      if (data.success !== false) {
        const vmList = data.data || data.vms || [];
        setVms(vmList);
      }
    } catch (err) {
      console.error("Failed to fetch VMs:", err);
    }
  }, []);

  // Fetch VM stats
  const fetchVMStats = useCallback(async (vmid: number) => {
    try {
      const response = await api.get(`/vms/${vmid}/stats`);
      const data = response.data;
      if (data.success !== false) {
        setVmStats(prev => ({
          ...prev,
          [vmid]: data.stats || data
        }));
      }
    } catch (err) {
      console.error(`Failed to fetch stats for VM ${vmid}:`, err);
    }
  }, []);

  // Fetch historical data
  const fetchHistoricalData = useCallback(async (vmid: number) => {
    try {
      const response = await api.get(`/vms/${vmid}/metrics?range=${timeRange}`);
      const data = response.data;
      if (data.success !== false) {
        setHistoricalData(prev => ({
          ...prev,
          [vmid]: data.metrics || []
        }));
      }
    } catch (err) {
      console.error(`Failed to fetch historical data for VM ${vmid}:`, err);
    }
  }, [timeRange]);

  // Fetch system health
  const fetchSystemHealth = useCallback(async () => {
    try {
      const response = await api.get("/health");
      const data = response.data;
      setSystemHealth({
        api: true,
        database: data.database === "connected",
        storage: data.storage === "healthy",
        proxmox: data.proxmox === "connected",
        redis: data.redis === "connected",
      });
    } catch (err) {
      console.error("Failed to fetch system health:", err);
    }
  }, []);

  // Fetch alerts
  const fetchAlerts = useCallback(async () => {
    try {
      const response = await api.get("/monitoring/alerts");
      const data = response.data;
      if (data.success !== false) {
        setAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    }
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      setError(null);
      await Promise.all([
        fetchVMs(),
        fetchSystemHealth(),
        fetchAlerts(),
      ]);
      setIsLoading(false);
    };
    fetchAll();
  }, [fetchVMs, fetchSystemHealth, fetchAlerts]);

  useEffect(() => {
    if (vms.length > 0) {
      vms.forEach(vm => {
        fetchVMStats(vm.vmid);
        fetchHistoricalData(vm.vmid);
      });
      
      const interval = setInterval(() => {
        vms.forEach(vm => {
          fetchVMStats(vm.vmid);
        });
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [vms, fetchVMStats, fetchHistoricalData]);

  const handleRefresh = () => {
    fetchVMs();
    fetchSystemHealth();
    fetchAlerts();
    vms.forEach(vm => {
      fetchVMStats(vm.vmid);
      fetchHistoricalData(vm.vmid);
    });
  };

  const filteredVMs = selectedVM === "all" 
    ? vms 
    : vms.filter(vm => vm.vmid.toString() === selectedVM);

  const totalStats = {
    cpu: vms.reduce((sum, vm) => sum + (vmStats[vm.vmid]?.cpu_usage || 0), 0) / vms.length || 0,
    memory: vms.reduce((sum, vm) => sum + (vmStats[vm.vmid]?.memory_usage || 0), 0),
    memoryTotal: vms.reduce((sum, vm) => sum + (vm.ram_gb || 0), 0) * 1024 * 1024 * 1024,
    disk: vms.reduce((sum, vm) => sum + (vmStats[vm.vmid]?.disk_usage || 0), 0),
    diskTotal: vms.reduce((sum, vm) => sum + (vm.ssd_gb || 0), 0) * 1024 * 1024 * 1024,
    networkIn: vms.reduce((sum, vm) => sum + (vmStats[vm.vmid]?.network_in || 0), 0),
    networkOut: vms.reduce((sum, vm) => sum + (vmStats[vm.vmid]?.network_out || 0), 0),
    running: vms.filter(vm => vm.status === "running").length,
    total: vms.length,
    totalCores: vms.reduce((sum, vm) => sum + (vm.vcpu || 0), 0),
    totalRam: vms.reduce((sum, vm) => sum + (vm.ram_gb || 0), 0),
    totalDisk: vms.reduce((sum, vm) => sum + (vm.ssd_gb || 0), 0),
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    if (!seconds || seconds === 0) return "N/A";
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "warning": return <AlertCircle className="w-4 h-4 text-amber-400" />;
      case "error": return <XCircle className="w-4 h-4 text-red-400" />;
      case "success": return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      default: return <Bell className="w-4 h-4 text-blue-400" />;
    }
  };

  const pieData = [
    { name: "Used", value: totalStats.disk, color: "#f59e0b" },
    { name: "Free", value: totalStats.diskTotal - totalStats.disk, color: "#334155" },
  ];

  const formatTooltipValue = (value: number | undefined): string => {
    if (value === undefined) return "0";
    return `${value.toFixed(1)}%`;
  };

  if (isLoading && vms.length === 0) {
    return (
      <div className="flex min-h-screen bg-[#0A0E27]">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Topbar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Loading monitoring dashboard...</p>
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
            {/* Header */}
            <div className="relative mb-8">
              <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-8 overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-emerald-500/5 to-cyan-500/5 rounded-full blur-3xl" />
                
                <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                  <div>
                    
                    <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                      Monitoring Dashboard
                    </h1>
                    <p className="text-slate-400 text-base max-w-2xl">
                      Real-time metrics and performance insights for your infrastructure
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <select
                      value={timeRange}
                      onChange={(e) => setTimeRange(e.target.value as any)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    >
                      <option value="1h">Last Hour</option>
                      <option value="6h">Last 6 Hours</option>
                      <option value="24h">Last 24 Hours</option>
                      <option value="7d">Last 7 Days</option>
                      <option value="30d">Last 30 Days</option>
                    </select>
                    <button
                      onClick={handleRefresh}
                      className="p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400">
                <XCircle className="w-5 h-5" />
                <span className="text-sm flex-1">{error}</span>
                <button onClick={() => setError(null)} className="hover:text-red-300">✕</button>
              </div>
            )}

            {/* Overview Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-8 gap-4 mb-8">
              <StatCard icon={<Server />} value={`${totalStats.running}/${totalStats.total}`} label="Active VMs" color="indigo" />
              <StatCard icon={<Cpu />} value={`${totalStats.cpu.toFixed(1)}%`} label="Avg CPU" color="emerald" />
              <StatCard icon={<MemoryStick />} value={`${((totalStats.memory / totalStats.memoryTotal) * 100).toFixed(1)}%`} label="Memory" color="blue" />
              <StatCard icon={<HardDrive />} value={`${((totalStats.disk / totalStats.diskTotal) * 100).toFixed(1)}%`} label="Storage" color="amber" />
              <StatCard icon={<Wifi />} value={formatBytes(totalStats.networkIn + totalStats.networkOut)} label="Network" color="cyan" />
              <StatCard icon={<Zap />} value={totalStats.totalCores} label="Total vCPUs" color="purple" />
              <StatCard icon={<Database />} value={`${totalStats.totalRam} GB`} label="Total RAM" color="pink" />
              <StatCard icon={<HardDrive />} value={`${totalStats.totalDisk} GB`} label="Total Disk" color="orange" />
            </div>

            {/* VM Selector */}
            <div className="mb-6">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                <button
                  onClick={() => setSelectedVM("all")}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                    selectedVM === "all"
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20"
                      : "bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50"
                  }`}
                >
                  All VMs ({vms.length})
                </button>
                {vms.map(vm => (
                  <button
                    key={vm.vmid}
                    onClick={() => setSelectedVM(vm.vmid.toString())}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                      selectedVM === vm.vmid.toString()
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20"
                        : "bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50"
                    }`}
                  >
                    {vm.name}
                    {vmStats[vm.vmid] && (
                      <span className="ml-2 text-xs opacity-75">
                        {vmStats[vm.vmid].cpu_usage.toFixed(0)}%
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* VM Metrics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {filteredVMs.map((vm, idx) => {
                const stats = vmStats[vm.vmid];
                const history = historicalData[vm.vmid] || [];
                const chartData = history.slice(-30).map((m, i) => ({
                  time: new Date(m.timestamp).toLocaleTimeString(),
                  cpu: m.value,
                }));
                
                return (
                  <motion.div
                    key={vm.vmid}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden group hover:border-slate-600/50 transition-all duration-300"
                  >
                    <div className="p-5 border-b border-slate-700 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          vm.status === "running" ? "bg-emerald-500/10" : "bg-red-500/10"
                        }`}>
                          <Server className={`w-5 h-5 ${
                            vm.status === "running" ? "text-emerald-400" : "text-red-400"
                          }`} />
                        </div>
                        <div>
                          <h3 className="text-white font-semibold">{vm.name}</h3>
                          <p className="text-xs text-slate-500">ID: {vm.vmid} • {vm.vcpu} vCPUs • {vm.ram_gb} GB RAM</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`px-2 py-1 rounded-full text-xs ${
                          vm.status === "running" 
                            ? "bg-emerald-500/10 text-emerald-400" 
                            : "bg-red-500/10 text-red-400"
                        }`}>
                          {vm.status === "running" ? "Running" : "Stopped"}
                        </div>
                        <button 
                          onClick={() => setShowFullScreen(showFullScreen === vm.vmid ? null : vm.vmid)}
                          className="p-1.5 hover:bg-slate-700 rounded-lg transition"
                        >
                          <Maximize2 className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-5">
                      {stats ? (
                        <div className="space-y-5">
                          {/* CPU Section with Chart */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Cpu className="w-4 h-4 text-indigo-400" />
                                <span className="text-sm text-slate-300">CPU Usage</span>
                              </div>
                              <span className="text-white font-bold">{stats.cpu_usage.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden mb-3">
                              <div 
                                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                                style={{ width: `${stats.cpu_usage}%` }}
                              />
                            </div>
                            {chartData.length > 0 && (
                              <div className="h-16 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={chartData}>
                                    <defs>
                                      <linearGradient id={`cpuGradient-${vm.vmid}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                      </linearGradient>
                                    </defs>
                                    <Area
                                      type="monotone"
                                      dataKey="cpu"
                                      stroke="#6366f1"
                                      fill={`url(#cpuGradient-${vm.vmid})`}
                                      strokeWidth={2}
                                    />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>
                            )}
                          </div>
                          
                          {/* Memory and Disk Row */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <MemoryStick className="w-4 h-4 text-blue-400" />
                                  <span className="text-sm text-slate-300">Memory</span>
                                </div>
                                <span className="text-white font-bold">{stats.memory_usage.toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-slate-700 rounded-full h-2">
                                <div 
                                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                                  style={{ width: `${stats.memory_usage}%` }}
                                />
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <HardDrive className="w-4 h-4 text-amber-400" />
                                  <span className="text-sm text-slate-300">Disk</span>
                                </div>
                                <span className="text-white font-bold">{stats.disk_usage.toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-slate-700 rounded-full h-2">
                                <div 
                                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                                  style={{ width: `${stats.disk_usage}%` }}
                                />
                              </div>
                            </div>
                          </div>
                          
                          {/* Network Stats */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-800/30 rounded-xl p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <TrendingDown className="w-3 h-3 text-cyan-400" />
                                <span className="text-xs text-slate-500">Inbound</span>
                              </div>
                              <p className="text-white font-bold text-sm">{formatBytes(stats.network_in)}</p>
                            </div>
                            <div className="bg-slate-800/30 rounded-xl p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <TrendingUp className="w-3 h-3 text-emerald-400" />
                                <span className="text-xs text-slate-500">Outbound</span>
                              </div>
                              <p className="text-white font-bold text-sm">{formatBytes(stats.network_out)}</p>
                            </div>
                          </div>
                          
                          {/* Footer */}
                          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-700">
                            <span>Uptime: {formatUptime(stats.uptime)}</span>
                            <span>Updated: {new Date().toLocaleTimeString()}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                          <p className="text-slate-500 text-sm">No metrics available</p>
                          {vm.status !== "running" && (
                            <p className="text-xs text-slate-600 mt-1">Start the VM to see metrics</p>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* System Health and Alerts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* System Health */}
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">System Health</h4>
                    <p className="text-xs text-slate-500">Infrastructure status</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <HealthItem label="API Server" status={systemHealth.api} />
                  <HealthItem label="Database" status={systemHealth.database} />
                  <HealthItem label="Storage" status={systemHealth.storage} />
                  <HealthItem label="Proxmox" status={systemHealth.proxmox} />
                  <HealthItem label="Redis" status={systemHealth.redis} />
                </div>
              </div>

              {/* Recent Alerts */}
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">Recent Alerts</h4>
                    <p className="text-xs text-slate-500">Last 24 hours</p>
                  </div>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {alerts.length === 0 ? (
                    <div className="text-center py-4">
                      <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                      <p className="text-slate-500 text-sm">No alerts</p>
                      <p className="text-xs text-slate-600">All systems operational</p>
                    </div>
                  ) : (
                    alerts.map(alert => (
                      <div key={alert.id} className="flex items-start gap-2 p-2 rounded-lg bg-slate-800/30">
                        {getAlertIcon(alert.type)}
                        <div className="flex-1">
                          <p className="text-sm text-white">{alert.title}</p>
                          <p className="text-xs text-slate-500">{alert.message}</p>
                          <p className="text-xs text-slate-600 mt-1">{new Date(alert.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Resource Usage Summary with Pie Chart */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-indigo-400" />
                Resource Usage Summary
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">CPU Usage</span>
                    <span className="text-white">{totalStats.cpu.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2 mb-4">
                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${totalStats.cpu}%` }} />
                  </div>
                  
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">Memory Usage</span>
                    <span className="text-white">{((totalStats.memory / totalStats.memoryTotal) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2 mb-4">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" style={{ width: `${(totalStats.memory / totalStats.memoryTotal) * 100}%` }} />
                  </div>
                  
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">Storage Usage</span>
                    <span className="text-white">{((totalStats.disk / totalStats.diskTotal) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500" style={{ width: `${(totalStats.disk / totalStats.diskTotal) * 100}%` }} />
                  </div>
                </div>
                
                <div className="lg:col-span-2">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1e293b",
                            border: "1px solid #334155",
                            borderRadius: "8px",
                            color: "#f1f5f9",
                          }}
                          // formatter={(value: number | undefined) => [formatBytes(value || 0), ""]}
                        />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: number | string; label: string; color: string }) {
  const bgColorMap: Record<string, string> = {
    indigo: "bg-indigo-500/10",
    emerald: "bg-emerald-500/10",
    blue: "bg-blue-500/10",
    amber: "bg-amber-500/10",
    cyan: "bg-cyan-500/10",
    purple: "bg-purple-500/10",
    pink: "bg-pink-500/10",
    orange: "bg-orange-500/10",
  };
  
  const textColorMap: Record<string, string> = {
    indigo: "text-indigo-400",
    emerald: "text-emerald-400",
    blue: "text-blue-400",
    amber: "text-amber-400",
    cyan: "text-cyan-400",
    purple: "text-purple-400",
    pink: "text-pink-400",
    orange: "text-orange-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="relative group overflow-hidden bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4 hover:border-slate-600/50 transition-all duration-300"
    >
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br opacity-10 rounded-full blur-2xl" />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-xs uppercase tracking-wider">{label}</p>
          <p className="text-xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl ${bgColorMap[color]} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
          <div className={`w-5 h-5 ${textColorMap[color]}`}>{icon}</div>
        </div>
      </div>
    </motion.div>
  );
}

// Health Item Component
function HealthItem({ label, status }: { label: string; status: boolean }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30">
      <span className="text-sm text-slate-300">{label}</span>
      <div className="flex items-center gap-2">
        {status ? (
          <>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-emerald-400">Operational</span>
          </>
        ) : (
          <>
            <XCircle className="w-4 h-4 text-red-400" />
            <span className="text-xs text-red-400">Down</span>
          </>
        )}
      </div>
    </div>
  );
}