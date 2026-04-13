'use client'

import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ServerFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedDatacenter: string;
  onDatacenterChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  viewMode: 'table' | 'grid';
  onViewModeChange: (mode: 'table' | 'grid') => void;
  datacenters: string[];
  statuses: string[];
  loadingDatacenters?: boolean;
}

export function ServerFilters({
  searchTerm,
  onSearchChange,
  selectedDatacenter,
  onDatacenterChange,
  selectedStatus,
  onStatusChange,
  viewMode,
  onViewModeChange,
  datacenters,
  statuses,
  loadingDatacenters = false,
}: ServerFiltersProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, hostname, or client..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={selectedDatacenter}
            onChange={(e) => onDatacenterChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
            disabled={loadingDatacenters}
          >
            <option value="all">All Datacenters</option>
            {datacenters.filter(dc => dc !== 'all').map((dc) => (
              <option key={`dc-${dc}`} value={dc}>
                {dc}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
          >
            {statuses.map((status) => (
              <option key={`status-${status}`} value={status}>
                {status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>

          <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
            <button
              onClick={() => onViewModeChange('table')}
              className={cn(
                'px-3 py-2',
                viewMode === 'table'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400'
              )}
            >
              Table
            </button>
            <button
              onClick={() => onViewModeChange('grid')}
              className={cn(
                'px-3 py-2',
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400'
              )}
            >
              Grid
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}