"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaSearch,
  FaPlus,
  FaFilter,
  FaEye,
  FaReply,
  FaUser,
  FaClock,
  FaCheckCircle,
  FaSpinner,
  FaExclamationTriangle,
  FaFlag,
  FaComment,
  FaEnvelope,
  FaBell,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaSortAmountDown,
  FaSortAmountUp
} from "react-icons/fa";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import api from "@/lib/api/auth";

interface Ticket {
  id: number;
  ticket_number: string;
  subject: string;
  department: "sales" | "billing" | "technical" | "abuse" | "general";
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "resolved" | "closed";
  description: string;
  created_at: string;
  updated_at: string;
  user: {
    full_name: string;
    email: string;
  };
  assigned_to_admin?: {
    email: string;
  };
  messages?: any[];
  last_reply_at?: string;
}

interface Stats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  urgent: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function SupportPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [search, setSearch] = useState("");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"created" | "priority">("created");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [stats, setStats] = useState<Stats>({
    total: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    urgent: 0,
  });

  // Fetch tickets from API
  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append("page", pagination.page.toString());
      params.append("limit", pagination.limit.toString());
      if (filterDepartment !== "all") params.append("department", filterDepartment);
      if (filterPriority !== "all") params.append("priority", filterPriority);
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (search) params.append("search", search);
      
      const response = await api.get(`/tickets?${params.toString()}`);
      const data = response.data;
      
      if (data.success !== false) {
        setTickets(data.tickets || []);
        setPagination(data.pagination);
        
        // Calculate stats from tickets
        const ticketsList = data.tickets || [];
        setStats({
          total: data.pagination.total,
          open: ticketsList.filter((t: Ticket) => t.status === "open").length,
          in_progress: ticketsList.filter((t: Ticket) => t.status === "in_progress").length,
          resolved: ticketsList.filter((t: Ticket) => t.status === "resolved").length,
          urgent: ticketsList.filter((t: Ticket) => t.priority === "urgent").length,
        });
      }
    } catch (err: any) {
      console.error("Failed to fetch tickets:", err);
      setError(err.response?.data?.message || "Failed to load tickets");
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, filterDepartment, filterPriority, filterStatus, search]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low": return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "medium": return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
      case "high": return "bg-orange-500/10 text-orange-400 border-orange-500/30";
      case "urgent": return "bg-red-500/10 text-red-400 border-red-500/30";
      default: return "bg-slate-500/10 text-slate-400";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "in_progress": return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
      case "resolved": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "closed": return "bg-slate-500/10 text-slate-400 border-slate-500/30";
      default: return "bg-slate-500/10 text-slate-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open": return <FaSpinner className="w-3 h-3" />;
      case "in_progress": return <FaClock className="w-3 h-3" />;
      case "resolved": return <FaCheckCircle className="w-3 h-3" />;
      case "closed": return <FaFlag className="w-3 h-3" />;
      default: return <FaComment className="w-3 h-3" />;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "low": return <FaFlag className="w-3 h-3" />;
      case "medium": return <FaFlag className="w-3 h-3" />;
      case "high": return <FaExclamationTriangle className="w-3 h-3" />;
      case "urgent": return <FaExclamationTriangle className="w-3 h-3" />;
      default: return <FaFlag className="w-3 h-3" />;
    }
  };

  const getDepartmentBadge = (department: string) => {
    const colors: Record<string, string> = {
      sales: "bg-purple-500/10 text-purple-400",
      billing: "bg-emerald-500/10 text-emerald-400",
      technical: "bg-cyan-500/10 text-cyan-400",
      abuse: "bg-red-500/10 text-red-400",
      general: "bg-indigo-500/10 text-indigo-400",
    };
    return colors[department] || "bg-slate-500/10 text-slate-400";
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  if (isLoading && tickets.length === 0) {
    return (
      <div className="flex min-h-screen bg-[#0A0E27]">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Topbar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Loading support tickets...</p>
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
                      Support Tickets
                    </h1>
                    <p className="text-slate-400 text-base max-w-2xl">
View and manage your support requests

                    </p>
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push("/support/new")}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium transition-all duration-300 flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                  >
                    <FaPlus className="w-4 h-4" />
                    New Ticket
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400">
                <FaExclamationTriangle className="w-5 h-5" />
                <span className="text-sm flex-1">{error}</span>
                <button onClick={() => setError(null)} className="hover:text-red-300">✕</button>
              </div>
            )}

           

            {/* Filters Bar */}
            <div className="mb-6">
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by ticket number, subject, or description..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <div className="relative">
                      <select
                        value={filterDepartment}
                        onChange={(e) => setFilterDepartment(e.target.value)}
                        className="pl-4 pr-10 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      >
                        <option value="all">All Departments</option>
                        <option value="sales">Sales</option>
                        <option value="billing">Billing</option>
                        <option value="technical">Technical</option>
                        <option value="abuse">Abuse</option>
                        <option value="general">General</option>
                      </select>
                      <FaFilter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none" />
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
                    
                    <button
                      onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                      className="px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white transition flex items-center gap-2"
                    >
                      {sortOrder === "asc" ? <FaSortAmountUp className="w-4 h-4" /> : <FaSortAmountDown className="w-4 h-4" />}
                      {sortBy === "created" ? "Date" : "Priority"}
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
                          value={filterPriority}
                          onChange={(e) => setFilterPriority(e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        >
                          <option value="all">All Priorities</option>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                        
                        <select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        >
                          <option value="all">All Status</option>
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                        
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as "created" | "priority")}
                          className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        >
                          <option value="created">Sort by Date</option>
                          <option value="priority">Sort by Priority</option>
                        </select>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Tickets Table */}
            {tickets.length === 0 ? (
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-16 flex flex-col items-center justify-center">
                <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6">
                  <FaComment className="w-12 h-12 text-slate-600" />
                </div>
                <p className="text-slate-400 text-lg font-medium mb-2">No tickets found</p>
                <p className="text-slate-500 text-sm text-center max-w-md">
                  {search || filterDepartment !== "all" || filterPriority !== "all" || filterStatus !== "all"
                    ? "Try adjusting your filters to see more results"
                    : "Create a new ticket to get support"}
                </p>
                {!search && filterDepartment === "all" && filterPriority === "all" && filterStatus === "all" && (
                  <button
                    onClick={() => router.push("/support/new")}
                    className="mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium flex items-center gap-2"
                  >
                    <FaPlus className="w-4 h-4" />
                    Create New Ticket
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-800/50 border-b border-slate-700">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Ticket</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Subject</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Department</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Priority</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Created</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      <AnimatePresence>
                        {tickets.map((ticket, idx) => (
                          <motion.tr
                            key={ticket.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className="hover:bg-slate-800/30 transition-colors cursor-pointer group"
                            onClick={() => router.push(`/support/${ticket.id}`)}
                          >
                            <td className="px-6 py-4">
                              <span className="font-mono text-white text-sm font-medium">#{ticket.ticket_number}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <p className="text-white text-sm font-medium line-clamp-1">{ticket.subject}</p>
                                <p className="text-xs text-slate-500 mt-0.5">by {ticket.user?.full_name || "Customer"}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getDepartmentBadge(ticket.department)}`}>
                                {ticket.department.charAt(0).toUpperCase() + ticket.department.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                                {getPriorityIcon(ticket.priority)}
                                {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                                {getStatusIcon(ticket.status)}
                                {ticket.status === "in_progress" ? "In Progress" : ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-slate-400 text-sm">{new Date(ticket.created_at).toLocaleDateString()}</span>
                                <span className="text-xs text-slate-500">{new Date(ticket.created_at).toLocaleTimeString()}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/support/${ticket.id}`);
                                  }}
                                  className="p-2 hover:bg-indigo-500/10 rounded-lg transition"
                                  title="View Ticket"
                                >
                                  <FaEye className="w-4 h-4 text-indigo-400" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/support/${ticket.id}?reply=true`);
                                  }}
                                  className="p-2 hover:bg-emerald-500/10 rounded-lg transition"
                                  title="Reply"
                                >
                                  <FaReply className="w-4 h-4 text-emerald-400" />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-slate-500">
                      Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} tickets
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FaChevronLeft className="w-3 h-3" />
                        Previous
                      </button>
                      <div className="flex gap-1">
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                          let pageNum;
                          if (pagination.totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (pagination.page <= 3) {
                            pageNum = i + 1;
                          } else if (pagination.page >= pagination.totalPages - 2) {
                            pageNum = pagination.totalPages - 4 + i;
                          } else {
                            pageNum = pagination.page - 2 + i;
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`w-10 h-10 rounded-lg font-medium transition ${
                                pagination.page === pageNum
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
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
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
    </div>
  );
}

// Stat Card Component
function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  const bgColorMap: Record<string, string> = {
    indigo: "bg-indigo-500/10",
    blue: "bg-blue-500/10",
    yellow: "bg-yellow-500/10",
    emerald: "bg-emerald-500/10",
    red: "bg-red-500/10",
  };
  
  const textColorMap: Record<string, string> = {
    indigo: "text-indigo-400",
    blue: "text-blue-400",
    yellow: "text-yellow-400",
    emerald: "text-emerald-400",
    red: "text-red-400",
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