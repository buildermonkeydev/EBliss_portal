// app/admin/infrastructure/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { 
  Network,
  Plus,
  Search,
  RefreshCw,
  Database,
} from 'lucide-react'
import { LayoutWrapper } from '../components/layout/LayoutWrapper'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { Label } from '../components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { useToast } from '../../hooks/use-toast'
import { ipamApi, IPPool, IPAddress, POP } from '../lib/ipam-api'
import { IPPoolCard } from '../components/ipam/IPPoolCard'
import { IPAddressTable } from '../components/ipam/IPAddressTable'

export default function InfrastructurePage() {
  const [pools, setPools] = useState<IPPool[]>([])
  const [addresses, setAddresses] = useState<IPAddress[]>([])
  const [pops, setPops] = useState<POP[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pools')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  // Dialogs
  const [poolDialog, setPoolDialog] = useState(false)
  const [ptrDialog, setPtrDialog] = useState(false)
  const [assignDialog, setAssignDialog] = useState(false)
  const [selectedItem, setSelectedItem] = useState<IPAddress | IPPool | null>(null)
  const [ptrRecord, setPtrRecord] = useState('')
  
  // Forms
  const [poolForm, setPoolForm] = useState({
    pop_id: 0,
    name: '',
    subnet: '',
    gateway: '',
    start_ip: '',
    end_ip: '',
  })
  
  const { toast } = useToast()

  useEffect(() => {
    fetchPOPs()
    if (activeTab === 'pools') {
      fetchPools()
    } else {
      fetchAddresses()
    }
  }, [activeTab, currentPage, statusFilter])

  const fetchPOPs = async () => {
    try {
      const data = await ipamApi.getPOPs()
      setPops(data)
    } catch (error) {
      console.error('Failed to fetch POPs:', error)
    }
  }

  const fetchPools = async () => {
    try {
      setLoading(true)
      const response = await ipamApi.getIPPools({
        page: currentPage,
        limit: 12,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search || undefined,
      })
      setPools(response.data)
      setTotalPages(response.totalPages)
    } catch (error: any) {
      console.error('Failed to fetch IP pools:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch IP pools',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchAddresses = async () => {
    try {
      setLoading(true)
      const response = await ipamApi.getIPAddresses({
        page: currentPage,
        limit: 20,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search || undefined,
      })
      setAddresses(response.data)
      setTotalPages(response.totalPages)
    } catch (error: any) {
      console.error('Failed to fetch IP addresses:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch IP addresses',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePool = async () => {
    if (!poolForm.pop_id || !poolForm.name || !poolForm.subnet || !poolForm.gateway || !poolForm.start_ip || !poolForm.end_ip) {
      toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' })
      return
    }
    
    try {
      await ipamApi.createIPPool(poolForm)
      toast({ title: 'Success', description: 'IP Pool created successfully' })
      setPoolDialog(false)
      resetPoolForm()
      fetchPools()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create IP pool',
        variant: 'destructive',
      })
    }
  }

  const handleSyncPool = async (pool: IPPool) => {
    try {
      await ipamApi.syncIPPool(pool.id)
      toast({ title: 'Success', description: `Pool ${pool.name} synced successfully` })
      fetchPools()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to sync pool',
        variant: 'destructive',
      })
    }
  }

  const handleDeletePool = async (pool: IPPool) => {
    if (!confirm(`Are you sure you want to delete pool ${pool.name}?`)) return
    
    try {
      await ipamApi.deleteIPPool(pool.id)
      toast({ title: 'Success', description: 'IP Pool deleted successfully' })
      fetchPools()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete pool',
        variant: 'destructive',
      })
    }
  }

  const handleSetPTR = async () => {
    if (!selectedItem || !('address' in selectedItem) || !ptrRecord) return
    
    try {
      await ipamApi.setPTRRecord(selectedItem.id, ptrRecord)
      toast({ title: 'Success', description: `PTR record set to ${ptrRecord}` })
      setPtrDialog(false)
      setPtrRecord('')
      fetchAddresses()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to set PTR record',
        variant: 'destructive',
      })
    }
  }

  const handleReleaseIP = async (ip: IPAddress) => {
    if (!confirm(`Are you sure you want to release IP ${ip.address}?`)) return
    
    try {
      await ipamApi.releaseIP(ip.id)
      toast({ title: 'Success', description: `IP ${ip.address} released to pool` })
      fetchAddresses()
      fetchPools()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to release IP',
        variant: 'destructive',
      })
    }
  }

  const resetPoolForm = () => {
    setPoolForm({
      pop_id: 0,
      name: '',
      subnet: '',
      gateway: '',
      start_ip: '',
      end_ip: '',
    })
  }

  return (
    <LayoutWrapper>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">IP Address Management</h1>
            <p className="text-sm text-gray-500 mt-1">Manage IP pools and addresses</p>
          </div>
          <Button onClick={() => setPoolDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Add IP Pool
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-gray-100 p-1 rounded-lg w-fit mb-6">
            <TabsTrigger value="pools" className="px-4 py-2 gap-2">
              <Database className="h-4 w-4" />
              IP Pools
            </TabsTrigger>
            <TabsTrigger value="addresses" className="px-4 py-2 gap-2">
              <Network className="h-4 w-4" />
              IP Addresses
            </TabsTrigger>
          </TabsList>

          {/* Search and Filter */}
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={activeTab === 'pools' ? "Search pools by name or subnet..." : "Search by IP, user, or VM..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="full">Full</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={activeTab === 'pools' ? fetchPools : fetchAddresses} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Pools Tab */}
          <TabsContent value="pools" className="mt-0">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-64 bg-gray-100 rounded-xl animate-pulse"></div>
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pools.map((pool) => (
                    <IPPoolCard
                      key={pool.id}
                      pool={pool}
                      onSync={handleSyncPool}
                      onDelete={handleDeletePool}
                      onView={(p) => console.log('View pool:', p)}
                    />
                  ))}
                </div>
                
                {pools.length === 0 && (
                  <div className="text-center py-16">
                    <Database className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 text-lg">No IP pools found</p>
                    <Button onClick={() => setPoolDialog(true)} className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Create IP Pool
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses" className="mt-0">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <IPAddressTable
                addresses={addresses}
                loading={loading}
                onSetPTR={(ip) => { setSelectedItem(ip); setPtrDialog(true) }}
                onRelease={handleReleaseIP}
                onView={(ip) => console.log('View IP:', ip)}
              />
              
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50/50">
                  <p className="text-sm text-gray-600">Page {currentPage} of {totalPages}</p>
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
          </TabsContent>
        </Tabs>
      </div>

      {/* Create IP Pool Dialog */}
      <Dialog open={poolDialog} onOpenChange={setPoolDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add IP Pool</DialogTitle>
            <DialogDescription>Define a new IP subnet for a POP</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Select POP *</Label>
              <Select value={poolForm.pop_id.toString()} onValueChange={(v) => setPoolForm({ ...poolForm, pop_id: parseInt(v) })}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose POP" />
                </SelectTrigger>
                <SelectContent className="z-[10001]">
                  {pops.filter(p => p.active).map(pop => (
                    <SelectItem key={pop.id} value={pop.id.toString()}>
                      {pop.name} - {pop.city}, {pop.country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pool Name *</Label>
              <Input 
                placeholder="e.g., Public IP Pool 1" 
                value={poolForm.name}
                onChange={(e) => setPoolForm({ ...poolForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Subnet (CIDR) *</Label>
              <Input 
                placeholder="10.0.1.0/24" 
                value={poolForm.subnet}
                onChange={(e) => setPoolForm({ ...poolForm, subnet: e.target.value })}
              />
            </div>
            <div>
              <Label>Gateway *</Label>
              <Input 
                placeholder="10.0.1.1" 
                value={poolForm.gateway}
                onChange={(e) => setPoolForm({ ...poolForm, gateway: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start IP *</Label>
                <Input 
                  placeholder="10.0.1.10" 
                  value={poolForm.start_ip}
                  onChange={(e) => setPoolForm({ ...poolForm, start_ip: e.target.value })}
                />
              </div>
              <div>
                <Label>End IP *</Label>
                <Input 
                  placeholder="10.0.1.250" 
                  value={poolForm.end_ip}
                  onChange={(e) => setPoolForm({ ...poolForm, end_ip: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPoolDialog(false)}>Cancel</Button>
            <Button onClick={handleCreatePool} className="bg-blue-600 hover:bg-blue-700">Create Pool</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set PTR Record Dialog */}
      <Dialog open={ptrDialog} onOpenChange={setPtrDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set PTR Record</DialogTitle>
            <DialogDescription>
              Configure reverse DNS for IP {selectedItem && 'address' in selectedItem ? selectedItem.address : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>PTR Record (rDNS)</Label>
            <Input
              placeholder="server.example.com"
              value={ptrRecord}
              onChange={(e) => setPtrRecord(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-2">
              Example: web-server-01.ebliss.com
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPtrDialog(false)}>Cancel</Button>
            <Button onClick={handleSetPTR} className="bg-blue-600 hover:bg-blue-700">Save PTR Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LayoutWrapper>
  )
}