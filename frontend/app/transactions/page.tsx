"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaSearch, 
  FaFilter, 
  FaArrowLeft, 
  FaArrowRight,
  FaWallet,
  FaCreditCard,
  FaCheckCircle,
  FaExclamationTriangle,
  FaDownload,
  FaChartLine,
  FaCalendarAlt,
  FaSortUp,
  FaSortDown,
  FaTimes,
  FaCaretUp,
  FaCaretDown,
  FaRegClock
} from "react-icons/fa";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import api from "@/lib/api/auth";

// Updated Transaction type to include "Usage" as a possible type value
type Transaction = {
  id: number;
  type: "credit" | "debit" | "Usage" | string; // Allow string for flexibility
  payment_method?: string;
  reference_id: string;
  description: string;
  amount: number;
  status?: "completed" | "pending" | "failed";
  created_at: string;
  balance_after: number;
};

type Stats = {
  total: number;
  totalCredit: number;
  totalDebit: number;
  completed: number;
  pending: number;
  failed: number;
  netBalance: number;
};

export default function TransactionsPage() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "year" | "all">("month");
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [stats, setStats] = useState<Stats>({
    total: 0,
    totalCredit: 0,
    totalDebit: 0,
    completed: 0,
    pending: 0,
    failed: 0,
    netBalance: 0,
  });
  
  const router = useRouter();

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append("page", pagination.page.toString());
      params.append("limit", pagination.limit.toString());
      if (filterType !== "all") params.append("type", filterType);
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (dateRange !== "all") params.append("date_range", dateRange);
      if (search) params.append("search", search);
      
      const response = await api.get(`/wallet/transactions?${params.toString()}`);
      const data = response.data;
      
      if (data.success !== false) {
        const txList = data.transactions || data.data || [];
        setTransactions(txList);
        setPagination(data.pagination || {
          page: 1,
          limit: 20,
          total: txList.length,
          totalPages: 1,
        });
        
        const totalCredit = txList
          .filter((tx: Transaction) => tx.type === "credit")
          .reduce((sum: number, tx: Transaction) => sum + tx.amount, 0);
        const totalDebit = txList
          .filter((tx: Transaction) => tx.type === "debit" || tx.type === "Usage")
          .reduce((sum: number, tx: Transaction) => sum + tx.amount, 0);
        const netBalance = totalCredit - totalDebit;
        
        setStats({
          total: txList.length,
          totalCredit,
          totalDebit,
          completed: txList.filter((tx: Transaction) => tx.status === "completed" || !tx.status).length,
          pending: txList.filter((tx: Transaction) => tx.status === "pending").length,
          failed: txList.filter((tx: Transaction) => tx.status === "failed").length,
          netBalance,
        });
      }
    } catch (err: any) {
      console.error("Failed to fetch transactions:", err);
      setError(err.response?.data?.message || "Failed to load transactions");
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, filterType, filterStatus, dateRange, search]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const getTypeColor = (type: string) => {
    if (type === "credit") {
      return "bg-emerald-500/10 text-emerald-400";
    }
    return "bg-red-500/10 text-red-400";
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "pending":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "failed":
        return "bg-red-500/10 text-red-400 border-red-500/30";
      default:
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "completed":
        return <FaCheckCircle className="w-3 h-3" />;
      case "pending":
        return <FaRegClock className="w-3 h-3" />;
      case "failed":
        return <FaExclamationTriangle className="w-3 h-3" />;
      default:
        return <FaCheckCircle className="w-3 h-3" />;
    }
  };

  const getStatusText = (status?: string) => {
    if (!status) return "Completed";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Updated getPaymentMethodName function
  const getPaymentMethodName = (type: string, description?: string, payment_method?: string) => {
    // Check for Usage type or debit with Usage description
    if (type === "Usage" || type === "debit" && description?.toLowerCase().includes("usage")) {
      return "VM Usage";
    }
    
    // For credit transactions with Razorpay
    if (type === "credit" && description?.toLowerCase().includes("razorpay")) {
      return "Razorpay";
    }
    
    // For other credit transactions
    if (type === "credit") {
      return "Wallet Credit";
    }
    
    // For debit transactions
    if (type === "debit") {
      return "Wallet Debit";
    }
    
    // Fallback to payment_method or default
    switch (payment_method) {
      case "wallet":
        return "Wallet Balance";
      case "upi":
        return "UPI";
      case "bonus":
        return "Bonus Credit";
      default:
        return "Razorpay";
    }
  };

  // Get icon for payment method
  const getPaymentMethodIcon = (type: string, description?: string) => {
    if (type === "Usage" || (type === "debit" && description?.toLowerCase().includes("usage"))) {
      return <FaWallet className="w-4 h-4 text-purple-400" />;
    }
    if (type === "credit" && description?.toLowerCase().includes("razorpay")) {
      return <FaCreditCard className="w-4 h-4 text-blue-400" />;
    }
    if (type === "credit") {
      return <FaWallet className="w-4 h-4 text-emerald-400" />;
    }
    return <FaWallet className="w-4 h-4 text-indigo-400" />;
  };

  const filteredTransactions = [...transactions].sort((a, b) => {
    if (sortBy === "date") {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    } else {
      return sortOrder === "asc" ? a.amount - b.amount : b.amount - a.amount;
    }
  });

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get(`/wallet/transactions/export?format=csv`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export CSV:", err);
    }
  };

  if (isLoading && transactions.length === 0) {
    return (
      <div className="flex min-h-screen bg-[#0A0E27]">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Topbar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/30" />
                <div className="absolute inset-0 rounded-full border-t-4 border-indigo-500 animate-spin" />
                <FaWallet className="absolute inset-0 m-auto w-6 h-6 text-indigo-400" />
              </div>
              <p className="text-slate-400 text-sm">Loading transactions...</p>
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

            {/* Header */}
            <div className="relative mb-8">
              <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-8 overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-emerald-500/5 to-cyan-500/5 rounded-full blur-3xl" />
                
                <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                      Transaction History
                    </h1>
                    <p className="text-slate-400 text-base max-w-2xl">
                      Track all your financial activities and payment history
                    </p>
                  </div>
                  
                  <button
                    onClick={() => router.push("/invoices")}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-medium transition-all duration-300 flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                  >
                    <FaChartLine className="w-4 h-4" />
                    View Invoices
                  </button>
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
                  <FaExclamationTriangle className="w-5 h-5" />
                  <span className="text-sm flex-1">{error}</span>
                  <button onClick={() => setError(null)} className="hover:text-red-300">✕</button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard icon={<FaWallet />} value={formatCurrency(stats.netBalance)} label="Net Balance" color="indigo" />
              <StatCard icon={<FaCaretUp />} value={formatCurrency(stats.totalCredit)} label="Total Credits" color="emerald" />
              <StatCard icon={<FaCaretDown />} value={formatCurrency(stats.totalDebit)} label="Total Debits" color="red" />
              <StatCard icon={<FaCheckCircle />} value={stats.completed} label="Completed" color="emerald" />
            </div>

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
                        placeholder="Search by ID, description, or reference..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <select
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value as any)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    >
                      <option value="today">Today</option>
                      <option value="week">Last 7 Days</option>
                      <option value="month">Last 30 Days</option>
                      <option value="year">Last Year</option>
                      <option value="all">All Time</option>
                    </select>
                    
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
                          <option value="all">All Types</option>
                          <option value="credit">💰 Credit</option>
                          <option value="debit">💸 Debit</option>
                        </select>
                        
                        <select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        >
                          <option value="all">All Status</option>
                          <option value="completed">✅ Completed</option>
                          <option value="pending">⏳ Pending</option>
                          <option value="failed">❌ Failed</option>
                        </select>
                        
                        <div className="flex items-center gap-2">
                          <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                          >
                            <option value="date">Sort by Date</option>
                            <option value="amount">Sort by Amount</option>
                          </select>
                          
                          <button
                            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                            className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white transition"
                          >
                            {sortOrder === "asc" ? <FaSortUp className="w-4 h-4" /> : <FaSortDown className="w-4 h-4" />}
                          </button>
                        </div>
                        
                        <button
                          onClick={() => {
                            setFilterType("all");
                            setFilterStatus("all");
                            setDateRange("month");
                            setSortBy("date");
                            setSortOrder("desc");
                          }}
                          className="px-3 py-2 text-sm text-slate-400 hover:text-white transition flex items-center gap-1"
                        >
                          <FaTimes className="w-3 h-3" />
                          Clear Filters
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Transactions Table */}
            {filteredTransactions.length === 0 ? (
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-16 flex flex-col items-center justify-center">
                <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6">
                  <FaWallet className="w-12 h-12 text-slate-600" />
                </div>
                <p className="text-slate-400 text-lg font-medium mb-2">No transactions found</p>
                <p className="text-slate-500 text-sm">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-800/50 border-b border-slate-700">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">ID</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Date & Time</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Method</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Balance</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      <AnimatePresence>
                        {filteredTransactions.map((tx, idx) => (
                          <motion.tr
                            key={tx.id}
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.25, delay: idx * 0.02 }}
                            className="hover:bg-slate-800/30 transition-colors group"
                          >
                            <td className="px-6 py-4">
                              <span className="font-mono text-white text-sm">
                                #{tx.reference_id?.slice(-8) || tx.id}
                              </span>
                            </td>

                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <FaCalendarAlt className="w-3 h-3 text-slate-500" />
                                <span className="text-slate-300 text-sm">
                                  {formatDate(tx.created_at)}
                                </span>
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <p className="text-white text-sm">{tx.description}</p>
                            </td>

                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {getPaymentMethodIcon(tx.type, tx.description)}
                                <span className="text-slate-300 text-sm">
                                  {getPaymentMethodName(tx.type, tx.description, tx.payment_method)}
                                </span>
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <div
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${getTypeColor(
                                  tx.type
                                )}`}
                              >
                                {tx.type === "credit" ? (
                                  <FaCaretUp className="w-3 h-3" />
                                ) : (
                                  <FaCaretDown className="w-3 h-3" />
                                )}
                                {formatCurrency(tx.amount)}
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <span className="text-white text-sm font-medium">
                                {formatCurrency(tx.balance_after)}
                              </span>
                            </td>

                            <td className="px-6 py-4">
                              <div
                                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                  tx.status
                                )}`}
                              >
                                {getStatusIcon(tx.status)}
                                {getStatusText(tx.status)}
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
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} transactions
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        disabled={pagination.page === 1}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FaArrowLeft className="w-3 h-3" />
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
                              onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                              className={`w-10 h-10 rounded-lg font-medium transition ${
                                pagination.page === pageNum
                                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                                  : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        disabled={pagination.page === pagination.totalPages}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                        <FaArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Export Options */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-white transition flex items-center gap-2 text-sm"
              >
                <FaDownload className="w-4 h-4" />
                Export CSV
              </button>
            </div>

            {/* Footer Note */}
            <div className="mt-6 text-center">
              <p className="text-xs text-slate-500">
                Showing transactions from your wallet history. All amounts are in Indian Rupees (₹).
              </p>
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
    red: "bg-red-500/10",
    amber: "bg-amber-500/10",
  };
  
  const textColorMap: Record<string, string> = {
    indigo: "text-indigo-400",
    emerald: "text-emerald-400",
    red: "text-red-400",
    amber: "text-amber-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="relative group overflow-hidden bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 hover:border-slate-600/50 transition-all duration-300"
    >
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br opacity-10 rounded-full blur-2xl" />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-xs uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl ${bgColorMap[color]} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
          <div className={`w-6 h-6 ${textColorMap[color]}`}>{icon}</div>
        </div>
      </div>
    </motion.div>
  );
}