'use client'

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2, User, Search, CheckCircle2, Mail, Building } from 'lucide-react';
import { LayoutWrapper } from '../../../components/layout/LayoutWrapper';
import { getColocation, assignColocation, Colocation } from '../../../lib/colocation';
import { getUsers } from '../../../lib/users';
import { cn } from '@/lib/utils';

// Updated User interface to match actual API response
interface ApiUser {
  id: number;
  email: string;
  role: string;
  wallet_balance: string;
  verified: boolean;
  created_at: string;
  phone: string | null;
  company: string | null;
  tax_id: string | null;
  address: any;
  status: string;
  full_name?: string; // Optional - API doesn't provide this
  name?: string; // Optional - alternative field
}

export default function AssignColocationPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [colocation, setColocation] = useState<Colocation | null>(null);
  const [users, setUsers] = useState<ApiUser[]>([]);
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
        const [colocationData, usersData] = await Promise.all([
          getColocation(id),
          getUsers({ take: 100 }),
        ]);
        setColocation(colocationData);
        
        // Handle the API response structure
        // const usersList = usersData.users || usersData.data || [];
        // setUsers(usersList);
  const usersList: ApiUser[] = (usersData.users ?? []).map((u) => ({
  id: u.id,
  email: u.email,
  role: u.role,
  wallet_balance: u.wallet_balance,
  verified: u.verified,
  created_at: u.created_at,
  phone: u.phone ?? null,        //  FIX
  company: u.company ?? null,    // (do same for safety)
  tax_id: u.tax_id ?? null,
  address: u.address ?? null,
  status: u.status,
  full_name: u.full_name,
  name: u.name,
}));

setUsers(usersList);
        if (colocationData.user_id) {
          setSelectedUser(colocationData.user_id);
        }
        
        if (colocationData.contract_start) {
          setFormData(prev => ({
            ...prev,
            contract_start: colocationData.contract_start?.split('T')[0] || '',
            contract_end: colocationData.contract_end?.split('T')[0] || '',
            auto_renew: colocationData.auto_renew ?? true,
            notes: colocationData.notes || '',
          }));
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
      await assignColocation(id, selectedUser, formData);
      router.push('/colocation/list');
    } catch (error: any) {
      console.error('Failed to assign colocation:', error);
      setError(error.response?.data?.message || 'Failed to assign colocation');
    } finally {
      setSaving(false);
    }
  };

  // Helper function to get display name
  const getDisplayName = (user: ApiUser): string => {
    if (user.full_name) return user.full_name;
    if (user.name) return user.name;
    // Extract name from email (e.g., "adarsh.tiwari" -> "Adarsh Tiwari")
    const emailName = user.email.split('@')[0];
    return emailName
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  // Safe filtering with null checks
  const filteredUsers = (users || []).filter(user => {
    const displayName = getDisplayName(user);
    const email = user.email || '';
    const company = user.company || '';
    const search = searchTerm.toLowerCase();
    
    return displayName.toLowerCase().includes(search) ||
           email.toLowerCase().includes(search) ||
           company.toLowerCase().includes(search);
  });

  const selectedUserData = users.find(u => u.id === selectedUser);

  if (loading) {
    return (
      <LayoutWrapper>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </LayoutWrapper>
    );
  }

  if (!colocation) {
    return (
      <LayoutWrapper>
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">Colocation not found</p>
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

  return (
    <LayoutWrapper>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assign Colocation</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {colocation.rack_id} - Unit {colocation.unit_position}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Colocation Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Space Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Datacenter</p>
                <p className="font-medium text-gray-900 dark:text-white">{colocation.datacenter}</p>
              </div>
              <div>
                <p className="text-gray-500">Rack</p>
                <p className="font-medium text-gray-900 dark:text-white">{colocation.rack_id}</p>
              </div>
              <div>
                <p className="text-gray-500">Unit</p>
                <p className="font-medium text-gray-900 dark:text-white">{colocation.unit_position} ({colocation.unit_size}U)</p>
              </div>
              <div>
                <p className="text-gray-500">Power</p>
                <p className="font-medium text-gray-900 dark:text-white">{colocation.power_capacity_kw} kW</p>
              </div>
              <div>
                <p className="text-gray-500">Monthly Price</p>
                <p className="font-medium text-gray-900 dark:text-white">₹{colocation.monthly_price?.toLocaleString() || 0}</p>
              </div>
              <div>
                <p className="text-gray-500">Current Status</p>
                <p className="font-medium text-gray-900 dark:text-white capitalize">{colocation.status}</p>
              </div>
            </div>
          </div>

          {/* User Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <User size={20} />
              Select Client
            </h2>
            
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name, email, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contract Details (Optional)</h2>
            
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
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assignment Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Add any notes about this assignment..."
              />
            </div>
          </div>

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
                  Assign Colocation
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