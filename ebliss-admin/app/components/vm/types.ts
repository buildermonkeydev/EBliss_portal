// components/vm/types.ts
export interface VM {
  id: number
  user_id: number
  node_id: number
  proxmox_vmid: number
  plan_id: number
  name: string
  hostname: string
  vcpu: number
  ram_gb: number
  ssd_gb: number
  plan_type: 'hourly' | 'monthly'
  status: 'pending' | 'creating' | 'running' | 'stopped' | 'suspended' | 'rebooting' | 'deleting' | 'failed'
  hourly_rate: number
  monthly_rate: number | null
  ip_addresses: IPAddress[]
  created_at: string
  last_billed_at: string
  suspended_at: string | null
  user?: {
    id: number
    email: string
    full_name: string
  }
  node?: Node
  plan?: Plan
}

export interface IPAddress {
  id: number
  address: string
  subnet: string
  gateway: string
  status: 'available' | 'assigned' | 'reserved'
}

export interface Node {
  id: number
  pop_id: number
  hostname: string
  api_url: string
  ip_address: string
  max_vcpu: number
  max_ram_gb: number
  max_storage_gb: number
  status: 'active' | 'maintenance' | 'offline'
  created_at: string
  pop?: Pop
  stats?: NodeStats
}

export interface Pop {
  id: number
  name: string
  city: string
  country: string
  active: boolean
}

export interface NodeStats {
  used_vcpu: number
  used_ram_gb: number
  used_storage_gb: number
  running_vms: number
  total_vms: number
}

export interface Plan {
  id: number
  name: string
  type: 'hourly' | 'monthly'
  vcpu: number
  ram_gb: number
  ssd_gb: number
  bandwidth_gb: number
  hourly_price: number
  monthly_price: number
  is_active: boolean
}

export interface CreateVMDto {
  user_id: number
  node_id: number
  plan_id: number
  name: string
  hostname: string
  os_template_id: number
  ssh_key_ids?: number[]
  firewall_group_id?: number
  cloud_init_data?: any
}

export interface VMStats {
  totalVMs: number
  runningVMs: number
  stoppedVMs: number
  suspendedVMs: number
  totalVCPU: number
  totalRAM: number
  totalStorage: number
  monthlyRevenue: number
  hourlyRevenue: number
}

export interface NodeConfigDto {
  hostname: string
  api_url: string
  api_token_id: string
  api_token_secret: string
  ip_address: string
  pop_id: number
  max_vcpu: number
  max_ram_gb: number
  max_storage_gb: number
}