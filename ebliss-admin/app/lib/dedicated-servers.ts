import api from './api';

// lib/dedicated-servers.ts
export interface DedicatedServer {
  id: string;
  name: string;
  hostname: string;
  datacenter: string;
  pop_id?: number; // Add this
  rack_id?: string;
  rack_position?: string;
  cpu_model: string;
  cpu_cores: number;
  cpu_threads: number;
  cpu_speed: string;
  ram_gb: number;
  ram_type: string;
  ram_speed?: string;
  storage: Storage[];
  network_port: string;
  bandwidth_tb: number;
  ipv4_count: number;
  ipv6_count: number;
  status: 'pending' | 'provisioning' | 'online' | 'offline' | 'maintenance' | 'suspended' | 'terminated' | 'error';
  os?: string;
  os_version?: string;
  root_password?: string; // Add this
  monthly_price: number;
  setup_fee: number;
  ip_addresses?: IPAddress[];
  assigned_to?: {
    id: number;
    full_name: string;
    email: string;
    company?: string;
  };
  created_at: string;
  updated_at: string;
  next_billing_date?: string;
  uptime_percentage?: number;
  // Add all missing fields
  ddos_protection?: boolean;
  backup_enabled?: boolean;
  monitoring_enabled?: boolean;
  ipmi_ip?: string;
  ipmi_user?: string;
  ipmi_password?: string;
  kvm_enabled?: boolean;
  kvm_type?: string;
  notes?: string;
  tags?: string[];
}
export interface Storage {
  id: string;
  type: 'nvme' | 'ssd' | 'hdd';
  size_gb: number;
  raid_level?: string;
  drive_count: number;
  is_primary: boolean;
}

export interface IPAddress {
  id: string;
  address: string;
  subnet: string;
  gateway?: string;
  status: string;
}

export interface BandwidthStats {
  server: { id: string; name: string };
  period_days: number;
  daily_stats: BandwidthDaily[];
  totals: { in_gb: number; out_gb: number; total_gb: number };
  limit_tb: number;
  usage_percent: number;
}

export interface BandwidthDaily {
  date: string;
  in_gb: number;
  out_gb: number;
  total_gb: number;
}

export interface ServerStatistics {
  total_servers: number;
  by_status: Record<string, number>;
  by_datacenter: Record<string, number>;
  monthly_revenue: number;
}

export interface ServerLog {
  id: string;
  log_type: string;
  severity: string;
  message: string;
  details?: any;
  created_at: string;
}

// Get all servers
export const getServers = async (params?: {
  skip?: number;
  take?: number;
  status?: string;
  datacenter?: string;
  userId?: number;
  search?: string;
}): Promise<{ servers: DedicatedServer[]; total: number }> => {
  const response = await api.get('/dedicated-servers', { params });
  return response.data;
};

// Get server statistics
export const getServerStatistics = async (): Promise<ServerStatistics> => {
  const response = await api.get('/dedicated-servers/statistics');
  return response.data;
};

// Get single server
export const getServer = async (id: string): Promise<DedicatedServer> => {
  const response = await api.get(`/dedicated-servers/${id}`);
  return response.data;
};

// Create server
export const createServer = async (data: Partial<DedicatedServer>): Promise<DedicatedServer> => {
  const response = await api.post('/dedicated-servers', data);
  return response.data;
};

// Update server
export const updateServer = async (id: string, data: Partial<DedicatedServer>): Promise<DedicatedServer> => {
  const response = await api.patch(`/dedicated-servers/${id}`, data);
  return response.data;
};

// Delete server
export const deleteServer = async (id: string): Promise<{ message: string }> => {
  const response = await api.delete(`/dedicated-servers/${id}`);
  return response.data;
};

// Assign server to user
export const assignServer = async (id: string, userId: number, data?: any): Promise<DedicatedServer> => {
  const response = await api.post(`/dedicated-servers/${id}/assign`, { user_id: userId, ...data });
  return response.data;
};

// Unassign server
export const unassignServer = async (id: string): Promise<DedicatedServer> => {
  const response = await api.post(`/dedicated-servers/${id}/unassign`);
  return response.data;
};

// Update server status
export const updateServerStatus = async (id: string, status: string, reason?: string): Promise<DedicatedServer> => {
  const response = await api.patch(`/dedicated-servers/${id}/status`, { status, reason });
  return response.data;
};

// Reboot server
export const rebootServer = async (id: string): Promise<{ message: string }> => {
  const response = await api.post(`/dedicated-servers/${id}/reboot`);
  return response.data;
};

// Get bandwidth stats
export const getBandwidthStats = async (id: string, days?: number): Promise<BandwidthStats> => {
  const response = await api.get(`/dedicated-servers/${id}/bandwidth`, { params: { days } });
  return response.data;
};

// Get server logs
export const getServerLogs = async (id: string, limit?: number, type?: string): Promise<ServerLog[]> => {
  const response = await api.get(`/dedicated-servers/${id}/logs`, { params: { limit, type } });
  return response.data;
};

// Get available racks
export const getAvailableRacks = async (datacenter?: string): Promise<any[]> => {
  const response = await api.get('/dedicated-servers/racks', { params: { datacenter } });
  return response.data;
};