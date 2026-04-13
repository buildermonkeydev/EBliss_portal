// components/vm/VMCreateForm.tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  Server, 
  HardDrive, 
  Cpu, 
  MemoryStick,
  Globe,
  Key,
  Shield,
  User,
  Check,
  ChevronsUpDown,
  Loader2
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Badge } from '../ui/badge'
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
} from '../ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover'
import { Textarea } from '../ui/textarea'
import { useToast } from '../../../hooks/use-toast'
import { api } from '@/lib/api'

interface Node {
  id: number
  pop_id: number
  hostname: string
  api_url: string
  max_vcpu: number
  max_ram_gb: number
  max_storage_gb: number
  status: string
  ip_address: string
  pop?: {
    id: number
    name: string
    city: string
    country: string
  }
  _count?: {
    vms: number
  }
}

interface Pop {
  id: number
  name: string
  city: string
  country: string
  active: boolean
  created_at?: string
  _count?: {
    nodes: number
    ip_addresses: number
  }
}

interface OsTemplate {
  id: string
  name: string
  volumeId: string
  node: string
  storage: string
  size: number
  format: string
  contentType: string
  version: string
  family: string
  category: string
  minDisk: number
  minMemory: number
  recommended: boolean
  tags: string[]
  createdAt: string
  updatedAt: string
}

interface User {
  id: number
  email: string
  full_name?: string
  name?: string
  role?: string
}

interface SSHKey {
  id: number
  label: string
  fingerprint: string
  public_key: string
}

interface FirewallGroup {
  id: number
  name: string
  default_policy: string
  rules_count?: number
}

export function VMCreateForm({ open, onOpenChange, onSuccess }: VMCreateFormProps) {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  const [users, setUsers] = useState<User[]>([])
  const [nodes, setNodes] = useState<Node[]>([])
  const [pops, setPops] = useState<Pop[]>([])
  const [osTemplates, setOsTemplates] = useState<OsTemplate[]>([])
  const [sshKeys, setSshKeys] = useState<SSHKey[]>([])
  const [firewallGroups, setFirewallGroups] = useState<FirewallGroup[]>([])
  const [isSearchingUsers, setIsSearchingUsers] = useState(false)
  
  // Form state - Added vcpu, ram_gb, ssd_gb
  const [formData, setFormData] = useState({
    user_id: 0,
    node_id: 0,
    pop_id: 0,
    os_template_id: '',
    name: '',
    hostname: '',
    vcpu: 2,
    ram_gb: 4,
    ssd_gb: 40,
    ssh_key_ids: [] as number[],
    firewall_group_id: 0,
    cloud_init_data: '',
  })
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userSearchOpen, setUserSearchOpen] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<OsTemplate | null>(null)
  const [filteredNodes, setFilteredNodes] = useState<Node[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<OsTemplate[]>([])
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  
  const { toast } = useToast()
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (open) {
      fetchInitialData()
      resetForm()
    }
  }, [open])

  useEffect(() => {
    let filtered = nodes.filter(n => n.status === 'active')
    if (formData.pop_id) {
      filtered = filtered.filter(n => n.pop_id === formData.pop_id)
    }
    setFilteredNodes(filtered)
  }, [formData.pop_id, nodes])

  useEffect(() => {
    const filtered = osTemplates.filter(t => 
      (t.contentType === 'iso' || t.contentType === 'images') &&
      !t.id.includes('vztmpl')
    )
    setFilteredTemplates(filtered)
  }, [osTemplates])

  useEffect(() => {
    if (formData.os_template_id) {
      const template = osTemplates.find(t => t.id === formData.os_template_id)
      setSelectedTemplate(template || null)
      
      // Auto-set recommended resources based on template
      if (template) {
        const recommendedRam = Math.max(template.minMemory || 1, 4)
        const recommendedDisk = Math.max(Math.ceil(template.minDisk || (template.size / 1024 / 1024 / 1024)), 40)
        setFormData(prev => ({
          ...prev,
          ram_gb: recommendedRam,
          ssd_gb: recommendedDisk,
        }))
      }
    }
  }, [formData.os_template_id, osTemplates])

  useEffect(() => {
    if (formData.name && !formData.hostname) {
      const hostname = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
      setFormData(prev => ({ ...prev, hostname }))
    }
  }, [formData.name])

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  const resetForm = () => {
    setFormData({
      user_id: 0,
      node_id: 0,
      pop_id: 0,
      os_template_id: '',
      name: '',
      hostname: '',
      vcpu: 2,
      ram_gb: 4,
      ssd_gb: 40,
      ssh_key_ids: [],
      firewall_group_id: 0,
      cloud_init_data: '',
    })
    setSelectedUser(null)
    setSelectedTemplate(null)
    setValidationErrors({})
    setUserSearch('')
    setUsers([])
  }

  const fetchInitialData = async () => {
    setLoading(true)
    try {
      const [nodesRes, popsRes, templatesRes] = await Promise.all([
        api.get('/admin/nodes'),
        api.get('/admin/pops'),
        api.get('/os-templates'),
      ])
      
      const nodesData = nodesRes.data?.data || nodesRes.data || []
      setNodes(Array.isArray(nodesData) ? nodesData : [])
      
      const popsData = popsRes.data?.data || popsRes.data || []
      setPops(Array.isArray(popsData) ? popsData : [])
      
      const templatesData = templatesRes.data?.templates || templatesRes.data || []
      setOsTemplates(Array.isArray(templatesData) ? templatesData : [])
    } catch (error: any) {
      console.error('Failed to fetch initial data:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load required data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchUsersDebounced = useCallback((search: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    if (search.length < 2) {
      setUsers([])
      setIsSearchingUsers(false)
      return
    }

    setIsSearchingUsers(true)

    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await api.get('/admin/users', {
          params: { search, limit: 10 }
        })
        
        let usersData: User[] = []
        if (response.data?.data && Array.isArray(response.data.data)) {
          usersData = response.data.data
        } else if (Array.isArray(response.data)) {
          usersData = response.data
        }
        
        const customers = usersData.filter(u => u.role === 'customer')
        setUsers(customers)
      } catch (error) {
        console.error('Failed to fetch users:', error)
        setUsers([])
      } finally {
        setIsSearchingUsers(false)
      }
    }, 500)
  }, [])

  const handleUserSearch = (value: string) => {
    setUserSearch(value)
    fetchUsersDebounced(value)
  }

  const fetchSSHKeys = async (userId: number) => {
    if (!userId) return
    try {
      const response = await api.get(`/admin/users/${userId}/ssh-keys`)
      setSshKeys(response.data?.data || response.data || [])
    } catch (error) {
      console.error('Failed to fetch SSH keys:', error)
      setSshKeys([])
    }
  }

  const fetchFirewallGroups = async (userId: number) => {
    if (!userId) return
    try {
      const response = await api.get(`/admin/users/${userId}/firewall-groups`)
      setFirewallGroups(response.data?.data || response.data || [])
    } catch (error) {
      console.error('Failed to fetch firewall groups:', error)
      setFirewallGroups([])
    }
  }

  const handleUserSelect = (user: User) => {
    setSelectedUser(user)
    setFormData(prev => ({ ...prev, user_id: user.id }))
    setUserSearchOpen(false)
    setUserSearch('')
    setUsers([])
    setValidationErrors(prev => ({ ...prev, user_id: '' }))
    fetchSSHKeys(user.id)
    fetchFirewallGroups(user.id)
  }

  const getUserDisplayName = (user: User): string => {
    return user.full_name || user.name || user.email?.split('@')[0] || 'User'
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    
    if (!formData.user_id) errors.user_id = 'Please select a user'
    if (!formData.name.trim()) errors.name = 'VM name is required'
    if (!formData.hostname.trim()) errors.hostname = 'Hostname is required'
    if (!formData.pop_id) errors.pop_id = 'Please select a location'
    if (!formData.os_template_id) errors.os_template_id = 'Please select an OS template'
    if (formData.vcpu < 1) errors.vcpu = 'vCPU must be at least 1'
    if (formData.ram_gb < 1) errors.ram_gb = 'RAM must be at least 1 GB'
    if (formData.ssd_gb < 10) errors.ssd_gb = 'Storage must be at least 10 GB'
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors before submitting',
        variant: 'destructive',
      })
      return
    }
    
    setSubmitting(true)
    try {
      const submitData = {
        user_id: formData.user_id,
        pop_id: formData.pop_id,
        node_id: formData.node_id || undefined,
        os_template_id: formData.os_template_id,
        name: formData.name,
        hostname: formData.hostname,
        vcpu: formData.vcpu,
        ram_gb: formData.ram_gb,
        ssd_gb: formData.ssd_gb,
        ssh_key_ids: formData.ssh_key_ids,
        firewall_group_id: formData.firewall_group_id || undefined,
        cloud_init_data: formData.cloud_init_data || undefined,
      }
      
      console.log('Submitting VM data:', submitData)
      
      await api.post('/admin/vms', submitData)
      
      toast({
        title: 'Success',
        description: `VM "${formData.name}" created successfully`,
      })
      
      resetForm()
      onSuccess()
    } catch (error: any) {
      console.error('Failed to create VM:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create VM',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getOsIcon = (template: OsTemplate): string => {
    const name = template.name.toLowerCase()
    if (name.includes('ubuntu')) return '🔶'
    if (name.includes('debian')) return '🌀'
    if (name.includes('almalinux')) return '🌊'
    if (name.includes('centos')) return '🎯'
    if (name.includes('rocky')) return '🪨'
    if (name.includes('fedora')) return '🎩'
    if (name.includes('windows')) return '🪟'
    if (name.includes('alpine')) return '🗻'
    return '🐧'
  }

  const getTemplateDisplayName = (template: OsTemplate): string => {
    let name = template.name
      .replace(/\.iso$/i, '')
      .replace(/\.img$/i, '')
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
    
    name = name.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
    
    return name
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto z-[10000]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Create New Virtual Machine
          </DialogTitle>
          <DialogDescription>
            Configure and deploy a new VM for a customer
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* User Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Customer <span className="text-red-500">*</span>
              </Label>
              <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    type="button"
                    className={`w-full justify-between ${validationErrors.user_id ? 'border-red-500' : ''}`}
                  >
                    {selectedUser ? (
                      <span className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {getUserDisplayName(selectedUser)} ({selectedUser.email})
                      </span>
                    ) : (
                      <span className="text-gray-500">Search for a customer...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-[500px] p-0 z-[10001]" 
                  align="start"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                  onPointerDownOutside={() => setUserSearchOpen(false)}
                >
                  <Command shouldFilter={false} className="max-h-[300px]">
                    <CommandInput 
                      placeholder="Type at least 2 characters to search..." 
                      value={userSearch}
                      onValueChange={handleUserSearch}
                      autoFocus
                    />
                    <CommandList>
                      {isSearchingUsers && (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                        </div>
                      )}
                      {!isSearchingUsers && userSearch.length < 2 && (
                        <CommandEmpty>Type at least 2 characters to search</CommandEmpty>
                      )}
                      {!isSearchingUsers && userSearch.length >= 2 && users.length === 0 && (
                        <CommandEmpty>No customers found</CommandEmpty>
                      )}
                      {!isSearchingUsers && users.length > 0 && (
                        <CommandGroup heading="Customers">
                          {users.map((user) => (
                            <div
                              key={user.id}
                              onClick={() => handleUserSelect(user)}
                              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                            >
                              <Check
                                className={`mr-2 h-4 w-4 shrink-0 ${
                                  selectedUser?.id === user.id ? 'opacity-100' : 'opacity-0'
                                }`}
                              />
                              <div className="flex flex-col flex-1">
                                <span className="font-medium">{getUserDisplayName(user)}</span>
                                <span className="text-xs text-muted-foreground">{user.email}</span>
                              </div>
                            </div>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {validationErrors.user_id && (
                <p className="text-xs text-red-500">{validationErrors.user_id}</p>
              )}
            </div>

            {/* VM Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vm-name">
                  VM Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="vm-name"
                  placeholder="my-web-server"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value })
                    setValidationErrors({ ...validationErrors, name: '' })
                  }}
                  className={validationErrors.name ? 'border-red-500' : ''}
                />
                {validationErrors.name && (
                  <p className="text-xs text-red-500">{validationErrors.name}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="hostname">
                  Hostname <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="hostname"
                  placeholder="web01.example.com"
                  value={formData.hostname}
                  onChange={(e) => {
                    setFormData({ ...formData, hostname: e.target.value })
                    setValidationErrors({ ...validationErrors, hostname: '' })
                  }}
                  className={validationErrors.hostname ? 'border-red-500' : ''}
                />
                {validationErrors.hostname && (
                  <p className="text-xs text-red-500">{validationErrors.hostname}</p>
                )}
              </div>
            </div>

            {/* Resource Configuration */}
            <div className="space-y-2">
              <Label>Resources <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <Cpu className="h-3 w-3 text-blue-600" />
                    <span className="text-xs text-gray-500">vCPU</span>
                  </div>
                  <Input
                    type="number"
                    min="1"
                    max="64"
                    value={formData.vcpu}
                    onChange={(e) => {
                      setFormData({ ...formData, vcpu: parseInt(e.target.value) || 1 })
                      setValidationErrors({ ...validationErrors, vcpu: '' })
                    }}
                    className={validationErrors.vcpu ? 'border-red-500' : ''}
                  />
                  {validationErrors.vcpu && (
                    <p className="text-xs text-red-500">{validationErrors.vcpu}</p>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <MemoryStick className="h-3 w-3 text-green-600" />
                    <span className="text-xs text-gray-500">RAM (GB)</span>
                  </div>
                  <Input
                    type="number"
                    min="1"
                    max="256"
                    value={formData.ram_gb}
                    onChange={(e) => {
                      setFormData({ ...formData, ram_gb: parseInt(e.target.value) || 1 })
                      setValidationErrors({ ...validationErrors, ram_gb: '' })
                    }}
                    className={validationErrors.ram_gb ? 'border-red-500' : ''}
                  />
                  {validationErrors.ram_gb && (
                    <p className="text-xs text-red-500">{validationErrors.ram_gb}</p>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <HardDrive className="h-3 w-3 text-purple-600" />
                    <span className="text-xs text-gray-500">Storage (GB)</span>
                  </div>
                  <Input
                    type="number"
                    min="10"
                    max="2000"
                    value={formData.ssd_gb}
                    onChange={(e) => {
                      setFormData({ ...formData, ssd_gb: parseInt(e.target.value) || 10 })
                      setValidationErrors({ ...validationErrors, ssd_gb: '' })
                    }}
                    className={validationErrors.ssd_gb ? 'border-red-500' : ''}
                  />
                  {validationErrors.ssd_gb && (
                    <p className="text-xs text-red-500">{validationErrors.ssd_gb}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label>
                Location (POP) <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={formData.pop_id ? formData.pop_id.toString() : ''} 
                onValueChange={(value) => {
                  setFormData({ 
                    ...formData, 
                    pop_id: parseInt(value),
                    node_id: 0
                  })
                  setValidationErrors({ ...validationErrors, pop_id: '' })
                }}
              >
                <SelectTrigger className={validationErrors.pop_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {pops.filter(p => p.active).map((pop) => (
                    <SelectItem key={pop.id} value={pop.id.toString()}>
                      {pop.name} - {pop.city}, {pop.country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.pop_id && (
                <p className="text-xs text-red-500">{validationErrors.pop_id}</p>
              )}
            </div>

            {/* Node Selection */}
            {formData.pop_id && filteredNodes.length > 0 && (
              <div className="space-y-2">
                <Label>
                  Node
                  <span className="text-xs text-gray-500 ml-2">(Auto-select recommended)</span>
                </Label>
                <Select 
                  value={formData.node_id ? formData.node_id.toString() : '0'} 
                  onValueChange={(value) => setFormData({ ...formData, node_id: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Auto-select best node" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Auto-select best node</SelectItem>
                    {filteredNodes.map((node) => (
                      <SelectItem key={node.id} value={node.id.toString()}>
                        <div className="flex items-center justify-between w-full gap-4">
                          <span>{node.hostname}</span>
                          <Badge variant={node.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                            {node.status}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {node._count?.vms || 0} VMs
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* OS Template */}
            <div className="space-y-2">
              <Label>
                Operating System <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={formData.os_template_id} 
                onValueChange={(value) => {
                  setFormData({ ...formData, os_template_id: value })
                  setValidationErrors({ ...validationErrors, os_template_id: '' })
                }}
              >
                <SelectTrigger className={validationErrors.os_template_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select OS template" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {filteredTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2 w-full">
                        <span className="text-lg">{getOsIcon(template)}</span>
                        <span className="flex-1 truncate">{getTemplateDisplayName(template)}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          {formatBytes(template.size)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.os_template_id && (
                <p className="text-xs text-red-500">{validationErrors.os_template_id}</p>
              )}
            </div>

            {/* SSH Keys */}
            {selectedUser && (
              <div className="space-y-2">
                <Label>SSH Keys</Label>
                {sshKeys.length > 0 ? (
                  <div className="space-y-2 border rounded-lg p-3 max-h-40 overflow-y-auto">
                    {sshKeys.map((key) => (
                      <label key={key.id} className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={formData.ssh_key_ids.includes(key.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                ssh_key_ids: [...formData.ssh_key_ids, key.id]
                              })
                            } else {
                              setFormData({
                                ...formData,
                                ssh_key_ids: formData.ssh_key_ids.filter(id => id !== key.id)
                              })
                            }
                          }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Key className="h-3 w-3 text-gray-500" />
                            <span className="font-medium text-sm">{key.label}</span>
                          </div>
                          <p className="text-xs text-gray-500 font-mono mt-1 truncate">{key.fingerprint}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    No SSH keys found for this user
                  </p>
                )}
              </div>
            )}

            {/* Firewall Group */}
            {selectedUser && firewallGroups.length > 0 && (
              <div className="space-y-2">
                <Label>Firewall Group</Label>
                <Select 
                  value={formData.firewall_group_id ? formData.firewall_group_id.toString() : '0'} 
                  onValueChange={(value) => setFormData({ ...formData, firewall_group_id: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None (default firewall)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">None</SelectItem>
                    {firewallGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id.toString()}>
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          <span>{group.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {group.default_policy}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Cloud-Init */}
            <div className="space-y-2">
              <Label>Cloud-Init Configuration</Label>
              <Textarea
                placeholder="#cloud-config&#10;packages:&#10;  - nginx&#10;  - git"
                value={formData.cloud_init_data}
                onChange={(e) => setFormData({ ...formData, cloud_init_data: e.target.value })}
                rows={4}
                className="font-mono text-sm"
              />
            </div>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            className="bg-blue-600 hover:bg-blue-700" 
            onClick={handleSubmit}
            disabled={loading || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Server className="h-4 w-4 mr-2" />
                Create VM
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface VMCreateFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}