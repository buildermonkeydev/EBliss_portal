"use client";

import { useState } from "react";
import { X, Shield, Plus } from "lucide-react";
import { FirewallRule } from "../../firewall/type/firewall";

type Props = {
  open: boolean;
  onClose: () => void;
  onAdd: (rule: FirewallRule) => void;
};

export default function AddRuleDrawer({
  open,
  onClose,
  onAdd,
}: Props) {
  const [form, setForm] = useState({
    direction: "IN" as "IN" | "OUT",
    ipType: "IPv4" as "IPv4" | "IPv6",
    protocol: "TCP" as string,
    action: "ALLOW" as "ALLOW" | "DENY",
    port: "",
    source: "0.0.0.0/0",
    comment: "",
  });

  const handleSubmit = () => {
    const newRule: FirewallRule = {
      id: Date.now(),
      direction: form.direction,
      ipType: form.ipType,
      protocol: form.protocol,
      port: form.port ? (isNaN(Number(form.port)) ? form.port : Number(form.port)) : "any",
      source: form.source,
      action: form.action,
      comment: form.comment || undefined,
      enabled: true,
    };
    
    onAdd(newRule);
    onClose();
    
    // Reset form
    setForm({
      direction: "IN",
      ipType: "IPv4",
      protocol: "TCP",
      action: "ALLOW",
      port: "",
      source: "0.0.0.0/0",
      comment: "",
    });
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl z-50 transform transition-transform duration-300 ease-out animate-slideIn">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Add Firewall Rule</h2>
                <p className="text-sm text-slate-400">Configure traffic rules for your VPS</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Form */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Direction & IP Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Direction
                  </label>
                  <select
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                    value={form.direction}
                    onChange={(e) => setForm({ ...form, direction: e.target.value as "IN" | "OUT" })}
                  >
                    <option value="IN">IN (Incoming)</option>
                    <option value="OUT">OUT (Outgoing)</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    {form.direction === "IN" ? "Traffic coming to your server" : "Traffic leaving your server"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    IP Version
                  </label>
                  <select
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    value={form.ipType}
                    onChange={(e) => setForm({ ...form, ipType: e.target.value as "IPv4" | "IPv6" })}
                  >
                    <option value="IPv4">IPv4</option>
                    <option value="IPv6">IPv6</option>
                  </select>
                </div>
              </div>

              {/* Protocol & Action */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Protocol
                  </label>
                  <select
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    value={form.protocol}
                    onChange={(e) => setForm({ ...form, protocol: e.target.value })}
                  >
                    <option value="TCP">TCP</option>
                    <option value="UDP">UDP</option>
                    <option value="ICMP">ICMP</option>
                    <option value="ALL">ALL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Action
                  </label>
                  <select
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    value={form.action}
                    onChange={(e) => setForm({ ...form, action: e.target.value as "ALLOW" | "DENY" })}
                  >
                    <option value="ALLOW">Allow</option>
                    <option value="DENY">Deny</option>
                  </select>
                </div>
              </div>

              {/* Port */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Port / Port Range
                </label>
                <input
                  type="text"
                  placeholder="e.g., 80, 443, 3000-4000"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  value={form.port}
                  onChange={(e) => setForm({ ...form, port: e.target.value })}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Single port (e.g., 80) or range (e.g., 3000-4000). Leave empty for "any"
                </p>
              </div>

              {/* Source IP */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Source / Destination IP
                </label>
                <input
                  type="text"
                  placeholder="e.g., 0.0.0.0/0, 192.168.1.0/24, 203.0.113.5"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono text-sm"
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                />
                <p className="text-xs text-slate-500 mt-1">
                  CIDR notation (e.g., 0.0.0.0/0 for all IPs)
                </p>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Comment (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Describe this rule (e.g., Allow web traffic)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  value={form.comment}
                  onChange={(e) => setForm({ ...form, comment: e.target.value })}
                />
              </div>

              {/* Example Rules */}
              <div className="bg-slate-800/30 rounded-xl p-4">
                <p className="text-xs text-slate-400 font-medium mb-2"> Example Rules:</p>
                <div className="space-y-1 text-xs text-slate-500">
                  <p>• Allow HTTP (80) and HTTPS (443) from anywhere: IN, TCP, port 80,443, source 0.0.0.0/0, ALLOW</p>
                  <p>• Block SSH from specific IP: IN, TCP, port 22, source 203.0.113.5/32, DENY</p>
                  <p>• Allow all outgoing traffic: OUT, ALL, source 0.0.0.0/0, ALLOW</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-700">
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
              >
                <Plus className="w-4 h-4" />
                Add Rule
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
}