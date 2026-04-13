import api from './api';

export interface ColocationPowerFeed {
  id?: string;
  name: string;
  voltage: number;
  amperage: number;
  phase: string;
  power_kw: number;
  status: 'active' | 'inactive' | 'maintenance' | 'failed';
}

export interface Colocation {
  id: string;
  user_id?: number;
  assigned_to?: {
    id: number;
    full_name: string;
    email: string;
    company?: string;
  };
  datacenter: string;
  rack_id: string;
  rack_name?: string;
  unit_position: string;
  unit_size: number;
  cabinet_type: 'standard' | 'high_density' | 'secure';
  power_capacity_kw: number;
  power_used_kw: number;
  network_port: string;
  bandwidth_mbps: number;
  bandwidth_used_mbps: number;
  cross_connects: number;
  ipv4_allocation?: string;
  ipv6_allocation?: string;
  asn?: number;
  access_level: 'full' | 'restricted' | 'supervised';
  biometric_access: boolean;
  security_camera: boolean;
  power_feeds: ColocationPowerFeed[];
  cooling_type?: string;
  temperature_c?: number;
  humidity_percent?: number;
  monthly_price: number;
  setup_fee: number;
  power_cost_per_kwh: number;
  cross_connect_fee: number;
  status: 'pending' | 'active' | 'suspended' | 'terminated' | 'maintenance';
  contract_start?: string;
  contract_end?: string;
  auto_renew: boolean;
  sla_uptime_guarantee: number;
  sla_credit_percent: number;
  notes?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  last_inspection?: string;
  bgp_config?: any;
}

export interface Rack {
  id: string;
  name: string;
  datacenter: string;
  location: string;
  total_units: number;
  used_units: number;
  available_units: number;
  power_capacity_kw: number;
  power_used_kw: number;
  status: 'operational' | 'maintenance' | 'offline' | 'full';
}

// Get all colocations
export const getColocations = async (params?: {
  skip?: number;
  take?: number;
  status?: string;
  datacenter?: string;
  userId?: number;
  search?: string;
}): Promise<{ colocations: Colocation[]; total: number }> => {
  const response = await api.get('/colocations', { params });
  return response.data;
};

// Get single colocation
export const getColocation = async (id: string): Promise<Colocation> => {
  const response = await api.get(`/colocations/${id}`);
  return response.data;
};

// Create colocation
export const createColocation = async (data: Partial<Colocation>): Promise<Colocation> => {
  const response = await api.post('/colocations', data);
  return response.data;
};

// Update colocation
export const updateColocation = async (id: string, data: Partial<Colocation>): Promise<Colocation> => {
  const response = await api.patch(`/colocations/${id}`, data);
  return response.data;
};

// Delete colocation
export const deleteColocation = async (id: string): Promise<{ message: string }> => {
  const response = await api.delete(`/colocations/${id}`);
  return response.data;
};

// Assign colocation to user
export const assignColocation = async (id: string, userId: number, data?: any): Promise<Colocation> => {
  const response = await api.post(`/colocations/${id}/assign`, { user_id: userId, ...data });
  return response.data;
};

// Unassign colocation
export const unassignColocation = async (id: string): Promise<Colocation> => {
  const response = await api.post(`/colocations/${id}/unassign`);
  return response.data;
};

// Update status
export const updateColocationStatus = async (id: string, status: string): Promise<Colocation> => {
  const response = await api.patch(`/colocations/${id}/status`, { status });
  return response.data;
};

// Get available racks
export const getAvailableRacks = async (datacenter?: string): Promise<Rack[]> => {
  const response = await api.get('/colocations/racks', { params: { datacenter } });
  return response.data;
};

// Get rack units availability
export const getRackAvailability = async (rackId: string): Promise<{ available_units: number[]; used_units: number[] }> => {
  const response = await api.get(`/colocations/racks/${rackId}/availability`);
  return response.data;
};

// Get statistics
export const getColocationStatistics = async (): Promise<any> => {
  const response = await api.get('/colocations/statistics');
  return response.data;
};