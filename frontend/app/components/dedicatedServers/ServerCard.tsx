"use client";

import { useState } from "react";
import { 
  Server, 
  Cpu, 
  MemoryStick, 
  HardDrive, 
  Network, 
  MapPin,
  CheckCircle,
  Clock,
  AlertCircle,
  Activity,
  Info
} from "lucide-react";

interface ServerCardProps {
  server: {
    id: number;
    name: string;
    cpu: string;
    cpuCores: number;
    ram: number;
    storage: string;
    storageSize: number;
    ip: string;
    location: string;
    status: "active" | "maintenance" | "offline";
    lastUpdated: string;
    assignedTo: string;
    specs: {
      model: string;
      architecture: string;
      diskType: string;
    };
  };
}

export default function ServerCard({ server }: ServerCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getStatusColor = (status: string) => {
    switch(status) {
      case "active": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
      case "maintenance": return "text-amber-400 bg-amber-500/10 border-amber-500/30";
      case "offline": return "text-red-400 bg-red-500/10 border-red-500/30";
      default: return "text-slate-400 bg-slate-500/10 border-slate-500/30";
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case "active": return <CheckCircle className="w-4 h-4" />;
      case "maintenance": return <Clock className="w-4 h-4" />;
      case "offline": return <AlertCircle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case "active": return "Active";
      case "maintenance": return "Maintenance";
      case "offline": return "Offline";
      default: return "Unknown";
    }
  };

  return (
    <div className="group relative overflow-hidden bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl hover:border-slate-600/50 transition-all duration-300 hover:shadow-xl hover:shadow-black/20">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-2xl" />
      
      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Server className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">{server.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${getStatusColor(server.status)}`}>
                  {getStatusIcon(server.status)}
                  {getStatusText(server.status)}
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {server.location}
                </span>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
            title="View details"
          >
            <Info className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Specs */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-slate-800/50 rounded-xl p-2 text-center">
            <Cpu className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
            <p className="text-white text-sm font-bold">{server.cpuCores}</p>
            <p className="text-slate-500 text-xs">Cores</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-2 text-center">
            <MemoryStick className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
            <p className="text-white text-sm font-bold">{server.ram} GB</p>
            <p className="text-slate-500 text-xs">RAM</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-2 text-center">
            <HardDrive className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
            <p className="text-white text-sm font-bold">{server.storageSize} GB</p>
            <p className="text-slate-500 text-xs">Storage</p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2 mb-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">CPU</span>
            <span className="text-slate-300">{server.cpu}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Storage Type</span>
            <span className="text-slate-300">{server.storage}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">IP Address</span>
            <span className="text-slate-300 font-mono text-xs">{server.ip}</span>
          </div>
        </div>

        {/* Expandable Details */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t border-slate-700 space-y-2 animate-slideDown">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Model</span>
              <span className="text-slate-300">{server.specs.model}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Architecture</span>
              <span className="text-slate-300">{server.specs.architecture}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Last Updated</span>
              <span className="text-slate-300">{new Date(server.lastUpdated).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Assigned To</span>
              <span className="text-slate-300">{server.assignedTo}</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-700 flex items-center justify-between text-xs">
          <span className="text-slate-500">Read-only view</span>
          <span className="text-indigo-400">Managed by admin</span>
        </div>
      </div>

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