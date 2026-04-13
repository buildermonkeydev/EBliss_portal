'use client'

import { useRouter } from 'next/navigation';
import { Eye, Edit, Trash2, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DedicatedServer } from '../../lib/dedicated-servers';

interface ServerTableProps {
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

export function ServerTable({ servers, onDelete }: ServerTableProps) {
  const router = useRouter();

  const getTotalStorage = (server: DedicatedServer) => {
    return server.storage?.reduce((sum, s) => sum + s.size_gb, 0) || 0;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Server</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Specs</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Client</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Price</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {servers.map((server) => {
              const status = statusConfig[server.status] || statusConfig.offline;
              const StatusIcon = status.icon;
              const primaryIp = server.ip_addresses?.find(ip => ip.status === 'assigned')?.address || '—';

              return (
                <tr key={server.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{server.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{server.hostname}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{primaryIp}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-600 dark:text-gray-300">
                        {server.cpu_cores} Cores · {server.ram_gb} GB {server.ram_type}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">
                        {getTotalStorage(server)} GB Storage
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">
                        {server.bandwidth_tb} TB Bandwidth
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {server.assigned_to ? (
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{server.assigned_to.full_name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{server.assigned_to.email}</p>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium w-fit",
                        status.color
                      )}>
                        <StatusIcon size={12} />
                        {status.label}
                      </span>
                      {server.os && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {server.os} {server.os_version}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        ₹{server.monthly_price?.toLocaleString() || 0}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">/month</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => router.push(`/dedicated-servers/${server.id}`)}
                        className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => router.push(`/dedicated-servers/${server.id}/edit`)}
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}