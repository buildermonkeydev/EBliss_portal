import api from './api';

export interface Pop {
  id: number;
  name: string;
  city: string;
  country: string;
  active: boolean;
  created_at: string;
}

export interface PopWithNodes extends Pop {
  nodes: Node[];
}

export interface Node {
  id: number;
  hostname: string;
  api_url: string;
  max_vcpu: number;
  max_ram_gb: number;
  max_storage_gb: number;
  status: string;
  ip_address?: string;
}

// Get all POPs
export const getAllPOPs = async (): Promise<Pop[]> => {
    const response = await api.get('/admin/pops')
  return response.data;
};

// Get POP with nodes
export const getPOPWithNodes = async (id: number): Promise<PopWithNodes> => {
  const response = await api.get(`/pops/${id}`);
  return response.data;
};

// Get active POPs only
export const getActivePOPs = async (): Promise<Pop[]> => {
  const response = await api.get('/pops/active');
  return response.data;
};

// Admin endpoints
export const adminGetAllPOPs = async (): Promise<Pop[]> => {
  const response = await api.get('/admin/pops');
  return response.data;
};

export const adminCreatePOP = async (data: Partial<Pop>): Promise<Pop> => {
  const response = await api.post('/admin/pops', data);
  return response.data;
};

export const adminUpdatePOP = async (id: number, data: Partial<Pop>): Promise<Pop> => {
  const response = await api.patch(`/admin/pops/${id}`, data);
  return response.data;
};

export const adminDeletePOP = async (id: number): Promise<{ message: string }> => {
  const response = await api.delete(`/admin/pops/${id}`);
  return response.data;
};