// app/vms/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { 
  Server, 
  Search, 
  RefreshCw,
  Plus,
  Filter,
  LayoutGrid,
  List
} from 'lucide-react'
import { LayoutWrapper } from '../components/layout/LayoutWrapper'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { useToast } from '../../hooks/use-toast'
import { vmApi } from '../lib/vm-api'
import { VMStatsCards } from '../components/vm/VMStatsCards'
import { VMTable } from '../components/vm/VMTable'
import { VMNodeConfig } from '../components/vm/VMNodeConfig'
import { VMCreateForm } from '../components/vm/VMCreateForm'
import { VMResizeForm } from '../components/vm/VMResizeForm'
import { VM, VMStats } from '../components/vm/types'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'





export default function VMsPage() {
  const [vms, setVMs] = useState<VM[]>([])
  const [stats, setStats] = useState<VMStats>({
    totalVMs: 0,
    runningVMs: 0,
    stoppedVMs: 0,
    suspendedVMs: 0,
    totalVCPU: 0,
    totalRAM: 0,
    totalStorage: 0,
    monthlyRevenue: 0,
    hourlyRevenue: 0,
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedVM, setSelectedVM] = useState<VM | null>(null)
  const [actionDialog, setActionDialog] = useState<{ open: boolean; action: string; reason?: string }>({ open: false, action: '' })
  const [createDialog, setCreateDialog] = useState(false)
  const [resizeDialog, setResizeDialog] = useState(false)
  const [migrateDialog, setMigrateDialog] = useState(false)
  const [viewDialog, setViewDialog] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [activeTab, setActiveTab] = useState<'vms' | 'nodes'>('vms')
  const [selectedNodeId, setSelectedNodeId] = useState<number | undefined>()
  
  const { toast } = useToast()

  useEffect(() => {
    if (activeTab === 'vms') {
      fetchVMs()
      fetchStats()
    }
  }, [currentPage, search, statusFilter])

  const fetchVMs = async () => {
    try {
      setLoading(true)
      const response = await vmApi.getAllVMs({
        page: currentPage,
        limit: 20,
        search: search || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        node_id: selectedNodeId,
      })
      setVMs(response.data)
      setTotalPages(Math.ceil(response.total / 20))
    } catch (error: any) {
      console.error('Failed to fetch VMs:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch VMs',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const data = await vmApi.getVMStats()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const handleVMAction = async (action: string, vm: VM, reason?: string) => {
    try {
      switch (action) {
        case 'start':
          await vmApi.startVM(vm.id)
          break
        case 'stop':
          await vmApi.stopVM(vm.id)
          break
        case 'restart':
          await vmApi.restartVM(vm.id)
          break
        case 'suspend':
          await vmApi.suspendVM(vm.id, reason)
          break
        case 'resume':
          await vmApi.resumeVM(vm.id)
          break
        case 'delete':
          await vmApi.deleteVM(vm.id)
          break
      }
      
      toast({
        title: 'Success',
        description: `VM ${action} operation initiated successfully`,
      })
      
      setActionDialog({ open: false, action: '' })
      setSelectedVM(null)
      fetchVMs()
      fetchStats()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || `Failed to ${action} VM`,
        variant: 'destructive',
      })
    }
  }

  const handleOpenConsole = async (vm: VM) => {
    try {
      const console = await vmApi.getVMConsole(vm.id)
      window.open(console.url, '_blank')
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to open console',
        variant: 'destructive',
      })
    }
  }

  return (
    <LayoutWrapper>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Virtual Machines</h1>
            <p className="text-sm text-gray-500 mt-1">Manage virtual instances and node configurations</p>
          </div>
          <Button 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => setCreateDialog(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New VM
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'vms' | 'nodes')} className="mb-6">
          <TabsList>
            <TabsTrigger value="vms" className="gap-2">
              <Server className="h-4 w-4" />
              Virtual Machines
            </TabsTrigger>
            <TabsTrigger value="nodes" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Node Configuration
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* VMs Tab */}
        {activeTab === 'vms' && (
          <>
            <VMStatsCards stats={stats} loading={loading} />

            {/* Search and Filter */}
            <div className="flex gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, hostname, or IP..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="z-[10000]">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="stopped">Stopped</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchVMs} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {/* VMs Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <VMTable
                vms={vms}
                loading={loading}
                onStart={(vm) => { setSelectedVM(vm); setActionDialog({ open: true, action: 'start' }) }}
                onStop={(vm) => { setSelectedVM(vm); setActionDialog({ open: true, action: 'stop' }) }}
                onRestart={(vm) => { setSelectedVM(vm); setActionDialog({ open: true, action: 'restart' }) }}
                onSuspend={(vm) => { setSelectedVM(vm); setActionDialog({ open: true, action: 'suspend' }) }}
                onResume={(vm) => handleVMAction('resume', vm)}
                onResize={(vm) => { setSelectedVM(vm); setResizeDialog(true) }}
                onMigrate={(vm) => { setSelectedVM(vm); setMigrateDialog(true) }}
                onConsole={handleOpenConsole}
                onDelete={(vm) => { setSelectedVM(vm); setActionDialog({ open: true, action: 'delete' }) }}
                onView={(vm) => { setSelectedVM(vm); setViewDialog(true) }}
              />
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50/50">
                  <p className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Nodes Tab */}
        {activeTab === 'nodes' && (
          <VMNodeConfig onNodeSelect={(nodeId) => {
            setSelectedNodeId(nodeId)
            setActiveTab('vms')
          }} />
        )}
      </div>

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}>
        <DialogContent className="z-[10000]">
          <DialogHeader>
            <DialogTitle>Confirm {actionDialog.action}</DialogTitle>
            <DialogDescription>
              Are you sure you want to {actionDialog.action} VM "{selectedVM?.name}"?
              {actionDialog.action === 'delete' && (
                <span className="block mt-2 text-red-600">This action cannot be undone.</span>
              )}
              {actionDialog.action === 'suspend' && (
                <div className="mt-3">
                  <Label>Reason (Optional)</Label>
                  <Input
                    placeholder="Enter reason for suspension"
                    value={actionDialog.reason || ''}
                    onChange={(e) => setActionDialog({ ...actionDialog, reason: e.target.value })}
                    className="mt-1"
                  />
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ open: false, action: '' })}>
              Cancel
            </Button>
            <Button 
              variant={actionDialog.action === 'delete' ? 'destructive' : 'default'}
              onClick={() => selectedVM && handleVMAction(actionDialog.action, selectedVM, actionDialog.reason)}
              className={actionDialog.action === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create VM Dialog */}
      <VMCreateForm
        open={createDialog}
        onOpenChange={setCreateDialog}
        onSuccess={() => {
          setCreateDialog(false)
          fetchVMs()
          fetchStats()
        }}
      />

      {/* Resize VM Dialog */}
      {selectedVM && (
        <VMResizeForm
          open={resizeDialog}
          onOpenChange={setResizeDialog}
          vm={selectedVM}
          onSuccess={() => {
            setResizeDialog(false)
            fetchVMs()
            fetchStats()
          }}
        />
      )}

      {/* View VM Dialog */}
      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent className="max-w-2xl z-[10000]">
          <DialogHeader>
            <DialogTitle>VM Details</DialogTitle>
            <DialogDescription>Detailed information about {selectedVM?.name}</DialogDescription>
          </DialogHeader>
          {selectedVM && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Name</Label>
                  <p className="font-medium">{selectedVM.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Hostname</Label>
                  <p className="font-medium">{selectedVM.hostname}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Status</Label>
                  <Badge className="mt-1">{selectedVM.status}</Badge>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Node</Label>
                  <p className="font-medium">{selectedVM.node?.hostname}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">vCPU</Label>
                  <p className="font-medium">{selectedVM.vcpu} cores</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">RAM</Label>
                  <p className="font-medium">{selectedVM.ram_gb} GB</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Storage</Label>
                  <p className="font-medium">{selectedVM.ssd_gb} GB</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Created</Label>
                  <p className="font-medium">{new Date(selectedVM.created_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LayoutWrapper>
  )
}