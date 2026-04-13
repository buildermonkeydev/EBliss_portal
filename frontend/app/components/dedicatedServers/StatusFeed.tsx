"use client";

import { useState } from "react";
import { 
  Activity, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Server,
  Database,
  Info
} from "lucide-react";

interface StatusUpdate {
  id: number;
  type: "server" | "colocation";
  name: string;
  status: "active" | "maintenance" | "offline";
  message: string;
  timestamp: string;
  adminNote?: string;
}

interface StatusFeedProps {
  updates: StatusUpdate[];
  onRefresh: () => void;
}

export default function StatusFeed({ updates, onRefresh }: StatusFeedProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case "active": return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case "maintenance": return <Clock className="w-4 h-4 text-amber-400" />;
      case "offline": return <AlertCircle className="w-4 h-4 text-red-400" />;
      default: return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch(type) {
      case "server": return <Server className="w-4 h-4 text-indigo-400" />;
      case "colocation": return <Database className="w-4 h-4 text-purple-400" />;
      default: return <Info className="w-4 h-4 text-slate-400" />;
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
    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-white">Status Feed</h2>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 hover:bg-slate-700 rounded-xl transition-colors"
        >
          <RefreshCw className={`w-4 h-4 text-slate-400 ${isRefreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Updates List */}
      <div className="divide-y divide-slate-700 max-h-[600px] overflow-y-auto">
        {updates.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No status updates available</p>
            <p className="text-slate-500 text-sm mt-1">Updates will appear here when admins post them</p>
          </div>
        ) : (
          updates.map((update) => (
            <div key={update.id} className="p-5 hover:bg-slate-800/30 transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {getTypeIcon(update.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="font-medium text-white">{update.name}</span>
                    <span className="text-xs text-slate-500">{update.type === "server" ? "Dedicated Server" : "Colocation"}</span>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(update.status)}
                      <span className={`text-xs font-medium ${
                        update.status === "active" ? "text-emerald-400" :
                        update.status === "maintenance" ? "text-amber-400" :
                        "text-red-400"
                      }`}>
                        {getStatusText(update.status)}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-300 text-sm mb-2">{update.message}</p>
                  {update.adminNote && (
                    <div className="mt-2 p-2 bg-slate-800/50 rounded-lg text-xs text-slate-400">
                      <span className="font-medium text-indigo-400">Admin Note:</span> {update.adminNote}
                    </div>
                  )}
                  <p className="text-xs text-slate-500 mt-2">
                    {new Date(update.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700 bg-slate-800/30">
        <p className="text-xs text-slate-500 text-center">
          Status updates are managed by administrators. For immediate assistance, contact support.
        </p>
      </div>
    </div>
  );
}