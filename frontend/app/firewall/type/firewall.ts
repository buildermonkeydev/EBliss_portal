// app/types/firewall.ts
export interface FirewallRule {
  id: number;
  direction: "IN" | "OUT";
  ipType?: "IPv4" | "IPv6";
  protocol: string;
  port: number | string; // Allow both number and string
  source: string;
  action: "ALLOW" | "DENY";
  comment?: string;
  enabled?: boolean;
}

export interface FirewallGroup {
  id: string;
  name: string;
  description: string;
  rules: FirewallRule[];
  assignedVMs?: string[];
  defaultPolicy?: "accept" | "drop";
}

export interface VM {
  vmid: number;
  name: string;
  status: string;
  cpu: number;
  maxmem: number;
  maxdisk: number;
  uptime: number;
  type: "qemu" | "lxc";
}