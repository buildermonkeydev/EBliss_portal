// app/components/ipam/IPAddressTable.tsx
'use client'

import { useState } from 'react'
import { 
  Edit, 
  Unlink, 
  Link, 
  MoreVertical, 
  Eye,
  Copy,
  Server,
  User,
  Calendar,
  Globe,
  X,
  Save,
  AlertTriangle
} from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { useToast } from '../../../hooks/use-toast'
import { ipamApi, IPAddress } from '../../lib/ipam-api'

interface IPAddressTableProps {
  addresses: IPAddress[]
  loading?: boolean
  compact?: boolean
  onAssign?: (ip: IPAddress) => void
  onRelease?: (ip: IPAddress) => void
  onSetPTR?: (ip: IPAddress) => void
  onView?: (ip: IPAddress) => void
  onRefresh?: () => void
}

export function IPAddressTable({ 
  addresses, 
  loading, 
  compact = false,
  onAssign, 
  onRelease, 
  onSetPTR,
  onView,
  onRefresh
}: IPAddressTableProps) {
  const [selectedIP, setSelectedIP] = useState<IPAddress | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [ptrDialogOpen, setPtrDialogOpen] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false)
  const [ptrRecord, setPtrRecord] = useState('')
  const [assignForm, setAssignForm] = useState({ vm_id: '', user_id: '' })
  const [saving, setSaving] = useState(false)
  const [releasing, setReleasing] = useState(false)
  const [vms, setVMs] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  
  const { toast } = useToast()

  const getIPStatusBadge = (status: string) => {
    switch (status) {
      case 'available': return <Badge className="bg-green-100 text-green-700 border-green-200">Available</Badge>
      case 'assigned': return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Assigned</Badge>
      case 'reserved': return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Reserved</Badge>
      case 'released': return <Badge className="bg-gray-100 text-gray-700 border-gray-200">Released</Badge>
      default: return <Badge>{status}</Badge>
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatDateTime = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text)
    toast({
      title: 'Copied',
      description: 'IP address copied to clipboard',
    })
  }

  const handleViewDetails = (ip: IPAddress) => {
    setSelectedIP(ip)
    setViewDialogOpen(true)
  }

  const handleSetPTR = (ip: IPAddress) => {
    setSelectedIP(ip)
    setPtrRecord(ip.ptr_record || '')
    setPtrDialogOpen(true)
  }

  const handleSavePTR = async () => {
    if (!selectedIP) return
    
    setSaving(true)
    try {
      await ipamApi.setPTRRecord(selectedIP.id, ptrRecord)
      toast({
        title: 'Success',
        description: `PTR record set to ${ptrRecord}`,
      })
      setPtrDialogOpen(false)
      onRefresh?.()
      onSetPTR?.(selectedIP)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to set PTR record',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleAssignClick = async (ip: IPAddress) => {
    setSelectedIP(ip)
    setAssignDialogOpen(true)
    
    // Fetch VMs and users for assignment
    try {
      const [vmsRes, usersRes] = await Promise.all([
        ipamApi.getVMs({ status: 'running,stopped' }),
        ipamApi.getUsers?.() || Promise.resolve([]),
      ])
      setVMs(vmsRes)
      setUsers(usersRes)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    }
  }

  const handleAssign = async () => {
    if (!selectedIP || !assignForm.vm_id || !assignForm.user_id) {
      toast({ title: 'Error', description: 'Please select VM and User', variant: 'destructive' })
      return
    }
    
    setSaving(true)
    try {
      await ipamApi.assignIPToVM(
        selectedIP.id, 
        parseInt(assignForm.vm_id), 
        parseInt(assignForm.user_id)
      )
      toast({
        title: 'Success',
        description: `IP ${selectedIP.address} assigned successfully`,
      })
      setAssignDialogOpen(false)
      setAssignForm({ vm_id: '', user_id: '' })
      onRefresh?.()
      onAssign?.(selectedIP)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to assign IP',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleReleaseClick = (ip: IPAddress) => {
    setSelectedIP(ip)
    setReleaseDialogOpen(true)
  }

  const handleRelease = async () => {
    if (!selectedIP) return
    
    setReleasing(true)
    try {
      await ipamApi.releaseIP(selectedIP.id)
      toast({
        title: 'Success',
        description: `IP ${selectedIP.address} released`,
      })
      setReleaseDialogOpen(false)
      onRefresh?.()
      onRelease?.(selectedIP)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to release IP',
        variant: 'destructive',
      })
    } finally {
      setReleasing(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-4">
              <div className="h-4 w-32 bg-gray-200 rounded"></div>
              <div className="h-4 w-24 bg-gray-200 rounded"></div>
              <div className="flex-1 h-4 bg-gray-200 rounded"></div>
              <div className="w-20 h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (addresses.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Link className="h-8 w-8 text-gray-400" />
        </div>
        <p className="text-gray-500 text-lg">No IP addresses found</p>
        <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">IP Address</th>
              {!compact && (
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Pool/Subnet</th>
              )}
              {!compact && (
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">POP</th>
              )}
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Assigned To</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">VM</th>
              {!compact && (
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">PTR Record</th>
              )}
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              {!compact && (
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Assigned</th>
              )}
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {addresses.map((ip) => (
              <tr key={ip.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">
                      {ip.address}
                    </code>
                    <button
                      onClick={() => copyToClipboard(ip.address)}
                      className="opacity-0 group-hover:opacity-100 hover:bg-gray-200 p-1 rounded"
                    >
                      <Copy className="h-3 w-3 text-gray-400" />
                    </button>
                  </div>
                </td>
                {!compact && (
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-600">{ip.pool_name || ip.subnet}</span>
                  </td>
                )}
                {!compact && (
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-600">{ip.pop_name}</span>
                  </td>
                )}
                <td className="px-4 py-4">
                  {ip.user_email ? (
                    <div>
                      <p className="text-sm font-medium text-gray-900">{ip.user_name || 'N/A'}</p>
                      <p className="text-xs text-gray-500">{ip.user_email}</p>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  {ip.vm_name ? (
                    <div className="flex items-center gap-1">
                      <Server className="h-3 w-3 text-gray-400" />
                      <span className="text-sm text-gray-600">{ip.vm_name}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>
                {!compact && (
                  <td className="px-4 py-4">
                    <code className="text-xs text-gray-500">{ip.ptr_record || '-'}</code>
                  </td>
                )}
                <td className="px-4 py-4">
                  {getIPStatusBadge(ip.status)}
                </td>
                {!compact && (
                  <td className="px-4 py-4">
                    <span className="text-xs text-gray-500">{formatDate(ip.assigned_at)}</span>
                  </td>
                )}
                <td className="px-4 py-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4 text-gray-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-[10000]">
                      <DropdownMenuItem onClick={() => handleViewDetails(ip)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => copyToClipboard(ip.address)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy IP
                      </DropdownMenuItem>
                      {ip.status === 'available' && (
                        <DropdownMenuItem onClick={() => handleAssignClick(ip)}>
                          <Link className="h-4 w-4 mr-2" />
                          Assign to VM
                        </DropdownMenuItem>
                      )}
                      {ip.status === 'assigned' && (
                        <>
                          <DropdownMenuItem onClick={() => handleSetPTR(ip)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Set PTR Record
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleReleaseClick(ip)}
                            className="text-red-600"
                          >
                            <Unlink className="h-4 w-4 mr-2" />
                            Release IP
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>IP Address Details</DialogTitle>
            <DialogDescription>
              Detailed information for {selectedIP?.address}
            </DialogDescription>
          </DialogHeader>
          
          {selectedIP && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">IP Address</p>
                  <code className="text-lg font-medium">{selectedIP.address}</code>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  {getIPStatusBadge(selectedIP.status)}
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Subnet</p>
                  <p className="text-sm">{selectedIP.subnet}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Pool</p>
                  <p className="text-sm">{selectedIP.pool_name || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">POP</p>
                  <p className="text-sm">{selectedIP.pop_name}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">PTR Record</p>
                  <code className="text-sm">{selectedIP.ptr_record || '-'}</code>
                </div>
              </div>
              
              {selectedIP.status === 'assigned' && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-3">Assignment Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Assigned To</p>
                      <p className="font-medium">{selectedIP.user_name || 'N/A'}</p>
                      <p className="text-sm text-gray-600">{selectedIP.user_email || 'N/A'}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">VM</p>
                      <p className="font-medium">{selectedIP.vm_name || 'N/A'}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Assigned At</p>
                      <p className="text-sm">{formatDateTime(selectedIP.assigned_at)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set PTR Dialog */}
      <Dialog open={ptrDialogOpen} onOpenChange={setPtrDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set PTR Record</DialogTitle>
            <DialogDescription>
              Configure reverse DNS for IP {selectedIP?.address}
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
            <Button variant="outline" onClick={() => setPtrDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePTR} disabled={saving}>
              {saving ? 'Saving...' : 'Save PTR Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign IP Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign IP Address</DialogTitle>
            <DialogDescription>
              Assign {selectedIP?.address} to a VM
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Select VM *</Label>
              <Select value={assignForm.vm_id} onValueChange={(v) => setAssignForm({ ...assignForm, vm_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose VM" />
                </SelectTrigger>
                <SelectContent className="z-[10001]">
                  {vms.map((vm) => (
                    <SelectItem key={vm.id} value={vm.id.toString()}>
                      {vm.name} ({vm.hostname})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Select User (VM Owner) *</Label>
              <Select value={assignForm.user_id} onValueChange={(v) => setAssignForm({ ...assignForm, user_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose User" />
                </SelectTrigger>
                <SelectContent className="z-[10001]">
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.full_name || user.email} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={saving}>
              {saving ? 'Assigning...' : 'Assign IP'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Release IP Dialog */}
      <Dialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Release IP Address</DialogTitle>
            <DialogDescription>
              Are you sure you want to release {selectedIP?.address}?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {selectedIP && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  This will release the IP from {selectedIP.vm_name || 'the VM'}.
                </p>
                <p className="text-xs text-yellow-600 mt-2">
                  The IP will become available for other assignments.
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setReleaseDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRelease} disabled={releasing}>
              {releasing ? 'Releasing...' : 'Release IP'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}