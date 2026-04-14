"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import api from "@/lib/api/auth";
import {
  Server,
  AlertCircle,
  CheckCircle,
  Clock,
  Cpu,
  HardDrive,
  Wifi,
  MapPin,
  Power,
  PowerOff,
  Search,
  Filter,
  Loader2,
  Circle,
  MoreVertical,
  ExternalLink,
  Copy,
  Check,
  XCircle,
  User,
  Mail,
  Calendar
} from "lucide-react";

// Updated interface to match actual API response
interface DedicatedServerStorage {
  id: string;
  server_id: string;
  type: string;
  size_gb: number;
  raid_level: string | null;
  drive_count: number;
  is_primary: boolean;
  created_at: string;
}

interface AssignedUser {
  id: number;
  full_name: string;
  email: string;
  company?: string;
  phone?: string;
}

interface IPAddress {
  id: number;
  address: string;
  subnet: string;
  gateway?: string;
  status: string;
}

interface DedicatedServer {
  id: string;
  name: string;
  hostname: string;
  user_id?: number;
  assigned_to?: AssignedUser;
  cpu_model: string;
  cpu_cores: number;
  cpu_threads: number;
  cpu_speed: string;
  ram_gb: number;
  ram_type: string;
  ram_speed?: string;
  storage: DedicatedServerStorage[];
  network_port: string;
  bandwidth_tb: number;
  ipv4_count: number;
  ipv6_count: number;
  datacenter: string;
  rack_id?: string;
  rack_position?: string;
  os?: string;
  os_version?: string;
  monthly_price: number;
  setup_fee: number;
  status: string;
  provisioning_status: string;
  ddos_protection: boolean;
  backup_enabled: boolean;
  monitoring_enabled: boolean;
  ip_addresses: IPAddress[];
  created_at: string;
  updated_at: string;
  next_billing_date?: string;
  uptime_percentage?: number;
  notes?: string;
  tags: string[];
}

interface Stats {
  total: number;
  active: number;
  maintenance: number;
  offline: number;
  totalCores: number;
  totalRam: number;
  totalStorage: number;
}

export default function DedicatedServersPage() {
  const [servers, setServers] = useState<DedicatedServer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    maintenance: 0,
    offline: 0,
    totalCores: 0,
    totalRam: 0,
    totalStorage: 0,
  });
  const [selectedServer, setSelectedServer] = useState<DedicatedServer | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Fetch dedicated servers
  const fetchDedicatedServers = useCallback(async () => {
    try {
      const response = await api.get("/dedicated-servers/user/me");
      const data = response.data;
      
      let serversList: DedicatedServer[] = [];
      
      // Handle different response structures
      if (data.servers) {
        serversList = data.servers;
      } else if (data.data) {
        serversList = Array.isArray(data.data) ? data.data : data.data.servers || [];
      } else if (Array.isArray(data)) {
        serversList = data;
      }
      
      setServers(serversList);
      
      // Calculate stats
      const activeCount = serversList.filter((s) => s.status === "online" || s.status === "active").length;
      const maintenanceCount = serversList.filter((s) => s.status === "maintenance").length;
      const offlineCount = serversList.filter((s) => s.status === "offline" || s.status === "suspended").length;
      const totalCores = serversList.reduce((sum, s) => sum + (s.cpu_cores || 0), 0);
      const totalRam = serversList.reduce((sum, s) => sum + (s.ram_gb || 0), 0);
      const totalStorage = serversList.reduce((sum, s) => {
        return sum + (s.storage || []).reduce((ss, st) => ss + (st.size_gb || 0), 0);
      }, 0);
      
      setStats({
        total: serversList.length,
        active: activeCount,
        maintenance: maintenanceCount,
        offline: offlineCount,
        totalCores,
        totalRam,
        totalStorage,
      });
    } catch (err: any) {
      console.error("Failed to fetch dedicated servers:", err);
      setError(err.response?.data?.message || "Failed to load dedicated servers");
    }
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      setError(null);
      await fetchDedicatedServers();
      setIsLoading(false);
    };
    
    fetchAll();
    
    const interval = setInterval(() => {
      fetchDedicatedServers();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchDedicatedServers]);

  // Get total storage for a server
  const getServerStorage = (server: DedicatedServer): number => {
    if (!server.storage) return 0;
    return server.storage.reduce((sum, s) => sum + (s.size_gb || 0), 0);
  };

  // Get primary IP address
  const getPrimaryIp = (server: DedicatedServer): string => {
    if (!server.ip_addresses || server.ip_addresses.length === 0) return "—";
    const assigned = server.ip_addresses.find(ip => ip.status === "assigned");
    return assigned?.address || server.ip_addresses[0]?.address || "—";
  };

  // Filters
  const filteredServers = servers.filter((server) => {
    const matchesSearch = server.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          server.hostname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          getPrimaryIp(server).includes(searchTerm) ||
                          server.assigned_to?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = selectedLocation === "all" || server.datacenter === selectedLocation;
    const matchesStatus = selectedStatus === "all" || 
                          (selectedStatus === "active" && (server.status === "online" || server.status === "active")) ||
                          (selectedStatus === "maintenance" && server.status === "maintenance") ||
                          (selectedStatus === "offline" && (server.status === "offline" || server.status === "suspended"));
    return matchesSearch && matchesLocation && matchesStatus;
  });

  const locations = [...new Set(servers.map((s) => s.datacenter).filter(Boolean))];

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase() || "";
    if (s === "online" || s === "active") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    if (s === "maintenance") return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    if (s === "offline" || s === "suspended") return "bg-red-500/10 text-red-400 border-red-500/30";
    if (s === "provisioning" || s === "pending") return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    return "bg-slate-500/10 text-slate-400 border-slate-500/30";
  };

  const getStatusIcon = (status: string) => {
    const s = status?.toLowerCase() || "";
    if (s === "online" || s === "active") return <Power className="w-3 h-3" />;
    if (s === "maintenance") return <Clock className="w-3 h-3" />;
    if (s === "offline" || s === "suspended") return <PowerOff className="w-3 h-3" />;
    return <Circle className="w-3 h-3" />;
  };

  const getStatusLabel = (status: string) => {
    const s = status?.toLowerCase() || "";
    if (s === "online") return "Online";
    if (s === "active") return "Active";
    if (s === "maintenance") return "Maintenance";
    if (s === "offline") return "Offline";
    if (s === "suspended") return "Suspended";
    if (s === "provisioning") return "Provisioning";
    if (s === "pending") return "Pending";
    return status || "Unknown";
  };

  if (isLoading && servers.length === 0) {
    return (
      <div className="flex min-h-screen bg-[#0A0E27]">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Topbar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Loading dedicated servers...</p>
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
                
                <div className="relative">
                  <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                    Dedicated Infrastructure
                  </h1>
                  <p className="text-slate-400 text-base max-w-2xl">
                    Manage your dedicated servers, monitor performance, and track hardware status
                  </p>
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

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
              <StatCard icon={<Server />} value={stats.total} label="Total Servers" color="indigo" />
              <StatCard icon={<CheckCircle />} value={stats.active} label="Active" color="emerald" />
              <StatCard icon={<Clock />} value={stats.maintenance} label="Maintenance" color="amber" />
              <StatCard icon={<PowerOff />} value={stats.offline} label="Offline" color="red" />
              <StatCard icon={<Cpu />} value={stats.totalCores} label="Total Cores" color="blue" />
              <StatCard icon={<Server />} value={`${stats.totalRam} GB`} label="Total RAM" color="purple" />
              <StatCard icon={<HardDrive />} value={`${(stats.totalStorage / 1000).toFixed(1)} TB`} label="Total Storage" color="cyan" />
            </div>

            {/* Filters Bar */}
            <div className="mb-6">
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by name, hostname, IP, or client..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    >
                      <option value="all">All Locations</option>
                      {locations.map((loc) => (
                        <option key={`location-${loc}`} value={loc}>{loc}</option>
                      ))}
                    </select>
                    
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    >
                      <option value="all">All Status</option>
                      <option key="status-active" value="active">🟢 Active</option>
                      <option key="status-maintenance" value="maintenance">🟡 Maintenance</option>
                      <option key="status-offline" value="offline">🔴 Offline</option>
                    </select>
                    
                    <button
                      onClick={fetchDedicatedServers}
                      className="px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-slate-400 hover:text-white transition-all duration-300 flex items-center gap-2"
                    >
                      <Filter className="w-4 h-4" />
                      Refresh
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Servers Grid */}
            {filteredServers.length === 0 ? (
              <EmptyState icon={<Server />} title="No Dedicated Servers Found" message="No dedicated servers match your filters" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <AnimatePresence>
                  {filteredServers.map((server, idx) => (
                    <ServerCard
                      key={`server-${server.id}`}
                      server={server}
                      index={idx}
                      onViewDetails={() => {
                        setSelectedServer(server);
                        setShowDetailsModal(true);
                      }}
                      onCopyText={handleCopyText}
                      copiedText={copiedText}
                      getStatusColor={getStatusColor}
                      getStatusIcon={getStatusIcon}
                      getStatusLabel={getStatusLabel}
                      getPrimaryIp={getPrimaryIp}
                      getServerStorage={getServerStorage}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Server Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedServer && (
          <ServerDetailsModal
            server={selectedServer}
            onClose={() => setShowDetailsModal(false)}
            onCopyText={handleCopyText}
            copiedText={copiedText}
            getStatusColor={getStatusColor}
            getStatusIcon={getStatusIcon}
            getStatusLabel={getStatusLabel}
            getPrimaryIp={getPrimaryIp}
            getServerStorage={getServerStorage}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: number | string; label: string; color: 'indigo' | 'emerald' | 'amber' | 'red' | 'blue' | 'purple' | 'cyan' }) {
  const bgColorMap: Record<string, string> = {
    indigo: "bg-indigo-500/10",
    emerald: "bg-emerald-500/10",
    amber: "bg-amber-500/10",
    red: "bg-red-500/10",
    blue: "bg-blue-500/10",
    purple: "bg-purple-500/10",
    cyan: "bg-cyan-500/10",
  };
  
  const textColorMap: Record<string, string> = {
    indigo: "text-indigo-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    red: "text-red-400",
    blue: "text-blue-400",
    purple: "text-purple-400",
    cyan: "text-cyan-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative group overflow-hidden bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4 hover:border-slate-600/50 transition-all duration-300"
    >
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br opacity-10 rounded-full blur-2xl" />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-xs">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl ${bgColorMap[color]} flex items-center justify-center`}>
          <div className={`w-5 h-5 ${textColorMap[color]}`}>{icon}</div>
        </div>
      </div>
    </motion.div>
  );
}

// Server Card Component
function ServerCard({ server, index, onViewDetails, onCopyText, copiedText, getStatusColor, getStatusIcon, getStatusLabel, getPrimaryIp, getServerStorage }: any) {
  const primaryIp = getPrimaryIp(server);
  const totalStorage = getServerStorage(server);
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className="group relative overflow-hidden bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl hover:border-slate-600/50 transition-all duration-300 hover:shadow-xl hover:shadow-black/20"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-2xl" />
      
      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Server className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">{server.name}</h3>
              <p className="text-slate-500 text-xs">{server.hostname}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(server.status)}`}>
                  {getStatusIcon(server.status)}
                  {getStatusLabel(server.status)}
                </div>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {server.datacenter}
                </span>
              </div>
            </div>
          </div>
          
          <button
            onClick={onViewDetails}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* IP Address */}
        <div className="mb-4 p-3 bg-slate-900/50 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-indigo-400" />
              <code className="text-white font-mono text-sm">{primaryIp}</code>
            </div>
            <button
              onClick={() => onCopyText(primaryIp)}
              className="p-1 hover:bg-slate-700 rounded transition"
            >
              {copiedText === primaryIp ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
            </button>
          </div>
        </div>

        {/* Specs */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-slate-900/30 rounded-xl p-2 text-center">
            <Cpu className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
            <p className="text-white text-sm font-bold">{server.cpu_cores}</p>
            <p className="text-slate-500 text-xs">Cores</p>
          </div>
          <div className="bg-slate-900/30 rounded-xl p-2 text-center">
            <Server className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
            <p className="text-white text-sm font-bold">{server.ram_gb} GB</p>
            <p className="text-slate-500 text-xs">RAM</p>
          </div>
          <div className="bg-slate-900/30 rounded-xl p-2 text-center">
            <HardDrive className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
            <p className="text-white text-sm font-bold">{totalStorage} GB</p>
            <p className="text-slate-500 text-xs">Storage</p>
          </div>
        </div>

        {/* Client Info */}
        <div className="mb-4 p-3 bg-slate-900/30 rounded-xl">
          {server.assigned_to ? (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-400" />
              <div>
                <p className="text-white text-sm">{server.assigned_to.full_name}</p>
                <p className="text-slate-500 text-xs">{server.assigned_to.email}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-500" />
              <p className="text-slate-500 text-sm">Unassigned</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-700">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Calendar className="w-3 h-3" />
            <span>{new Date(server.created_at).toLocaleDateString()}</span>
          </div>
          <div className="text-white font-semibold">
            ₹{server.monthly_price?.toLocaleString() || 0}/mo
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Server Details Modal Component
function ServerDetailsModal({ server, onClose, onCopyText, copiedText, getStatusColor, getStatusIcon, getStatusLabel, getPrimaryIp, getServerStorage }: any) {
  const primaryIp = getPrimaryIp(server);
  const totalStorage = getServerStorage(server);
  
  return (
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
        className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-slate-700 shadow-2xl"
      >
        <div className="sticky top-0 bg-gradient-to-br from-slate-800 to-slate-900 p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <Server className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{server.name}</h2>
                <p className="text-slate-400 text-sm">{server.hostname}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg transition"
            >
              <XCircle className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Status & Location */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/50 rounded-xl p-4">
              <p className="text-xs text-slate-400 uppercase mb-2">Status</p>
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(server.status)}`}>
                {getStatusIcon(server.status)}
                {getStatusLabel(server.status)}
              </div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4">
              <p className="text-xs text-slate-400 uppercase mb-2">Location</p>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-400" />
                <p className="text-white">{server.datacenter}</p>
              </div>
              {server.rack_id && (
                <p className="text-slate-400 text-xs mt-1">Rack: {server.rack_id} {server.rack_position && `(U${server.rack_position})`}</p>
              )}
            </div>
          </div>

          {/* IP Addresses */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Wifi className="w-4 h-4 text-indigo-400" />
              Network
            </h3>
            <div className="space-y-2">
              {server.ip_addresses?.map((ip: any) => (
                <div key={ip.id} className="bg-slate-900/30 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <code className="text-white font-mono text-sm">{ip.address}</code>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      ip.status === 'assigned' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'
                    }`}>
                      {ip.status}
                    </span>
                  </div>
                  <button
                    onClick={() => onCopyText(ip.address)}
                    className="p-1 hover:bg-slate-700 rounded transition"
                  >
                    {copiedText === ip.address ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Hardware */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-400" />
              Hardware Specifications
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/30 rounded-xl p-3">
                <p className="text-xs text-slate-500">CPU Model</p>
                <p className="text-white text-sm mt-1">{server.cpu_model}</p>
              </div>
              <div className="bg-slate-900/30 rounded-xl p-3">
                <p className="text-xs text-slate-500">Cores / Threads</p>
                <p className="text-white text-sm mt-1">{server.cpu_cores}C / {server.cpu_threads}T</p>
              </div>
              <div className="bg-slate-900/30 rounded-xl p-3">
                <p className="text-xs text-slate-500">Clock Speed</p>
                <p className="text-white text-sm mt-1">{server.cpu_speed}</p>
              </div>
              <div className="bg-slate-900/30 rounded-xl p-3">
                <p className="text-xs text-slate-500">RAM</p>
                <p className="text-white text-sm mt-1">{server.ram_gb} GB {server.ram_type} {server.ram_speed}</p>
              </div>
            </div>
          </div>

          {/* Storage */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-indigo-400" />
              Storage ({totalStorage} GB Total)
            </h3>
            <div className="space-y-2">
              {server.storage?.map((s: any) => (
                <div key={s.id} className="bg-slate-900/30 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">{s.size_gb} GB {s.type.toUpperCase()}</span>
                    {s.is_primary && (
                      <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full">Primary</span>
                    )}
                  </div>
                  <div className="flex gap-4 mt-1">
                    <span className="text-slate-400 text-xs">RAID: {s.raid_level || "None"}</span>
                    <span className="text-slate-400 text-xs">Drives: {s.drive_count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Client Info */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-400" />
              Assigned Client
            </h3>
            {server.assigned_to ? (
              <div className="bg-slate-900/30 rounded-xl p-4">
                <p className="text-white font-medium">{server.assigned_to.full_name}</p>
                <p className="text-slate-400 text-sm flex items-center gap-1 mt-1">
                  <Mail className="w-3 h-3" />
                  {server.assigned_to.email}
                </p>
                {server.assigned_to.company && (
                  <p className="text-slate-500 text-xs mt-1">{server.assigned_to.company}</p>
                )}
              </div>
            ) : (
              <div className="bg-slate-900/30 rounded-xl p-4">
                <p className="text-slate-400">No client assigned</p>
              </div>
            )}
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/30 rounded-xl p-4">
              <p className="text-xs text-slate-500">Monthly Price</p>
              <p className="text-white text-xl font-bold mt-1">₹{server.monthly_price?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-slate-900/30 rounded-xl p-4">
              <p className="text-xs text-slate-500">Setup Fee</p>
              <p className="text-white text-xl font-bold mt-1">₹{server.setup_fee?.toLocaleString() || 0}</p>
            </div>
          </div>

          {/* Timestamps */}
          <div className="bg-slate-900/30 rounded-xl p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Created</p>
                <p className="text-white text-sm mt-1">{new Date(server.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Last Updated</p>
                <p className="text-white text-sm mt-1">{new Date(server.updated_at).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Empty State Component
function EmptyState({ icon, title, message }: { icon: React.ReactNode; title: string; message: string }) {
  return (
    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-16 flex flex-col items-center justify-center">
      <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6">
        {icon}
      </div>
      <p className="text-slate-400 text-lg font-medium mb-2">{title}</p>
      <p className="text-slate-500 text-sm">{message}</p>
    </div>
  );
}