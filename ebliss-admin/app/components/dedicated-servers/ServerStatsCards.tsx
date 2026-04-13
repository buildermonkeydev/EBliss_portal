'use client'

import { Server, Cpu, HardDrive } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ServerStatsCardsProps {
  totalServers: number;
  onlineServers: number;
  totalRam: number;
  totalStorage: number;
  monthlyRevenue: number;
  loading?: boolean;
}

export function ServerStatsCards({ 
  totalServers, 
  onlineServers, 
  totalRam, 
  totalStorage, 
  monthlyRevenue,
  loading = false 
}: ServerStatsCardsProps) {
  const stats = [
    {
      title: 'Total Servers',
      value: totalServers,
      icon: Server,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      subtitle: `${onlineServers} online · ${totalServers - onlineServers} offline`,
    },
   
    {
      title: 'Total RAM',
      value: `${totalRam} GB`,
      icon: Cpu,
      color: 'text-purple-500',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      subtitle: 'Across all servers',
    },
    {
      title: 'Total Storage',
      value: `${(totalStorage / 1000).toFixed(1)} TB`,
      icon: HardDrive,
      color: 'text-orange-500',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      subtitle: 'Combined capacity',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2" />
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              </div>
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", stat.bgColor)}>
                <Icon className={cn("w-5 h-5", stat.color)} />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{stat.subtitle}</p>
          </div>
        );
      })}
    </div>
  );
}