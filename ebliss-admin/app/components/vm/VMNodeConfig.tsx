'use client'

import { useState, useEffect } from 'react'
import { 
  Server, 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw, 
  Settings,
  HardDrive,
  Cpu,
  MemoryStick,
  Activity,
  Wifi,
  WifiOff,
  CheckCircle,
  XCircle,
  Globe,
  MapPin,
  Building
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
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
import { vmApi } from '../../lib/vm-api'
import { Node, NodeStats, Pop, NodeConfigDto } from './types'

interface VMNodeConfigProps {
  onNodeSelect?: (nodeId: number) => void
}

export function VMNodeConfig({ onNodeSelect }: VMNodeConfigProps) {
  const [nodes, setNodes] = useState<Node[]>([])
  const [pops, setPops] = useState<Pop[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [selectedPop, setSelectedPop] = useState<Pop | null>(null)
  const [nodeStats, setNodeStats] = useState<Record<number, NodeStats>>({})
  const [activeTab, setActiveTab] = useState<'nodes' | 'pops'>('pops')
  
  // Node dialogs
  const [createNodeDialog, setCreateNodeDialog] = useState(false)
  const [editNodeDialog, setEditNodeDialog] = useState(false)
  const [deleteNodeDialog, setDeleteNodeDialog] = useState(false)
  
  // POP dialogs
  const [createPopDialog, setCreatePopDialog] = useState(false)
  const [editPopDialog, setEditPopDialog] = useState(false)
  const [deletePopDialog, setDeletePopDialog] = useState(false)
  
  // Node form data
  const [nodeFormData, setNodeFormData] = useState<NodeConfigDto>({
    hostname: '',
    api_url: '',
    api_token_id: '',
    api_token_secret: '',
    ip_address: '',
    pop_id: 0,
    max_vcpu: 64,
    max_ram_gb: 256,
    max_storage_gb: 2000,
  })
  
  // POP form data
  const [popFormData, setPopFormData] = useState({
    name: '',
    city: '',
    country: '',
    active: true,
  })
  
  const { toast } = useToast()

  useEffect(() => {
    fetchNodes()
    fetchPOPs()
  }, [])

const fetchNodes = async () => {
  try {
    setLoading(true)
    const response = await vmApi.getAllNodes()
    
    // Handle different possible response structures
    let nodesData: Node[] = []
    
    if (response && typeof response === 'object') {
      // Case 1: Response has a data property that is an array
      if ('data' in response && Array.isArray(response.data)) {
        nodesData = response.data
      }
      // Case 2: Response has data.data structure (nested)
      else if ('data' in response && response.data && typeof response.data === 'object' && 'data' in response.data && Array.isArray(response.data.data)) {
        nodesData = response.data.data
      }
      // Case 3: Response itself is an array
      else if (Array.isArray(response)) {
        nodesData = response
      }
    }
    
    setNodes(nodesData)
    
    // Fetch stats for each node
    nodesData.forEach((node: Node) => {
      fetchNodeStats(node.id)
    })
  } catch (error) {
    console.error('Failed to fetch nodes:', error)
    toast({
      title: 'Error',
      description: 'Failed to fetch nodes',
      variant: 'destructive',
    })
    setNodes([])
  } finally {
    setLoading(false)
  }
}

const fetchPOPs = async () => {
  try {
    const response = await vmApi.getAllPOPs()
    
    // Handle different possible response structures
    let popsData: Pop[] = []
    
    if (response && typeof response === 'object') {
      // Case 1: Response has a data property that is an array
      if ('data' in response && Array.isArray(response.data)) {
        popsData = response.data
      }
      // Case 2: Response has data.data structure (nested)
      else if ('data' in response && response.data && typeof response.data === 'object' && 'data' in response.data && Array.isArray(response.data.data)) {
        popsData = response.data.data
      }
      // Case 3: Response itself is an array
      else if (Array.isArray(response)) {
        popsData = response
      }
    }
    
    setPops(popsData)
  } catch (error) {
    console.error('Failed to fetch POPs:', error)
    setPops([])
  }
}
  const fetchNodeStats = async (nodeId: number) => {
    try {
      const stats = await vmApi.getNodeStats(nodeId)
      setNodeStats(prev => ({ ...prev, [nodeId]: stats }))
    } catch (error) {
      console.error(`Failed to fetch stats for node ${nodeId}:`, error)
    }
  }

  // ============ POP CRUD Operations ============
  
  const handleCreatePop = async () => {
    try {
      await vmApi.createPOP(popFormData)
      toast({
        title: 'Success',
        description: 'POP created successfully',
      })
      setCreatePopDialog(false)
      resetPopForm()
      fetchPOPs()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create POP',
        variant: 'destructive',
      })
    }
  }

  const handleUpdatePop = async () => {
    if (!selectedPop) return
    
    try {
      await vmApi.updatePOP(selectedPop.id, popFormData)
      toast({
        title: 'Success',
        description: 'POP updated successfully',
      })
      setEditPopDialog(false)
      resetPopForm()
      fetchPOPs()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update POP',
        variant: 'destructive',
      })
    }
  }

  const handleDeletePop = async () => {
    if (!selectedPop) return
    
    try {
      await vmApi.deletePOP(selectedPop.id)
      toast({
        title: 'Success',
        description: 'POP deleted successfully',
      })
      setDeletePopDialog(false)
      setSelectedPop(null)
      fetchPOPs()
      fetchNodes()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete POP',
        variant: 'destructive',
      })
    }
  }

  const handleTogglePopStatus = async (pop: Pop) => {
    try {
      await vmApi.togglePOPStatus(pop.id)
      toast({
        title: 'Success',
        description: `POP ${pop.name} status toggled`,
      })
      fetchPOPs()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to toggle POP status',
        variant: 'destructive',
      })
    }
  }

  // ============ Node CRUD Operations ============

  const handleCreateNode = async () => {
    try {
      await vmApi.createNode(nodeFormData)
      toast({
        title: 'Success',
        description: 'Node created successfully',
      })
      setCreateNodeDialog(false)
      resetNodeForm()
      fetchNodes()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create node',
        variant: 'destructive',
      })
    }
  }

  const handleUpdateNode = async () => {
    if (!selectedNode) return
    
    try {
      await vmApi.updateNode(selectedNode.id, nodeFormData)
      toast({
        title: 'Success',
        description: 'Node updated successfully',
      })
      setEditNodeDialog(false)
      resetNodeForm()
      fetchNodes()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update node',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteNode = async () => {
    if (!selectedNode) return
    
    try {
      await vmApi.deleteNode(selectedNode.id)
      toast({
        title: 'Success',
        description: 'Node deleted successfully',
      })
      setDeleteNodeDialog(false)
      setSelectedNode(null)
      fetchNodes()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete node',
        variant: 'destructive',
      })
    }
  }

  const handleSyncNode = async (node: Node) => {
    try {
      await vmApi.syncNode(node.id)
      toast({
        title: 'Success',
        description: `Node ${node.hostname} synced successfully`,
      })
      fetchNodeStats(node.id)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to sync node',
        variant: 'destructive',
      })
    }
  }

  const handleToggleMaintenance = async (node: Node) => {
    const newStatus = node.status !== 'maintenance'
    try {
      await vmApi.setNodeMaintenance(node.id, newStatus)
      toast({
        title: 'Success',
        description: `Node ${node.hostname} ${newStatus ? 'entered' : 'exited'} maintenance mode`,
      })
      fetchNodes()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update node status',
        variant: 'destructive',
      })
    }
  }

  const resetNodeForm = () => {
    setNodeFormData({
      hostname: '',
      api_url: '',
      api_token_id: '',
      api_token_secret: '',
      ip_address: '',
      pop_id: 0,
      max_vcpu: 64,
      max_ram_gb: 256,
      max_storage_gb: 2000,
    })
    setSelectedNode(null)
  }

  const resetPopForm = () => {
    setPopFormData({
      name: '',
      city: '',
      country: '',
      active: true,
    })
    setSelectedPop(null)
  }

  const openEditNodeDialog = (node: Node) => {
    setSelectedNode(node)
    setNodeFormData({
      hostname: node.hostname,
      api_url: node.api_url,
      api_token_id: '',
      api_token_secret: '',
      ip_address: node.ip_address,
      pop_id: node.pop_id,
      max_vcpu: node.max_vcpu,
      max_ram_gb: node.max_ram_gb,
      max_storage_gb: node.max_storage_gb,
    })
    setEditNodeDialog(true)
  }

  const openEditPopDialog = (pop: Pop) => {
    setSelectedPop(pop)
    setPopFormData({
      name: pop.name,
      city: pop.city,
      country: pop.country,
      active: pop.active,
    })
    setEditPopDialog(true)
  }

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; icon: any; label: string }> = {
      active: { color: 'text-green-600 bg-green-100 border-green-200', icon: CheckCircle, label: 'Active' },
      maintenance: { color: 'text-yellow-600 bg-yellow-100 border-yellow-200', icon: Settings, label: 'Maintenance' },
      offline: { color: 'text-red-600 bg-red-100 border-red-200', icon: XCircle, label: 'Offline' },
    }
    return configs[status] || configs.offline
  }

  const calculateUsage = (used: number, max: number) => {
    const percentage = (used / max) * 100
    let color = 'bg-green-500'
    if (percentage > 80) color = 'bg-red-500'
    else if (percentage > 60) color = 'bg-yellow-500'
    
    return { percentage, color }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Infrastructure Configuration</h2>
          <p className="text-sm text-gray-500">Manage POPs and Proxmox nodes</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'pops' && (
            <Button onClick={() => setCreatePopDialog(true)} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Add POP
            </Button>
          )}
          {activeTab === 'nodes' && (
            <Button onClick={() => setCreateNodeDialog(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Node
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'nodes' | 'pops')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="pops" className="gap-2">
            <Globe className="h-4 w-4" />
            POPs / Locations
          </TabsTrigger>
          <TabsTrigger value="nodes" className="gap-2">
            <Server className="h-4 w-4" />
            Nodes
          </TabsTrigger>
        </TabsList>

        {/* POPs Tab */}
        <TabsContent value="pops" className="mt-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="border border-gray-200">
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pops.length > 0 ? (
                pops.map((pop) => (
                  <Card key={pop.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                            <Building className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{pop.name}</CardTitle>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {pop.city}, {pop.country}
                            </p>
                          </div>
                        </div>
                        <Badge className={pop.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                          {pop.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openEditPopDialog(pop)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleTogglePopStatus(pop)}
                        >
                          {pop.active ? (
                            <><XCircle className="h-3 w-3 mr-1" /> Disable</>
                          ) : (
                            <><CheckCircle className="h-3 w-3 mr-1" /> Enable</>
                          )}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => { setSelectedPop(pop); setDeletePopDialog(true) }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <Globe className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">No POPs found</p>
                  <Button onClick={() => setCreatePopDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First POP
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Nodes Tab */}
        <TabsContent value="nodes" className="mt-6">
          {pops.length === 0 ? (
            <div className="text-center py-12 bg-yellow-50 rounded-lg border border-yellow-200">
              <Globe className="h-12 w-12 text-yellow-600 mx-auto mb-3" />
              <p className="text-yellow-800 font-medium mb-2">No POPs Available</p>
              <p className="text-yellow-600 mb-4">You need to create a POP before adding nodes.</p>
              <Button onClick={() => setActiveTab('pops')} variant="outline" className="border-yellow-400">
                Go to POPs Tab
              </Button>
            </div>
          ) : loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(2)].map((_, i) => (
                <Card key={i} className="border border-gray-200">
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="space-y-2">
                        <div className="h-2 bg-gray-200 rounded"></div>
                        <div className="h-2 bg-gray-200 rounded"></div>
                        <div className="h-2 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {nodes.length > 0 ? (
                nodes.map((node) => {
                  const stats = nodeStats[node.id]
                  const statusConfig = getStatusConfig(node.status)
                  const StatusIcon = statusConfig.icon
                  
                  return (
                    <Card 
                      key={node.id} 
                      className="border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => onNodeSelect?.(node.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                              <Server className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{node.hostname}</CardTitle>
                              <p className="text-sm text-gray-500">{node.pop?.name} • {node.ip_address}</p>
                            </div>
                          </div>
                          <Badge className={statusConfig.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {stats && (
                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="flex items-center gap-1"><Cpu className="h-3 w-3" />CPU</span>
                                <span>{stats.used_vcpu} / {node.max_vcpu} cores</span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${calculateUsage(stats.used_vcpu, node.max_vcpu).color} transition-all`}
                                  style={{ width: `${calculateUsage(stats.used_vcpu, node.max_vcpu).percentage}%` }}
                                />
                              </div>
                            </div>
                            
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="flex items-center gap-1"><MemoryStick className="h-3 w-3" />RAM</span>
                                <span>{stats.used_ram_gb} / {node.max_ram_gb} GB</span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${calculateUsage(stats.used_ram_gb, node.max_ram_gb).color} transition-all`}
                                  style={{ width: `${calculateUsage(stats.used_ram_gb, node.max_ram_gb).percentage}%` }}
                                />
                              </div>
                            </div>
                            
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" />Storage</span>
                                <span>{stats.used_storage_gb} / {node.max_storage_gb} GB</span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${calculateUsage(stats.used_storage_gb, node.max_storage_gb).color} transition-all`}
                                  style={{ width: `${calculateUsage(stats.used_storage_gb, node.max_storage_gb).percentage}%` }}
                                />
                              </div>
                            </div>
                            
                            <div className="flex justify-between text-sm text-gray-500 pt-2 border-t">
                              <span className="flex items-center gap-1"><Activity className="h-3 w-3" />Running: {stats.running_vms}</span>
                              <span>Total VMs: {stats.total_vms}</span>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex gap-2 pt-2">
                          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleSyncNode(node) }}>
                            <RefreshCw className="h-3 w-3 mr-1" />Sync
                          </Button>
                          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openEditNodeDialog(node) }}>
                            <Edit className="h-3 w-3 mr-1" />Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleToggleMaintenance(node) }}>
                            {node.status === 'maintenance' ? <><Wifi className="h-3 w-3 mr-1" />Activate</> : <><WifiOff className="h-3 w-3 mr-1" />Maintenance</>}
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600" onClick={(e) => { e.stopPropagation(); setSelectedNode(node); setDeleteNodeDialog(true) }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              ) : (
                <div className="col-span-full text-center py-12">
                  <Server className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">No nodes found</p>
                  <Button onClick={() => setCreateNodeDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Node
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit POP Dialog */}
      <Dialog open={createPopDialog || editPopDialog} onOpenChange={createPopDialog ? setCreatePopDialog : setEditPopDialog}>
        <DialogContent className="max-w-md z-[10000]">
          <DialogHeader>
            <DialogTitle>{editPopDialog ? 'Edit POP' : 'Add New POP'}</DialogTitle>
            <DialogDescription>
              Configure a Point of Presence (datacenter location)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>POP Name *</Label>
              <Input
                placeholder="US-East-1"
                value={popFormData.name}
                onChange={(e) => setPopFormData({ ...popFormData, name: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City *</Label>
                <Input
                  placeholder="New York"
                  value={popFormData.city}
                  onChange={(e) => setPopFormData({ ...popFormData, city: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Country *</Label>
                <Input
                  placeholder="United States"
                  value={popFormData.country}
                  onChange={(e) => setPopFormData({ ...popFormData, country: e.target.value })}
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pop-active"
                checked={popFormData.active}
                onChange={(e) => setPopFormData({ ...popFormData, active: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="pop-active">Active (available for deployment)</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              createPopDialog ? setCreatePopDialog(false) : setEditPopDialog(false)
              resetPopForm()
            }}>
              Cancel
            </Button>
            <Button 
              className="bg-purple-600 hover:bg-purple-700"
              onClick={editPopDialog ? handleUpdatePop : handleCreatePop}
            >
              {editPopDialog ? 'Update POP' : 'Create POP'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete POP Dialog */}
      <Dialog open={deletePopDialog} onOpenChange={setDeletePopDialog}>
        <DialogContent className="z-[10000]">
          <DialogHeader>
            <DialogTitle>Delete POP</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete POP "{selectedPop?.name}"?
              <span className="block mt-2 text-red-600">
                This will also affect all nodes associated with this POP.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePopDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeletePop}>Delete POP</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Node Dialog */}
      <Dialog open={createNodeDialog || editNodeDialog} onOpenChange={createNodeDialog ? setCreateNodeDialog : setEditNodeDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto z-[10000]">
          <DialogHeader>
            <DialogTitle>{editNodeDialog ? 'Edit Node' : 'Add New Node'}</DialogTitle>
            <DialogDescription>
              Configure Proxmox node connection and resource limits
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hostname *</Label>
                <Input
                  placeholder="node01.proxmox.com"
                  value={nodeFormData.hostname}
                  onChange={(e) => setNodeFormData({ ...nodeFormData, hostname: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>IP Address *</Label>
                <Input
                  placeholder="10.0.0.100"
                  value={nodeFormData.ip_address}
                  onChange={(e) => setNodeFormData({ ...nodeFormData, ip_address: e.target.value })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>API URL *</Label>
              <Input
                placeholder="https://proxmox.example.com:8006/api2/json"
                value={nodeFormData.api_url}
                onChange={(e) => setNodeFormData({ ...nodeFormData, api_url: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>API Token ID *</Label>
                <Input
                  placeholder="root@pam!tokenid"
                  value={nodeFormData.api_token_id}
                  onChange={(e) => setNodeFormData({ ...nodeFormData, api_token_id: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>API Token Secret *</Label>
                <Input
                  type="password"
                  placeholder={editNodeDialog ? 'Leave blank to keep unchanged' : 'Enter secret'}
                  value={nodeFormData.api_token_secret}
                  onChange={(e) => setNodeFormData({ ...nodeFormData, api_token_secret: e.target.value })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Point of Presence (POP) *</Label>
              <Select 
                value={nodeFormData.pop_id.toString()} 
                onValueChange={(value) => setNodeFormData({ ...nodeFormData, pop_id: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select POP" />
                </SelectTrigger>
                <SelectContent className="z-[10001]">
                  {pops.filter(p => p.active).map((pop) => (
                    <SelectItem key={pop.id} value={pop.id.toString()}>
                      {pop.name} - {pop.city}, {pop.country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Resource Limits</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Max vCPU</Label>
                  <Input
                    type="number"
                    value={nodeFormData.max_vcpu}
                    onChange={(e) => setNodeFormData({ ...nodeFormData, max_vcpu: parseInt(e.target.value) })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Max RAM (GB)</Label>
                  <Input
                    type="number"
                    value={nodeFormData.max_ram_gb}
                    onChange={(e) => setNodeFormData({ ...nodeFormData, max_ram_gb: parseInt(e.target.value) })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Max Storage (GB)</Label>
                  <Input
                    type="number"
                    value={nodeFormData.max_storage_gb}
                    onChange={(e) => setNodeFormData({ ...nodeFormData, max_storage_gb: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              createNodeDialog ? setCreateNodeDialog(false) : setEditNodeDialog(false)
              resetNodeForm()
            }}>
              Cancel
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={editNodeDialog ? handleUpdateNode : handleCreateNode}
              disabled={!nodeFormData.pop_id}
            >
              {editNodeDialog ? 'Update Node' : 'Add Node'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Node Dialog */}
      <Dialog open={deleteNodeDialog} onOpenChange={setDeleteNodeDialog}>
        <DialogContent className="z-[10000]">
          <DialogHeader>
            <DialogTitle>Delete Node</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete node "{selectedNode?.hostname}"?
              <span className="block mt-2 text-red-600">
                This action cannot be undone. All VMs on this node must be migrated first.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteNodeDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteNode}>Delete Node</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}