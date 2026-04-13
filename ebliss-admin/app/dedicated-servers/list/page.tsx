'use client'

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Server, Loader2 } from 'lucide-react';
import { LayoutWrapper } from '../../components/layout/LayoutWrapper';
import { ServerStatsCards } from '../../components/dedicated-servers/ServerStatsCards';
import { ServerFilters } from '../../components/dedicated-servers/ServerFilters';
import { ServerTable } from '../../components/dedicated-servers/ServerTable';
import { ServerGrid } from '../../components/dedicated-servers/ServerGrid';
import {
  getServers,
  getServerStatistics,
  deleteServer,
  DedicatedServer,
  ServerStatistics,
} from '../../lib/dedicated-servers';
import { adminGetAllPOPs, Pop } from '../../lib/pops';

export default function DedicatedServersListPage() {
  const router = useRouter();
  const [servers, setServers] = useState<DedicatedServer[]>([]);
  const [statistics, setStatistics] = useState<ServerStatistics | null>(null);
  const [pops, setPops] = useState<Pop[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPops, setLoadingPops] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDatacenter, setSelectedDatacenter] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const statuses = ['all', 'online', 'offline', 'maintenance', 'provisioning', 'pending', 'suspended', 'error'];

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
      const [serversRes, statsRes] = await Promise.all([
        getServers({
          status: selectedStatus === 'all' ? undefined : selectedStatus,
          datacenter: selectedDatacenter === 'all' ? undefined : selectedDatacenter,
          search: searchTerm || undefined,
        }),
        getServerStatistics(),
      ]);
      setServers(serversRes.servers);
      setStatistics(statsRes);
    } catch (error) {
      console.error('Failed to fetch servers:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedDatacenter, selectedStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this server?')) return;

    try {
      await deleteServer(id);
      setServers(servers.filter((s) => s.id !== id));
      fetchData(); // Refresh statistics
    } catch (error) {
      console.error('Failed to delete server:', error);
      alert('Failed to delete server. Please try again.');
    }
  };

  const getTotalRam = () => {
    return servers.reduce((sum, s) => sum + (s.ram_gb || 0), 0);
  };

  const getTotalStorage = () => {
    return servers.reduce((sum, s) => {
      return sum + (s.storage?.reduce((ss, st) => ss + st.size_gb, 0) || 0);
    }, 0);
  };

const getOnlineServers = () => {
  return servers.filter((s) => s.status === 'online').length;
};
  // Get unique datacenters from both POPs and existing servers
  const datacenters = ['all', ...new Set([
    ...pops.map(pop => pop.name),
    ...servers.map(s => s.datacenter)
  ].filter(Boolean))];

  if (loading && servers.length === 0) {
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dedicated Servers</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage your bare metal dedicated servers
            </p>
          </div>
          <button
            onClick={() => router.push('/dedicated-servers/create')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Deploy Server
          </button>
        </div>

        {/* Stats Cards */}
        <ServerStatsCards
          totalServers={statistics?.total_servers || 0}
          onlineServers={getOnlineServers()}
          totalRam={getTotalRam()}
          totalStorage={getTotalStorage()}
          monthlyRevenue={statistics?.monthly_revenue || 0}
          loading={loading}
        />

        {/* Filters */}
        <ServerFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedDatacenter={selectedDatacenter}
          onDatacenterChange={setSelectedDatacenter}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          datacenters={datacenters}
          statuses={statuses}
          loadingDatacenters={loadingPops}
        />

        {/* Servers Display */}
        {servers.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <Server className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No servers found</p>
            <button
              onClick={() => router.push('/dedicated-servers/create')}
              className="mt-3 text-blue-600 dark:text-blue-400 hover:underline"
            >
              Deploy your first server
            </button>
          </div>
        ) : viewMode === 'table' ? (
          <ServerTable servers={servers} onDelete={handleDelete} />
        ) : (
          <ServerGrid servers={servers} onDelete={handleDelete} />
        )}
      </div>
    </LayoutWrapper>
  );
}