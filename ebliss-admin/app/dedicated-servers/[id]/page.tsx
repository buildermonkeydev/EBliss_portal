'use client'

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Server,
  Cpu,
  HardDrive,
  Wifi,
  Globe,
  Clock,
  Activity,
  Power,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  User,
  Mail,
  Building,
  Calendar,
  DollarSign,
  Shield,
  Database,
  Loader2,
  Copy,
  Terminal
} from 'lucide-react';
import { LayoutWrapper } from '../../components/layout/LayoutWrapper';
import { getServer, deleteServer, rebootServer, updateServerStatus, DedicatedServer } from '../../lib/dedicated-servers';
import { cn } from '@/lib/utils';

const statusConfig: Record<string, { color: string; icon: any; label: string; bgColor: string }> = {
  online: { 
    color: 'text-green-700 dark:text-green-400', 
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: CheckCircle2, 
    label: 'Online' 
  },
  offline: { 
    color: 'text-gray-700 dark:text-gray-400', 
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    icon: XCircle, 
    label: 'Offline' 
  },
  maintenance: { 
    color: 'text-yellow-700 dark:text-yellow-400', 
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: AlertCircle, 
    label: 'Maintenance' 
  },
  provisioning: { 
    color: 'text-blue-700 dark:text-blue-400', 
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: Clock, 
    label: 'Provisioning' 
  },
  pending: { 
    color: 'text-blue-700 dark:text-blue-400', 
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: Clock, 
    label: 'Pending' 
  },
  suspended: { 
    color: 'text-orange-700 dark:text-orange-400', 
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    icon: AlertCircle, 
    label: 'Suspended' 
  },
  error: { 
    color: 'text-red-700 dark:text-red-400', 
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: XCircle, 
    label: 'Error' 
  },
  terminated: { 
    color: 'text-gray-700 dark:text-gray-400', 
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    icon: XCircle, 
    label: 'Terminated' 
  },
};

export default function ViewServerPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [server, setServer] = useState<DedicatedServer | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchServer();
  }, [id]);

  const fetchServer = async () => {
    try {
      setLoading(true);
      const data = await getServer(id);
      setServer(data);
    } catch (error) {
      console.error('Failed to fetch server:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setActionLoading(true);
      await deleteServer(id);
      router.push('/dedicated-servers/list');
    } catch (error) {
      console.error('Failed to delete server:', error);
      alert('Failed to delete server');
    } finally {
      setActionLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleReboot = async () => {
    if (!confirm('Are you sure you want to reboot this server?')) return;
    
    try {
      setActionLoading(true);
      await rebootServer(id);
      alert('Server reboot initiated');
      fetchServer();
    } catch (error) {
      console.error('Failed to reboot server:', error);
      alert('Failed to reboot server');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      setActionLoading(true);
      await updateServerStatus(id, status);
      fetchServer();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard');
  };

  const getTotalStorage = () => {
    if (!server?.storage) return 0;
    return server.storage.reduce((sum, s) => sum + s.size_gb, 0);
  };

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
        </div>
      </LayoutWrapper>
    );
  }

  const status = statusConfig[server.status] || statusConfig.offline;
  const StatusIcon = status.icon;
  const primaryIp = server.ip_addresses?.find(ip => ip.status === 'assigned')?.address;

  return (
    <LayoutWrapper>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{server.name}</h1>
                <span className={cn(
                  "inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium",
                  status.bgColor,
                  status.color
                )}>
                  <StatusIcon size={14} />
                  {status.label}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {server.hostname} • {server.datacenter}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchServer}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Refresh"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleReboot}
              disabled={actionLoading || server.status !== 'online'}
              className="px-4 py-2 border border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-400 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 disabled:opacity-50 flex items-center gap-2"
            >
              <Power size={16} />
              Reboot
            </button>
            <button
              onClick={() => router.push(`/dedicated-servers/${id}/edit`)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
            >
              <Edit size={16} />
              Edit
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <button className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm flex items-center gap-1 hover:bg-gray-200 dark:hover:bg-gray-600">
              <Terminal size={14} />
              SSH Console
            </button>
            <button className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm flex items-center gap-1 hover:bg-gray-200 dark:hover:bg-gray-600">
              <Activity size={14} />
              View Graphs
            </button>
            <select
              value={server.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800"
              disabled={actionLoading}
            >
              <option value="online">Set Online</option>
              <option value="offline">Set Offline</option>
              <option value="maintenance">Set Maintenance</option>
              <option value="suspended">Suspend</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left 2 Columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hardware Specifications */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Cpu size={20} />
                Hardware Specifications
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Processor</h3>
                  <div className="space-y-2 text-sm">
                    <p className="flex justify-between">
                      <span className="text-gray-500">Model:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{server.cpu_model}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-500">Cores:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{server.cpu_cores}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-500">Threads:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{server.cpu_threads}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-500">Clock Speed:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{server.cpu_speed}</span>
                    </p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Memory</h3>
                  <div className="space-y-2 text-sm">
                    <p className="flex justify-between">
                      <span className="text-gray-500">Total RAM:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{server.ram_gb} GB</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-500">Type:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{server.ram_type}</span>
                    </p>
                    {server.ram_speed && (
                      <p className="flex justify-between">
                        <span className="text-gray-500">Speed:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{server.ram_speed}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Storage */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <HardDrive size={16} />
                  Storage Configuration
                </h3>
                <div className="space-y-3">
                  {server.storage?.map((storage, idx) => (
                    <div key={storage.id || idx} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {storage.type.toUpperCase()} {storage.size_gb} GB
                        </span>
                        {storage.is_primary && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded">
                            Primary
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <p className="text-gray-500">RAID: <span className="text-gray-900 dark:text-white">{storage.raid_level}</span></p>
                        <p className="text-gray-500">Drives: <span className="text-gray-900 dark:text-white">{storage.drive_count}</span></p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                  Total Storage: <span className="font-medium text-gray-900 dark:text-white">{getTotalStorage()} GB</span>
                </p>
              </div>
            </div>

            {/* Network Configuration */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Wifi size={20} />
                Network Configuration
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Port Speed</p>
                  <p className="font-medium text-gray-900 dark:text-white">{server.network_port}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Bandwidth</p>
                  <p className="font-medium text-gray-900 dark:text-white">{server.bandwidth_tb} TB/month</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">IPv4 Addresses</p>
                  <p className="font-medium text-gray-900 dark:text-white">{server.ipv4_count}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">IPv6 Addresses</p>
                  <p className="font-medium text-gray-900 dark:text-white">{server.ipv6_count}</p>
                </div>
              </div>

              {/* IP Addresses */}
              {server.ip_addresses && server.ip_addresses.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Assigned IPs</h3>
                  <div className="space-y-2">
                    {server.ip_addresses.map((ip) => (
                      <div key={ip.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono text-gray-900 dark:text-white">{ip.address}</code>
                          <span className={cn(
                            "text-xs px-1.5 py-0.5 rounded",
                            ip.status === 'assigned' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          )}>
                            {ip.status}
                          </span>
                        </div>
                        <button
                          onClick={() => copyToClipboard(ip.address)}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                        >
                          <Copy size={14} className="text-gray-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Operating System & Access */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System & Access</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Operating System</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {server.os} {server.os_version}
                  </p>
                </div>
                {server.root_password && (
                  <div>
                    <p className="text-sm text-gray-500">Root Password</p>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-gray-900 dark:text-white">••••••••</code>
                      <button
                        onClick={() => copyToClipboard(server.root_password!)}
                        className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
                      >
                        Reveal
                      </button>
                    </div>
                  </div>
                )}
                {server.ipmi_ip && (
                  <div>
                    <p className="text-sm text-gray-500">IPMI/IP</p>
                    <p className="font-medium text-gray-900 dark:text-white">{server.ipmi_ip}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Right Column */}
          <div className="space-y-6">
            {/* Client Information */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <User size={20} />
                Client Information
              </h2>
              
              {server.assigned_to ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <User size={20} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{server.assigned_to.full_name}</p>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Mail size={12} />
                        {server.assigned_to.email}
                      </p>
                    </div>
                  </div>
                  {server.assigned_to.company && (
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Building size={14} />
                      {server.assigned_to.company}
                    </p>
                  )}
                </div>
              ) : (
               <div className="text-center py-4">
    <User size={32} className="text-gray-300 mx-auto mb-2" />
    <p className="text-gray-500 dark:text-gray-400">Unassigned</p>
    <button 
      onClick={() => router.push(`/dedicated-servers/${id}/assign`)}
      className="mt-3 text-blue-600 dark:text-blue-400 text-sm hover:underline"
    >
      Assign to Client
    </button>
  </div>
              )}
            </div>

            {/* Billing Information */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <DollarSign size={20} />
                Billing
              </h2>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Monthly Price</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    ₹{server.monthly_price?.toLocaleString() || 0}
                  </span>
                </div>
                {server.setup_fee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Setup Fee</span>
                    <span className="text-gray-900 dark:text-white">₹{server.setup_fee.toLocaleString()}</span>
                  </div>
                )}
                <hr className="border-gray-200 dark:border-gray-700" />
                {server.next_billing_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar size={14} className="text-gray-400" />
                    <span className="text-gray-500">Next Billing:</span>
                    <span className="text-gray-900 dark:text-white">
                      {new Date(server.next_billing_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Features */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Shield size={20} />
                Features
              </h2>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {server.ddos_protection ? (
                    <CheckCircle2 size={16} className="text-green-500" />
                  ) : (
                    <XCircle size={16} className="text-gray-400" />
                  )}
                  <span className="text-sm text-gray-700 dark:text-gray-300">DDoS Protection</span>
                </div>
                <div className="flex items-center gap-2">
                  {server.backup_enabled ? (
                    <CheckCircle2 size={16} className="text-green-500" />
                  ) : (
                    <XCircle size={16} className="text-gray-400" />
                  )}
                  <span className="text-sm text-gray-700 dark:text-gray-300">Automated Backups</span>
                </div>
                <div className="flex items-center gap-2">
                  {server.monitoring_enabled ? (
                    <CheckCircle2 size={16} className="text-green-500" />
                  ) : (
                    <XCircle size={16} className="text-gray-400" />
                  )}
                  <span className="text-sm text-gray-700 dark:text-gray-300">24/7 Monitoring</span>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Globe size={20} />
                Location
              </h2>
              
              <div className="space-y-2">
                <p className="flex justify-between">
                  <span className="text-gray-500">Datacenter:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{server.datacenter}</span>
                </p>
                {server.rack_id && (
                  <p className="flex justify-between">
                    <span className="text-gray-500">Rack:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{server.rack_id}</span>
                  </p>
                )}
                {server.rack_position && (
                  <p className="flex justify-between">
                    <span className="text-gray-500">Position:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{server.rack_position}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Timestamps */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Timestamps</h2>
              <div className="space-y-2 text-sm">
                <p className="flex justify-between">
                  <span className="text-gray-500">Created:</span>
                  <span className="text-gray-900 dark:text-white">
                    {new Date(server.created_at).toLocaleDateString()}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-500">Last Updated:</span>
                  <span className="text-gray-900 dark:text-white">
                    {new Date(server.updated_at).toLocaleDateString()}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Server</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Are you sure you want to delete <strong>{server.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2"
              >
                {actionLoading && <Loader2 size={16} className="animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </LayoutWrapper>
  );
}