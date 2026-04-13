"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaKey, 
  FaPlus, 
  FaSearch, 
  FaTrash, 
  FaEdit, 
  FaCopy, 
  FaCheck,
  FaServer,
  FaLock,
  FaShieldAlt,
  FaCalendarAlt,
  FaUser,
  FaEye,
  FaEyeSlash,
  FaDownload,
  FaSync,
  FaChartLine
} from "react-icons/fa";
import { BiFingerprint } from "react-icons/bi";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import api from "@/lib/api/auth";

interface SSHKey {
  id: string;
  name: string;
  publicKey: string;
  fingerprint: string;
  type: string;
  description?: string;
  isActive: boolean;
  lastUsed?: string;
  usedCount: number;
  createdAt: string;
}

interface VM {
  id: number;
  vmid: number;
  name: string;
  status: string;
}

export default function SSHKeysPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [keys, setKeys] = useState<SSHKey[]>([]);
  const [vms, setVMs] = useState<VM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState<SSHKey | null>(null);
  const [selectedVM, setSelectedVM] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showKeyContent, setShowKeyContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    totalUsage: 0,
  });

  // Fetch SSH keys
  const fetchSSHKeys = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get("/ssh-keys");
      const data = response.data;
      
      if (data.success !== false) {
        const keysList = data.keys || [];
        setKeys(keysList);
        setStats({
          total: keysList.length,
          active: keysList.filter((k: SSHKey) => k.isActive).length,
          totalUsage: keysList.reduce((sum: number, k: SSHKey) => sum + (k.usedCount || 0), 0),
        });
      }
    } catch (err: any) {
      console.error("Failed to fetch SSH keys:", err);
      setError(err.response?.data?.message || "Failed to load SSH keys");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch VMs for assignment
  const fetchVMs = async () => {
    try {
      const response = await api.get("/vms");
      const data = response.data;
      const vmList = data.data || data.vms || [];
      setVMs(vmList);
    } catch (err) {
      console.error("Failed to fetch VMs:", err);
    }
  };

  // Sync keys from Proxmox
  const syncKeys = async () => {
    setIsLoading(true);
    try {
      const response = await api.post("/ssh-keys/sync");
      if (response.data.success !== false) {
        setSuccess("SSH keys synced successfully!");
        setTimeout(() => setSuccess(null), 3000);
        fetchSSHKeys();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to sync keys");
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete SSH key
  const handleDeleteKey = async (keyId: string) => {
    try {
      const response = await api.delete(`/ssh-keys/${keyId}`);
      
      if (response.data.success !== false) {
        setKeys(keys.filter(k => k.id !== keyId));
        setSuccess("SSH key deleted successfully!");
        setTimeout(() => setSuccess(null), 3000);
      }
      setShowDeleteConfirm(null);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete key");
      setTimeout(() => setError(null), 3000);
    }
  };

  // Assign SSH key to VM
  const handleAssignKey = async () => {
    if (!showAssignModal || !selectedVM) return;
    
    try {
      const response = await api.post("/ssh-keys/add-to-vm", {
        keyIds: [showAssignModal.id],
        vmid: parseInt(selectedVM),
        node: vms.find(v => v.vmid === parseInt(selectedVM))?.status === "running" ? "pve-1" : "pve-1",
      });
      
      if (response.data.success !== false) {
        setSuccess(`Key "${showAssignModal.name}" assigned to VM successfully!`);
        setTimeout(() => setSuccess(null), 3000);
        fetchSSHKeys();
      }
      setShowAssignModal(null);
      setSelectedVM("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to assign key");
      setTimeout(() => setError(null), 3000);
    }
  };

  // Export key
  const handleExportKey = async (keyId: string, keyName: string) => {
    try {
      const response = await api.get(`/ssh-keys/${keyId}/export`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${keyName}.pub`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export key:", err);
      setError("Failed to export key");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleCopyKey = (key: string, keyId: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getKeyTypeColor = (type: string) => {
    switch(type?.toLowerCase()) {
      case "rsa": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "ed25519": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "ecdsa": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      default: return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const getKeyTypeIcon = (type: string) => {
    switch(type?.toLowerCase()) {
      case "rsa": return "🔐";
      case "ed25519": return "🔑";
      case "ecdsa": return "🛡️";
      default: return "🔑";
    }
  };

  useEffect(() => {
    fetchSSHKeys();
    fetchVMs();
  }, []);

  const filteredKeys = keys.filter(k =>
    k.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.fingerprint?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-[#0A0E27]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar />
        
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[1600px] mx-auto p-6 lg:p-8">
            {/* Hero Section */}
            <div className="relative mb-8">
              <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-8 overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-emerald-500/5 to-cyan-500/5 rounded-full blur-3xl" />
                
                <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                  <div>
                   
                    <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                      SSH Key Manager
                    </h1>
                    <p className="text-slate-400 text-base max-w-2xl">
                      Manage secure access keys for passwordless authentication to your virtual machines
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={syncKeys}
                      className="px-5 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium transition-all duration-300 flex items-center gap-2"
                    >
                      <FaSync className="w-4 h-4" />
                      Sync Keys
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => router.push("/ssh-keys/new")}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium transition-all duration-300 flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                    >
                      <FaPlus className="w-4 h-4" />
                      Add SSH Key
                    </motion.button>
                  </div>
                </div>
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
                    <FaKey className="w-4 h-4" />
                  </div>
                  <span className="text-sm flex-1">{error}</span>
                  <button onClick={() => setError(null)} className="hover:text-red-300">✕</button>
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

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {[
                { label: "Total Keys", value: stats.total, icon: FaKey, color: "from-indigo-500 to-purple-500", bgColor: "bg-indigo-500/10", textColor: "text-indigo-400" },
                { label: "Active Keys", value: stats.active, icon: FaLock, color: "from-emerald-500 to-teal-500", bgColor: "bg-emerald-500/10", textColor: "text-emerald-400" },
                { label: "Total Assignments", value: stats.totalUsage, icon: FaServer, color: "from-blue-500 to-cyan-500", bgColor: "bg-blue-500/10", textColor: "text-blue-400" },
              ].map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="relative group overflow-hidden bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 hover:border-slate-600/50 transition-all duration-300"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-10 rounded-full blur-2xl" />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm">{stat.label}</p>
                      <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                      <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Search Bar */}
            <div className="relative mb-6">
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search keys by name or fingerprint..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Keys Grid */}
            {isLoading ? (
              <div className="flex items-center justify-center py-32">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-slate-400">Loading SSH keys...</p>
                </div>
              </div>
            ) : filteredKeys.length === 0 ? (
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-16 flex flex-col items-center justify-center">
                <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6">
                  <FaKey className="w-12 h-12 text-slate-600" />
                </div>
                <p className="text-slate-400 text-lg font-medium mb-2">No SSH Keys Found</p>
                <p className="text-slate-500 text-sm text-center max-w-md mb-6">
                  Add your first SSH key to securely connect to your virtual machines without passwords
                </p>
                <button
                  onClick={() => router.push("/ssh-keys/new")}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                  <FaPlus className="w-4 h-4" />
                  Add Your First Key
                </button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence>
                  {filteredKeys.map((key, idx) => (
                    <motion.div
                      key={key.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group relative overflow-hidden bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl hover:border-slate-600/50 transition-all duration-300 hover:shadow-xl hover:shadow-black/20"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-2xl" />
                      
                      <div className="relative p-5">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                              <FaKey className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="text-white font-semibold text-lg">{key.name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${getKeyTypeColor(key.type)}`}>
                                  {getKeyTypeIcon(key.type)} {key.type?.toUpperCase() || "RSA"}
                                </span>
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <BiFingerprint className="w-3 h-3" />
                                  {key.fingerprint?.substring(0, 16)}...
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleExportKey(key.id, key.name)}
                              className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
                              title="Export key"
                            >
                              <FaDownload className="w-4 h-4 text-slate-400" />
                            </button>
                            <button
                              onClick={() => router.push(`/ssh-keys/edit/${key.id}`)}
                              className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
                              title="Edit key"
                            >
                              <FaEdit className="w-4 h-4 text-slate-400" />
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(key.id)}
                              className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Delete key"
                            >
                              <FaTrash className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
                        </div>

                        {/* Key Content */}
                        <div className="mb-4 p-3 bg-slate-900/50 rounded-xl border border-slate-700/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-slate-500">Public Key</span>
                            <button
                              onClick={() => setShowKeyContent(showKeyContent === key.id ? null : key.id)}
                              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                            >
                              {showKeyContent === key.id ? <FaEyeSlash className="w-3 h-3" /> : <FaEye className="w-3 h-3" />}
                              {showKeyContent === key.id ? "Hide" : "Show"}
                            </button>
                          </div>
                          <div className="relative">
                            <code className="text-xs font-mono text-slate-300 break-all block pr-8">
                              {showKeyContent === key.id 
                                ? key.publicKey?.substring(0, 100) + "..."
                                : "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ..."}
                            </code>
                            <button
                              onClick={() => handleCopyKey(key.publicKey, key.id)}
                              className="absolute top-0 right-0 p-1 hover:bg-slate-700 rounded transition-colors"
                              title="Copy full key"
                            >
                              {copiedKey === key.id ? (
                                <FaCheck className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <FaCopy className="w-3 h-3 text-slate-400" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Metadata */}
                        <div className="space-y-2 mb-4 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 flex items-center gap-1">
                              <FaCalendarAlt className="w-3 h-3" />
                              Created
                            </span>
                            <span className="text-slate-300">{new Date(key.createdAt).toLocaleDateString()}</span>
                          </div>
                          {key.lastUsed && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 flex items-center gap-1">
                                <FaServer className="w-3 h-3" />
                                Last Used
                              </span>
                              <span className="text-slate-300">{new Date(key.lastUsed).toLocaleDateString()}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 flex items-center gap-1">
                              <FaChartLine className="w-3 h-3" />
                              Usage Count
                            </span>
                            <span className="text-slate-300">{key.usedCount || 0} times</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 flex items-center gap-1">
                              <FaLock className="w-3 h-3" />
                              Status
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${key.isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                              {key.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2 border-t border-slate-700">
                          <button
                            onClick={() => setShowAssignModal(key)}
                            disabled={!key.isActive}
                            className="flex-1 px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <FaServer className="w-4 h-4" />
                            Assign to VM
                          </button>
                          <button
                            onClick={() => handleCopyKey(key.publicKey, key.id)}
                            className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors flex items-center gap-2"
                          >
                            {copiedKey === key.id ? <FaCheck className="w-4 h-4" /> : <FaCopy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Security Note */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative mt-8 p-5 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl flex items-start gap-4"
            >
              <div className="p-2 bg-indigo-500/10 rounded-xl">
                <FaShieldAlt className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm text-indigo-300 font-medium">Security Best Practice</p>
                <p className="text-xs text-slate-400 mt-1">
                  SSH keys provide secure, passwordless authentication. Keep your private keys safe and never share them.
                  Keys are injected via cloud-init at deployment time and can be assigned to multiple VMs.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full mx-4 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-xl">
                  <FaTrash className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="text-white font-bold text-lg">Delete SSH Key?</h3>
              </div>
              <p className="text-slate-300 text-sm">
                This key will be removed from all assigned VMs and cannot be recovered.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteKey(showDeleteConfirm)}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition"
                >
                  Delete Key
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assign VM Modal */}
      <AnimatePresence>
        {showAssignModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full mx-4 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-xl">
                  <FaServer className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="text-white font-bold text-lg">Assign SSH Key to VM</h3>
              </div>
              <p className="text-slate-300 text-sm">
                Assign <span className="text-indigo-400 font-medium">{showAssignModal.name}</span> to a virtual machine
              </p>
              <select
                value={selectedVM}
                onChange={(e) => setSelectedVM(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="">Select a VM...</option>
                {vms.map(vm => (
                  <option key={vm.vmid} value={vm.vmid}>
                    {vm.name} (ID: {vm.vmid}) - {vm.status}
                  </option>
                ))}
              </select>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAssignModal(null)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignKey}
                  disabled={!selectedVM}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition disabled:opacity-50"
                >
                  Assign Key
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}