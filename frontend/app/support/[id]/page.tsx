"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaArrowLeft,
  FaReply,
  FaPaperclip,
  FaTrash,
  FaUser,
  FaClock,
  FaCheckCircle,
  FaSpinner,
  FaFlag,
  FaUserSecret,
  FaEnvelope,
  FaServer,
  FaTerminal,
  FaTimes,
  FaCheck,
  FaExclamationTriangle,
  FaInfoCircle,
  FaBuilding,
  FaDatabase,
  FaShieldAlt
} from "react-icons/fa";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import api from "@/lib/api/auth";

interface Message {
  id: number;
  message: string;
  user_id?: number;
  admin_id?: number;
  is_internal?: boolean;
  created_at: string;
  user?: {
    full_name: string;
    email: string;
  };
  admin?: {
    email: string;
  };
}

interface Ticket {
  id: number;
  ticket_number: string;
  subject: string;
  department: string;
  priority: string;
  status: string;
  description: string;
  created_at: string;
  updated_at: string;
  user: {
    full_name: string;
    email: string;
  };
  messages: Message[];
  assigned_to_admin?: {
    email: string;
  };
}

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchTicket = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get(`/tickets/${params.id}`);
      const data = response.data;
      
      if (data.success !== false) {
        setTicket(data.ticket);
      } else {
        throw new Error(data.message || "Failed to fetch ticket");
      }
    } catch (err: any) {
      console.error("Failed to fetch ticket:", err);
      setError(err.response?.data?.message || "Failed to load ticket details");
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const handleReply = async () => {
    if (!reply.trim()) {
      setError("Please enter a message");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.post(`/tickets/${params.id}/reply`, {
        message: reply,
      });

      if (response.data.success !== false) {
        setSuccess("Reply sent successfully!");
        setReply("");
        fetchTicket();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(response.data.message || "Failed to send reply");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send reply");
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsSubmitting(false);
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
      case "closed": return <FaTimes className="w-3 h-3" />;
      default: return <FaInfoCircle className="w-3 h-3" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low": return "bg-blue-500/10 text-blue-400";
      case "medium": return "bg-yellow-500/10 text-yellow-400";
      case "high": return "bg-orange-500/10 text-orange-400";
      case "urgent": return "bg-red-500/10 text-red-400";
      default: return "bg-slate-500/10 text-slate-400";
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

  const getDepartmentIcon = (department: string) => {
    switch (department) {
      case "sales": return <FaBuilding className="w-4 h-4" />;
      case "billing": return <FaDatabase className="w-4 h-4" />;
      case "technical": return <FaServer className="w-4 h-4" />;
      case "abuse": return <FaShieldAlt className="w-4 h-4" />;
      default: return <FaInfoCircle className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-[#0A0E27]">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Topbar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Loading ticket details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div className="flex min-h-screen bg-[#0A0E27]">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Topbar />
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center max-w-md">
              <FaExclamationTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h2 className="text-white text-lg font-semibold mb-2">Ticket Not Found</h2>
              <p className="text-slate-400 mb-6">{error}</p>
              <button
                onClick={() => router.push("/support")}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition"
              >
                Back to Tickets
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-[#0A0E27]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar />
        
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6 lg:p-8">
            {/* Back Button */}
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => router.back()}
              className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition group"
              >
              <FaArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm">Back to Tickets</span>
            </motion.button>

            {/* Ticket Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 mb-6"
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-indigo-400 text-sm bg-indigo-500/10 px-3 py-1 rounded-full">
                      #{ticket.ticket_number}
                    </span>
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                      {getStatusIcon(ticket.status)}
                      {ticket.status === "in_progress" ? "In Progress" : ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                    </div>
                  </div>
                  <h1 className="text-xl lg:text-2xl font-bold text-white">{ticket.subject}</h1>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                    {getPriorityIcon(ticket.priority)}
                    {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)} Priority
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 text-slate-400">
                  <FaUser className="w-4 h-4" />
                  <span>{ticket.user.full_name}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  {getDepartmentIcon(ticket.department)}
                  <span>{ticket.department.charAt(0).toUpperCase() + ticket.department.slice(1)}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <FaClock className="w-4 h-4" />
                  <span>Created: {new Date(ticket.created_at).toLocaleString()}</span>
                </div>
                {ticket.assigned_to_admin && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <FaUserSecret className="w-4 h-4" />
                    <span>Assigned to: {ticket.assigned_to_admin.email}</span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Error/Success Messages */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400"
                >
                  <div className="p-1 bg-red-500/20 rounded-lg">
                    <FaExclamationTriangle className="w-4 h-4" />
                  </div>
                  <span className="text-sm flex-1">{error}</span>
                </motion.div>
              )}
              
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-400"
                >
                  <div className="p-1 bg-emerald-500/20 rounded-lg">
                    <FaCheck className="w-4 h-4" />
                  </div>
                  <span className="text-sm flex-1">{success}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 mb-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                  <FaUser className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{ticket.user.full_name}</p>
                  <p className="text-xs text-slate-500">{new Date(ticket.created_at).toLocaleString()}</p>
                </div>
              </div>
              <div className="text-slate-300 text-sm whitespace-pre-wrap">
                {ticket.description}
              </div>
            </motion.div>

            {/* Messages */}
            {ticket.messages && ticket.messages.length > 0 && (
              <div className="space-y-4 mb-6">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <FaEnvelope className="w-4 h-4 text-indigo-400" />
                  Conversation History
                </h3>
                <AnimatePresence>
                  {ticket.messages.map((message, idx) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border rounded-2xl p-5 ${
                        message.admin_id
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "border-indigo-500/30"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            message.admin_id
                              ? "bg-emerald-500/20"
                              : "bg-indigo-500/20"
                          }`}>
                            {message.admin_id ? (
                              <FaUserSecret className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <FaUser className="w-4 h-4 text-indigo-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">
                              {message.admin_id ? "Support Team" : ticket.user.full_name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {new Date(message.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {message.is_internal && (
                          <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">
                            Internal Note
                          </span>
                        )}
                      </div>
                      <div className="text-slate-300 text-sm whitespace-pre-wrap">
                        {message.message}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Reply Form - Only show if ticket is not closed */}
            {ticket.status !== "closed" && ticket.status !== "resolved" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                    <FaReply className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Add Reply</h3>
                    <p className="text-xs text-slate-500">Our support team will respond within 24 hours</p>
                  </div>
                </div>
                
                <textarea
                  rows={5}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type your response here..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none"
                />
                
                <div className="flex justify-end mt-4">
                  <button
                    onClick={handleReply}
                    disabled={isSubmitting || !reply.trim()}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-medium transition-all duration-300 flex items-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <FaReply className="w-4 h-4" />
                        Send Reply
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Closed Ticket Message */}
            {(ticket.status === "closed" || ticket.status === "resolved") && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-800/30 rounded-xl p-6 text-center border border-slate-700"
              >
                <FaCheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-1">This ticket is {ticket.status}</h3>
                <p className="text-slate-400 text-sm">
                  {ticket.status === "resolved" 
                    ? "If you need further assistance, please create a new ticket."
                    : "Closed tickets cannot be replied to. Please create a new ticket for further assistance."}
                </p>
                <button
                  onClick={() => router.push("/support/new")}
                  className="mt-4 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-medium transition flex items-center gap-2 mx-auto"
                >
                  <FaReply className="w-4 h-4" />
                  Create New Ticket
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}