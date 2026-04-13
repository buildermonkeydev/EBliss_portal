"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import api from "@/lib/api/auth";
import {
  Shield,
  Plus,
  Save,
  Search,
  Server,
  CheckCircle,
  XCircle,
  Trash2,
  Edit,
  RefreshCw,
  AlertCircle,
  Loader2,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

interface FirewallRule {
  id: string;
  position: number;
  action: "ACCEPT" | "DROP";
  protocol: "tcp" | "udp" | "icmp";
  port?: string;
  source?: string;
  dest?: string;
  comment?: string;
  enabled: boolean;
  direction: "IN" | "OUT";
  ipType: "IPv4" | "IPv6";
}

interface VM {
  id: number;
  vmid: number;
  name: string;
  status: string;
}

export default function FirewallPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVM, setSelectedVM] = useState<VM | null>(null);
  const [rules, setRules] = useState<FirewallRule[]>([]);
  const [vms, setVMs] = useState<VM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<FirewallRule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Filter states
  const [filterProtocol, setFilterProtocol] = useState<string>("all");
  const [filterDirection, setFilterDirection] = useState<string>("all");
  const [filterIPType, setFilterIPType] = useState<string>("all");
  const [filterDecision, setFilterDecision] = useState<string>("all");
  
  const [newRule, setNewRule] = useState<Partial<FirewallRule>>({
    action: "ACCEPT",
    protocol: "tcp",
    port: "",
    source: "0.0.0.0/0",
    dest: "0.0.0.0/0",
    comment: "",
    enabled: true,
    direction: "IN",
    ipType: "IPv4",
  });

  // Fetch VMs
  const fetchVMs = async () => {
    try {
      const response = await api.get("/vms");
      const data = response.data;
      const vmList = data.data || data.vms || [];
      setVMs(vmList);
      
      if (vmList.length > 0 && !selectedVM) {
        setSelectedVM(vmList[0]);
        fetchFirewallRulesForVM(vmList[0]);
      } else if (vmList.length === 0) {
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Failed to fetch VMs:", err);
      setIsLoading(false);
    }
  };

  // Fetch firewall rules for specific VM
  const fetchFirewallRulesForVM = async (vm: VM) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/firewall/vm/${vm.vmid}`);
      const data = response.data;
      
      if (data.success !== false) {
        setRules(data.rules || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch firewall rules:", err);
      setRules([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Save firewall rules (only called when user clicks Save Rules)
  const saveFirewallRules = async () => {
    if (!selectedVM) return;
    
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await api.post(`/firewall/vm/${selectedVM.vmid}/rules`, {
        rules: rules.map(({ id, ...rule }) => rule),
      });
      
      if (response.data.success !== false) {
        setSuccess("Firewall rules saved successfully!");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save firewall rules");
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Add new rule (local only, not saved to API)
  const addRule = () => {
    if (!newRule.port && newRule.protocol !== "icmp") {
      setError("Port is required for TCP/UDP protocols");
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    if (newRule.port) {
      const portNum = parseInt(newRule.port);
      if (portNum < 1 || portNum > 65535) {
        setError("Port must be between 1 and 65535");
        setTimeout(() => setError(null), 3000);
        return;
      }
    }
    
    const newRuleData: FirewallRule = {
      id: Date.now().toString(),
      position: rules.length + 1,
      action: newRule.action as "ACCEPT" | "DROP",
      protocol: newRule.protocol as "tcp" | "udp" | "icmp",
      port: newRule.port || (newRule.protocol === "icmp" ? "N/A" : ""),
      source: newRule.source,
      dest: newRule.dest,
      comment: newRule.comment,
      enabled: true,
      direction: newRule.direction as "IN" | "OUT",
      ipType: newRule.ipType as "IPv4" | "IPv6",
    };
    
    setRules([...rules, newRuleData]);
    setShowAddRuleModal(false);
    setNewRule({
      action: "ACCEPT",
      protocol: "tcp",
      port: "",
      source: "0.0.0.0/0",
      dest: "0.0.0.0/0",
      comment: "",
      enabled: true,
      direction: "IN",
      ipType: "IPv4",
    });
    setSuccess("Rule added locally. Click 'Save Rules' to persist changes.");
    setTimeout(() => setSuccess(null), 3000);
  };

  // Update rule (local only)
  const updateRule = (rule: FirewallRule) => {
    setRules(rules.map(r => r.id === rule.id ? rule : r));
    setEditingRule(null);
    setSuccess("Rule updated locally. Click 'Save Rules' to persist changes.");
    setTimeout(() => setSuccess(null), 3000);
  };

  // Delete rule (local only)
  const deleteRule = (ruleId: string) => {
    setRules(rules.filter(r => r.id !== ruleId));
    setSuccess("Rule deleted locally. Click 'Save Rules' to persist changes.");
    setTimeout(() => setSuccess(null), 3000);
  };

  // Toggle rule status (local only)
  const toggleRuleStatus = (rule: FirewallRule) => {
    const updatedRule = { ...rule, enabled: !rule.enabled };
    setRules(rules.map(r => r.id === rule.id ? updatedRule : r));
    setSuccess("Rule status changed. Click 'Save Rules' to persist changes.");
    setTimeout(() => setSuccess(null), 3000);
  };

  useEffect(() => {
    fetchVMs();
  }, []);

  useEffect(() => {
    if (selectedVM) {
      fetchFirewallRulesForVM(selectedVM);
    }
  }, [selectedVM]);

  const handleVMChange = (vmid: string) => {
    const vm = vms.find(v => v.vmid === parseInt(vmid));
    if (vm) {
      setSelectedVM(vm);
    }
  };

  // Apply filters
  const filteredRules = rules.filter(rule => {
    // Search filter
    const matchesSearch = 
      rule.comment?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.port?.includes(searchQuery) ||
      rule.source?.includes(searchQuery) ||
      rule.dest?.includes(searchQuery) ||
      rule.protocol.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    // Protocol filter
    if (filterProtocol !== "all" && rule.protocol !== filterProtocol) return false;
    
    // Direction filter
    if (filterDirection !== "all" && rule.direction !== filterDirection) return false;
    
    // IP Type filter
    if (filterIPType !== "all" && rule.ipType !== filterIPType) return false;
    
    // Decision filter
    if (filterDecision !== "all" && rule.action !== filterDecision) return false;
    
    return true;
  });

  const stats = {
    total: rules.length,
    allowed: rules.filter(r => r.action === "ACCEPT").length,
    denied: rules.filter(r => r.action === "DROP").length,
    active: rules.filter(r => r.enabled).length,
  };

  const getActionColor = (action: string) => {
    switch(action) {
      case "ACCEPT": return "text-emerald-400 bg-emerald-500/10";
      case "DROP": return "text-red-400 bg-red-500/10";
      default: return "text-slate-400 bg-slate-500/10";
    }
  };

  if (isLoading && vms.length === 0) {
    return (
      <div className="flex min-h-screen bg-[#0A0E27]">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Topbar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Loading virtual machines...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (vms.length === 0) {
    return (
      <div className="flex min-h-screen bg-[#0A0E27]">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Topbar />
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-12 h-12 text-slate-600" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">No Virtual Machines Found</h2>
              <p className="text-slate-400 mb-6">
                You don't have any virtual machines yet. Create your first VM to configure firewall rules.
              </p>
              <button
                onClick={() => router.push("/hourly-compute")}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
              >
                Create Your First VM
              </button>
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
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-white">Firewall Rules</h1>
                <p className="text-slate-400 text-sm mt-1">Manage security rules for your virtual machines</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddRuleModal(true)}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Rule
                </button>
                <button
                  onClick={saveFirewallRules}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSaving ? "Saving..." : "Save Rules"}
                </button>
              </div>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
                <button onClick={() => setError(null)} className="ml-auto hover:text-red-300">✕</button>
              </div>
            )}
            
            {success && (
              <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-2 text-emerald-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>{success}</span>
                <button onClick={() => setSuccess(null)} className="ml-auto hover:text-emerald-300">✕</button>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-xs text-slate-500">Total Rules</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <p className="text-2xl font-bold text-emerald-400">{stats.allowed}</p>
                <p className="text-xs text-slate-500">Allowed</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <p className="text-2xl font-bold text-red-400">{stats.denied}</p>
                <p className="text-xs text-slate-500">Denied</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <p className="text-2xl font-bold text-blue-400">{stats.active}</p>
                <p className="text-xs text-slate-500">Active</p>
              </div>
            </div>

            {/* VM Selector & Filters */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
              {/* VM Selector - Left Side */}
              <div className="lg:col-span-1">
                <label className="block text-xs font-medium text-slate-400 mb-1">Virtual Machine</label>
                <div className="relative">
                  <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <select
                    value={selectedVM?.vmid || ""}
                    onChange={(e) => handleVMChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {vms.map(vm => (
                      <option key={vm.vmid} value={vm.vmid}>
                        {vm.name} (ID: {vm.vmid})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Filters - Right Side */}
              <div className="lg:col-span-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Protocol</label>
                    <select
                      value={filterProtocol}
                      onChange={(e) => setFilterProtocol(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="all">All</option>
                      <option value="tcp">TCP</option>
                      <option value="udp">UDP</option>
                      <option value="icmp">ICMP</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Direction</label>
                    <select
                      value={filterDirection}
                      onChange={(e) => setFilterDirection(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="all">All</option>
                      <option value="IN">IN</option>
                      <option value="OUT">OUT</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">IP Type</label>
                    <select
                      value={filterIPType}
                      onChange={(e) => setFilterIPType(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="all">All</option>
                      <option value="IPv4">IPv4</option>
                      <option value="IPv6">IPv6</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Decision</label>
                    <select
                      value={filterDecision}
                      onChange={(e) => setFilterDecision(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="all">All</option>
                      <option value="ACCEPT">ACCEPT</option>
                      <option value="DROP">DROP</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="IP, port, comment..."
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Refresh Button */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => selectedVM && fetchFirewallRulesForVM(selectedVM)}
                className="p-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Rules Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-32">
                <div className="text-center">
                  <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">Loading firewall rules...</p>
                </div>
              </div>
            ) : filteredRules.length === 0 ? (
              <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-12 flex flex-col items-center justify-center">
                <Shield className="w-12 h-12 text-slate-600 mb-3" />
                <p className="text-slate-400 font-medium">No firewall rules found</p>
                <p className="text-slate-500 text-sm mt-1">Click "Add Rule" to create your first security rule</p>
              </div>
            ) : (
              <div className="bg-slate-800/30 border border-slate-700 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-slate-700 bg-slate-800/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Direction</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">IP Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Protocol</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Port</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Source</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Destination</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Decision</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {filteredRules.map((rule, idx) => (
                        <tr key={rule.id} className="hover:bg-slate-800/20 transition-colors">
                          <td className="px-4 py-3">
                            <span className="text-slate-500 font-mono text-sm">{idx + 1}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                              rule.direction === "IN" ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"
                            }`}>
                              {rule.direction}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-slate-300 text-sm">{rule.ipType}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-white text-sm font-mono uppercase">{rule.protocol}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm text-slate-300">{rule.port || "N/A"}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm text-slate-300">{rule.source || "Any"}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm text-slate-300">{rule.dest || "Any"}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${getActionColor(rule.action)}`}>
                              {rule.action === "ACCEPT" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {rule.action}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggleRuleStatus(rule)}
                              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                                rule.enabled
                                  ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                                  : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                              }`}
                            >
                              {rule.enabled ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                              {rule.enabled ? "Active" : "Disabled"}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setEditingRule(rule)}
                                className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteRule(rule.id)}
                                className="p-1.5 hover:bg-red-500/10 rounded text-slate-400 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Footer Note */}
            <div className="mt-6 text-center">
              <p className="text-xs text-slate-500">
                Rules are processed in order. Click "Save Rules" to apply changes to the VM.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Rule Modal */}
      {showAddRuleModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-white font-semibold text-lg mb-4">Add Firewall Rule</h3>
            
            <div className="space-y-4">
              {/* Direction - Toggle */}
              <div>
                <label className="block text-sm text-slate-300 mb-2">Direction</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRule({ ...newRule, direction: "IN" })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      newRule.direction === "IN"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    IN
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRule({ ...newRule, direction: "OUT" })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      newRule.direction === "OUT"
                        ? "bg-purple-600 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    OUT
                  </button>
                </div>
              </div>

              {/* IP Type - Toggle */}
              <div>
                <label className="block text-sm text-slate-300 mb-2">IP Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRule({ ...newRule, ipType: "IPv4" })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      newRule.ipType === "IPv4"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    IPv4
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRule({ ...newRule, ipType: "IPv6" })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      newRule.ipType === "IPv6"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    IPv6
                  </button>
                </div>
              </div>

              {/* Protocol - Toggle */}
              <div>
                <label className="block text-sm text-slate-300 mb-2">Protocol</label>
                <div className="flex gap-2">
                  {["tcp", "udp", "icmp"].map((proto) => (
                    <button
                      key={proto}
                      type="button"
                      onClick={() => setNewRule({ ...newRule, protocol: proto as any })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors uppercase ${
                        newRule.protocol === proto
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      {proto}
                    </button>
                  ))}
                </div>
              </div>

              {/* Decision - Toggle */}
              <div>
                <label className="block text-sm text-slate-300 mb-2">Decision</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRule({ ...newRule, action: "ACCEPT" })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      newRule.action === "ACCEPT"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    ACCEPT
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRule({ ...newRule, action: "DROP" })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      newRule.action === "DROP"
                        ? "bg-red-600 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    DROP
                  </button>
                </div>
              </div>

              {/* Port */}
              <div>
                <label className="block text-sm text-slate-300 mb-1">Port</label>
                <input
                  type="text"
                  value={newRule.port}
                  onChange={(e) => setNewRule({ ...newRule, port: e.target.value })}
                  placeholder="e.g., 22, 80, 443 or NONE"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <p className="text-xs text-slate-500 mt-1">Leave empty or "NONE" for ICMP</p>
              </div>

              {/* Source / Dest IP */}
              <div>
                <label className="block text-sm text-slate-300 mb-1">Source / Dest IP</label>
                <input
                  type="text"
                  value={newRule.source}
                  onChange={(e) => setNewRule({ ...newRule, source: e.target.value, dest: e.target.value })}
                  placeholder="0.0.0.0/0 (anywhere)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm text-slate-300 mb-1">Comment (optional)</label>
                <input
                  type="text"
                  value={newRule.comment}
                  onChange={(e) => setNewRule({ ...newRule, comment: e.target.value })}
                  placeholder="e.g., SSH Access"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={addRule}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Add Rule
              </button>
              <button
                onClick={() => setShowAddRuleModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Rule Modal */}
      {editingRule && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-white font-semibold text-lg mb-4">Edit Firewall Rule</h3>
            
            <div className="space-y-4">
              {/* Direction - Toggle */}
              <div>
                <label className="block text-sm text-slate-300 mb-2">Direction</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingRule({ ...editingRule, direction: "IN" })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      editingRule.direction === "IN"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    IN
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingRule({ ...editingRule, direction: "OUT" })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      editingRule.direction === "OUT"
                        ? "bg-purple-600 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    OUT
                  </button>
                </div>
              </div>

              {/* IP Type - Toggle */}
              <div>
                <label className="block text-sm text-slate-300 mb-2">IP Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingRule({ ...editingRule, ipType: "IPv4" })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      editingRule.ipType === "IPv4"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    IPv4
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingRule({ ...editingRule, ipType: "IPv6" })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      editingRule.ipType === "IPv6"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    IPv6
                  </button>
                </div>
              </div>

              {/* Protocol - Toggle */}
              <div>
                <label className="block text-sm text-slate-300 mb-2">Protocol</label>
                <div className="flex gap-2">
                  {["tcp", "udp", "icmp"].map((proto) => (
                    <button
                      key={proto}
                      type="button"
                      onClick={() => setEditingRule({ ...editingRule, protocol: proto as any })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors uppercase ${
                        editingRule.protocol === proto
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      {proto}
                    </button>
                  ))}
                </div>
              </div>

              {/* Decision - Toggle */}
              <div>
                <label className="block text-sm text-slate-300 mb-2">Decision</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingRule({ ...editingRule, action: "ACCEPT" })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      editingRule.action === "ACCEPT"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    ACCEPT
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingRule({ ...editingRule, action: "DROP" })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      editingRule.action === "DROP"
                        ? "bg-red-600 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    DROP
                  </button>
                </div>
              </div>

              {/* Port */}
              <div>
                <label className="block text-sm text-slate-300 mb-1">Port</label>
                <input
                  type="text"
                  value={editingRule.port}
                  onChange={(e) => setEditingRule({ ...editingRule, port: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Source IP */}
              <div>
                <label className="block text-sm text-slate-300 mb-1">Source IP</label>
                <input
                  type="text"
                  value={editingRule.source}
                  onChange={(e) => setEditingRule({ ...editingRule, source: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Destination IP */}
              <div>
                <label className="block text-sm text-slate-300 mb-1">Destination IP</label>
                <input
                  type="text"
                  value={editingRule.dest}
                  onChange={(e) => setEditingRule({ ...editingRule, dest: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm text-slate-300 mb-1">Comment</label>
                <input
                  type="text"
                  value={editingRule.comment}
                  onChange={(e) => setEditingRule({ ...editingRule, comment: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => updateRule(editingRule)}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditingRule(null)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}