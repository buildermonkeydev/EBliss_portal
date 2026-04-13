"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaArrowLeft,
  FaPaperclip,
  FaTrash,
  FaUpload,
  FaComment,
  FaFlag,
  FaBuilding,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimes,
  FaInfoCircle,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaServer,
  FaDatabase,
  FaShieldAlt,
  FaClock,
  FaRocket
} from "react-icons/fa";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import api from "@/lib/api/auth";

interface FormData {
  subject: string;
  department: string;
  priority: string;
  description: string;
}

export default function NewTicketPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({
    subject: "",
    department: "technical",
    priority: "medium",
    description: "",
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showTips, setShowTips] = useState(true);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const maxSize = 10 * 1024 * 1024; // 10MB
      const validFiles = newFiles.filter(file => file.size <= maxSize);
      setAttachments([...attachments, ...validFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim()) {
      setError("Please enter a subject");
      return;
    }
    if (!form.description.trim()) {
      setError("Please enter a description");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post("/tickets", {
        subject: form.subject,
        department: form.department,
        priority: form.priority,
        description: form.description,
      });

      if (response.data.success !== false) {
        setSuccess("Ticket created successfully! Redirecting...");
        setTimeout(() => {
          router.push(`/support/${response.data.ticket.id}`);
        }, 1500);
      } else {
        throw new Error(response.data.message || "Failed to create ticket");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to create ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDepartmentIcon = (dept: string) => {
    switch (dept) {
      case "sales": return <FaBuilding className="w-4 h-4" />;
      case "billing": return <FaDatabase className="w-4 h-4" />;
      case "technical": return <FaServer className="w-4 h-4" />;
      case "abuse": return <FaShieldAlt className="w-4 h-4" />;
      default: return <FaComment className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low": return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "medium": return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
      case "high": return "bg-orange-500/10 text-orange-400 border-orange-500/30";
      case "urgent": return "bg-red-500/10 text-red-400 border-red-500/30";
      default: return "bg-slate-500/10 text-slate-400";
    }
  };

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

            {/* Main Form Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden"
            >
              <div className="relative p-6 lg:p-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl" />
                
                {/* Header */}
                <div className="relative flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <FaComment className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-white">Create New Ticket</h1>
                    <p className="text-slate-400 text-sm mt-1">Our support team will respond within 24 hours</p>
                  </div>
                </div>

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
                        <FaTimes className="w-4 h-4" />
                      </div>
                      <span className="text-sm flex-1">{error}</span>
                      <button onClick={() => setError("")} className="hover:text-red-300">✕</button>
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
                        <FaCheckCircle className="w-4 h-4" />
                      </div>
                      <span className="text-sm flex-1">{success}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Form */}
                <form onSubmit={handleSubmit} className="relative space-y-6">
                  {/* Subject */}
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">
                      Subject <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      placeholder="Brief description of your issue"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    />
                  </div>

                  {/* Department & Priority */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-slate-300 text-sm font-medium mb-2">
                        Department
                      </label>
                      <div className="relative">
                        <select
                          value={form.department}
                          onChange={(e) => setForm({ ...form, department: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        >
                          <option value="sales"> Sales - Purchase inquiries</option>
                          <option value="billing"> Billing - Payments & invoices</option>
                          <option value="technical"> Technical Support - Server issues</option>
                          <option value="abuse">Abuse Report - Policy violations</option>
                          <option value="general"> General - Other inquiries</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                          {getDepartmentIcon(form.department)}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 text-sm font-medium mb-2">
                        Priority
                      </label>
                      <div className="relative">
                        <select
                          value={form.priority}
                          onChange={(e) => setForm({ ...form, priority: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        >
                          <option value="low">🟢 Low - General inquiry</option>
                          <option value="medium">🟡 Medium - Non-urgent issue</option>
                          <option value="high">🟠 High - Affecting service</option>
                          <option value="urgent">🔴 Urgent - Critical outage</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <FaFlag className={`w-4 h-4 ${form.priority === "urgent" ? "text-red-400" : form.priority === "high" ? "text-orange-400" : "text-slate-500"}`} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">
                      Description <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      rows={8}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Please provide detailed information about your issue including any error messages, steps to reproduce, and affected services..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none"
                    />
                    <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                      <FaInfoCircle className="w-3 h-3" />
                      The more details you provide, the faster we can help you
                    </p>
                  </div>

                  {/* Attachments */}
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">
                      Attachments (Optional)
                    </label>
                    <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-indigo-500 hover:bg-indigo-500/5 transition-all cursor-pointer group">
                      <input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer block">
                        <div className="w-16 h-16 mx-auto bg-slate-800 rounded-full flex items-center justify-center group-hover:bg-indigo-500/20 transition-all mb-4">
                          <FaUpload className="w-6 h-6 text-slate-500 group-hover:text-indigo-400 transition-all" />
                        </div>
                        <p className="text-slate-400 text-sm group-hover:text-indigo-400 transition-all">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-slate-500 text-xs mt-1">
                          PNG, JPG, PDF, TXT (Max 10MB per file)
                        </p>
                      </label>
                    </div>
                    
                    {attachments.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {attachments.map((file, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center justify-between bg-slate-800/50 rounded-xl p-3 border border-slate-700"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-slate-700 rounded-lg">
                                <FaPaperclip className="w-4 h-4 text-indigo-400" />
                              </div>
                              <div>
                                <p className="text-sm text-white">{file.name}</p>
                                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeAttachment(index)}
                              className="p-2 hover:bg-red-500/10 rounded-lg transition"
                            >
                              <FaTrash className="w-4 h-4 text-red-400" />
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tips Section */}
                  {showTips && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                            <FaRocket className="w-4 h-4 text-indigo-400" />
                          </div>
                          <div>
                            <p className="text-sm text-indigo-300 font-medium">Tips for faster resolution</p>
                            <ul className="text-xs text-slate-400 mt-2 space-y-1">
                              <li>• Include any error messages you're seeing</li>
                              <li>• Share steps to reproduce the issue</li>
                              <li>• Mention any recent changes to your setup</li>
                              <li>• Attach screenshots or logs if possible</li>
                            </ul>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowTips(false)}
                          className="p-1 hover:bg-slate-700 rounded"
                        >
                          <FaTimes className="w-3 h-3 text-slate-500" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => router.back()}
                      className="flex-1 px-6 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium transition-all duration-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Creating Ticket...
                        </>
                      ) : (
                        <>
                          <FaComment className="w-4 h-4" />
                          Create Ticket
                        </>
                      )}
                    </button>
                  </div>

                  {/* Response Time Info */}
                  <div className="text-center pt-2">
                    <p className="text-xs text-slate-500 flex items-center justify-center gap-2">
                      <FaClock className="w-3 h-3" />
                      Priority response times: Urgent (4h) • High (12h) • Medium (24h) • Low (48h)
                    </p>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}