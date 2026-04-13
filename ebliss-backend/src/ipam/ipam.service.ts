// src/ipam/ipam.service.ts
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProxmoxService } from '../proxmox/proxmox.service';
import { IPStatus } from '@prisma/client';

@Injectable()
export class IPAMService {
  private readonly logger = new Logger(IPAMService.name);

  constructor(
    private prisma: PrismaService,
    private proxmoxService: ProxmoxService,
  ) {}

  // ============ IP POOL METHODS ============

  async getAllIPPools(params: {
    page?: number;
    limit?: number;
    pop_id?: number;
    status?: string;
    search?: string;
  }) {
    const { page = 1, limit = 20, pop_id, status, search } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (pop_id) where.pop_id = pop_id;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { subnet: { contains: search } },
      ];
    }

    const [pools, total] = await Promise.all([
      this.prisma.iPPool.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          pop: { select: { id: true, name: true, city: true, country: true } },
        },
      }),
      this.prisma.iPPool.count({ where }),
    ]);

    return {
      data: pools,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getIPPoolById(id: number) {
    const pool = await this.prisma.iPPool.findUnique({
      where: { id },
      include: {
        pop: true,
        ip_addresses: {
          take: 100,
          orderBy: { address: 'asc' },
        },
      },
    });

    if (!pool) {
      throw new NotFoundException('IP Pool not found');
    }

    return pool;
  }

  async createIPPool(data: {
    pop_id: number;
    name: string;
    subnet: string;
    gateway: string;
    start_ip: string;
    end_ip: string;
  }) {
    // Check if subnet already exists in this POP
    const existing = await this.prisma.iPPool.findFirst({
      where: {
        pop_id: data.pop_id,
        subnet: data.subnet,
      },
    });

    if (existing) {
      throw new BadRequestException('Subnet already exists in this POP');
    }

    const totalIPs = this.calculateTotalIPs(data.start_ip, data.end_ip);

    const pool = await this.prisma.iPPool.create({
      data: {
        pop_id: data.pop_id,
        name: data.name,
        subnet: data.subnet,
        gateway: data.gateway,
        start_ip: data.start_ip,
        end_ip: data.end_ip,
        total_ips: totalIPs,
        used_ips: 0,
        status: 'active',
      },
    });

    // Generate IP addresses in the pool
    await this.generateIPAddresses(pool);

    this.logger.log(`IP Pool created: ${pool.name} (${pool.subnet})`);

    return pool;
  }

  async updateIPPool(id: number, data: any) {
    const pool = await this.prisma.iPPool.update({
      where: { id },
      data: {
        name: data.name,
        gateway: data.gateway,
        status: data.status,
      },
    });

    return pool;
  }

  async deleteIPPool(id: number) {
    // Check if pool has assigned IPs
    const assignedCount = await this.prisma.iPAddress.count({
      where: { pool_id: id, status: 'assigned' },
    });

    if (assignedCount > 0) {
      throw new BadRequestException('Cannot delete pool with assigned IPs');
    }

    // Delete all IP addresses in the pool
    await this.prisma.iPAddress.deleteMany({
      where: { pool_id: id },
    });

    await this.prisma.iPPool.delete({
      where: { id },
    });

    return { success: true, message: 'IP Pool deleted successfully' };
  }

  async syncIPPool(id: number) {
    const pool = await this.prisma.iPPool.findUnique({
      where: { id },
      include: { pop: true },
    });

    if (!pool) {
      throw new NotFoundException('IP Pool not found');
    }

    // Scan subnet for used IPs
    const nodes = await this.prisma.node.findMany({
      where: { pop_id: pool.pop_id, status: 'active' },
    });

    const usedIPs: string[] = [];
    
    for (const node of nodes) {
      try {
        const ips = await this.proxmoxService.scanSubnetForUsedIPs(node.hostname, pool.subnet);
        usedIPs.push(...ips);
      } catch (error) {
        this.logger.error(`Failed to scan node ${node.hostname}:`, error);
      }
    }

    // Update IP statuses
    for (const ip of usedIPs) {
      await this.prisma.iPAddress.updateMany({
        where: {
          pool_id: id,
          address: ip,
          status: 'available',
        },
        data: { status: 'assigned' },
      });
    }

    // Update pool used count
    const usedCount = await this.prisma.iPAddress.count({
      where: { pool_id: id, status: 'assigned' },
    });

    await this.prisma.iPPool.update({
      where: { id },
      data: {
        used_ips: usedCount,
        status: usedCount >= pool.total_ips ? 'full' : 'active',
      },
    });

    return { success: true, message: `Synced ${usedIPs.length} IPs` };
  }

  // ============ IP ADDRESS METHODS ============
// src/ipam/ipam.service.ts

async getAllIPAddresses(params: {
  page?: number;
  limit?: number;
  pool_id?: number;
  pop_id?: number;
  status?: string;
  search?: string;
}) {
  const { page = 1, limit = 50, pool_id, pop_id, status, search } = params;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (pool_id) where.pool_id = pool_id;
  if (pop_id) where.pop_id = pop_id;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { address: { contains: search } },
      { ptr_record: { contains: search, mode: 'insensitive' } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
      { vm: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  // Fetch all matching addresses first (without pagination for proper sorting)
  const allAddresses = await this.prisma.iPAddress.findMany({
    where,
    include: {
      pool: { select: { id: true, name: true, subnet: true } },
      pop: { select: { id: true, name: true } },
      user: { select: { id: true, email: true, full_name: true } },
      vm: { select: { id: true, name: true, hostname: true } },
    },
  });

  // Sort IP addresses numerically
  const sortedAddresses = allAddresses.sort((a, b) => {
    return this.ipToNumber(a.address) - this.ipToNumber(b.address);
  });

  // Apply pagination after sorting
  const paginatedAddresses = sortedAddresses.slice(skip, skip + limit);
  const total = sortedAddresses.length;

  return {
    data: paginatedAddresses,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// Helper method to convert IP to number for proper sorting
private ipToNumber(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
}

  async getIPAddressById(id: number) {
    const ip = await this.prisma.iPAddress.findUnique({
      where: { id },
      include: {
        pool: true,
        pop: true,
        user: true,
        vm: true,
      },
    });

    if (!ip) {
      throw new NotFoundException('IP Address not found');
    }

    return ip;
  }

  async assignIPToVM(ipId: number, vmId: number, userId: number) {
    const ip = await this.prisma.iPAddress.findUnique({
      where: { id: ipId },
    });

    if (!ip) {
      throw new NotFoundException('IP Address not found');
    }

    if (ip.status !== 'available') {
      throw new BadRequestException('IP Address is not available');
    }

    const vm = await this.prisma.vM.findUnique({
      where: { id: vmId },
      include: { node: true },
    });

    if (!vm) {
      throw new NotFoundException('VM not found');
    }

    // Assign IP in Proxmox
    await this.proxmoxService.assignIPToVM(
      vm.node.hostname,
      vm.proxmox_vmid,
      ip.address,
      ip.gateway || undefined,
    );

    // Update IP in database
    const updatedIP = await this.prisma.iPAddress.update({
      where: { id: ipId },
      data: {
        status: 'assigned',
        user_id: userId,
        vm_id: vmId,
        assigned_at: new Date(),
      },
    });

    // Update pool used count
    if (ip.pool_id) {
      await this.updatePoolUsedCount(ip.pool_id);
    }

    this.logger.log(`IP ${ip.address} assigned to VM ${vm.name}`);

    return updatedIP;
  }

  async releaseIP(id: number) {
    const ip = await this.prisma.iPAddress.findUnique({
      where: { id },
      include: { vm: { include: { node: true } } },
    });

    if (!ip) {
      throw new NotFoundException('IP Address not found');
    }

    if (ip.status !== 'assigned') {
      throw new BadRequestException('IP Address is not assigned');
    }

    // Release IP in Proxmox if VM exists
    if (ip.vm) {
      try {
        await this.proxmoxService.releaseIPFromVM(
          ip.vm.node.hostname,
          ip.vm.proxmox_vmid,
        );
      } catch (error) {
        this.logger.error(`Failed to release IP from VM:`, error);
      }
    }

    // Update IP in database
    const updatedIP = await this.prisma.iPAddress.update({
      where: { id },
      data: {
        status: 'available',
        user_id: null,
        vm_id: null,
        released_at: new Date(),
      },
    });

    // Update pool used count
    if (ip.pool_id) {
      await this.updatePoolUsedCount(ip.pool_id);
    }

    this.logger.log(`IP ${ip.address} released`);

    return updatedIP;
  }

  async setPTRRecord(id: number, ptrRecord: string) {
    const ip = await this.prisma.iPAddress.findUnique({
      where: { id },
      include: { pop: true },
    });

    if (!ip) {
      throw new NotFoundException('IP Address not found');
    }

    // Set PTR in Proxmox/DNS
    const nodes = await this.prisma.node.findMany({
      where: { pop_id: ip.pop_id, status: 'active' },
    });

    if (nodes.length > 0) {
      await this.proxmoxService.setPTRRecord(nodes[0].hostname, ip.address, ptrRecord);
    }

    const updatedIP = await this.prisma.iPAddress.update({
      where: { id },
      data: { ptr_record: ptrRecord },
    });

    return updatedIP;
  }

  async getIPAMStats() {
    const [totalPools, totalIPs, usedIPs, availableIPs, poolsByStatus] = await Promise.all([
      this.prisma.iPPool.count(),
      this.prisma.iPPool.aggregate({ _sum: { total_ips: true } }),
      this.prisma.iPAddress.count({ where: { status: 'assigned' } }),
      this.prisma.iPAddress.count({ where: { status: 'available' } }),
      this.prisma.iPPool.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    return {
      total_pools: totalPools,
      total_ips: totalIPs._sum.total_ips || 0,
      used_ips: usedIPs,
      available_ips: availableIPs,
      reserved_ips: await this.prisma.iPAddress.count({ where: { status: 'reserved' } }),
      pools_by_status: poolsByStatus.map(p => ({
        status: p.status,
        count: p._count,
      })),
    };
  }

  // ============ HELPER METHODS ============

  private calculateTotalIPs(startIP: string, endIP: string): number {
    const ipToNumber = (ip: string): number => {
      return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);
    };
    
    const start = ipToNumber(startIP);
    const end = ipToNumber(endIP);
    return end - start + 1;
  }

  private async generateIPAddresses(pool: any) {
    const startIP = pool.start_ip;
    const endIP = pool.end_ip;
    
    const ipToNumber = (ip: string): number => {
      return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);
    };
    
    const numberToIP = (num: number): string => {
      return [
        (num >>> 24) & 255,
        (num >>> 16) & 255,
        (num >>> 8) & 255,
        num & 255,
      ].join('.');
    };
    
    const start = ipToNumber(startIP);
    const end = ipToNumber(endIP);
    
    const ipAddresses: any[] = [];
    
    for (let i = start; i <= end; i++) {
      ipAddresses.push({
        pool_id: pool.id,
        pop_id: pool.pop_id,
        address: numberToIP(i),
        subnet: pool.subnet,
        gateway: pool.gateway,
        status: 'available',
      });
    }
    
    // Batch insert
    await this.prisma.iPAddress.createMany({
      data: ipAddresses,
      skipDuplicates: true,
    });
    
    this.logger.log(`Generated ${ipAddresses.length} IP addresses for pool ${pool.name}`);
  }

  private async updatePoolUsedCount(poolId: number) {
    const usedCount = await this.prisma.iPAddress.count({
      where: { pool_id: poolId, status: 'assigned' },
    });

    const pool = await this.prisma.iPPool.findUnique({
      where: { id: poolId },
    });

    if (pool) {
      await this.prisma.iPPool.update({
        where: { id: poolId },
        data: {
          used_ips: usedCount,
          status: usedCount >= pool.total_ips ? 'full' : 'active',
        },
      });
    }
  }



// src/ipam/ipam.service.ts - Add this method

/**
 * Get all IPs from all nodes in a POP
 */
async getPOPIPAddresses(popId: number): Promise<any[]> {
  const nodes = await this.prisma.node.findMany({
    where: { pop_id: popId, status: 'active' },
  });
  
  const allIPs: any[] = [];
  
  for (const node of nodes) {
    try {
      const ips = await this.proxmoxService.getNodeIPAddresses(node.hostname);
      allIPs.push(...ips.map(ip => ({
        ...ip,
        node_id: node.id,
        node_hostname: node.hostname,
      })));
    } catch (error) {
      this.logger.error(`Failed to get IPs from node ${node.hostname}:`, error);
    }
  }
  
  return allIPs;
}

/**
 * Get IP usage statistics for a POP
 */
async getPOPIPUsageStats(popId: number): Promise<any> {
  const pools = await this.prisma.iPPool.findMany({
    where: { pop_id: popId },
    include: {
      _count: {
        select: {
          ip_addresses: {
            where: { status: 'assigned' },
          },
        },
      },
    },
  });
  
  const stats = {
    total_pools: pools.length,
    total_ips: pools.reduce((sum, p) => sum + p.total_ips, 0),
    used_ips: pools.reduce((sum, p) => sum + p.used_ips, 0),
    available_ips: pools.reduce((sum, p) => sum + (p.total_ips - p.used_ips), 0),
    pools: pools.map(p => ({
      id: p.id,
      name: p.name,
      subnet: p.subnet,
      total: p.total_ips,
      used: p.used_ips,
      available: p.total_ips - p.used_ips,
      status: p.status,
    })),
  };
  
  return stats;
}

















}