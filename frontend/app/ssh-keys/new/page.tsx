"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaKey, 
  FaArrowLeft, 
  FaCheck, 
  FaTimes, 
  FaUpload, 
  FaInfoCircle,
  FaShieldAlt,
  FaFingerprint,
  FaServer
} from "react-icons/fa";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import api from "@/lib/api/auth";

export default function AddSSHKeyPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [keyContent, setKeyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [keyType, setKeyType] = useState<"rsa" | "ed25519" | "ecdsa" | null>(null);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isKeyValid, setIsKeyValid] = useState(false);
  
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced validation - only calls API when user stops typing
  const validateKeyFormat = useCallback(async (key: string) => {
    if (!key.trim()) {
      setKeyType(null);
      setFingerprint(null);
      setIsKeyValid(false);
      setError("");
      return;
    }

    setIsValidating(true);
    setError("");
    
    try {
      const response = await api.post("/ssh-keys/validate", { publicKey: key.trim() });
      const data = response.data;
      
      if (data.valid) {
        setKeyType(data.type as "rsa" | "ed25519" | "ecdsa");
        setFingerprint(data.fingerprint);
        setIsKeyValid(true);
        setError("");
      } else {
        setKeyType(null);
        setFingerprint(null);
        setIsKeyValid(false);
        setError(data.message || "Invalid SSH key format");
      }
    } catch (err: any) {
      setKeyType(null);
      setFingerprint(null);
      setIsKeyValid(false);
      setError(err.response?.data?.message || "Failed to validate key");
    } finally {
      setIsValidating(false);
    }
  }, []);

  // Handle key change with debounce
  const handleKeyChange = (value: string) => {
    setKeyContent(value);
    setError("");
    setKeyType(null);
    setFingerprint(null);
    setIsKeyValid(false);
    
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set new timer - wait 500ms after user stops typing
    debounceTimerRef.current = setTimeout(() => {
      if (value.trim()) {
        validateKeyFormat(value.trim());
      }
    }, 500);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Format SSH key for Proxmox (remove newlines and extra spaces)
  const formatSSHKeyForProxmox = (key: string): string => {
    // Remove any newlines and trim
    let formattedKey = key.trim().replace(/\n/g, ' ').replace(/\r/g, '');
    // Replace multiple spaces with single space
    formattedKey = formattedKey.replace(/\s+/g, ' ');
    return formattedKey;
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Please enter a key name");
      return;
    }
    
    if (!keyContent.trim()) {
      setError("Please enter the public key");
      return;
    }
    
    if (!isKeyValid && !keyType) {
      setError("Please enter a valid SSH key (RSA, ED25519, or ECDSA)");
      return;
    }
    
    setIsSubmitting(true);
    setError("");
    setSuccess("");
    
    try {
      // Format the key properly for Proxmox
      const formattedKey = formatSSHKeyForProxmox(keyContent);
      
      const response = await api.post("/ssh-keys", {
        name: name.trim(),
        publicKey: formattedKey,
        description: `Added via web interface on ${new Date().toLocaleDateString()}`,
      });
      
      const data = response.data;
      
      if (data.success !== false) {
        setSuccess("SSH key added successfully! Redirecting...");
        setTimeout(() => {
          router.push("/ssh-keys");
        }, 1500);
      } else {
        throw new Error(data.message || "Failed to add SSH key");
      }
    } catch (err: any) {
      console.error("Add SSH key error:", err);
      setError(err.response?.data?.message || err.message || "Failed to add SSH key");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getKeyTypeColor = () => {
    switch(keyType) {
      case "rsa": return "text-blue-400 bg-blue-500/10 border-blue-500/30";
      case "ed25519": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
      case "ecdsa": return "text-purple-400 bg-purple-500/10 border-purple-500/30";
      default: return "text-slate-400 bg-slate-500/10 border-slate-500/30";
    }
  };

  const getKeyTypeIcon = () => {
    switch(keyType) {
      case "rsa": return "🔐";
      case "ed25519": return "🔑";
      case "ecdsa": return "🛡️";
      default: return "🔑";
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0A0E27]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar />
        
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6 lg:p-8">
            {/* Header */}
            <div className="relative mb-8">
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => router.back()}
                className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition group"
              >
                <FaArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm">Back to SSH Keys</span>
              </motion.button>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 mb-3"
              >
                <div className="p-2 bg-indigo-500/10 rounded-xl">
                  <FaKey className="w-6 h-6 text-indigo-400" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full">SECURITY</span>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">SSH KEYS</span>
                </div>
              </motion.div>
              
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="text-3xl lg:text-4xl font-bold text-white mb-2"
              >
                Add SSH Key
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-slate-400 text-base max-w-2xl"
              >
                Add a public SSH key to securely access your virtual machines without passwords
              </motion.p>
            </div>

            {/* Main Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden"
            >
              <div className="p-6 lg:p-8 space-y-6">
                {/* Error/Success Messages */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400"
                    >
                      <div className="p-1 bg-red-500/20 rounded-lg">
                        <FaTimes className="w-4 h-4" />
                      </div>
                      <span className="text-sm flex-1">{error}</span>
                    </motion.div>
                  )}
                  
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-400"
                    >
                      <div className="p-1 bg-emerald-500/20 rounded-lg">
                        <FaCheck className="w-4 h-4" />
                      </div>
                      <span className="text-sm flex-1">{success}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Key Name Field */}
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">
                    Key Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., My Laptop, Work Desktop, GitHub Actions"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  />
                  <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                    <FaInfoCircle className="w-3 h-3" />
                    A friendly name to help you identify this key
                  </p>
                </div>

                {/* Public Key Field */}
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">
                    Public Key <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={keyContent}
                    onChange={(e) => handleKeyChange(e.target.value)}
                    rows={6}
                    placeholder="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none"
                  />
                  
                  {/* Validation Status */}
                  {isValidating && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs text-slate-400">Validating key...</span>
                    </div>
                  )}
                  
                  {isKeyValid && keyType && !isValidating && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-3 p-3 rounded-xl border bg-emerald-500/5 border-emerald-500/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <FaCheck className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${getKeyTypeColor()}`}>
                              {getKeyTypeIcon()} {keyType.toUpperCase()} Key
                            </span>
                            {fingerprint && (
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <FaFingerprint className="w-3 h-3" />
                                {fingerprint.substring(0, 20)}...
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-emerald-400 mt-1">✓ Valid SSH key format detected</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  <p className="text-xs text-slate-500 mt-3 flex items-start gap-1">
                    <FaInfoCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    Paste your public SSH key. Supported formats: RSA, ED25519, ECDSA (nistp256, nistp384, nistp521)
                  </p>
                </div>

                {/* Example Box */}
                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FaShieldAlt className="w-4 h-4 text-indigo-400" />
                    <p className="text-xs text-indigo-300 font-medium">Key Format Example</p>
                  </div>
                  <code className="text-xs text-slate-400 block break-all font-mono">
                    ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC3... user@hostname
                  </code>
                </div>

                {/* Security Tips */}
                <div className="bg-slate-800/30 rounded-xl p-4 space-y-2">
                  <p className="text-xs text-slate-300 font-medium flex items-center gap-2">
                    <FaServer className="w-3 h-3 text-indigo-400" />
                    Security Tips
                  </p>
                  <ul className="text-xs text-slate-500 space-y-1 ml-4 list-disc">
                    <li>Use strong, unique key pairs for each device or service</li>
                    <li>Never share your private key with anyone</li>
                    <li>Regularly audit and remove unused keys</li>
                    <li>Keys are injected via cloud-init at VM deployment time</li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.back()}
                    className="px-6 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-all duration-300"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmit}
                    disabled={isSubmitting || (!isKeyValid && keyContent.trim() !== "") || (keyContent.trim() === "")}
                    className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Adding SSH Key...
                      </>
                    ) : (
                      <>
                        <FaUpload className="w-4 h-4" />
                        Add SSH Key
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}