"use client";

import { useState } from "react";
import { 
  Shield, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  ChevronDown, 
  ChevronRight,
  Server,
  Settings,
  AlertCircle
} from "lucide-react";
import { FirewallGroup, VM } from "../../firewall/type/firewall";

interface RuleGroupPanelProps {
  groups: FirewallGroup[];
  selectedGroup: string;
  onSelectGroup: (groupId: string) => void;
  onAddGroup: (group: FirewallGroup) => void;
  onUpdateGroup: (group: FirewallGroup) => void;
  onDeleteGroup: (groupId: string) => void;
  onAssignVM: (vmid: string, groupId: string) => void;
  vms: VM[];
  defaultPolicy: "accept" | "drop";
  onDefaultPolicyChange: (policy: "accept" | "drop") => void;
}

export default function RuleGroupPanel({
  groups,
  selectedGroup,
  onSelectGroup,
  onAddGroup,
  onUpdateGroup,
  onDeleteGroup,
  onAssignVM,
  vms,
  defaultPolicy,
  onDefaultPolicyChange,
}: RuleGroupPanelProps) {
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupDesc, setEditGroupDesc] = useState("");
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null);
  const [selectedVM, setSelectedVM] = useState<string>("");

  const handleAddGroup = () => {
    if (newGroupName.trim()) {
      const newGroup: FirewallGroup = {
        id: newGroupName.toLowerCase().replace(/\s+/g, "-"),
        name: newGroupName,
        description: newGroupDesc,
        rules: [],
        assignedVMs: [],
        defaultPolicy: "drop",
      };
      onAddGroup(newGroup);
      setIsAddingGroup(false);
      setNewGroupName("");
      setNewGroupDesc("");
    }
  };

  const handleUpdateGroup = (groupId: string) => {
    if (editGroupName.trim()) {
      const group = groups.find(g => g.id === groupId);
      if (group) {
        onUpdateGroup({
          ...group,
          name: editGroupName,
          description: editGroupDesc,
        });
      }
      setEditingGroup(null);
    }
  };

  const toggleGroupExpand = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const handleAssignVM = () => {
    if (showAssignModal && selectedVM) {
      onAssignVM(selectedVM, showAssignModal);
      setShowAssignModal(null);
      setSelectedVM("");
    }
  };

  const getAssignedVMs = (groupId: string) => {
    // In a real implementation, you'd fetch assigned VMs from your backend
    // For now, return empty array
    return [];
  };

  return (
    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-white">Rule Groups</h2>
        </div>
        <button
          onClick={() => setIsAddingGroup(true)}
          className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
          title="Add Group"
        >
          <Plus className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Default Policy */}
      <div className="mb-5 p-3 bg-slate-800/50 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-300">Default Policy</span>
          <div className="flex gap-2">
            <button
              onClick={() => onDefaultPolicyChange("accept")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                defaultPolicy === "accept"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-slate-700 text-slate-400 hover:bg-slate-600"
              }`}
            >
              Allow All
            </button>
            <button
              onClick={() => onDefaultPolicyChange("drop")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                defaultPolicy === "drop"
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-slate-700 text-slate-400 hover:bg-slate-600"
              }`}
            >
              Deny All
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          {defaultPolicy === "accept" 
            ? "Allow all traffic unless explicitly denied"
            : "Deny all traffic unless explicitly allowed"}
        </p>
      </div>

      {/* Add Group Form */}
      {isAddingGroup && (
        <div className="mb-4 p-3 bg-slate-800/50 rounded-xl border border-slate-700">
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Group name"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm mb-2 focus:outline-none focus:border-indigo-500"
            autoFocus
          />
          <input
            type="text"
            value={newGroupDesc}
            onChange={(e) => setNewGroupDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm mb-3 focus:outline-none focus:border-indigo-500"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setIsAddingGroup(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-sm flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Cancel
            </button>
            <button
              onClick={handleAddGroup}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm flex items-center gap-1"
            >
              <Check className="w-3 h-3" /> Add
            </button>
          </div>
        </div>
      )}

      {/* Groups List */}
      <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
        {/* Default Group */}
        <div
          onClick={() => onSelectGroup("default")}
          className={`group cursor-pointer rounded-xl transition-all duration-200 ${
            selectedGroup === "default"
              ? "bg-indigo-500/10 border border-indigo-500/30"
              : "hover:bg-slate-800/50 border border-transparent"
          }`}
        >
          <div className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-white text-sm font-medium">Default Rules</p>
                <p className="text-xs text-slate-500">Global firewall policies</p>
              </div>
            </div>
            {selectedGroup === "default" && (
              <Check className="w-4 h-4 text-indigo-400" />
            )}
          </div>
        </div>

        {/* Custom Groups */}
        {groups.map((group) => {
          const isExpanded = expandedGroups.has(group.id);
          const assignedVMs = getAssignedVMs(group.id);
          
          return (
            <div key={group.id} className="space-y-1">
              <div
                className={`group cursor-pointer rounded-xl transition-all duration-200 ${
                  selectedGroup === group.id
                    ? "bg-indigo-500/10 border border-indigo-500/30"
                    : "hover:bg-slate-800/50 border border-transparent"
                }`}
              >
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleGroupExpand(group.id);
                        }}
                        className="p-0.5 hover:bg-slate-700 rounded"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3 h-3 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-3 h-3 text-slate-400" />
                        )}
                      </button>
                      <div
                        onClick={() => onSelectGroup(group.id)}
                        className="flex-1"
                      >
                        <p className="text-white text-sm font-medium">{group.name}</p>
                        {group.description && (
                          <p className="text-xs text-slate-500">{group.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingGroup(group.id);
                          setEditGroupName(group.name);
                          setEditGroupDesc(group.description || "");
                        }}
                        className="p-1 hover:bg-slate-700 rounded"
                      >
                        <Edit2 className="w-3 h-3 text-slate-400" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteGroup(group.id);
                        }}
                        className="p-1 hover:bg-red-500/10 rounded"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && selectedGroup === group.id && (
                <div className="ml-8 space-y-2">
                  <div className="p-3 bg-slate-800/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Server className="w-3 h-3" />
                        Assigned VMs
                      </span>
                      <button
                        onClick={() => setShowAssignModal(group.id)}
                        className="text-xs text-indigo-400 hover:text-indigo-300"
                      >
                        + Assign VM
                      </button>
                    </div>
                    {assignedVMs.length === 0 ? (
                      <p className="text-xs text-slate-500">No VMs assigned</p>
                    ) : (
                      <div className="space-y-1">
                        {assignedVMs.map((vm) => (
                          <div key={vm} className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">{vm}</span>
                            <button className="text-red-400 hover:text-red-300">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {groups.length === 0 && (
          <div className="text-center py-8">
            <Settings className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No custom groups</p>
            <p className="text-slate-600 text-xs">Click + to create one</p>
          </div>
        )}
      </div>

      {/* Assign VM Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center animate-fadeIn">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-white font-bold text-lg mb-4">Assign VM to Group</h3>
            <select
              value={selectedVM}
              onChange={(e) => setSelectedVM(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white mb-4"
            >
              <option value="">Select a VM...</option>
              {vms.map((vm) => (
                <option key={vm.vmid} value={vm.vmid.toString()}>
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
                onClick={handleAssignVM}
                disabled={!selectedVM}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition disabled:opacity-50"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Group Modal */}
      {editingGroup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center animate-fadeIn">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-white font-bold text-lg mb-4">Edit Group</h3>
            <input
              type="text"
              value={editGroupName}
              onChange={(e) => setEditGroupName(e.target.value)}
              placeholder="Group name"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white mb-3"
            />
            <input
              type="text"
              value={editGroupDesc}
              onChange={(e) => setEditGroupDesc(e.target.value)}
              placeholder="Description"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setEditingGroup(null)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateGroup(editingGroup)}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}