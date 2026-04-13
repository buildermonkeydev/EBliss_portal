"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaSearch,
  FaFilter,
  FaCalendarAlt,
  FaDownload,
  FaEye,
  FaServer,
  FaUser,
  FaShieldAlt,
  FaKey,
  FaDatabase,
  FaCloudUploadAlt,
  FaCloudDownloadAlt,
  FaPowerOff,
  FaPlay,
  FaStop,
  FaSync,
  FaTrash,
  FaSpinner,
  FaChevronLeft,
  FaChevronRight,
  FaTimes,
  FaInfoCircle,
  FaCheckCircle,
  FaExclamationTriangle,
  FaClock,
  FaSignInAlt,
  FaSignOutAlt,
  FaEdit,
  FaPlusCircle,
  FaMinusCircle,
  FaLock,
  FaGlobe,
  FaMobileAlt,
  FaLaptop,
  FaTabletAlt
} from "react-icons/fa";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import api from "@/lib/api/auth";

interface SystemActivityLog {
  id: string;
  action: string;
  actionType: "create" | "update" | "delete" | "start" | "stop" | "reboot" | "login" | "security";
  description: string;
  service: string;
  serviceType: "vps" | "firewall" | "ssh" | "billing" | "account";
  ipAddress: string;
  userAgent?: string;
  timestamp: string;
  status: "success" | "failed" | "warning";
  metadata?: Record<string, any>;
}

interface UserActivityLog {
  id: number;
  action: string;
  description: string;
  ip_address: string;
  location: string;
  device_type: string;
  user_agent: string;
  status: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface Stats {
  total: number;
  success: number;
  failed: number;
  warning: number;
  vps: number;
  security: number;
  firewall: number;
  ssh: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function ActivityLogsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "all">("week");
  const [showFilters, setShowFilters] = useState(false);
  const [systemLogs, setSystemLogs] = useState<SystemActivityLog[]>([]);
  const [userLogs, setUserLogs] = useState<UserActivityLog[]>([]);
  const [activeTab, setActiveTab] = useState<"system" | "user">("system");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [systemPagination, setSystemPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [userPagination, setUserPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [selectedLog, setSelectedLog] = useState<SystemActivityLog | UserActivityLog | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    success: 0,
    failed: 0,
    warning: 0,
    vps: 0,
    security: 0,
    firewall: 0,
    ssh: 0
  });

  const itemsPerPage = 20;

  // Fetch system activity logs
  const fetchSystemLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      params.append("page", systemPagination.page.toString());
      params.append("limit", itemsPerPage.toString());
      params.append("dateRange", dateRange);
      if (filterType !== "all") params.append("serviceType", filterType);
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (searchQuery) params.append("search", searchQuery);
      
      const response = await api.get(`/activity-logs?${params.toString()}`);
      const data = response.data;
      
      if (data.success !== false) {
        setSystemLogs(data.logs || []);
        setSystemPagination({
          page: data.pagination?.page || 1,
          limit: data.pagination?.limit || itemsPerPage,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 1,
        });
        setStats(data.stats || {
          total: 0,
          success: 0,
          failed: 0,
          warning: 0,
          vps: 0,
          security: 0,
          firewall: 0,
          ssh: 0
        });
      } else {
        throw new Error(data.message || "Failed to fetch activity logs");
      }
    } catch (err: any) {
      console.error("Error fetching system logs:", err);
      setError(err.response?.data?.message || "Failed to load activity logs");
    } finally {
      setIsLoading(false);
    }
  }, [systemPagination.page, dateRange, filterType, filterStatus, searchQuery]);

  // Fetch user activity logs (login history)
  const fetchUserLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      params.append("limit", itemsPerPage.toString());
      params.append("page", userPagination.page.toString());
      
      const response = await api.get(`/users/me/activity?${params.toString()}`);
      const data = response.data;
      
      if (data.success !== false) {
        // Transform the API response to match UserActivityLog interface
        const transformedLogs: UserActivityLog[] = (data.activities || []).map((activity: any) => ({
          id: activity.id,
          action: activity.action,
          description: activity.description,
          ip_address: activity.ip_address,
          location: activity.location,
          device_type: activity.device_type,
          user_agent: activity.user_agent,
          status: activity.status,
          timestamp: activity.timestamp,
          metadata: activity.metadata,
        }));
        
        setUserLogs(transformedLogs);
        setUserPagination({
          page: data.pagination?.page || 1,
          limit: data.pagination?.limit || itemsPerPage,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 1,
        });
      }
    } catch (err: any) {
      console.error("Error fetching user logs:", err);
      setError(err.response?.data?.message || "Failed to load user activity logs");
    } finally {
      setIsLoading(false);
    }
  }, [userPagination.page]);

  useEffect(() => {
    if (activeTab === "system") {
      fetchSystemLogs();
    } else {
      fetchUserLogs();
    }
  }, [fetchSystemLogs, fetchUserLogs, activeTab]);

  const handleSystemPageChange = (newPage: number) => {
    setSystemPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleUserPageChange = (newPage: number) => {
    setUserPagination(prev => ({ ...prev, page: newPage }));
  };

  const exportLogs = async () => {
    try {
      const params = new URLSearchParams();
      params.append("format", "csv");
      params.append("dateRange", dateRange);
      if (filterType !== "all") params.append("serviceType", filterType);
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (searchQuery) params.append("search", searchQuery);
      
      const response = await api.get(`/activity-logs/export?${params.toString()}`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Error exporting logs:", err);
      setError("Failed to export logs");
      setTimeout(() => setError(null), 3000);
    }
  };

  const getActionIcon = (action: string, actionType?: string) => {
    const actionLower = action?.toLowerCase() || '';
    if (actionLower.includes('login') || actionType === 'login') return <FaSignInAlt className="w-3 h-3" />;
    if (actionLower.includes('start')) return <FaPlay className="w-3 h-3" />;
    if (actionLower.includes('stop')) return <FaStop className="w-3 h-3" />;
    if (actionLower.includes('reboot') || actionLower.includes('restart')) return <FaSync className="w-3 h-3" />;
    if (actionLower.includes('create')) return <FaPlusCircle className="w-3 h-3" />;
    if (actionLower.includes('delete') || actionLower.includes('destroy')) return <FaTrash className="w-3 h-3" />;
    if (actionLower.includes('update') || actionLower.includes('edit')) return <FaEdit className="w-3 h-3" />;
    if (actionLower.includes('security')) return <FaShieldAlt className="w-3 h-3" />;
    return <FaDatabase className="w-3 h-3" />;
  };

  const getDeviceIcon = (deviceType: string) => {
    const type = deviceType?.toLowerCase() || '';
    if (type.includes('mobile')) return <FaMobileAlt className="w-3 h-3" />;
    if (type.includes('tablet')) return <FaTabletAlt className="w-3 h-3" />;
    if (type.includes('desktop') || type.includes('laptop')) return <FaLaptop className="w-3 h-3" />;
    return <FaLaptop className="w-3 h-3" />;
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "success":
      case "completed":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "failed":
      case "error":
        return "bg-red-500/10 text-red-400 border-red-500/30";
      case "warning":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      default:
        return "bg-slate-500/10 text-slate-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "success":
      case "completed":
        return <FaCheckCircle className="w-3 h-3" />;
      case "failed":
      case "error":
        return <FaTimes className="w-3 h-3" />;
      case "warning":
        return <FaExclamationTriangle className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status?.toLowerCase()) {
      case "success": return "Success";
      case "failed": return "Failed";
      case "warning": return "Warning";
      case "completed": return "Completed";
      default: return status || "Unknown";
    }
  };

  const handleViewDetails = (log: SystemActivityLog | UserActivityLog) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  };

  const statCards = [
    { label: "Total Events", value: stats.total, icon: FaDatabase, color: "from-indigo-500 to-purple-500", bgColor: "bg-indigo-500/10", textColor: "text-indigo-400" },
    { label: "Successful", value: stats.success, icon: FaCheckCircle, color: "from-emerald-500 to-teal-500", bgColor: "bg-emerald-500/10", textColor: "text-emerald-400" },
    { label: "Failed", value: stats.failed, icon: FaTimes, color: "from-red-500 to-orange-500", bgColor: "bg-red-500/10", textColor: "text-red-400" },
    { label: "VPS Actions", value: stats.vps, icon: FaServer, color: "from-blue-500 to-cyan-500", bgColor: "bg-blue-500/10", textColor: "text-blue-400" },
    { label: "Security Events", value: stats.security, icon: FaShieldAlt, color: "from-amber-500 to-orange-500", bgColor: "bg-amber-500/10", textColor: "text-amber-400" },
  ];

  const currentPagination = activeTab === "system" ? systemPagination : userPagination;
  const currentItems = activeTab === "system" ? systemLogs : userLogs;

  if (isLoading && ((activeTab === "system" && systemLogs.length === 0) || (activeTab === "user" && userLogs.length === 0))) {
    return (
      <div className="flex min-h-screen bg-[#0A0E27]">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Topbar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FaSpinner className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Loading activity logs...</p>
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
                      Activity Logs
                    </h1>
                    <p className="text-slate-400 text-base max-w-2xl">
                      Track all system events, VPS actions, and security activities across your infrastructure
                    </p>
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={exportLogs}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium transition-all duration-300 flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                  >
                    <FaDownload className="w-4 h-4" />
                    Export CSV
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400"
                >
                  <div className="p-1 bg-red-500/20 rounded-lg">
                    <FaTimes className="w-4 h-4" />
                  </div>
                  <span className="text-sm flex-1">{error}</span>
                  <button onClick={() => setError(null)} className="hover:text-red-300">✕</button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
              {statCards.map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="relative group overflow-hidden bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 hover:border-slate-600/50 transition-all duration-300"
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

            {/* Tabs */}
            <div className="mb-6">
              <div className="flex gap-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-1 w-fit">
                <button
                  onClick={() => {
                    setActiveTab("system");
                    setError(null);
                  }}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                    activeTab === "system"
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                  }`}
                >
                  <FaServer className="w-4 h-4" />
                  System Logs
                </button>
                <button
                  onClick={() => {
                    setActiveTab("user");
                    setError(null);
                  }}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                    activeTab === "user"
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                  }`}
                >
                  <FaUser className="w-4 h-4" />
                  User Login History
                </button>
              </div>
            </div>

            {/* Filters Bar - Only for System Logs */}
            {activeTab === "system" && (
              <div className="relative mb-6">
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4">
                  <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search by action, description, or service..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <div className="relative">
                        <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                        <select
                          value={dateRange}
                          onChange={(e) => setDateRange(e.target.value as any)}
                          className="pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        >
                          <option value="today">Today</option>
                          <option value="week">Last 7 Days</option>
                          <option value="month">Last 30 Days</option>
                          <option value="all">All Time</option>
                        </select>
                      </div>
                      
                      <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-4 py-3 rounded-xl border transition-all duration-300 flex items-center gap-2 ${
                          showFilters 
                            ? "bg-indigo-600 border-indigo-500 text-white" 
                            : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
                        }`}
                      >
                        <FaFilter className="w-4 h-4" />
                        Filters
                      </button>
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {showFilters && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-slate-700 overflow-hidden"
                      >
                        <div className="flex flex-wrap gap-4">
                          <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                          >
                            <option value="all">All Services</option>
                            <option value="vps">💻 VPS</option>
                            <option value="firewall">🛡️ Firewall</option>
                            <option value="ssh">🔑 SSH Keys</option>
                            <option value="billing">💰 Billing</option>
                            <option value="account">👤 Account</option>
                          </select>
                          
                          <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                          >
                            <option value="all">All Status</option>
                            <option value="success">✅ Success</option>
                            <option value="failed">❌ Failed</option>
                            <option value="warning">⚠️ Warning</option>
                          </select>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Activity Logs Table */}
            {currentItems.length === 0 ? (
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-16 flex flex-col items-center justify-center">
                <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6">
                  <FaDatabase className="w-12 h-12 text-slate-600" />
                </div>
                <p className="text-slate-400 text-lg font-medium mb-2">No activity logs found</p>
                <p className="text-slate-500 text-sm text-center max-w-md">
                  {activeTab === "system" 
                    ? "Try adjusting your filters or search query to see more results"
                    : "No login history found for your account"}
                </p>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-800/50 border-b border-slate-700">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">ID</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Action</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Description / Details</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Location / IP</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Timestamp</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      <AnimatePresence mode="popLayout">
                        {currentItems.map((item, idx) => {
                          const isUserLog = activeTab === "user";
                          const logItem = item as any;
                          
                          return (
                            <motion.tr
                              key={`${activeTab}-${logItem.id}`}
                              layout
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ duration: 0.25, delay: idx * 0.02 }}
                              className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                              onClick={() => handleViewDetails(logItem)}
                            >
                              <td className="px-6 py-4">
                                <span className="font-mono text-white text-sm">
                                  #{isUserLog ? logItem.id : logItem.id.slice(0, 8)}
                                </span>
                              </td>
                              
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-indigo-500/10">
                                    {getActionIcon(logItem.action, logItem.actionType)}
                                  </div>
                                  <span className="text-white text-sm font-medium">
                                    {isUserLog 
                                      ? (logItem.action === "LOGIN_SUCCESS" ? "Login Success" : "Login Failed")
                                      : logItem.action}
                                  </span>
                                </div>
                              </td>
                              
                              <td className="px-6 py-4">
                                <p className="text-slate-300 text-sm max-w-xs truncate">
                                  {logItem.description}
                                </p>
                                {isUserLog && logItem.device_type && (
                                  <div className="flex items-center gap-1 mt-1">
                                    {getDeviceIcon(logItem.device_type)}
                                    <span className="text-xs text-slate-500">{logItem.device_type}</span>
                                  </div>
                                )}
                              </td>
                              
                              <td className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                  <code className="text-slate-300 text-xs font-mono">
                                    {isUserLog ? logItem.ip_address : logItem.ipAddress}
                                  </code>
                                  {isUserLog && logItem.location && (
                                    <span className="text-xs text-slate-500 flex items-center gap-1">
                                      <FaGlobe className="w-3 h-3" />
                                      {logItem.location}
                                    </span>
                                  )}
                                </div>
                              </td>
                              
                              <td className="px-6 py-4">
                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(logItem.status)}`}>
                                  {getStatusIcon(logItem.status)}
                                  {getStatusText(logItem.status)}
                                </div>
                              </td>
                              
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                                  <FaClock className="w-3 h-3" />
                                  {new Date(logItem.timestamp).toLocaleString()}
                                </div>
                              </td>
                              
                              <td className="px-6 py-4">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewDetails(logItem);
                                  }}
                                  className="p-2 hover:bg-indigo-500/10 rounded-lg transition group"
                                  title="View Details"
                                >
                                  <FaEye className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300" />
                                </button>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                {currentPagination.totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-slate-500">
                      Showing {(currentPagination.page - 1) * currentPagination.limit + 1} to {Math.min(currentPagination.page * currentPagination.limit, currentPagination.total)} of {currentPagination.total} items
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (activeTab === "system") {
                            handleSystemPageChange(currentPagination.page - 1);
                          } else {
                            handleUserPageChange(currentPagination.page - 1);
                          }
                        }}
                        disabled={currentPagination.page === 1}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FaChevronLeft className="w-3 h-3" />
                        Previous
                      </button>
                      <div className="flex gap-1">
                        {Array.from({ length: Math.min(5, currentPagination.totalPages) }, (_, i) => {
                          let pageNum;
                          if (currentPagination.totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPagination.page <= 3) {
                            pageNum = i + 1;
                          } else if (currentPagination.page >= currentPagination.totalPages - 2) {
                            pageNum = currentPagination.totalPages - 4 + i;
                          } else {
                            pageNum = currentPagination.page - 2 + i;
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => {
                                if (activeTab === "system") {
                                  handleSystemPageChange(pageNum);
                                } else {
                                  handleUserPageChange(pageNum);
                                }
                              }}
                              className={`w-10 h-10 rounded-lg font-medium transition ${
                                currentPagination.page === pageNum
                                  ? "bg-indigo-600 text-white"
                                  : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => {
                          if (activeTab === "system") {
                            handleSystemPageChange(currentPagination.page + 1);
                          } else {
                            handleUserPageChange(currentPagination.page + 1);
                          }
                        }}
                        disabled={currentPagination.page === currentPagination.totalPages}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                        <FaChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedLog && (
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
                      <FaInfoCircle className="w-5 h-5 text-indigo-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Event Details</h2>
                  </div>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="p-2 hover:bg-slate-700 rounded-lg transition"
                  >
                    <FaTimes className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wider">Event ID</label>
                    <p className="text-white font-mono mt-1 text-sm">{(selectedLog as any).id}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wider">Status</label>
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mt-1 ${getStatusColor((selectedLog as any).status)}`}>
                      {getStatusIcon((selectedLog as any).status)}
                      {getStatusText((selectedLog as any).status)}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wider">Action</label>
                    <p className="text-white mt-1 text-sm">{(selectedLog as any).action}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wider">IP Address</label>
                    <p className="text-white font-mono mt-1 text-sm">{(selectedLog as any).ipAddress || (selectedLog as any).ip_address}</p>
                  </div>
                  {(selectedLog as any).location && (
                    <div>
                      <label className="text-xs text-slate-400 uppercase tracking-wider">Location</label>
                      <p className="text-white mt-1 text-sm">{(selectedLog as any).location}</p>
                    </div>
                  )}
                  {(selectedLog as any).device_type && (
                    <div>
                      <label className="text-xs text-slate-400 uppercase tracking-wider">Device Type</label>
                      <p className="text-white mt-1 text-sm capitalize">{(selectedLog as any).device_type}</p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <label className="text-xs text-slate-400 uppercase tracking-wider">Description</label>
                    <p className="text-slate-300 mt-1 text-sm">{(selectedLog as any).description}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-slate-400 uppercase tracking-wider">User Agent</label>
                    <p className="text-slate-300 text-xs mt-1 break-all">{(selectedLog as any).user_agent || (selectedLog as any).userAgent || "N/A"}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-slate-400 uppercase tracking-wider">Timestamp</label>
                    <p className="text-white mt-1 text-sm">{new Date((selectedLog as any).timestamp).toLocaleString()}</p>
                  </div>
                </div>
                
                {(selectedLog as any).metadata && Object.keys((selectedLog as any).metadata).length > 0 && (
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wider">Additional Metadata</label>
                    <pre className="mt-2 p-3 bg-slate-900 rounded-lg text-xs text-slate-300 overflow-x-auto">
                      {JSON.stringify((selectedLog as any).metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}