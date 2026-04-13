"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, 
  Key, 
  Smartphone, 
  AlertCircle, 
  CheckCircle, 
  Lock,
  Mail,
  Bell,
  Eye,
  EyeOff,
  RefreshCw,
  Fingerprint,
  QrCode,
  Download,
  Copy,
  Check,
  Loader2,
  XCircle,
  Globe,
  Clock,
  Laptop,
  Tablet,
  Monitor,
  Smartphone as PhoneIcon
} from "lucide-react";
import TwoFactorCard from "../components/security/TwoFactorCard";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import api from "@/lib/api/auth";

interface Session {
  id: number;
  device_type: string;
  browser: string;
  os: string;
  ip_address: string;
  location: string;
  last_active: string;
  is_current: boolean;
  created_at: string;
}

interface SecurityStats {
  twoFactorEnabled: boolean;
  passwordStrength: string;
  activeSessions: number;
  emailAlerts: boolean;
  securityScore: number;
}

export default function SecurityPage() {
  const [activeSection, setActiveSection] = useState("2fa");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [notifications, setNotifications] = useState({
    new_login: true,
    suspicious_activity: true,
    security_changes: true,
  });
  const [stats, setStats] = useState<SecurityStats>({
    twoFactorEnabled: false,
    passwordStrength: "Strong",
    activeSessions: 0,
    emailAlerts: true,
    securityScore: 85,
  });

  // Fetch active sessions
  const fetchSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const response = await api.get("/users/sessions");
      const data = response.data;
      setSessions(data.sessions || []);
      setStats(prev => ({ ...prev, activeSessions: data.sessions?.length || 0 }));
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  // Fetch security stats
  const fetchSecurityStats = useCallback(async () => {
    try {
      const response = await api.get("/users/security/stats");
      const data = response.data;
      setStats({
        twoFactorEnabled: data.twoFactorEnabled || false,
        passwordStrength: data.passwordStrength || "Strong",
        activeSessions: data.activeSessions || 0,
        emailAlerts: data.emailAlerts !== false,
        securityScore: data.securityScore || 85,
      });
    } catch (err) {
      console.error("Failed to fetch security stats:", err);
    }
  }, []);

  // Fetch notification preferences
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await api.get("/users/notifications/preferences");
      const data = response.data;
      setNotifications({
        new_login: data.new_login !== false,
        suspicious_activity: data.suspicious_activity !== false,
        security_changes: data.security_changes !== false,
      });
    } catch (err) {
      console.error("Failed to fetch notification preferences:", err);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    fetchSecurityStats();
    fetchNotifications();
  }, [fetchSessions, fetchSecurityStats, fetchNotifications]);

  // Calculate password strength
  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength += 25;
    if (password.match(/[0-9]/)) strength += 25;
    if (password.match(/[^a-zA-Z0-9]/)) strength += 25;
    setPasswordStrength(strength);
    return strength;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    if (name === "new_password") {
      calculatePasswordStrength(value);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      setError("New passwords do not match");
      setTimeout(() => setError(null), 3000);
      return;
    }
    if (passwordStrength < 75) {
      setError("Please use a stronger password");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsLoadingPassword(true);
    setError(null);
    setSuccess(null);

    try {
      await api.post("/auth/change-password", {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });
      setSuccess("Password updated successfully!");
      setPasswordData({ current_password: "", new_password: "", confirm_password: "" });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update password");
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoadingPassword(false);
    }
  };

  const handleRevokeSession = async (sessionId: number) => {
    try {
      await api.delete(`/users/sessions/${sessionId}`);
      fetchSessions();
      setSuccess("Session revoked successfully");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to revoke session");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleRevokeAllSessions = async () => {
    try {
      await api.delete("/users/sessions/all");
      fetchSessions();
      setSuccess("All other sessions revoked successfully");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to revoke sessions");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleUpdateNotifications = async (key: keyof typeof notifications, value: boolean) => {
    setIsLoadingNotifications(true);
    try {
      await api.put("/users/notifications/preferences", {
        ...notifications,
        [key]: value,
      });
      setNotifications(prev => ({ ...prev, [key]: value }));
      setSuccess("Notification preferences updated");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update preferences");
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType?.toLowerCase()) {
      case "mobile": return <PhoneIcon className="w-5 h-5" />;
      case "tablet": return <Tablet className="w-5 h-5" />;
      case "laptop": return <Laptop className="w-5 h-5" />;
      default: return <Monitor className="w-5 h-5" />;
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 25) return "bg-red-500";
    if (passwordStrength < 50) return "bg-orange-500";
    if (passwordStrength < 75) return "bg-yellow-500";
    return "bg-emerald-500";
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 25) return "Very Weak";
    if (passwordStrength < 50) return "Weak";
    if (passwordStrength < 75) return "Medium";
    return "Strong";
  };

  const sections = [
    { id: "2fa", label: "Two-Factor Authentication", icon: Shield, description: "Add an extra layer of security" },
    { id: "passwords", label: "Password Management", icon: Key, description: "Update your login credentials" },
    { id: "sessions", label: "Active Sessions", icon: Smartphone, description: "Manage logged-in devices" },
    { id: "notifications", label: "Security Alerts", icon: Bell, description: "Configure notification preferences" },
  ];

  return (
    <div className="flex min-h-screen bg-[#0A0E27]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar />
        
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto p-6 lg:p-8">
            {/* Header */}
            <div className="relative mb-8">
              <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-8 overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-emerald-500/5 to-cyan-500/5 rounded-full blur-3xl" />
                
                <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                  <div>
                 
                    <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                      Security Settings
                    </h1>
                    <p className="text-slate-400 text-base max-w-2xl">
                      Protect your account and manage security preferences
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-full border border-indigo-500/20">
                    <Shield className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm text-white font-medium">Security Score: {stats.securityScore}%</span>
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
                  <XCircle className="w-5 h-5" />
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
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm flex-1">{success}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Security Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard 
                icon={<Shield />} 
                value={stats.twoFactorEnabled ? "Enabled" : "Disabled"} 
                label="2FA Status" 
                color={stats.twoFactorEnabled ? "emerald" : "amber"}
              />
              <StatCard 
                icon={<Key />} 
                value={stats.passwordStrength} 
                label="Password Strength" 
                color="emerald"
              />
              <StatCard 
                icon={<Smartphone />} 
                value={stats.activeSessions} 
                label="Active Sessions" 
                color="blue"
              />
              <StatCard 
                icon={<Bell />} 
                value={stats.emailAlerts ? "On" : "Off"} 
                label="Email Alerts" 
                color="purple"
              />
            </div>

            {/* Navigation Tabs */}
            <div className="mb-6">
              <div className="flex gap-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-1 w-fit flex-wrap">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                        activeSection === section.id
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{section.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content Sections */}
            <div className="relative">
              {activeSection === "2fa" && <TwoFactorCard />}
              
              {activeSection === "passwords" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                      <Key className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">Password Management</h2>
                      <p className="text-sm text-slate-400">Update your password regularly for better security</p>
                    </div>
                  </div>
                  
                  <form onSubmit={handleUpdatePassword} className="space-y-5 max-w-md">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Current Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          name="current_password"
                          value={passwordData.current_password}
                          onChange={handlePasswordChange}
                          required
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-12 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">New Password</label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type={showNewPassword ? "text" : "password"}
                          name="new_password"
                          value={passwordData.new_password}
                          onChange={handlePasswordChange}
                          required
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-12 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {passwordData.new_password && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Password Strength</span>
                            <span className={`font-medium ${
                              passwordStrength < 25 ? "text-red-400" :
                              passwordStrength < 50 ? "text-orange-400" :
                              passwordStrength < 75 ? "text-yellow-400" : "text-emerald-400"
                            }`}>
                              {getPasswordStrengthText()}
                            </span>
                          </div>
                          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                              style={{ width: `${passwordStrength}%` }}
                            />
                          </div>
                          <ul className="text-xs text-slate-500 space-y-1 mt-2">
                            <li className="flex items-center gap-2">
                              {passwordData.new_password.length >= 8 ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <XCircle className="w-3 h-3 text-slate-600" />}
                              <span>At least 8 characters</span>
                            </li>
                            <li className="flex items-center gap-2">
                              {/[a-z]/.test(passwordData.new_password) && /[A-Z]/.test(passwordData.new_password) ? 
                                <CheckCircle className="w-3 h-3 text-emerald-400" /> : <XCircle className="w-3 h-3 text-slate-600" />}
                              <span>Uppercase & lowercase letters</span>
                            </li>
                            <li className="flex items-center gap-2">
                              {/[0-9]/.test(passwordData.new_password) ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <XCircle className="w-3 h-3 text-slate-600" />}
                              <span>Contains a number</span>
                            </li>
                            <li className="flex items-center gap-2">
                              {/[^a-zA-Z0-9]/.test(passwordData.new_password) ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <XCircle className="w-3 h-3 text-slate-600" />}
                              <span>Contains a special character</span>
                            </li>
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Confirm New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          name="confirm_password"
                          value={passwordData.confirm_password}
                          onChange={handlePasswordChange}
                          required
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-12 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {passwordData.confirm_password && passwordData.new_password !== passwordData.confirm_password && (
                        <p className="text-xs text-red-400 mt-2">Passwords do not match</p>
                      )}
                    </div>
                    
                    <button
                      type="submit"
                      disabled={isLoadingPassword}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium transition-all duration-300 flex items-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                    >
                      {isLoadingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      Update Password
                    </button>
                  </form>
                </motion.div>
              )}

              {activeSection === "sessions" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden"
                >
                  <div className="p-6 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <Smartphone className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-white">Active Sessions</h2>
                        <p className="text-sm text-slate-400">Manage devices where you're logged in</p>
                      </div>
                    </div>
                  </div>
                  
                  {isLoadingSessions ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                    </div>
                  ) : sessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                      <Smartphone className="w-12 h-12 mb-3 opacity-50" />
                      <p className="text-sm">No active sessions found</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-700">
                      {sessions.map((session) => (
                        <div key={session.id} className="p-6 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center">
                              {getDeviceIcon(session.device_type)}
                            </div>
                            <div>
                              <p className="text-white font-medium">
                                {session.browser} on {session.os}
                                {session.is_current && (
                                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                                    Current
                                  </span>
                                )}
                              </p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <Globe className="w-3 h-3" />
                                  {session.location || "Unknown Location"}
                                </span>
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Last active: {new Date(session.last_active).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          {!session.is_current && (
                            <button
                              onClick={() => handleRevokeSession(session.id)}
                              className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {sessions.length > 1 && (
                    <div className="p-6 border-t border-slate-700">
                      <button
                        onClick={handleRevokeAllSessions}
                        className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-2 transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Revoke All Other Sessions
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {activeSection === "notifications" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                      <Bell className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">Security Alerts</h2>
                      <p className="text-sm text-slate-400">Choose how you want to be notified about security events</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4 max-w-2xl">
                    <div className="flex items-center justify-between p-5 bg-slate-800/30 rounded-xl hover:bg-slate-800/50 transition-colors">
                      <div>
                        <p className="text-white font-medium">New Login Alert</p>
                        <p className="text-xs text-slate-500 mt-1">Get notified when someone logs into your account</p>
                      </div>
                      <button
                        onClick={() => handleUpdateNotifications("new_login", !notifications.new_login)}
                        disabled={isLoadingNotifications}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          notifications.new_login ? "bg-indigo-600" : "bg-slate-700"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            notifications.new_login ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between p-5 bg-slate-800/30 rounded-xl hover:bg-slate-800/50 transition-colors">
                      <div>
                        <p className="text-white font-medium">Suspicious Activity</p>
                        <p className="text-xs text-slate-500 mt-1">Alert on unusual login patterns or locations</p>
                      </div>
                      <button
                        onClick={() => handleUpdateNotifications("suspicious_activity", !notifications.suspicious_activity)}
                        disabled={isLoadingNotifications}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          notifications.suspicious_activity ? "bg-indigo-600" : "bg-slate-700"
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          notifications.suspicious_activity ? "translate-x-6" : "translate-x-1"
                        }`} />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between p-5 bg-slate-800/30 rounded-xl hover:bg-slate-800/50 transition-colors">
                      <div>
                        <p className="text-white font-medium">Security Settings Change</p>
                        <p className="text-xs text-slate-500 mt-1">Notify when security settings are modified</p>
                      </div>
                      <button
                        onClick={() => handleUpdateNotifications("security_changes", !notifications.security_changes)}
                        disabled={isLoadingNotifications}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          notifications.security_changes ? "bg-indigo-600" : "bg-slate-700"
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          notifications.security_changes ? "translate-x-6" : "translate-x-1"
                        }`} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Security Tips */}
            <div className="relative mt-8 p-5 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 border border-indigo-500/20 rounded-2xl">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-indigo-500/10 rounded-xl">
                  <Shield className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm text-indigo-300 font-medium">Security Best Practices</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Enable 2FA, use strong passwords, and regularly review active sessions to keep your account secure.
                    Never share your credentials or 2FA codes with anyone.
                  </p>
                </div>
              </div>
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
    amber: "bg-amber-500/10",
    red: "bg-red-500/10",
    blue: "bg-blue-500/10",
    purple: "bg-purple-500/10",
  };
  
  const textColorMap: Record<string, string> = {
    indigo: "text-indigo-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    red: "text-red-400",
    blue: "text-blue-400",
    purple: "text-purple-400",
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