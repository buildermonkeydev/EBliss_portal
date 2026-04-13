// lib/api/vm-api.ts
import { api } from './api'
import { VM, Node, Plan, CreateVMDto, VMStats, NodeConfigDto, NodeStats, Pop } from '../components/vm/types'

export const vmApi = {
  // VM Endpoints
  async getAllVMs(params?: { page?: number; limit?: number; search?: string; status?: string; node_id?: number }): Promise<{ data: VM[]; total: number }> {
    const response = await api.get('/admin/vms', { params })
    return response.data
  },

  async getVMById(id: number): Promise<VM> {
    const response = await api.get(`/admin/vms/${id}`)
    return response.data
  },

  async createVM(data: CreateVMDto): Promise<VM> {
    const response = await api.post('/admin/vms', data)
    return response.data
  },

  async updateVM(id: number, data: Partial<VM>): Promise<VM> {
    const response = await api.patch(`/admin/vms/${id}`, data)
    return response.data
  },

  async deleteVM(id: number): Promise<void> {
    await api.delete(`/admin/vms/${id}`)
  },

  async startVM(id: number): Promise<void> {
    await api.post(`/admin/vms/${id}/start`)
  },

  async stopVM(id: number): Promise<void> {
    await api.post(`/admin/vms/${id}/stop`)
  },

  async restartVM(id: number): Promise<void> {
    await api.post(`/admin/vms/${id}/restart`)
  },

  async suspendVM(id: number, reason?: string): Promise<void> {
    await api.post(`/admin/vms/${id}/suspend`, { reason })
  },

  async resumeVM(id: number): Promise<void> {
    await api.post(`/admin/vms/${id}/resume`)
  },

  async resizeVM(id: number, data: { vcpu?: number; ram_gb?: number; ssd_gb?: number }): Promise<VM> {
    const response = await api.post(`/admin/vms/${id}/resize`, data)
    return response.data
  },

  async migrateVM(id: number, target_node_id: number): Promise<void> {
    await api.post(`/admin/vms/${id}/migrate`, { target_node_id })
  },

  async getVMStats(): Promise<VMStats> {
    const response = await api.get('/admin/vms/stats')
    return response.data
  },

  async getVMConsole(id: number): Promise<{ url: string; token: string }> {
    const response = await api.get(`/admin/vms/${id}/console`)
    return response.data
  },

  // Node Endpoints
  async getAllNodes(): Promise<Node[]> {
    const response = await api.get('/admin/nodes')
    return response.data
  },

  async getNodeById(id: number): Promise<Node> {
    const response = await api.get(`/admin/nodes/${id}`)
    return response.data
  },

  async getNodeStats(id: number): Promise<NodeStats> {
    const response = await api.get(`/admin/nodes/${id}/stats`)
    return response.data
  },

  async createNode(data: NodeConfigDto): Promise<Node> {
    const response = await api.post('/admin/nodes', data)
    return response.data
  },

  async updateNode(id: number, data: Partial<NodeConfigDto>): Promise<Node> {
    const response = await api.patch(`/admin/nodes/${id}`, data)
    return response.data
  },

  async deleteNode(id: number): Promise<void> {
    await api.delete(`/admin/nodes/${id}`)
  },

  async syncNode(id: number): Promise<void> {
    await api.post(`/admin/nodes/${id}/sync`)
  },

  async setNodeMaintenance(id: number, maintenance: boolean): Promise<Node> {
    const response = await api.post(`/admin/nodes/${id}/maintenance`, { maintenance })
    return response.data
  },

  // Plan Endpoints
  async getAllPlans(): Promise<Plan[]> {
    const response = await api.get('/admin/plans')
    return response.data
  },

  async createPlan(data: Partial<Plan>): Promise<Plan> {
    const response = await api.post('/admin/plans', data)
    return response.data
  },

  async updatePlan(id: number, data: Partial<Plan>): Promise<Plan> {
    const response = await api.patch(`/admin/plans/${id}`, data)
    return response.data
  },

  async deletePlan(id: number): Promise<void> {
    await api.delete(`/admin/plans/${id}`)
  },

  // POP Endpoints
  async getAllPOPs(): Promise<Pop[]> {
    const response = await api.get('/admin/pops')
    return response.data
  },



  // lib/api/vm-api.ts - Add these functions

// POP CRUD
async createPOP(data: { name: string; city: string; country: string; active?: boolean }): Promise<Pop> {
  const response = await api.post('/admin/pops', data)
  return response.data
},

async updatePOP(id: number, data: Partial<Pop>): Promise<Pop> {
  const response = await api.patch(`/admin/pops/${id}`, data)
  return response.data
},

async deletePOP(id: number): Promise<void> {
  await api.delete(`/admin/pops/${id}`)
},

async togglePOPStatus(id: number): Promise<Pop> {
  const response = await api.patch(`/admin/pops/${id}/toggle`)
  return response.data
}
}