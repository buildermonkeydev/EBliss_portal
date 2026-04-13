"use client";

import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import {
  Globe,
  Network,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Copy,
  RefreshCw,
  MapPin,
  Server,
  Clock,
  User,
  Link,
  ExternalLink,
  Info,
  ChevronDown,
  ChevronRight
} from "lucide-react";

interface IPAddress {
  id: string;
  address: string;
  version: "IPv4" | "IPv6";
  subnet: string;
  pop: string;
  status: "available" | "assigned" | "reserved" | "releasing";
  assignedTo?: {
    vmid: number;
    name: string;
    type: "vm" | "container";
  };
  ptrRecord?: string;
  createdAt: string;
  assignedAt?: string;
  releaseDate?: string;
  notes?: string;
}

interface Subnet {
  id: string;
  cidr: string;
  version: "IPv4" | "IPv6";
  pop: string;
  totalIPs: number;
  usedIPs: number;
  availableIPs: number;
  reservedIPs: number;
  gateway?: string;
  dns1?: string;
  dns2?: string;
  description?: string;
}

interface POP {
  id: string;
  name: string;
  location: string;
  country: string;
  subnets: Subnet[];
}

export default function IPAMPage() {
  const [activeTab, setActiveTab] = useState<"my-ips" | "pools" | "subnets">("my-ips");
  const [selectedPOP, setSelectedPOP] = useState<string>("all");
  const [selectedVersion, setSelectedVersion] = useState<"all" | "IPv4" | "IPv6">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [myIPs, setMyIPs] = useState<IPAddress[]>([]);
  const [pops, setPOPs] = useState<POP[]>([]);
  const [subnets, setSubnets] = useState<Subnet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState<IPAddress | null>(null);
  const [showPTRModal, setShowPTRModal] = useState<IPAddress | null>(null);
  const [showReleaseConfirm, setShowReleaseConfirm] = useState<IPAddress | null>(null);
  const [expandedPOP, setExpandedPOP] = useState<string | null>(null);
  const [copiedIP, setCopiedIP] = useState<string | null>(null);
  const [ptrRecord, setPTRRecord] = useState("");
  const [assignVM, setAssignVM] = useState("");
  const [vms, setVMs] = useState<any[]>([]);

  // Fetch IPAM data from Proxmox
  const fetchIPAMData = async () => {
    setIsLoading(true);
    try {
      const [myIPsRes, popsRes, subnetsRes] = await Promise.all([
        fetch("/api/proxmox/ipam/ips"),
        fetch("/api/proxmox/ipam/pops"),
        fetch("/api/proxmox/ipam/subnets")
      ]);

      const myIPsData = await myIPsRes.json();
      const popsData = await popsRes.json();
      const subnetsData = await subnetsRes.json();

      if (myIPsData.success) setMyIPs(myIPsData.data);
      if (popsData.success) setPOPs(popsData.data);
      if (subnetsData.success) setSubnets(subnetsData.data);
    } catch (err) {
      console.error("Failed to fetch IPAM data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch VMs for assignment
  const fetchVMs = async () => {
    try {
      const res = await fetch("/api/proxmox/vms");
      const result = await res.json();
      if (result.success) setVMs(result.data);
    } catch (err) {
      console.error("Failed to fetch VMs:", err);
    }
  };

  useEffect(() => {
    fetchIPAMData();
    fetchVMs();
  }, []);

  const handleCopyIP = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIP(ip);
    setTimeout(() => setCopiedIP(null), 2000);
  };

  const handleAssignIP = async () => {
    if (!showAssignModal || !assignVM) return;

    try {
      const res = await fetch("/api/proxmox/ipam/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ipId: showAssignModal.id,
          vmid: parseInt(assignVM),
        }),
      });

      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error);

      fetchIPAMData();
      setShowAssignModal(null);
      setAssignVM("");
    } catch (err: any) {
      console.error("Failed to assign IP:", err);
      alert(err.message);
    }
  };

  const handleUpdatePTR = async () => {
    if (!showPTRModal) return;

    try {
      const res = await fetch("/api/proxmox/ipam/ptr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ipId: showPTRModal.id,
          ptrRecord: ptrRecord,
        }),
      });

      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error);

      fetchIPAMData();
      setShowPTRModal(null);
      setPTRRecord("");
    } catch (err: any) {
      console.error("Failed to update PTR:", err);
      alert(err.message);
    }
  };

  const handleReleaseIP = async () => {
    if (!showReleaseConfirm) return;

    try {
      const res = await fetch("/api/proxmox/ipam/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ipId: showReleaseConfirm.id,
        }),
      });

      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error);

      fetchIPAMData();
      setShowReleaseConfirm(null);
    } catch (err: any) {
      console.error("Failed to release IP:", err);
      alert(err.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "assigned": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
      case "available": return "text-blue-400 bg-blue-500/10 border-blue-500/30";
      case "reserved": return "text-amber-400 bg-amber-500/10 border-amber-500/30";
      case "releasing": return "text-orange-400 bg-orange-500/10 border-orange-500/30";
      default: return "text-slate-400 bg-slate-500/10 border-slate-500/30";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "assigned": return "Assigned";
      case "available": return "Available";
      case "reserved": return "Reserved";
      case "releasing": return "Releasing";
      default: return "Unknown";
    }
  };

  const filteredIPs = myIPs.filter(ip => {
    const matchesSearch = ip.address.includes(searchTerm) || 
                          (ip.assignedTo?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPOP = selectedPOP === "all" || ip.pop === selectedPOP;
    const matchesVersion = selectedVersion === "all" || ip.version === selectedVersion;
    return matchesSearch && matchesPOP && matchesVersion;
  });

  const totalStats = {
    total: myIPs.length,
    assigned: myIPs.filter(ip => ip.status === "assigned").length,
    available: myIPs.filter(ip => ip.status === "available").length,
    reserved: myIPs.filter(ip => ip.status === "reserved").length,
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar />
        
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Animated background */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>

          {/* Header */}
          <div className="relative mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
                  <Network className="w-8 h-8 text-indigo-400" />
                  IP Address Management
                </h1>
                <p className="text-slate-400 text-sm mt-2">
                  Manage your IP addresses, reverse DNS, and subnet pools
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
              <Network className="w-5 h-5 text-indigo-400 mb-2" />
              <p className="text-2xl font-bold text-white">{totalStats.total}</p>
              <p className="text-xs text-slate-500">Total IPs</p>
            </div>
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
              <CheckCircle className="w-5 h-5 text-emerald-400 mb-2" />
              <p className="text-2xl font-bold text-emerald-400">{totalStats.assigned}</p>
              <p className="text-xs text-slate-500">Assigned IPs</p>
            </div>
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
              <Globe className="w-5 h-5 text-blue-400 mb-2" />
              <p className="text-2xl font-bold text-blue-400">{totalStats.available}</p>
              <p className="text-xs text-slate-500">Available IPs</p>
            </div>
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
              <Clock className="w-5 h-5 text-amber-400 mb-2" />
              <p className="text-2xl font-bold text-amber-400">{totalStats.reserved}</p>
              <p className="text-xs text-slate-500">Reserved IPs</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="relative mb-6">
            <div className="flex gap-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-1 w-fit">
              <button
                onClick={() => setActiveTab("my-ips")}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  activeTab === "my-ips"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                }`}
              >
                <Network className="w-4 h-4" />
                My IP Addresses
              </button>
              {/* <button
                onClick={() => setActiveTab("pools")}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  activeTab === "pools"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                }`}
              >
                <Globe className="w-4 h-4" />
                IP Pools
              </button>
              <button
                onClick={() => setActiveTab("subnets")}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  activeTab === "subnets"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                }`}
              >
                <Server className="w-4 h-4" />
                Subnets
              </button> */}
            </div>
          </div>

          {/* Filters (for My IPs tab) */}
          {activeTab === "my-ips" && (
            <div className="relative mb-6 flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by IP or assigned VM..."
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>
              <select
                value={selectedPOP}
                onChange={(e) => setSelectedPOP(e.target.value)}
                className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white"
              >
                <option value="all">All Locations</option>
                {pops.map(pop => (
                  <option key={pop.id} value={pop.id}>{pop.name}</option>
                ))}
              </select>
              <select
                value={selectedVersion}
                onChange={(e) => setSelectedVersion(e.target.value as any)}
                className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white"
              >
                <option value="all">All Versions</option>
                <option value="IPv4">IPv4</option>
                <option value="IPv6">IPv6</option>
              </select>
            </div>
          )}

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
          ) : (
            <>
              {activeTab === "my-ips" && (
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
                  {filteredIPs.length === 0 ? (
                    <div className="p-12 text-center">
                      <Network className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">No IP addresses found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-800/50 border-b border-slate-700">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">IP Address</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Version</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Location</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Assigned To</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">PTR Record</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                          {filteredIPs.map((ip) => (
                            <tr key={ip.id} className="hover:bg-slate-800/30 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-white text-sm">{ip.address}</span>
                                  <button
                                    onClick={() => handleCopyIP(ip.address)}
                                    className="p-1 hover:bg-slate-700 rounded transition"
                                  >
                                    {copiedIP === ip.address ? (
                                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3 text-slate-500" />
                                    )}
                                  </button>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-xs px-2 py-1 rounded ${
                                  ip.version === "IPv4" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"
                                }`}>
                                  {ip.version}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-3 h-3 text-slate-500" />
                                  <span className="text-slate-300 text-sm">{ip.pop}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-xs px-2 py-1 rounded ${getStatusColor(ip.status)}`}>
                                  {getStatusText(ip.status)}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {ip.assignedTo ? (
                                  <div className="flex items-center gap-2">
                                    <Server className="w-3 h-3 text-indigo-400" />
                                    <span className="text-slate-300 text-sm">{ip.assignedTo.name}</span>
                                    <span className="text-xs text-slate-500">(ID: {ip.assignedTo.vmid})</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-500 text-sm">Not assigned</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {ip.ptrRecord ? (
                                  <span className="text-slate-300 text-sm font-mono">{ip.ptrRecord}</span>
                                ) : (
                                  <span className="text-slate-500 text-sm">Not set</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  {ip.status === "available" && (
                                    <button
                                      onClick={() => setShowAssignModal(ip)}
                                      className="p-1.5 hover:bg-indigo-500/10 rounded transition"
                                      title="Assign IP"
                                    >
                                      <Plus className="w-4 h-4 text-indigo-400" />
                                    </button>
                                  )}
                                  {ip.status === "assigned" && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setShowPTRModal(ip);
                                          setPTRRecord(ip.ptrRecord || "");
                                        }}
                                        className="p-1.5 hover:bg-slate-700 rounded transition"
                                        title="Set PTR Record"
                                      >
                                        <Link className="w-4 h-4 text-slate-400" />
                                      </button>
                                      <button
                                        onClick={() => setShowReleaseConfirm(ip)}
                                        className="p-1.5 hover:bg-red-500/10 rounded transition"
                                        title="Release IP"
                                      >
                                        <Trash2 className="w-4 h-4 text-red-400" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* {activeTab === "pools" && (
                <div className="space-y-6">
                  {pops.map((pop) => (
                    <div key={pop.id} className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
                      <button
                        onClick={() => setExpandedPOP(expandedPOP === pop.id ? null : pop.id)}
                        className="w-full flex items-center justify-between p-5 hover:bg-slate-800/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <MapPin className="w-5 h-5 text-indigo-400" />
                          <div>
                            <h3 className="text-white font-semibold text-lg">{pop.name}</h3>
                            <p className="text-slate-500 text-sm">{pop.location}, {pop.country}</p>
                          </div>
                        </div>
                        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${expandedPOP === pop.id ? "rotate-180" : ""}`} />
                      </button>
                      
                      {expandedPOP === pop.id && (
                        <div className="p-5 pt-0 border-t border-slate-700">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                            {pop.subnets.map((subnet) => (
                              <div key={subnet.id} className="bg-slate-800/30 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    subnet.version === "IPv4" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"
                                  }`}>
                                    {subnet.version}
                                  </span>
                                  <span className="text-xs text-slate-500">{subnet.cidr}</span>
                                </div>
                                <p className="text-white font-mono text-sm mb-3">{subnet.cidr}</p>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Total IPs:</span>
                                    <span className="text-white">{subnet.totalIPs}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Used:</span>
                                    <span className="text-emerald-400">{subnet.usedIPs}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Available:</span>
                                    <span className="text-blue-400">{subnet.availableIPs}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Reserved:</span>
                                    <span className="text-amber-400">{subnet.reservedIPs}</span>
                                  </div>
                                </div>
                                {subnet.gateway && (
                                  <div className="mt-3 pt-3 border-t border-slate-700">
                                    <p className="text-xs text-slate-500">Gateway: <span className="text-slate-300 font-mono">{subnet.gateway}</span></p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "subnets" && (
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-800/50 border-b border-slate-700">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Subnet</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Version</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Location</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Usage</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Gateway</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">DNS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {subnets.map((subnet) => {
                          const usagePercent = (subnet.usedIPs / subnet.totalIPs) * 100;
                          return (
                            <tr key={subnet.id} className="hover:bg-slate-800/30 transition-colors">
                              <td className="px-6 py-4">
                                <span className="font-mono text-white text-sm">{subnet.cidr}</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-xs px-2 py-1 rounded ${
                                  subnet.version === "IPv4" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"
                                }`}>
                                  {subnet.version}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-slate-300 text-sm">{subnet.pop}</span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="w-32">
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-500">{subnet.usedIPs}/{subnet.totalIPs}</span>
                                    <span className="text-slate-500">{usagePercent.toFixed(0)}%</span>
                                  </div>
                                  <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                    <div 
                                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                      style={{ width: `${usagePercent}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                {subnet.gateway ? (
                                  <span className="font-mono text-slate-300 text-sm">{subnet.gateway}</span>
                                ) : (
                                  <span className="text-slate-500 text-sm">-</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {subnet.dns1 && (
                                  <div>
                                    <span className="font-mono text-slate-300 text-xs">{subnet.dns1}</span>
                                    {subnet.dns2 && <span className="font-mono text-slate-300 text-xs ml-2">{subnet.dns2}</span>}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )} */}
            </>
          )}
        </div>
      </div>

      {/* Assign IP Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center animate-fadeIn">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-white font-bold text-lg mb-4">Assign IP Address</h3>
            <p className="text-slate-300 text-sm mb-4">
              Assign <span className="font-mono text-indigo-400">{showAssignModal.address}</span> to a VM
            </p>
            <select
              value={assignVM}
              onChange={(e) => setAssignVM(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white mb-4"
            >
              <option value="">Select a VM...</option>
              {vms.map(vm => (
                <option key={vm.vmid} value={vm.vmid}>
                  {vm.name} (ID: {vm.vmid})
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
                onClick={handleAssignIP}
                disabled={!assignVM}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition disabled:opacity-50"
              >
                Assign IP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PTR Record Modal */}
      {showPTRModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center animate-fadeIn">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-white font-bold text-lg mb-4">Set PTR Record</h3>
            <p className="text-slate-300 text-sm mb-4">
              Set reverse DNS for <span className="font-mono text-indigo-400">{showPTRModal.address}</span>
            </p>
            <input
              type="text"
              value={ptrRecord}
              onChange={(e) => setPTRRecord(e.target.value)}
              placeholder="e.g., server1.example.com"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowPTRModal(null)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePTR}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition"
              >
                Save PTR Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Release IP Modal */}
      {showReleaseConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center animate-fadeIn">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-amber-400" />
              <h3 className="text-white font-bold text-lg">Release IP Address</h3>
            </div>
            <p className="text-slate-300 text-sm mb-4">
              Are you sure you want to release <span className="font-mono text-amber-400">{showReleaseConfirm.address}</span>?
              This IP will be returned to the pool and will be available for other VMs.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowReleaseConfirm(null)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReleaseIP}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition"
              >
                Release IP
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}