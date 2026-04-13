"use client";

import { useState } from "react";
import { Server, ChevronDown, Check, Search, Cpu, HardDrive, MemoryStick } from "lucide-react";
import { VM } from "../../firewall/type/firewall";

interface VMSelectorProps {
  vms: VM[];
  selectedVps: string;
  onSelect: (vmid: string) => void;
}

export default function VMSelector({ vms, selectedVps, onSelect }: VMSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedVM = vms.find(vm => vm.vmid.toString() === selectedVps);

  const filteredVMs = vms.filter(vm =>
    vm.name.toLowerCase().includes(search.toLowerCase()) ||
    vm.vmid.toString().includes(search)
  );

  const getStatusColor = (status: string) => {
    return status === "running" ? "bg-emerald-500" : "bg-red-500";
  };

  const getStatusText = (status: string) => {
    return status === "running" ? "Running" : "Stopped";
  };

  const formatBytes = (bytes: number) => {
    return (bytes / 1024 / 1024 / 1024).toFixed(1);
  };

  return (
    <div className="relative">
      {/* Selected VM Display */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl hover:border-slate-600/50 transition-all duration-300"
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Server className="w-6 h-6 text-white" />
            </div>
            {selectedVM && (
              <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${getStatusColor(selectedVM.status)} ${
                selectedVM.status === "running" ? "animate-pulse" : ""
              }`} />
            )}
          </div>
          <div className="text-left">
            {selectedVM ? (
              <>
                <p className="text-white font-semibold">{selectedVM.name}</p>
                <p className="text-xs text-slate-400">ID: {selectedVM.vmid} • {getStatusText(selectedVM.status)}</p>
              </>
            ) : (
              <>
                <p className="text-white font-semibold">Select a VM</p>
                <p className="text-xs text-slate-400">Choose a VPS to manage firewall rules</p>
              </>
            )}
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-20 overflow-hidden animate-slideDown">
            {/* Search */}
            <div className="p-3 border-b border-slate-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or ID..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>
            </div>

            {/* VM List */}
            <div className="max-h-80 overflow-y-auto">
              {filteredVMs.length === 0 ? (
                <div className="p-8 text-center">
                  <Server className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No VMs found</p>
                </div>
              ) : (
                filteredVMs.map((vm) => (
                  <button
                    key={vm.vmid}
                    onClick={() => {
                      onSelect(vm.vmid.toString());
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`w-full p-4 text-left hover:bg-slate-700/50 transition-all duration-200 ${
                      selectedVps === vm.vmid.toString() ? "bg-indigo-500/10" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${
                            vm.type === "lxc" 
                              ? "from-emerald-500 to-teal-600"
                              : "from-indigo-500 to-purple-600"
                          } flex items-center justify-center`}>
                            <Server className="w-5 h-5 text-white" />
                          </div>
                          <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${getStatusColor(vm.status)}`} />
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{vm.name}</p>
                          <p className="text-xs text-slate-500">ID: {vm.vmid}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Cpu className="w-3 h-3" />
                          <span>{(vm.cpu * 100).toFixed(0)}%</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <MemoryStick className="w-3 h-3" />
                          <span>{formatBytes(vm.maxmem)} GB</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <HardDrive className="w-3 h-3" />
                          <span>{formatBytes(vm.maxdisk)} GB</span>
                        </div>
                        {selectedVps === vm.vmid.toString() && (
                          <Check className="w-4 h-4 text-indigo-400" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        vm.type === "lxc" 
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-indigo-500/20 text-indigo-400"
                      }`}>
                        {vm.type === "lxc" ? "LXC Container" : "KVM VM"}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        vm.status === "running"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-red-500/20 text-red-400"
                      }`}>
                        {getStatusText(vm.status)}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-700 bg-slate-800/50">
              <p className="text-xs text-slate-500 text-center">
                {filteredVMs.length} VM{filteredVMs.length !== 1 ? "s" : ""} available
              </p>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}