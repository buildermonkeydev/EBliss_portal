// lib/proxmox.ts
import { NodeSSH } from 'node-ssh';

interface ProxmoxConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  realm?: string;
}

class ProxmoxClient {
  private config: ProxmoxConfig;
  private baseUrl: string;
  private ticket: string | null = null;
  private csrfToken: string | null = null;

  constructor(config: ProxmoxConfig) {
    this.config = config;
    this.baseUrl = `https://${config.host}:${config.port}/api2/json`;
  }

  private async authenticate() {
    if (this.ticket) return;

    const response = await fetch(`${this.baseUrl}/access/ticket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        username: `${this.config.username}@${this.config.realm || 'pam'}`,
        password: this.config.password,
      }),
    });

    const data = await response.json();
    
    if (data.data) {
      this.ticket = data.data.ticket;
      this.csrfToken = data.data.CSRFPreventionToken;
    } else {
      throw new Error('Failed to authenticate with Proxmox');
    }
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    await this.authenticate();

    const headers = {
      'Cookie': `PVEAuthCookie=${this.ticket}`,
      'CSRFPreventionToken': this.csrfToken || '',
      ...options.headers,
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();
    
    if (data.errors) {
      throw new Error(data.errors.join(', '));
    }

    return data.data;
  }

  async getNodes() {
    return this.request('/nodes');
  }

  async getStorage(node: string) {
    return this.request(`/nodes/${node}/storage`);
  }

  async getTemplates(node: string, storage: string) {
    return this.request(`/nodes/${node}/storage/${storage}/content`);
  }

  async getVMStatus(node: string, vmid: number) {
    return this.request(`/nodes/${node}/qemu/${vmid}/status/current`);
  }

  async createVM(node: string, params: any) {
    return this.request(`/nodes/${node}/qemu`, {
      method: 'POST',
      body: JSON.stringify(params),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async getFirewallGroups() {
    return this.request('/cluster/firewall/groups');
  }

  async getFirewallRules(group: string) {
    return this.request(`/cluster/firewall/groups/${group}`);
  }
}

export const proxmox = new ProxmoxClient({
  host: process.env.PROXMOX_HOST || 'localhost',
  port: parseInt(process.env.PROXMOX_PORT || '8006'),
  username: process.env.PROXMOX_USERNAME || 'root',
  password: process.env.PROXMOX_PASSWORD || '',
  realm: process.env.PROXMOX_REALM || 'pam',
});