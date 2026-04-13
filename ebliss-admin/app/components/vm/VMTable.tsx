// components/vm/VMTable.tsx
'use client'

import { 
  Server, 
  Play, 
  Square, 
  RotateCw, 
  Trash2, 
  MoreVertical,
  Pause,
  ExternalLink,
  Maximize2,
  Move
} from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { VM } from './types'

interface VMTableProps {
  vms: VM[]
  loading?: boolean
  onStart: (vm: VM) => void
  onStop: (vm: VM) => void
  onRestart: (vm: VM) => void
  onSuspend: (vm: VM) => void
  onResume: (vm: VM) => void
  onResize: (vm: VM) => void
  onMigrate: (vm: VM) => void
  onConsole: (vm: VM) => void
  onDelete: (vm: VM) => void
  onView: (vm: VM) => void
}

export function VMTable({ 
  vms, 
  loading,
  onStart,
  onStop,
  onRestart,
  onSuspend,
  onResume,
  onResize,
  onMigrate,
  onConsole,
  onDelete,
  onView,
}: VMTableProps) {
  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; bg: string; dot: string; label: string }> = {
      running: { color: 'text-green-700', bg: 'bg-green-100 border-green-200', dot: 'bg-green-500', label: 'Running' },
      stopped: { color: 'text-gray-700', bg: 'bg-gray-100 border-gray-200', dot: 'bg-gray-500', label: 'Stopped' },
      suspended: { color: 'text-yellow-700', bg: 'bg-yellow-100 border-yellow-200', dot: 'bg-yellow-500', label: 'Suspended' },
      pending: { color: 'text-blue-700', bg: 'bg-blue-100 border-blue-200', dot: 'bg-blue-500', label: 'Pending' },
      creating: { color: 'text-purple-700', bg: 'bg-purple-100 border-purple-200', dot: 'bg-purple-500', label: 'Creating' },
      rebooting: { color: 'text-orange-700', bg: 'bg-orange-100 border-orange-200', dot: 'bg-orange-500', label: 'Rebooting' },
      deleting: { color: 'text-red-700', bg: 'bg-red-100 border-red-200', dot: 'bg-red-500', label: 'Deleting' },
      failed: { color: 'text-red-700', bg: 'bg-red-100 border-red-200', dot: 'bg-red-500', label: 'Failed' },
    }
    return configs[status] || configs.stopped
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-4">
              <div className="h-10 w-10 bg-gray-200 rounded"></div>
              <div className="flex-1 h-4 bg-gray-200 rounded"></div>
              <div className="w-32 h-4 bg-gray-200 rounded"></div>
              <div className="w-24 h-4 bg-gray-200 rounded"></div>
              <div className="w-20 h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (vms.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Server className="h-10 w-10 text-gray-400" />
        </div>
        <p className="text-gray-500 text-lg mb-2">No virtual machines found</p>
        <p className="text-sm text-gray-400">Create your first VM to get started</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50/50">
            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">VM</th>
            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Node</th>
            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Specs</th>
            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">IP Address</th>
            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rate</th>
            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {vms.map((vm) => {
            const statusConfig = getStatusConfig(vm.status)
            const primaryIP = vm.ip_addresses?.[0]?.address || 'N/A'
            
            return (
              <tr key={vm.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Server className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{vm.name}</div>
                      <div className="text-xs text-gray-500">{vm.hostname}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">{vm.user?.full_name || 'N/A'}</div>
                    <div className="text-xs text-gray-500">{vm.user?.email || 'N/A'}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">{vm.node?.hostname || 'N/A'}</div>
                    <div className="text-xs text-gray-500">{vm.node?.pop?.name || 'N/A'}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">
                      {vm.vcpu} vCPU
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {vm.ram_gb} GB RAM
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {vm.ssd_gb} GB SSD
                    </Badge>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">{primaryIP}</code>
                </td>
                <td className="px-6 py-4">
                  <Badge className={`${statusConfig.bg} ${statusConfig.color} gap-1.5 border`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot} animate-pulse`} />
                    {statusConfig.label}
                  </Badge>
                </td>
              <td className="px-6 py-4">
  <div>
    <span className="font-medium text-gray-900">
      ${typeof vm.hourly_rate === 'number' 
          ? vm.hourly_rate.toFixed(4) 
          : parseFloat(vm.hourly_rate as any || '0').toFixed(4)}
    </span>
    <span className="text-xs text-gray-500">/hr</span>
    {vm.monthly_rate && (
      <div className="text-xs text-gray-500">
        ${typeof vm.monthly_rate === 'number'
            ? vm.monthly_rate.toFixed(2)
            : parseFloat(vm.monthly_rate as any || '0').toFixed(2)}/mo
      </div>
    )}
  </div>
</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {formatDate(vm.created_at)}
                </td>
                <td className="px-6 py-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 z-[10000]">
                      <DropdownMenuItem onClick={() => onView(vm)}>
                        <Server className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onConsole(vm)}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Console
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      
                      {vm.status === 'stopped' && (
                        <DropdownMenuItem onClick={() => onStart(vm)}>
                          <Play className="h-4 w-4 mr-2 text-green-600" />
                          Start
                        </DropdownMenuItem>
                      )}
                      
                      {vm.status === 'running' && (
                        <>
                          <DropdownMenuItem onClick={() => onStop(vm)}>
                            <Square className="h-4 w-4 mr-2 text-yellow-600" />
                            Stop
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onRestart(vm)}>
                            <RotateCw className="h-4 w-4 mr-2 text-blue-600" />
                            Restart
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onSuspend(vm)}>
                            <Pause className="h-4 w-4 mr-2 text-orange-600" />
                            Suspend
                          </DropdownMenuItem>
                        </>
                      )}
                      
                      {vm.status === 'suspended' && (
                        <DropdownMenuItem onClick={() => onResume(vm)}>
                          <Play className="h-4 w-4 mr-2 text-green-600" />
                          Resume
                        </DropdownMenuItem>
                      )}
                      
                      <DropdownMenuSeparator />
                      
                      {(vm.status === 'stopped' || vm.status === 'running') && (
                        <DropdownMenuItem onClick={() => onResize(vm)}>
                          <Maximize2 className="h-4 w-4 mr-2" />
                          Resize
                        </DropdownMenuItem>
                      )}
                      
                      <DropdownMenuItem onClick={() => onMigrate(vm)}>
                        <Move className="h-4 w-4 mr-2" />
                        Migrate
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem 
                        onClick={() => onDelete(vm)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}