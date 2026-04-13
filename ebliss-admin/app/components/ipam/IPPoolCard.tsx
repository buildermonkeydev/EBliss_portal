// app/components/ipam/IPPoolCard.tsx
'use client'

import { useState } from 'react'
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  RefreshCw, 
  Eye,
  X,
  Save,
  AlertTriangle
} from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { Card, CardContent } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { useToast } from '../../../hooks/use-toast'
import { ipamApi, IPPool, IPAddress } from '../../lib/ipam-api'
import { IPAddressTable } from './IPAddressTable'

interface IPPoolCardProps {
  pool: IPPool
  onEdit?: (pool: IPPool) => void
  onDelete?: (pool: IPPool) => void
  onSync?: (pool: IPPool) => void
  onView?: (pool: IPPool) => void
  onRefresh?: () => void
}

export function IPPoolCard({ 
  pool: initialPool, 
  onDelete, 
  onSync, 
  onRefresh 
}: IPPoolCardProps) {
  const [pool, setPool] = useState<IPPool>(initialPool)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [syncDialogOpen, setSyncDialogOpen] = useState(false)
  const [addresses, setAddresses] = useState<IPAddress[]>([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    name: pool.name,
    gateway: pool.gateway,
    status: pool.status,
  })
  
  const { toast } = useToast()

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
      case 'full': return <Badge className="bg-red-100 text-red-700 border-red-200">Full</Badge>
      case 'deprecated': return <Badge className="bg-gray-100 text-gray-700 border-gray-200">Deprecated</Badge>
      default: return <Badge>{status}</Badge>
    }
  }

  const usagePercentage = pool.total_ips > 0 ? (pool.used_ips / pool.total_ips) * 100 : 0

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600'
    if (percentage >= 70) return 'text-yellow-600'
    return 'text-green-600'
  }

  // Fetch addresses for view dialog
  const handleViewDetails = async () => {
    setViewDialogOpen(true)
    setLoading(true)
    try {
      const response = await ipamApi.getIPAddresses({ 
        pool_id: pool.id, 
        limit: 100 
      })
      setAddresses(response.data)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load IP addresses',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle edit
  const handleEdit = () => {
    setEditForm({
      name: pool.name,
      gateway: pool.gateway,
      status: pool.status,
    })
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    setSaving(true)
    try {
      const updated = await ipamApi.updateIPPool(pool.id, editForm)
      setPool(updated)
      toast({
        title: 'Success',
        description: 'IP Pool updated successfully',
      })
      setEditDialogOpen(false)
      onRefresh?.()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update pool',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Handle sync
  const handleSync = async () => {
    setSyncing(true)
    try {
      const result = await ipamApi.syncIPPool(pool.id)
      toast({
        title: 'Success',
        description: result.message || 'Pool synced successfully',
      })
      setSyncDialogOpen(false)
      
      // Refresh pool data
      const updated = await ipamApi.getIPPool(pool.id)
      setPool(updated)
      onRefresh?.()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to sync pool',
        variant: 'destructive',
      })
    } finally {
      setSyncing(false)
    }
  }

  // Handle delete
  const handleDelete = async () => {
    if (pool.used_ips > 0) {
      toast({
        title: 'Cannot Delete',
        description: `Pool has ${pool.used_ips} assigned IPs. Release them first.`,
        variant: 'destructive',
      })
      setDeleteDialogOpen(false)
      return
    }
    
    setDeleting(true)
    try {
      await ipamApi.deleteIPPool(pool.id)
      toast({
        title: 'Success',
        description: 'IP Pool deleted successfully',
      })
      setDeleteDialogOpen(false)
      onRefresh?.()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete pool',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  // Handle release IP from view dialog
  const handleReleaseIP = async (ip: IPAddress) => {
    try {
      await ipamApi.releaseIP(ip.id)
      toast({
        title: 'Success',
        description: `IP ${ip.address} released`,
      })
      // Refresh addresses
      const response = await ipamApi.getIPAddresses({ pool_id: pool.id, limit: 100 })
      setAddresses(response.data)
      // Refresh pool data
      const updated = await ipamApi.getIPPool(pool.id)
      setPool(updated)
      onRefresh?.()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to release IP',
        variant: 'destructive',
      })
    }
  }

  return (
    <>
      <Card className="border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-mono font-semibold text-gray-900">{pool.subnet}</h3>
              <p className="text-sm text-gray-500">{pool.name}</p>
              <p className="text-xs text-gray-400">{pool.pop_name}</p>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(pool.status)}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4 text-gray-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[10000]">
                  <DropdownMenuItem onClick={handleViewDetails}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Pool
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSyncDialogOpen(true)}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync Pool
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setDeleteDialogOpen(true)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Pool
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Gateway:</span>
              <span className="font-mono text-gray-700">{pool.gateway}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Range:</span>
              <span className="font-mono text-gray-700 text-xs">{pool.start_ip} - {pool.end_ip}</span>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>IP Usage</span>
              <span>{pool.used_ips}/{pool.total_ips}</span>
            </div>
            <Progress value={usagePercentage} className="h-2 mb-2" />
            <p className={`text-xs ${getUsageColor(usagePercentage)}`}>
              {pool.available_ips} available
            </p>
          </div>
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>IP Pool Details</DialogTitle>
            <DialogDescription>
              {pool.name} - {pool.subnet}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="overview" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="addresses">IP Addresses ({pool.total_ips})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Pool Name</p>
                  <p className="font-medium text-gray-900">{pool.name}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">POP</p>
                  <p className="font-medium text-gray-900">{pool.pop_name}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Subnet</p>
                  <p className="font-mono text-gray-900">{pool.subnet}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Gateway</p>
                  <p className="font-mono text-gray-900">{pool.gateway}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">IP Range</p>
                  <p className="font-mono text-sm text-gray-900">{pool.start_ip} - {pool.end_ip}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  {getStatusBadge(pool.status)}
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Usage Statistics</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Total IPs</span>
                      <span className="font-medium">{pool.total_ips}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Used IPs</span>
                      <span className="font-medium text-blue-600">{pool.used_ips}</span>
                    </div>
                    <Progress value={(pool.used_ips / pool.total_ips) * 100} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Available IPs</span>
                      <span className="font-medium text-green-600">{pool.available_ips}</span>
                    </div>
                    <Progress 
                      value={(pool.available_ips / pool.total_ips) * 100} 
                      className="h-2 [&>div]:bg-green-500" 
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="addresses" className="mt-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto"></div>
                </div>
              ) : (
                <IPAddressTable
                  addresses={addresses}
                  onRelease={handleReleaseIP}
                  compact
                />
              )}
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Pool Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit IP Pool</DialogTitle>
            <DialogDescription>
              Update pool configuration for {pool.subnet}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Pool Name</Label>
              <Input 
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Enter pool name"
              />
            </div>
            <div>
              <Label>Gateway</Label>
              <Input 
                value={editForm.gateway}
                onChange={(e) => setEditForm({ ...editForm, gateway: e.target.value })}
                placeholder="Enter gateway IP"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select 
                value={editForm.status} 
                onValueChange={(value: 'active' | 'full' | 'deprecated') => 
                  setEditForm({ ...editForm, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                  <SelectItem value="deprecated">Deprecated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Subnet (Cannot be changed)</p>
              <p className="font-mono text-gray-900">{pool.subnet}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">IP Range (Cannot be changed)</p>
              <p className="font-mono text-gray-900">{pool.start_ip} - {pool.end_ip}</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sync Pool Dialog */}
      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sync IP Pool</DialogTitle>
            <DialogDescription>
              Scan the network to update IP address statuses for {pool.subnet}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">
              This will scan the subnet and update the status of all IP addresses based on current usage.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700">
                <RefreshCw className="h-3 w-3 inline mr-1" />
                Current usage: {pool.used_ips} of {pool.total_ips} IPs assigned
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSyncDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSync} disabled={syncing}>
              {syncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Now
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Pool Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete IP Pool</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this IP pool?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800 font-medium mb-2">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                Warning
              </p>
              <p className="text-sm text-yellow-700">
                Pool: <strong>{pool.name}</strong><br />
                Subnet: <code>{pool.subnet}</code>
              </p>
            </div>
            
            {pool.used_ips > 0 ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">
                  <X className="h-4 w-4 inline mr-1" />
                  Cannot delete pool with {pool.used_ips} assigned IPs.
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Please release all assigned IP addresses first.
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                This action cannot be undone. All {pool.total_ips} IP addresses in this pool will be deleted.
              </p>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleting || pool.used_ips > 0}
            >
              {deleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Pool
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}