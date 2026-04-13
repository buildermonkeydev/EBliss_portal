"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaSearch, 
  FaDownload, 
  FaEye, 
  FaFileInvoice, 
  FaCalendarAlt,
  FaSpinner,
  FaExclamationTriangle,
  FaChevronLeft,
  FaChevronRight,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaPrint,
  FaEnvelope,
  FaTimes
} from "react-icons/fa";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import api from "@/lib/api/auth";

export interface Invoice {
  id: number;
  invoice_number: string;
  user_id: number;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  amount: number;
  total: number;
  status: 'pending' | 'paid' | 'overdue' | 'voided';
  due_date: string;
  billing_period_start: string;
  billing_period_end: string;
  created_at: string;
  updated_at: string;
  paid_at?: string;
  pdf_url?: string;
  items_json: {
    transactions: any[];
    vm_summary: any[];
    period: { start: string; end: string };
    user_details?: any;
    payment_details?: any;
  };
  user?: {
    full_name: string;
    email: string;
  };
}

export default function InvoicesPage() {
  const [search, setSearch] = useState("");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isModalLoading, setIsModalLoading] = useState(false);
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
 
  const router = useRouter();

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append("page", pagination.page.toString());
      params.append("limit", pagination.limit.toString());
      if (search) params.append("search", search);
      
      const response = await api.get(`/invoices?${params.toString()}`);
      const data = response.data;
      
      if (data.success !== false) {
        const invoiceList = data.invoices || data.data || [];
        setInvoices(invoiceList);
        setPagination(data.pagination || {
          page: 1,
          limit: 10,
          total: invoiceList.length,
          totalPages: Math.ceil(invoiceList.length / 10),
        });
      }
    } catch (err: any) {
      console.error("Failed to fetch invoices:", err);
      setError(err.response?.data?.message || "Failed to load invoices");
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, search]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const fetchInvoiceDetails = async (id: number) => {
    setIsModalLoading(true);
    try {
      const response = await api.get(`/invoices/${id}`);
      setSelectedInvoice(response.data);
    } catch (err: any) {
      console.error("Failed to fetch invoice details:", err);
      setError(err.response?.data?.message || "Failed to load invoice details");
    } finally {
      setIsModalLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "paid":
        return {
          icon: FaCheckCircle,
          text: "Paid",
          bg: "bg-emerald-50 dark:bg-emerald-500/10",
          textColor: "text-emerald-700 dark:text-emerald-400",
          border: "border-emerald-200 dark:border-emerald-500/20"
        };
      case "pending":
        return {
          icon: FaClock,
          text: "Unpaid",
          bg: "bg-amber-50 dark:bg-amber-500/10",
          textColor: "text-amber-700 dark:text-amber-400",
          border: "border-amber-200 dark:border-amber-500/20"
        };
      case "overdue":
        return {
          icon: FaTimesCircle,
          text: "Overdue",
          bg: "bg-red-50 dark:bg-red-500/10",
          textColor: "text-red-700 dark:text-red-400",
          border: "border-red-200 dark:border-red-500/20"
        };
      default:
        return {
          icon: FaClock,
          text: status,
          bg: "bg-gray-50 dark:bg-gray-500/10",
          textColor: "text-gray-700 dark:text-gray-400",
          border: "border-gray-200 dark:border-gray-500/20"
        };
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount).replace('₹', '₹');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const handleDownloadPDF = async (invoiceId: number, invoiceNumber: string) => {
    try {
      const response = await api.get(`/invoices/${invoiceId}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download invoice:", err);
    }
  };

  const handleEmailInvoice = async (invoiceId: number) => {
    try {
      await api.post(`/invoices/${invoiceId}/email`);
      alert("Invoice sent to your email!");
    } catch (err) {
      console.error("Failed to email invoice:", err);
    }
  };

  const handleViewInvoice = (invoice: Invoice) => {
    fetchInvoiceDetails(invoice.id);
  };

  if (isLoading && invoices.length === 0) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-[#0A0E27]">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Topbar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FaSpinner className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-500 dark:text-slate-400">Loading invoices...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-[#0A0E27]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar />
        
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
                Invoices
              </h1>
              <p className="text-gray-500 dark:text-slate-400 text-sm">
                {pagination.total} invoice{pagination.total !== 1 ? 's' : ''} total
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl flex items-center gap-3">
                <FaExclamationTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />
                <span className="text-sm text-red-700 dark:text-red-400 flex-1">{error}</span>
                <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 dark:hover:text-red-300">
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Search */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by ID, amount, status..."
                  className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl pl-11 pr-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-500/50 transition-all"
                />
              </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Invoice
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      View
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                            <FaFileInvoice className="w-8 h-8 text-gray-400 dark:text-slate-600" />
                          </div>
                          <p className="text-gray-500 dark:text-slate-400 font-medium mb-1">No invoices found</p>
                          <p className="text-gray-400 dark:text-slate-500 text-sm">Try adjusting your search</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    invoices.map((invoice) => {
                      const statusConfig = getStatusConfig(invoice.status);
                      const StatusIcon = statusConfig.icon;
                      
                      return (
                        <tr 
                          key={invoice.id} 
                          className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              #{invoice.invoice_number.split('-').pop() || invoice.id}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-900 dark:text-white font-medium">
                              {formatCurrency(invoice.total || invoice.amount)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600 dark:text-slate-400">
                              {formatDate(invoice.due_date)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.textColor} border ${statusConfig.border}`}>
                              <StatusIcon className="w-3 h-3" />
                              {statusConfig.text}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleViewInvoice(invoice)}
                              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm font-medium flex items-center gap-1 transition-colors"
                            >
                              View
                              <span className="text-lg leading-none">→</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between">
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                      className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <FaChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-gray-600 dark:text-slate-300 min-w-[60px] text-center">
                      {pagination.page} / {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page === pagination.totalPages}
                      className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <FaChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Detail Modal */}
      <AnimatePresence>
        {selectedInvoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedInvoice(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {isModalLoading ? (
                <div className="flex items-center justify-center h-64">
                  <FaSpinner className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
                </div>
              ) : (
                <>
                  {/* Modal Header */}
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Invoice #{selectedInvoice.invoice_number.split('-').pop() || selectedInvoice.id}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        Issued {formatDate(selectedInvoice.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedInvoice(null)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <FaTimes className="w-5 h-5 text-gray-400 dark:text-slate-500" />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 overflow-y-auto max-h-[calc(85vh-180px)]">
                    {/* Status Badge */}
                    <div className="mb-6">
                      {(() => {
                        const config = getStatusConfig(selectedInvoice.status);
                        const Icon = config.icon;
                        return (
                          <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${config.bg} ${config.textColor} border ${config.border}`}>
                            <Icon className="w-4 h-4" />
                            {config.text}
                            {selectedInvoice.paid_at && (
                              <span className="text-xs opacity-75">
                                on {formatDate(selectedInvoice.paid_at)}
                              </span>
                            )}
                          </span>
                        );
                      })()}
                    </div>

                    {/* Amount */}
                    <div className="mb-8">
                      <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">Total Amount</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(selectedInvoice.total || selectedInvoice.amount)}
                      </p>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4">
                        <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Invoice Number</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                          {selectedInvoice.invoice_number}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4">
                        <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Due Date</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatDate(selectedInvoice.due_date)}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4">
                        <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Subtotal</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(selectedInvoice.subtotal || 0)}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4">
                        <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Tax ({selectedInvoice.tax_rate}%)</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(selectedInvoice.tax_amount || 0)}
                        </p>
                      </div>
                    </div>

                    {/* Period */}
                    <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 mb-6">
                      <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">Billing Period</p>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {formatDate(selectedInvoice.billing_period_start)} – {formatDate(selectedInvoice.billing_period_end)}
                      </p>
                    </div>

                    {/* Items from items_json */}
                    {selectedInvoice.items_json?.transactions && selectedInvoice.items_json.transactions.length > 0 && (
                      <div className="mb-6">
                        <p className="text-xs text-gray-500 dark:text-slate-400 mb-3 uppercase tracking-wider">
                          Transactions
                        </p>
                        <div className="space-y-2">
                          {selectedInvoice.items_json.transactions.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-800 last:border-0">
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {item.description || 'Wallet Top-up'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-slate-400">
                                  {formatDate(item.date)}
                                </p>
                              </div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {formatCurrency(item.amount)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 flex gap-3">
                    <button
                      onClick={() => handleDownloadPDF(selectedInvoice.id, selectedInvoice.invoice_number)}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <FaDownload className="w-4 h-4" />
                      Download PDF
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <FaPrint className="w-4 h-4" />
                      Print
                    </button>
                    {/* <button
                      onClick={() => handleEmailInvoice(selectedInvoice.id)}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <FaEnvelope className="w-4 h-4" />
                      Email
                    </button> */}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}