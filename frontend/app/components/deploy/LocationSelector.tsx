"use client";

import { Globe, CheckCircle, Clock, Activity } from "lucide-react";
import { Location } from "./types";

interface LocationSelectorProps {
  locations: Location[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function LocationSelector({ locations, selectedId, onSelect }: LocationSelectorProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-5 flex items-center justify-center gap-2">
        <Globe className="w-5 h-5 text-indigo-400" />
        Choose Your Data Center
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
        {locations.map((loc) => (
          <button
            key={loc.id}
            onClick={() => loc.available && onSelect(loc.id)}
            disabled={!loc.available}
            className={`relative p-4 rounded-xl border-2 transition-all duration-300 text-center ${
              selectedId === loc.id
                ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/20"
                : loc.available 
                  ? "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                  : "border-slate-700 bg-slate-800/30 opacity-50 cursor-not-allowed"
            }`}
          >
            <div className="text-3xl mb-2">{loc.flag}</div>
            <p className="text-white font-medium text-sm">{loc.displayName || loc.name}</p>
            <p className="text-xs text-slate-500">{loc.city}, {loc.country}</p>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {loc.latency}ms
              </span>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Activity className="w-3 h-3" /> {loc.status.cpu.toFixed(0)}%
              </span>
            </div>
            <div className="mt-2 h-1 w-full bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${Math.min(loc.status.memory.usagePercent, 100)}%` }}
              />
            </div>
            {selectedId === loc.id && (
              <CheckCircle className="absolute top-2 right-2 w-4 h-4 text-indigo-400" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}