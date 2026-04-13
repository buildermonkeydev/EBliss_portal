'use client'

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Loader2,
  User,
  Search,
  CheckCircle2,
  Server,
  Calendar,
  FileText,
  AlertCircle,
  Mail,
  Building
} from 'lucide-react';
import { LayoutWrapper } from '../../../components/layout/LayoutWrapper';
import { getServer, assignServer, DedicatedServer } from '../../../lib/dedicated-servers';
import { getUsers, User as UserType } from '../../../lib/users';
import { cn } from '@/lib/utils';

export default function AssignServerPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [server, setServer] = useState<DedicatedServer | null>(null);
  const [users, setUsers] = useState<UserType[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    contract_start: '',
    contract_end: '',
    auto_renew: true,
    notes: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [serverData, usersData] = await Promise.all([
          getServer(id),
          getUsers({ take: 100 }),
        ]);
        setServer(serverData);
        setUsers(usersData.users || []);
        
        // If server already assigned, pre-select the user
        if (serverData.assigned_to) {
          setSelectedUser(serverData.assigned_to.id);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!selectedUser) {
      setError('Please select a client');
      return;
    }
    
    setSaving(true);

    try {
      await assignServer(id, selectedUser, {
        contract_start: formData.contract_start || undefined,
        contract_end: formData.contract_end || undefined,
        auto_renew: formData.auto_renew,
        notes: formData.notes || undefined,
      });
      
      router.push(`/dedicated-servers/${id}`);
    } catch (error: any) {
      console.error('Failed to assign server:', error);
      setError(error.response?.data?.message || 'Failed to assign server. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Get display name (handle both full_name and name fields)
  const getDisplayName = (user: UserType): string => {
    return user.full_name || user.name || user.email?.split('@')[0] || 'Unknown';
  };

  // Filter users safely
  const filteredUsers = (users || []).filter(user => {
    const displayName = getDisplayName(user);
    const email = user.email || '';
    const company = user.company || '';
    
    return displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           email.toLowerCase().includes(searchTerm.toLowerCase()) ||
           company.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <LayoutWrapper>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </LayoutWrapper>
    );
  }

  if (!server) {
    return (
      <LayoutWrapper>
        <div className="text-center py-12">
          <Server className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Server not found</p>
          <button
            onClick={() => router.back()}
            className="mt-3 text-blue-600 dark:text-blue-400 hover:underline"
          >
            Go back
          </button>
        </div>
      </LayoutWrapper>
    );
  }

  const selectedUserData = users.find(u => u.id === selectedUser);

  return (
    <LayoutWrapper>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assign Server to Client</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {server.name} • {server.hostname}
            </p>
          </div>
        </div>

        {/* Current Assignment Status */}
        {server.assigned_to && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
            <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
              <AlertCircle size={18} />
              <span className="font-medium">This server is already assigned</span>
            </div>
            <p className="text-sm text-yellow-600 dark:text-yellow-500 mt-1">
              Currently assigned to: {server.assigned_to.full_name} ({server.assigned_to.email})
            </p>
            <p className="text-xs text-yellow-500 mt-2">
              Assigning to a new client will transfer ownership.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Server Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Server size={20} />
              Server Details
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Name</p>
                <p className="font-medium text-gray-900 dark:text-white">{server.name}</p>
              </div>
              <div>
                <p className="text-gray-500">Hostname</p>
                <p className="font-medium text-gray-900 dark:text-white">{server.hostname}</p>
              </div>
              <div>
                <p className="text-gray-500">Datacenter</p>
                <p className="font-medium text-gray-900 dark:text-white">{server.datacenter}</p>
              </div>
              <div>
                <p className="text-gray-500">CPU</p>
                <p className="font-medium text-gray-900 dark:text-white">{server.cpu_model}</p>
              </div>
              <div>
                <p className="text-gray-500">RAM</p>
                <p className="font-medium text-gray-900 dark:text-white">{server.ram_gb} GB {server.ram_type}</p>
              </div>
              <div>
                <p className="text-gray-500">Monthly Price</p>
                <p className="font-medium text-gray-900 dark:text-white">₹{server.monthly_price?.toLocaleString() || 0}</p>
              </div>
            </div>
          </div>

          {/* Client Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <User size={20} />
              Select Client
            </h2>
            
            {/* Search */}
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Users List */}
            <div className="max-h-80 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  const displayName = getDisplayName(user);
                  
                  return (
                    <div
                      key={user.id}
                      onClick={() => setSelectedUser(user.id)}
                      className={cn(
                        "p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 last:border-b-0 transition-colors",
                        selectedUser === user.id && "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                          <User size={18} className="text-gray-500 dark:text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{displayName}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Mail size={12} />
                            {user.email}
                          </p>
                          {user.company && (
                            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                              <Building size={12} />
                              {user.company}
                            </p>
                          )}
                        </div>
                      </div>
                      {selectedUser === user.id && (
                        <CheckCircle2 size={20} className="text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <User size={32} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400">No users found</p>
                  <p className="text-xs text-gray-400 mt-1">Try adjusting your search</p>
                </div>
              )}
            </div>
            
            {/* Selected Client Summary */}
            {selectedUserData && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle2 size={14} />
                  Selected Client:
                </p>
                <p className="font-medium text-gray-900 dark:text-white mt-1">
                  {getDisplayName(selectedUserData)} • {selectedUserData.email}
                </p>
              </div>
            )}
          </div>

          {/* Contract Details */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar size={20} />
              Contract Details (Optional)
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contract Start Date
                </label>
                <input
                  type="date"
                  value={formData.contract_start}
                  onChange={(e) => setFormData({ ...formData, contract_start: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contract End Date
                </label>
                <input
                  type="date"
                  value={formData.contract_end}
                  onChange={(e) => setFormData({ ...formData, contract_end: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="mt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.auto_renew}
                  onChange={(e) => setFormData({ ...formData, auto_renew: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Auto-renew contract at the end of term
                </span>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText size={20} />
              Assignment Notes (Optional)
            </h2>
            
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Add any notes about this assignment..."
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving || !selectedUser}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Assign Server
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </LayoutWrapper>
  );
}