"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import api from "@/lib/api/auth";
import {
  Database,
  Clock,
  CheckCircle,
  AlertCircle,
  Server,
  MapPin,
  Power,
  PowerOff,
  Circle,
  Search,
  Filter,
  Loader2,
  Wifi,
  HardDrive,
  Zap,
  ExternalLink,
  Copy,
  Check,
  XCircle,
  MoreVertical,
  User,
  Building2
} from "lucide-react";

// Updated interface to match actual API response
interface ColocationPowerFeed {
  id: string;
  colocation_id: string;
  name: string;
  voltage: number;
  amperage: number;
  phase: string;
  power_kw: number;
  status: string;
  created_at: string;
}

interface AssignedUser {
  id: number;
  full_name: string;
  email: string;
  company?: string | null;
}

interface Colocation {
  id: string;
  user_id?: number;
  datacenter: string;
  rack_id: string;
  rack_name?: string | null;
  unit_position: string;
  unit_size: number;
  cabinet_type: string;
  power_capacity_kw: number;
  power_used_kw: number;
  network_port: string;
  bandwidth_mbps: number;
  bandwidth_used_mbps: number;
  cross_connects: number;
  ipv4_allocation?: string;
  ipv6_allocation?: string;
  access_level: string;
  monthly_price: string;
  setup_fee: string;
  status: "active" | "maintenance" | "offline" | "pending" | "suspended" | "terminated";
  contract_start?: string;
  contract_end?: string;
  auto_renew: boolean;
  notes?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  last_inspection?: string | null;
  power_feeds: ColocationPowerFeed[];
  assigned_to?: AssignedUser | null;
  ip_addresses: any[];
}

interface Stats {
  total: number;
  active: number;
  maintenance: number;
  offline: number;
  totalPower: number;
  monthlyRevenue: number;
}

export default function ColocationInfrastructure() {
  const [colocations, setColocations] = useState<Colocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedColocation, setSelectedColocation] = useState<Colocation | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    maintenance: 0,
    offline: 0,
    totalPower: 0,
    monthlyRevenue: 0,
  });

  // Fetch colocation data
  const fetchColocations = useCallback(async () => {
    try {
      const response = await api.get("/colocations");
      const data = response.data;
      
      let colocationList: Colocation[] = [];
      
      if (data.colocations) {
        colocationList = data.colocations;
      } else if (data.data) {
        colocationList = data.data;
      } else if (Array.isArray(data)) {
        colocationList = data;
      }
      
      setColocations(colocationList);
      
      // Calculate stats
      const activeCount = colocationList.filter((c) => c.status === "active").length;
      const maintenanceCount = colocationList.filter((c) => c.status === "maintenance").length;
      const offlineCount = colocationList.filter((c) => c.status === "offline" || c.status === "suspended").length;
      const totalPower = colocationList.reduce((sum, c) => sum + (c.power_capacity_kw || 0), 0);
      const monthlyRevenue = colocationList.reduce((sum, c) => sum + (parseFloat(c.monthly_price) || 0), 0);
      
      setStats({
        total: colocationList.length,
        active: activeCount,
        maintenance: maintenanceCount,
        offline: offlineCount,
        totalPower,
        monthlyRevenue,
      });
    } catch (err: any) {
      console.error("Failed to fetch colocation data:", err);
      setError(err.response?.data?.message || "Failed to load colocation infrastructure");
    }
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      setError(null);
      await fetchColocations();
      setIsLoading(false);
    };
    
    fetchAll();
    
    const interval = setInterval(() => {
      fetchColocations();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchColocations]);

  // Helper function to get display name
  const getColocationName = (colocation: Colocation): string => {
    return colocation.rack_name || colocation.rack_id || 'Unnamed';
  };

  // Filters - with safe property access
  const filteredColocations = colocations.filter((colocation) => {
    const name = getColocationName(colocation);
    const datacenter = colocation.datacenter || '';
    const unitPosition = colocation.unit_position || '';
    const assignedTo = colocation.assigned_to?.full_name || '';
    
    const matchesSearch = searchTerm === '' || 
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      datacenter.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unitPosition.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignedTo.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLocation = selectedLocation === "all" || colocation.datacenter === selectedLocation;
    const matchesStatus = selectedStatus === "all" || colocation.status === selectedStatus;
    
    return matchesSearch && matchesLocation && matchesStatus;
  });

  const locations = [...new Set(colocations.map((c) => c.datacenter).filter(Boolean))];

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "maintenance": return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "offline": return "bg-red-500/10 text-red-400 border-red-500/30";
      case "suspended": return "bg-orange-500/10 text-orange-400 border-orange-500/30";
      case "pending": return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      default: return "bg-slate-500/10 text-slate-400 border-slate-500/30";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return <Power className="w-3 h-3" />;
      case "maintenance": return <Clock className="w-3 h-3" />;
      case "offline": return <PowerOff className="w-3 h-3" />;
      case "suspended": return <AlertCircle className="w-3 h-3" />;
      default: return <Circle className="w-3 h-3" />;
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (isLoading && colocations.length === 0) {
    return (
      <div className="flex min-h-screen bg-[#0A0E27]">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Topbar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Loading colocation infrastructure...</p>
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
                    Colocation Infrastructure
                  </h1>
                  <p className="text-slate-400 text-base max-w-2xl">
                    Manage your colocation racks, power allocation, and infrastructure
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard icon={<Database />} value={stats.total} label="Total Spaces" color="indigo" />
              <StatCard icon={<CheckCircle />} value={stats.active} label="Active" color="emerald" />
              <StatCard icon={<Clock />} value={stats.maintenance} label="Maintenance" color="amber" />
              <StatCard icon={<Zap />} value={`${stats.totalPower.toFixed(1)} kW`} label="Total Power" color="yellow" />
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
                        placeholder="Search by rack, datacenter, or client..."
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
                        <option key={`loc-${loc}`} value={loc}>{loc}</option>
                      ))}
                    </select>
                    
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    >
                      <option value="all">All Status</option>
                      <option value="active">🟢 Active</option>
                      <option value="maintenance">🟡 Maintenance</option>
                      <option value="offline">🔴 Offline</option>
                      <option value="pending">🔵 Pending</option>
                    </select>
                    
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`px-4 py-3 rounded-xl border transition-all duration-300 flex items-center gap-2 ${
                        showFilters 
                          ? "bg-indigo-600 border-indigo-500 text-white" 
                          : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
                      }`}
                    >
                      <Filter className="w-4 h-4" />
                      Filters
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Colocations Grid */}
            {filteredColocations.length === 0 ? (
              <EmptyState icon={<Database />} title="No Colocations Found" message="No colocation infrastructure matches your filters" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <AnimatePresence>
                  {filteredColocations.map((colocation, idx) => (
                    <ColocationCard
                      key={colocation.id}
                      colocation={colocation}
                      index={idx}
                      onViewDetails={() => {
                        setSelectedColocation(colocation);
                        setShowDetailsModal(true);
                      }}
                      onCopyText={handleCopyText}
                      copiedText={copiedText}
                      getStatusColor={getStatusColor}
                      getStatusIcon={getStatusIcon}
                      getStatusLabel={getStatusLabel}
                      getColocationName={getColocationName}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Colocation Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedColocation && (
          <ColocationDetailsModal
            colocation={selectedColocation}
            onClose={() => setShowDetailsModal(false)}
            onCopyText={handleCopyText}
            copiedText={copiedText}
            getStatusColor={getStatusColor}
            getStatusIcon={getStatusIcon}
            getStatusLabel={getStatusLabel}
            getColocationName={getColocationName}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: number | string; label: string; color: string }) {
  const bgColorMap: Record<string, string> = {
    indigo: "bg-indigo-500/10",
    emerald: "bg-emerald-500/10",
    amber: "bg-amber-500/10",
    yellow: "bg-yellow-500/10",
  };
  
  const textColorMap: Record<string, string> = {
    indigo: "text-indigo-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    yellow: "text-yellow-400",
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

// Colocation Card Component
function ColocationCard({ colocation, index, onViewDetails, onCopyText, copiedText, getStatusColor, getStatusIcon, getStatusLabel, getColocationName }: any) {
  const name = getColocationName(colocation);
  const primaryIp = colocation.ip_addresses?.find((ip: any) => ip.status === 'assigned')?.address || '—';
  
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
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">{name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(colocation.status)}`}>
                  {getStatusIcon(colocation.status)}
                  {getStatusLabel(colocation.status)}
                </div>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {colocation.datacenter}
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

        {/* Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between p-2 bg-slate-900/30 rounded-lg">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Server className="w-3 h-3" />
              Unit
            </span>
            <span className="text-white text-sm font-medium">{colocation.unit_position} ({colocation.unit_size}U)</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-slate-900/30 rounded-lg">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Power
            </span>
            <span className="text-white text-sm font-medium">{colocation.power_capacity_kw} kW</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-slate-900/30 rounded-lg">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Wifi className="w-3 h-3" />
              Bandwidth
            </span>
            <span className="text-white text-sm font-medium">{colocation.bandwidth_mbps} Mbps</span>
          </div>
          {colocation.assigned_to && (
            <div className="p-2 bg-slate-900/30 rounded-lg">
              <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                <User className="w-3 h-3" />
                Assigned To
              </p>
              <p className="text-white text-sm">{colocation.assigned_to.full_name}</p>
              <p className="text-slate-400 text-xs">{colocation.assigned_to.email}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-700">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <span>₹{parseFloat(colocation.monthly_price).toLocaleString()}/mo</span>
          </div>
          <button
            onClick={onViewDetails}
            className="text-indigo-400 hover:text-indigo-300 text-xs font-medium flex items-center gap-1"
          >
            View Details
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Colocation Details Modal Component
function ColocationDetailsModal({ colocation, onClose, onCopyText, copiedText, getStatusColor, getStatusIcon, getStatusLabel, getColocationName }: any) {
  const name = getColocationName(colocation);
  
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
                <Database className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{name}</h2>
                <p className="text-slate-400 text-sm">{colocation.datacenter}</p>
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
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(colocation.status)}`}>
                {getStatusIcon(colocation.status)}
                {getStatusLabel(colocation.status)}
              </div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4">
              <p className="text-xs text-slate-400 uppercase mb-2">Cabinet Type</p>
              <p className="text-white">{colocation.cabinet_type}</p>
            </div>
          </div>

          {/* Rack & Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/50 rounded-xl p-4">
              <p className="text-xs text-slate-400 uppercase">Rack</p>
              <div className="flex items-center gap-2 mt-2">
                <Server className="w-4 h-4 text-indigo-400" />
                <p className="text-white">{colocation.rack_id}</p>
              </div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4">
              <p className="text-xs text-slate-400 uppercase">Unit Position</p>
              <p className="text-white mt-2">{colocation.unit_position} ({colocation.unit_size}U)</p>
            </div>
          </div>

          {/* Power & Network */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/50 rounded-xl p-4">
              <p className="text-xs text-slate-400 uppercase">Power Capacity</p>
              <div className="flex items-center gap-2 mt-2">
                <Zap className="w-4 h-4 text-indigo-400" />
                <p className="text-white">{colocation.power_capacity_kw} kW</p>
              </div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4">
              <p className="text-xs text-slate-400 uppercase">Network Port</p>
              <p className="text-white mt-2">{colocation.network_port}</p>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4">
              <p className="text-xs text-slate-400 uppercase">Bandwidth</p>
              <p className="text-white mt-2">{colocation.bandwidth_mbps} Mbps</p>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4">
              <p className="text-xs text-slate-400 uppercase">Cross Connects</p>
              <p className="text-white mt-2">{colocation.cross_connects}</p>
            </div>
          </div>

          {/* Power Feeds */}
          {colocation.power_feeds && colocation.power_feeds.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-400" />
                Power Feeds
              </h3>
              <div className="space-y-2">
                {colocation.power_feeds.map((feed: any) => (
                  <div key={feed.id} className="bg-slate-900/30 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">{feed.name}</span>
                      <span className="text-emerald-400">{feed.power_kw} kW</span>
                    </div>
                    <div className="flex gap-4 mt-1">
                      <span className="text-slate-400 text-xs">{feed.voltage}V</span>
                      <span className="text-slate-400 text-xs">{feed.amperage}A</span>
                      <span className="text-slate-400 text-xs">{feed.phase} phase</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assigned Client */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-400" />
              Assigned Client
            </h3>
            {colocation.assigned_to ? (
              <div className="bg-slate-900/30 rounded-xl p-4">
                <p className="text-white font-medium">{colocation.assigned_to.full_name}</p>
                <p className="text-slate-400 text-sm">{colocation.assigned_to.email}</p>
                {colocation.assigned_to.company && (
                  <p className="text-slate-500 text-xs mt-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {colocation.assigned_to.company}
                  </p>
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
              <p className="text-white text-xl font-bold mt-1">₹{parseFloat(colocation.monthly_price).toLocaleString()}</p>
            </div>
            <div className="bg-slate-900/30 rounded-xl p-4">
              <p className="text-xs text-slate-500">Setup Fee</p>
              <p className="text-white text-xl font-bold mt-1">₹{parseFloat(colocation.setup_fee).toLocaleString()}</p>
            </div>
          </div>

          {/* Contract */}
          {(colocation.contract_start || colocation.contract_end) && (
            <div className="bg-slate-900/30 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-2">Contract Period</p>
              <div className="flex items-center gap-4">
                {colocation.contract_start && (
                  <p className="text-white text-sm">Start: {new Date(colocation.contract_start).toLocaleDateString()}</p>
                )}
                {colocation.contract_end && (
                  <p className="text-white text-sm">End: {new Date(colocation.contract_end).toLocaleDateString()}</p>
                )}
              </div>
              <p className="text-slate-400 text-xs mt-2">
                Auto-renew: {colocation.auto_renew ? 'Yes' : 'No'}
              </p>
            </div>
          )}

          {/* Timestamps */}
          <div className="bg-slate-900/30 rounded-xl p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Created</p>
                <p className="text-white text-sm mt-1">{new Date(colocation.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Last Updated</p>
                <p className="text-white text-sm mt-1">{new Date(colocation.updated_at).toLocaleString()}</p>
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