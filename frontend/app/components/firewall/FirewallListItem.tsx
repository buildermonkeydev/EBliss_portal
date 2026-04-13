"use client";

import { useState } from "react";
import { FirewallRule } from "../../firewall/type/firewall";
import { Trash2, Edit2, Shield, ShieldAlert, Check, X } from "lucide-react";

interface FirewallListItemProps {
  rule: FirewallRule;
  onDelete: (id: number) => void;
  onUpdate?: (rule: FirewallRule) => void;
}

export default function FirewallListItem({ rule, onDelete, onUpdate }: FirewallListItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedRule, setEditedRule] = useState(rule);

  const getActionColor = () => {
    return rule.action === "ALLOW" 
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
      : "bg-red-500/10 text-red-400 border-red-500/30";
  };

  const getDirectionIcon = () => {
    return rule.direction === "IN" 
      ? <Shield className="w-4 h-4" />
      : <ShieldAlert className="w-4 h-4" />;
  };

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(editedRule);
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
          <select
            value={editedRule.direction}
            onChange={(e) => setEditedRule({ ...editedRule, direction: e.target.value as "IN" | "OUT" })}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
          >
            <option value="IN">IN</option>
            <option value="OUT">OUT</option>
          </select>
          <select
            value={editedRule.protocol}
            onChange={(e) => setEditedRule({ ...editedRule, protocol: e.target.value })}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
          >
            <option value="TCP">TCP</option>
            <option value="UDP">UDP</option>
            <option value="ICMP">ICMP</option>
          </select>
          <input
            type="text"
            value={editedRule.port}
            onChange={(e) => setEditedRule({ ...editedRule, port: e.target.value })}
            placeholder="Port"
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
          />
          <input
            type="text"
            value={editedRule.source}
            onChange={(e) => setEditedRule({ ...editedRule, source: e.target.value })}
            placeholder="Source"
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
          />
          <select
            value={editedRule.action}
            onChange={(e) => setEditedRule({ ...editedRule, action: e.target.value as "ALLOW" | "DENY" })}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
          >
            <option value="ALLOW">ALLOW</option>
            <option value="DENY">DENY</option>
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-sm flex items-center gap-1">
            <X className="w-3 h-3" /> Cancel
          </button>
          <button onClick={handleSave} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm flex items-center gap-1">
            <Check className="w-3 h-3" /> Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-all duration-300">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            {getDirectionIcon()}
            <span className="text-white font-mono text-sm">{rule.direction}</span>
          </div>
          <div className="px-3 py-1 bg-slate-700 rounded-lg">
            <span className="text-white font-mono text-sm">{rule.protocol}</span>
          </div>
          <div className="px-3 py-1 bg-slate-700 rounded-lg">
            <span className="text-white font-mono text-sm">Port: {rule.port}</span>
          </div>
          <div className="px-3 py-1 bg-slate-700 rounded-lg">
            <span className="text-white font-mono text-sm">Source: {rule.source}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${getActionColor()}`}>
            {rule.action}
          </span>
          {onUpdate && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4 text-slate-400" />
            </button>
          )}
          <button
            onClick={() => onDelete(rule.id)}
            className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>
      {rule.comment && (
        <p className="text-xs text-slate-500 mt-2">// {rule.comment}</p>
      )}
    </div>
  );
}