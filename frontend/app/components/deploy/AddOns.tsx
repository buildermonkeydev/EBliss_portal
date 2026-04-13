"use client";

import { Network, Wifi } from "lucide-react";

interface AddOnsProps {
  additionalIPs: number;
  bandwidth: number;
  includedBandwidth: number;
  onIPsChange: (value: number) => void;
  onBandwidthChange: (value: number) => void;
}

export function AddOns({ 
  additionalIPs, 
  bandwidth, 
  includedBandwidth, 
  onIPsChange, 
  onBandwidthChange 
}: AddOnsProps) {
  const bandwidthOptions = [includedBandwidth, includedBandwidth + 5, includedBandwidth + 10, includedBandwidth + 20, includedBandwidth + 50];

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-5 flex items-center justify-center gap-2">
        Add-ons & Customization
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <div className="bg-slate-800/30 rounded-xl p-5 text-center">
          <label className="block text-slate-300 text-sm font-medium mb-3 flex items-center justify-center gap-2">
            <Network className="w-4 h-4 text-indigo-400" />
            Additional Public IPs
          </label>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => onIPsChange(Math.max(0, additionalIPs - 1))}
              className="w-10 h-10 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xl transition"
            >
              -
            </button>
            <span className="text-white text-2xl font-bold w-12 text-center">{additionalIPs}</span>
            <button
              onClick={() => onIPsChange(Math.min(10, additionalIPs + 1))}
              className="w-10 h-10 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xl transition"
            >
              +
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">@ ₹50/month per IP • IPv4 from IPAM pool</p>
        </div>

        <div className="bg-slate-800/30 rounded-xl p-5 text-center">
          <label className="block text-slate-300 text-sm font-medium mb-3 flex items-center justify-center gap-2">
            <Wifi className="w-4 h-4 text-indigo-400" />
            Bandwidth Package (TB/month)
          </label>
          <select
            value={bandwidth}
            onChange={(e) => onBandwidthChange(parseInt(e.target.value))}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-center"
          >
            {bandwidthOptions.map((bw) => (
              <option key={bw} value={bw}>
                {bw} TB {bw === includedBandwidth ? "(Included)" : `(+₹${(bw - includedBandwidth) * 100}/month)`}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}