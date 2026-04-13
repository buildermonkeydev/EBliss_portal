"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import api from "@/lib/api/auth";
import {
  User,
  Mail,
  Phone,
  Building2,
  CreditCard,
  MapPin,
  Lock,
  Save,
  Edit2,
  CheckCircle,
  AlertCircle,
  Globe,
  Home,
  Building,
  Shield,
  Key,
  Eye,
  EyeOff,
  UserCheck,
  Smartphone,
  Fingerprint,
  Bell,
  BellRing,
  Moon,
  Sun,
  Languages,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Award,
  TrendingUp,
  Calendar,
  Clock,
  Zap,
  Rocket,
  Sparkles,
  BadgeCheck,
  ShieldCheck,
  Server,
  Database,
  Cpu,
  HardDrive,
  Wifi,
  Activity
} from "lucide-react";

interface UserProfile {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  company: string | null;
  tax_id: string | null;
  address: any;
  state: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  role: string;
  verified: boolean;
  status: string;
  wallet_balance: number;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  last_login_ip: string | null;
}

export default function SettingsPage() {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    company: "",
    tax_id: "",
    address: "",
    state: "",
    city: "",
    postal_code: "",
    country: "IN",
  });
  
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [activeSection, setActiveSection] = useState("personal");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  // Fetch user profile
  const fetchUserProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/users/me");
      const data = response.data;
      
      if (data.success !== false) {
        const userData = data.user || data;
        setUser(userData);
        
        // Parse address if it's JSON
        let addressStr = "";
        if (userData.address) {
          if (typeof userData.address === 'object') {
            addressStr = `${userData.address.street || ""} ${userData.address.city || ""} ${userData.address.state || ""}`.trim();
          } else {
            addressStr = userData.address;
          }
        }
        
        setForm({
          full_name: userData.full_name || "",
          email: userData.email || "",
          phone: userData.phone || "",
          company: userData.company || "",
          tax_id: userData.tax_id || "",
          address: addressStr,
          state: userData.state || "",
          city: userData.city || "",
          postal_code: userData.postal_code || "",
          country: userData.country || "IN",
        });
      }
    } catch (err: any) {
      console.error("Failed to fetch user profile:", err);
      setSaveStatus({ type: "error", message: err.response?.data?.message || "Failed to load profile" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);

    try {
      const response = await api.put("/users/me", {
        full_name: form.full_name,
        phone: form.phone,
        company: form.company,
        tax_id: form.tax_id,
        address: form.address,
        state: form.state,
        city: form.city,
        postal_code: form.postal_code,
        country: form.country,
      });

      if (response.data.success !== false) {
        setSaveStatus({ type: "success", message: "Profile updated successfully!" });
        fetchUserProfile();
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        throw new Error(response.data.message || "Failed to update profile");
      }
    } catch (err: any) {
      setSaveStatus({ type: "error", message: err.response?.data?.message || "Failed to update profile" });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      setSaveStatus({ type: "error", message: "New passwords do not match" });
      setTimeout(() => setSaveStatus(null), 3000);
      return;
    }
    
    if (passwordData.new_password.length < 8) {
      setSaveStatus({ type: "error", message: "Password must be at least 8 characters" });
      setTimeout(() => setSaveStatus(null), 3000);
      return;
    }
    
    setIsChangingPassword(true);
    setSaveStatus(null);

    try {
      const response = await api.post("/auth/change-password", {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });

      if (response.data.success !== false) {
        setSaveStatus({ type: "success", message: "Password changed successfully!" });
        setPasswordData({ current_password: "", new_password: "", confirm_password: "" });
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        throw new Error(response.data.message || "Failed to change password");
      }
    } catch (err: any) {
      setSaveStatus({ type: "error", message: err.response?.data?.message || "Failed to change password" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const sections = [
    { id: "personal", label: "Personal Info", icon: User, description: "Manage your personal details" },
    { id: "business", label: "Business Info", icon: Building2, description: "Company and tax information" },
    { id: "location", label: "Location", icon: MapPin, description: "Address and region settings" },
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-[#0A0E27]">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Topbar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Loading profile settings...</p>
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
          <div className="max-w-[1400px] mx-auto p-6 lg:p-8">
            {/* Header */}
            <div className="relative mb-8">
              <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-8 overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-emerald-500/5 to-cyan-500/5 rounded-full blur-3xl" />
                
                <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                  <div>
                   
                    <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                      Account Settings
                    </h1>
                    <p className="text-slate-400 text-base max-w-2xl">
                      Manage your account information, security preferences, and notification settings
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4 px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-700">
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs text-slate-400">Verified Account</span>
                    </div>
                    <div className="w-px h-4 bg-slate-700" />
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs text-slate-400">Protected</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Status */}
            <AnimatePresence>
              {saveStatus && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                    saveStatus.type === "success"
                      ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                      : "bg-red-500/10 border border-red-500/30 text-red-400"
                  }`}
                >
                  {saveStatus.type === "success" ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                  <span className="text-sm flex-1">{saveStatus.message}</span>
                  <button onClick={() => setSaveStatus(null)} className="hover:opacity-70">✕</button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Content */}
            <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-2xl" />
              
              <div className="relative flex flex-col lg:flex-row">
                {/* Sidebar Navigation */}
                <div className="lg:w-80 border-b lg:border-b-0 lg:border-r border-slate-700/50">
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-700">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                          <span className="text-2xl font-bold text-white">
                            {form.full_name?.charAt(0) || "U"}
                          </span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-800" />
                      </div>
                      <div>
                        <p className="text-white font-semibold text-lg">{form.full_name || "Your Name"}</p>
                        <p className="text-xs text-slate-500">{form.email || "your@email.com"}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-xs text-emerald-400">Active</span>
                        </div>
                      </div>
                    </div>
                    
                    <nav className="space-y-1">
                      {sections.map((section) => {
                        const Icon = section.icon;
                        return (
                          <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                              activeSection === section.id
                                ? "bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-indigo-400 border-l-2 border-indigo-500"
                                : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <div className="flex-1 text-left">
                              <div>{section.label}</div>
                              <div className="text-xs opacity-60">{section.description}</div>
                            </div>
                            {activeSection === section.id && (
                              <Sparkles className="w-3 h-3 text-indigo-400" />
                            )}
                          </button>
                        );
                      })}
                    </nav>
                  </div>
                </div>

                {/* Form Content */}
                <div className="flex-1 p-6 lg:p-8">
                  <form onSubmit={handleSubmit}>
                    {/* Personal Information */}
                    {activeSection === "personal" && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                      >
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-700">
                          <User className="w-5 h-5 text-indigo-400" />
                          <h2 className="text-lg font-semibold text-white">Personal Information</h2>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                          <Input
                            icon={<User className="w-4 h-4" />}
                            label="Full Name"
                            name="full_name"
                            value={form.full_name}
                            onChange={handleChange}
                            placeholder="John Doe"
                            required
                          />
                          <Input
                            icon={<Mail className="w-4 h-4" />}
                            label="Email Address"
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="your@email.com"
                            disabled
                            readonly
                          />
                          <Input
                            icon={<Phone className="w-4 h-4" />}
                            label="Phone Number"
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            placeholder="+91 98765 43210"
                          />
                         
                        </div>
                      </motion.div>
                    )}

                    {/* Business Information */}
                    {activeSection === "business" && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                      >
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-700">
                          <Building2 className="w-5 h-5 text-indigo-400" />
                          <h2 className="text-lg font-semibold text-white">Business Information</h2>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                          <Input
                            icon={<Building className="w-4 h-4" />}
                            label="Company Name"
                            name="company"
                            value={form.company}
                            onChange={handleChange}
                            placeholder="Your Company"
                          />
                          <Input
                            icon={<CreditCard className="w-4 h-4" />}
                            label="GSTIN / Tax ID"
                            name="tax_id"
                            value={form.tax_id}
                            onChange={handleChange}
                            placeholder="27AAEFF1234F1Z5"
                          />
                        </div>
                      </motion.div>
                    )}

                    {/* Location */}
                    {activeSection === "location" && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                      >
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-700">
                          <MapPin className="w-5 h-5 text-indigo-400" />
                          <h2 className="text-lg font-semibold text-white">Location</h2>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                          <Select
                            icon={<Globe className="w-4 h-4" />}
                            label="Country"
                            name="country"
                            value={form.country}
                            onChange={handleChange}
                            options={[
                              { value: "IN", label: "🇮🇳 India" },
                              { value: "US", label: "🇺🇸 United States" },
                              { value: "GB", label: "🇬🇧 United Kingdom" },
                              { value: "CA", label: "🇨🇦 Canada" },
                              { value: "AU", label: "🇦🇺 Australia" },
                              { value: "SG", label: "🇸🇬 Singapore" },
                              { value: "DE", label: "🇩🇪 Germany" },
                            ]}
                          />
                          <Input
                            icon={<Home className="w-4 h-4" />}
                            label="Street Address"
                            name="address"
                            value={form.address}
                            onChange={handleChange}
                            placeholder="123 Main St"
                            className="md:col-span-2"
                          />
                          <Input
                            icon={<MapPin className="w-4 h-4" />}
                            label="City"
                            name="city"
                            value={form.city}
                            onChange={handleChange}
                            placeholder="Mumbai"
                          />
                          <Input
                            icon={<MapPin className="w-4 h-4" />}
                            label="State / Province"
                            name="state"
                            value={form.state}
                            onChange={handleChange}
                            placeholder="Maharashtra"
                          />
                          <Input
                            icon={<MapPin className="w-4 h-4" />}
                            label="Postal Code"
                            name="postal_code"
                            value={form.postal_code}
                            onChange={handleChange}
                            placeholder="400093"
                          />
                        </div>
                      </motion.div>
                    )}

                  
                    {/* Save Button */}
                    <div className="flex justify-end pt-6 border-t border-slate-700">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium transition-all duration-300 flex items-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSaving ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Saving Changes...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Account Stats */}
            <div className="relative mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs text-slate-500">Member Since</span>
                </div>
                <p className="text-white font-medium">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}</p>
              </div>
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs text-slate-500">Last Login</span>
                </div>
                <p className="text-white font-medium">{user?.last_login_at ? new Date(user.last_login_at).toLocaleString() : "N/A"}</p>
              </div>
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Server className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs text-slate-500">Last Login IP</span>
                </div>
                <p className="text-white font-mono text-sm">{user?.last_login_ip || "N/A"}</p>
              </div>
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs text-slate-500">Account Status</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <p className="text-white font-medium">Active</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Input Component
function Input({ icon, label, name, value, onChange, placeholder, type = "text", required = false, disabled = false, readonly = false }: any) {
  return (
    <div>
      <label className="block mb-2 text-sm font-medium text-slate-300">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{icon}</div>}
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readonly}
          className={`w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all ${
            icon ? "pl-10" : ""
          } ${disabled || readonly ? "opacity-60 cursor-not-allowed" : ""}`}
        />
      </div>
    </div>
  );
}

// Select Component
function Select({ icon, label, name, value, onChange, options }: any) {
  return (
    <div>
      <label className="block mb-2 text-sm font-medium text-slate-300">{label}</label>
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{icon}</div>}
        <select
          name={name}
          value={value}
          onChange={onChange}
          className={`w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none ${
            icon ? "pl-10" : "pl-4"
          } pr-10`}
        >
          {options.map((opt: any) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// Settings Icon Component
function Settings(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}