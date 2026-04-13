// lib/api/ipam-api.ts
import { api } from './api'

export interface IPPool {
  id: number
  pop_id: number
  pop_name: string
  name: string
  subnet: string
  gateway: string
  start_ip: string
  end_ip: string
  total_ips: number
  used_ips: number
  available_ips: number
  status: 'active' | 'full' | 'deprecated'
  created_at: string
}

export interface IPAddress {
  id: number
  address: string
  subnet: string
  pool_id: number | null
  pool_name: string | null
  pop_id: number
  pop_name: string
  user_id: number | null
  user_email: string | null
  user_name: string | null
  vm_id: number | null
  vm_name: string | null
  ptr_record: string | null
  status: 'available' | 'assigned' | 'reserved' | 'released'
  assigned_at: string | null
  released_at: string | null
}

export interface IPAMStats {
  total_pools: number
  total_ips: number
  used_ips: number
  available_ips: number
  reserved_ips: number
  pools_by_status: Array<{ status: string; count: number }>
}

export interface POP {
  id: number
  name: string
  city: string
  country: string
  active: boolean
}
export interface VM {
  id: number
  name: string
  hostname: string
  status: string
  user_id: number
}

export interface User {
  id: number
  email: string
  full_name: string
}
export const ipamApi = {
  // IP Pools
  async getIPPools(params?: {
    page?: number
    limit?: number
    pop_id?: number
    status?: string
    search?: string
  }): Promise<{ data: IPPool[]; total: number; page: number; totalPages: number }> {
    const response = await api.get('/admin/ipam/pools', { params })
    return response.data
  },

  async getIPPool(id: number): Promise<IPPool> {
    const response = await api.get(`/admin/ipam/pools/${id}`)
    return response.data
  },

  async createIPPool(data: {
    pop_id: number
    name: string
    subnet: string
    gateway: string
    start_ip: string
    end_ip: string
  }): Promise<IPPool> {
    const response = await api.post('/admin/ipam/pools', data)
    return response.data
  },

  async updateIPPool(id: number, data: Partial<IPPool>): Promise<IPPool> {
    const response = await api.put(`/admin/ipam/pools/${id}`, data)
    return response.data
  },

  async deleteIPPool(id: number): Promise<void> {
    await api.delete(`/admin/ipam/pools/${id}`)
  },

  async syncIPPool(id: number): Promise<any> {
    const response = await api.post(`/admin/ipam/pools/${id}/sync`)
    return response.data
  },

  // IP Addresses
  async getIPAddresses(params?: {
    page?: number
    limit?: number
    pool_id?: number
    pop_id?: number
    status?: string
    search?: string
  }): Promise<{ data: IPAddress[]; total: number; page: number; totalPages: number }> {
    const response = await api.get('/admin/ipam/addresses', { params })
    return response.data
  },

  async getIPAddress(id: number): Promise<IPAddress> {
    const response = await api.get(`/admin/ipam/addresses/${id}`)
    return response.data
  },

  async assignIPToVM(ipId: number, vmId: number, userId: number): Promise<IPAddress> {
    const response = await api.post(`/admin/ipam/addresses/${ipId}/assign`, { vm_id: vmId, user_id: userId })
    return response.data
  },

  async releaseIP(id: number): Promise<IPAddress> {
    const response = await api.post(`/admin/ipam/addresses/${id}/release`)
    return response.data
  },

  async setPTRRecord(id: number, ptrRecord: string): Promise<IPAddress> {
    const response = await api.patch(`/admin/ipam/addresses/${id}/ptr`, { ptr_record: ptrRecord })
    return response.data
  },

  // Stats
  async getStats(): Promise<IPAMStats> {
    const response = await api.get('/admin/ipam/stats')
    return response.data
  },

  // POPs (for dropdown)
  async getPOPs(): Promise<POP[]> {
    const response = await api.get('/admin/pops', { params: { include_inactive: false } })
    return response.data.data || response.data || []
  },


  async getVMs(params?: { user_id?: number; status?: string }): Promise<any[]> {
    try {
      const response = await api.get('/admin/vms', { 
        params: { 
          page: 1,
          limit: 100,
          status: params?.status, // This should be comma-separated like "running,stopped"
          user_id: params?.user_id,
        } 
      })
      
      if (response.data?.data) {
        return response.data.data
      }
      if (Array.isArray(response.data)) {
        return response.data
      }
      return []
    } catch (error) {
      console.error('Failed to fetch VMs:', error)
      return []
    }
  },
  // Get Users for assignment dropdown
  async getUsers(params?: { search?: string }): Promise<User[]> {
    try {
      const response = await api.get('/admin/users', { 
        params: { 
          limit: 100,
          search: params?.search,
        } 
      })
      return response.data.data || response.data || []
    } catch (error) {
      console.error('Failed to fetch users:', error)
      return []
    }
  },
}