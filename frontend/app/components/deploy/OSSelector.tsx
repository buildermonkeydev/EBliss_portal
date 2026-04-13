"use client";

import { Server, CheckCircle, Terminal } from "lucide-react";
import { OS } from "./types";

interface OSSelectorProps {
  operatingSystems: OS[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function OSSelector({ operatingSystems, selectedId, onSelect }: OSSelectorProps) {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 GB';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-5 flex items-center justify-center gap-2">
        <Server className="w-5 h-5 text-indigo-400" />
        Operating System
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 max-w-5xl mx-auto">
        {operatingSystems.map((os) => (
          <button
            key={os.id}
            onClick={() => onSelect(os.id)}
            className={`relative p-3 rounded-xl border-2 transition-all duration-300 text-center ${
              selectedId === os.id
                ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/20"
                : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
            }`}
          >
            <Terminal className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            <p className="text-white font-medium text-sm">{os.name}</p>
            <p className="text-xs text-slate-500">{os.version}</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded ${
                os.category === "linux" ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400"
              }`}>
                {os.category === "linux" ? "🐧 Linux" : "🪟 Windows"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{formatBytes(os.size)}</p>
            {selectedId === os.id && (
              <CheckCircle className="absolute top-2 right-2 w-4 h-4 text-indigo-400" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}