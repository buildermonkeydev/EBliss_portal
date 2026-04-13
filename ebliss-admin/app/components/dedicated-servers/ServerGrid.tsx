'use client'

import { useRouter } from 'next/navigation';
import { Eye, Edit, Trash2, Cpu, Server, HardDrive, Wifi, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DedicatedServer } from '../../lib/dedicated-servers';

interface ServerGridProps {
  servers: DedicatedServer[];
  onDelete: (id: string) => void;
}

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  online: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2, label: 'Online' },
  offline: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400', icon: XCircle, label: 'Offline' },
  maintenance: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: AlertCircle, label: 'Maintenance' },
  provisioning: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Clock, label: 'Provisioning' },
  pending: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Clock, label: 'Pending' },
  suspended: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: AlertCircle, label: 'Suspended' },
  error: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle, label: 'Error' },
  terminated: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400', icon: XCircle, label: 'Terminated' },
};

export function ServerGrid({ servers, onDelete }: ServerGridProps) {
  const router = useRouter();

  const getTotalStorage = (server: DedicatedServer) => {
    return server.storage?.reduce((sum, s) => sum + s.size_gb, 0) || 0;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {servers.map((server) => {
        const status = statusConfig[server.status] || statusConfig.offline;
        const StatusIcon = status.icon;

        return (
          <div key={server.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{server.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{server.hostname}</p>
              </div>
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                status.color
              )}>
                <StatusIcon size={12} />
                {status.label}
              </span>
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2 text-sm">
                <Cpu size={14} className="text-gray-400" />
                <span className="text-gray-600 dark:text-gray-300">{server.cpu_model}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Server size={14} className="text-gray-400" />
                <span className="text-gray-600 dark:text-gray-300">
                  {server.cpu_cores} Cores · {server.ram_gb} GB {server.ram_type}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <HardDrive size={14} className="text-gray-400" />
                <span className="text-gray-600 dark:text-gray-300">
                  {getTotalStorage(server)} GB Total
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Wifi size={14} className="text-gray-400" />
                <span className="text-gray-600 dark:text-gray-300">
                  {server.bandwidth_tb} TB · {server.network_port}
                </span>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Client</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {server.assigned_to?.full_name || 'Unassigned'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">Monthly</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  ₹{server.monthly_price?.toLocaleString() || 0}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-3">
              <button
                onClick={() => router.push(`/admin/dedicated-servers/${server.id}`)}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Eye size={16} />
              </button>
              <button
                onClick={() => router.push(`/admin/dedicated-servers/${server.id}/edit`)}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={() => onDelete(server.id)}
                className="p-2 rounded-lg text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}