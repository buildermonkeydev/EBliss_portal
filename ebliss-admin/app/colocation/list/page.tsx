'use client'

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Building2,
  HardDrive,
  Zap,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Loader2,
  Wifi,
  MapPin
} from 'lucide-react';
import { LayoutWrapper } from '../../components/layout/LayoutWrapper';
import { getColocations, deleteColocation, getColocationStatistics, Colocation } from '../../lib/colocation';
import { adminGetAllPOPs, Pop } from '../../lib/pops';
import { cn } from '@/lib/utils';

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  active: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2, label: 'Active' },
  pending: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Clock, label: 'Pending' },
  suspended: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: AlertCircle, label: 'Suspended' },
  terminated: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400', icon: XCircle, label: 'Terminated' },
  maintenance: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: AlertCircle, label: 'Maintenance' },
};

const cabinetTypeConfig: Record<string, string> = {
  standard: 'Standard',
  high_density: 'High Density',
  secure: 'Secure',
};

export default function ColocationListPage() {
  const router = useRouter();
  const [colocations, setColocations] = useState<Colocation[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [pops, setPops] = useState<Pop[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPops, setLoadingPops] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDatacenter, setSelectedDatacenter] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [total, setTotal] = useState(0);

  const statuses = ['all', 'active', 'pending', 'suspended', 'maintenance', 'terminated'];

  // Fetch POPs for datacenter filter
  useEffect(() => {
    const fetchPops = async () => {
      try {
        setLoadingPops(true);
        const response = await adminGetAllPOPs();
        const popsData = (response as any).data || response || [];
        setPops(popsData.filter((pop: Pop) => pop.active));
      } catch (error) {
        console.error('Failed to fetch datacenters:', error);
      } finally {
        setLoadingPops(false);
      }
    };
    fetchPops();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [colocationsRes, statsRes] = await Promise.all([
        getColocations({
          status: selectedStatus === 'all' ? undefined : selectedStatus,
          datacenter: selectedDatacenter === 'all' ? undefined : selectedDatacenter,
          search: searchTerm || undefined,
        }),
        getColocationStatistics(),
      ]);
      setColocations(colocationsRes.colocations);
      setTotal(colocationsRes.total);
      setStatistics(statsRes);
    } catch (error) {
      console.error('Failed to fetch colocations:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedDatacenter, selectedStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this colocation?')) return;

    try {
      await deleteColocation(id);
      fetchData();
    } catch (error) {
      console.error('Failed to delete colocation:', error);
      alert('Failed to delete colocation');
    }
  };

  const handleAssign = (id: string) => {
    router.push(`/colocation/${id}/assign`);
  };

  // Get unique datacenters from both POPs and existing colocations
  const datacenters = ['all', ...new Set([
    ...pops.map(pop => pop.name),
    ...colocations.map(c => c.datacenter)
  ].filter(Boolean))];

  if (loading && colocations.length === 0) {
    return (
      <LayoutWrapper>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Colocation</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage colocation spaces and client assignments
            </p>
          </div>
          <button
            onClick={() => router.push('/colocation/create')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Add Colocation
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Spaces</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{statistics?.total || 0}</p>
              </div>
              <Building2 className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
                <p className="text-2xl font-bold text-green-600">{statistics?.active || 0}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Power</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {statistics?.total_power_kw || 0} kW
                </p>
              </div>
              <Zap className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by rack, client, or datacenter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={selectedDatacenter}
                onChange={(e) => setSelectedDatacenter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                disabled={loadingPops}
              >
                <option value="all">All Datacenters</option>
                {datacenters.filter(dc => dc !== 'all').map(dc => (
                  <option key={`dc-${dc}`} value={dc}>{dc}</option>
                ))}
              </select>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                {statuses.map(status => (
                  <option key={`status-${status}`} value={status}>
                    {status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Colocations Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Space</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Specs</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {colocations.map((colocation) => {
                  const status = statusConfig[colocation.status] || statusConfig.pending;
                  const StatusIcon = status.icon;

                  return (
                    <tr key={colocation.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {colocation.rack_name || colocation.rack_id}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <MapPin size={12} />
                            {colocation.datacenter}
                          </p>
                          <p className="text-xs text-gray-400">Unit: {colocation.unit_position} ({colocation.unit_size}U)</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1 text-sm">
                          <p className="text-gray-600 dark:text-gray-300 flex items-center gap-1">
                            <HardDrive size={12} />
                            {cabinetTypeConfig[colocation.cabinet_type] || colocation.cabinet_type}
                          </p>
                          <p className="text-gray-600 dark:text-gray-300 flex items-center gap-1">
                            <Zap size={12} />
                            {colocation.power_capacity_kw} kW
                          </p>
                          <p className="text-gray-600 dark:text-gray-300 flex items-center gap-1">
                            <Wifi size={12} />
                            {colocation.bandwidth_mbps} Mbps
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {colocation.assigned_to ? (
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
                              <User size={12} />
                              {colocation.assigned_to.full_name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{colocation.assigned_to.email}</p>
                            {colocation.assigned_to.company && (
                              <p className="text-xs text-gray-400">{colocation.assigned_to.company}</p>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="text-sm text-gray-400">Unassigned</span>
                            <button
                              onClick={() => handleAssign(colocation.id)}
                              className="mt-1 text-xs text-blue-600 dark:text-blue-400 hover:underline block"
                            >
                              Assign Client
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                          status.color
                        )}>
                          <StatusIcon size={12} />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                         <p className="font-semibold text-gray-900 dark:text-white">
  ₹{colocation.monthly_price?.toLocaleString() || 0}
</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">/month</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => router.push(`/colocation/${colocation.id}`)}
                            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => router.push(`/colocation/${colocation.id}/edit`)}
                            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(colocation.id)}
                            className="p-2 rounded-lg text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {colocations.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No colocation spaces found</p>
              <button
                onClick={() => router.push('/colocation/create')}
                className="mt-3 text-blue-600 dark:text-blue-400 hover:underline"
              >
                Add your first colocation space
              </button>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {colocations.length} of {total} colocation spaces
          </p>
        </div>
      </div>
    </LayoutWrapper>
  );
}