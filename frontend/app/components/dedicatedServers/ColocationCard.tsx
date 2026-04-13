"use client";

import { useState } from "react";
import { 
  Database, 
  Server, 
  Zap, 
  Network, 
  MapPin,
  CheckCircle,
  Clock,
  AlertCircle,
  Activity,
  Info,
  Link
} from "lucide-react";

interface ColocationCardProps {
  colocation: {
    id: number;
    name: string;
    rackUnit: string;
    powerAllocation: string;
    ips: string[];
    crossConnect: string;
    location: string;
    status: "active" | "maintenance" | "offline";
    assignedTo: string;
    lastUpdated: string;
  };
}

export default function ColocationCard({ colocation }: ColocationCardProps) {
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
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-2xl" />
      
      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">{colocation.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${getStatusColor(colocation.status)}`}>
                  {getStatusIcon(colocation.status)}
                  {getStatusText(colocation.status)}
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {colocation.location}
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
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-800/50 rounded-xl p-3 text-center">
            <Server className="w-4 h-4 text-purple-400 mx-auto mb-1" />
            <p className="text-white text-sm font-bold">{colocation.rackUnit}</p>
            <p className="text-slate-500 text-xs">Rack Unit</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3 text-center">
            <Zap className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <p className="text-white text-sm font-bold">{colocation.powerAllocation}</p>
            <p className="text-slate-500 text-xs">Power Allocation</p>
          </div>
        </div>

        {/* IPs */}
        <div className="mb-4">
          <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
            <Network className="w-3 h-3" />
            IP Addresses ({colocation.ips.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {colocation.ips.map((ip, idx) => (
              <code key={idx} className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">
                {ip}
              </code>
            ))}
          </div>
        </div>

        {/* Cross Connect */}
        <div className="mb-4">
          <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
            <Link className="w-3 h-3" />
            Cross Connect
          </p>
          <p className="text-sm text-slate-300">{colocation.crossConnect}</p>
        </div>

        {/* Expandable Details */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t border-slate-700 space-y-2 animate-slideDown">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Last Updated</span>
              <span className="text-slate-300">{new Date(colocation.lastUpdated).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Assigned To</span>
              <span className="text-slate-300">{colocation.assignedTo}</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-700 flex items-center justify-between text-xs">
          <span className="text-slate-500">Read-only view</span>
          <span className="text-purple-400">Managed by admin</span>
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