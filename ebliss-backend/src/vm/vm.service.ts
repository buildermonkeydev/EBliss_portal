import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProxmoxService } from '../proxmox/proxmox.service';
import { VMStatus, PlanType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Define BillingData interface
export interface BillingData {
  vmId: number;
  vmName: string;
  hourlyRate: number;
  monthlyRate: number;
  currentCost: number;
  estimatedMonthlyCost: number;
  totalCostToDate: number;
  billingPeriod: {
    start: Date;
    end: Date;
  };
  usage: {
    hours: number;
    days: number;
    cpuUsage: number;
    ramUsage: number;
    diskUsage: number;
    bandwidthUsed: number;
  };
  invoiceItems: Array<{
    date: Date;
    amount: number;
    description: string;
    type: 'hourly' | 'monthly' | 'one-time';
  }>;
}

@Injectable()
export class VMService {
  private readonly logger = new Logger(VMService.name);

  constructor(
    private prisma: PrismaService,
    private proxmoxService: ProxmoxService,
  ) {}

 async createVM(
  userId: number,
  data: {
    planId: number;
    nodeId?: number;
    name: string;
    hostname: string;
    sshKeyIds?: number[];
    firewallGroupId?: number;
    cloudInitData?: any;
  },
) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
  });
  
  console.log("User details", user);
  
  if (!user) {
    throw new NotFoundException('User not found');
  }

  // FIX: Check if planId is provided and valid
  if (!data.planId) {
    throw new BadRequestException('Plan ID is required');
  }

  const plan = await this.prisma.plan.findUnique({
    where: { id: data.planId },
  });

  if (!plan) {
    throw new NotFoundException(`Plan with ID ${data.planId} not found`);
  }

  // Check if plan is active
  if (!plan.is_active) {
    throw new BadRequestException('Selected plan is not active');
  }

  if (plan.type === 'hourly') {
    const hourlyPrice = plan.hourly_price?.toNumber() || 0;
    const monthlyCost = hourlyPrice * 24 * 30;
    const currentBalance = user.wallet_balance.toNumber();
    
    if (currentBalance < monthlyCost) {
      throw new BadRequestException(
        `Minimum balance of $${monthlyCost} required for VM deployment`,
      );
    }
  }

  let nodeId = data.nodeId;
  if (!nodeId) {
    const availableNode = await this.getBestAvailableNode(data.planId);
    if (!availableNode) {
      throw new BadRequestException('No available nodes for this plan');
    }
    nodeId = availableNode.id;
  }

  if (!nodeId) {
    throw new BadRequestException('Node ID is required');
  }

  const node = await this.prisma.node.findUnique({
    where: { id: nodeId },
    include: { pop: true },
  });

  if (!node) {
    throw new NotFoundException('Node not found');
  }

  let sshKeys: any[] = [];
  if (data.sshKeyIds?.length) {
    sshKeys = await this.prisma.sSHKey.findMany({
      where: {
        id: { in: data.sshKeyIds },
        user_id: userId,
      },
    });
  }

  const osTemplate = await this.getOsTemplate(plan.type);

  // Clean SSH keys - remove comments
  const sshKeysString = sshKeys.map(k => {
    // Extract only type and key, remove comment
    const parts = k.public_key.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[1]}`;
    }
    return k.public_key;
  }).join('\n');

  const proxmoxResult = await this.proxmoxService.createVM(node.hostname, {
    name: data.name,
    cores: plan.vcpu,
    memory: plan.ram_gb * 1024,
    disk: plan.ssd_gb,
    ostemplate: osTemplate.proxmox_template_id,
    sshkeys: sshKeysString,
    hostname: data.hostname,
    ...data.cloudInitData,
  });

  const vm = await this.prisma.vM.create({
    data: {
      user_id: userId,
      node_id: nodeId,
      plan_id: plan.id,
      proxmox_vmid: proxmoxResult.vmid,
      name: data.name,
      hostname: data.hostname,
      vcpu: plan.vcpu,
      ram_gb: plan.ram_gb,
      ssd_gb: plan.ssd_gb,
      plan_type: plan.type,
      status: 'creating',
      hourly_rate: plan.hourly_price || 0,
      monthly_rate: plan.monthly_price || null,
      firewall_group_id: data.firewallGroupId,
      ssh_key_ids: data.sshKeyIds || [],
      cloud_init_data: data.cloudInitData,
    },
  });

  return vm;
}

  private async getBestAvailableNode(planId: number): Promise<any> {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return null;
    }

    const nodes = await this.prisma.node.findMany({
      where: { status: 'active' },
      include: {
        vms: true,
        pop: true,
      },
    });

    const availableNodes = nodes.filter(node => {
      const usedVcpu = node.vms.reduce((sum, vm) => sum + vm.vcpu, 0);
      const usedRam = node.vms.reduce((sum, vm) => sum + vm.ram_gb, 0);
      
      return (
        usedVcpu + plan.vcpu <= node.max_vcpu &&
        usedRam + plan.ram_gb <= node.max_ram_gb
      );
    });

    if (availableNodes.length === 0) {
      return null;
    }

    return availableNodes.sort((a, b) => {
      const loadA = (a.vms.reduce((sum, vm) => sum + vm.vcpu, 0) / a.max_vcpu) +
                    (a.vms.reduce((sum, vm) => sum + vm.ram_gb, 0) / a.max_ram_gb);
      const loadB = (b.vms.reduce((sum, vm) => sum + vm.vcpu, 0) / b.max_vcpu) +
                    (b.vms.reduce((sum, vm) => sum + vm.ram_gb, 0) / b.max_ram_gb);
      return loadA - loadB;
    })[0];
  }

  private async getOsTemplate(planType: PlanType): Promise<any> {
    const template = await this.prisma.osTemplate.findFirst({
      where: { is_active: true },
    });

    if (!template) {
      throw new BadRequestException('No OS templates available');
    }

    return template;
  }

  async getRunningCost(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        vms: {
          where: { status: 'running' },
          select: {
            hourly_rate: true,
            status: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const total = user.vms.reduce((sum, vm) => {
      return sum + (vm.hourly_rate as any).toNumber();
    }, 0);

    const monthlyEstimate = total * 24 * 30;

    return {
      total: total,
      monthly_estimate: monthlyEstimate,
      currency: 'INR',
      running_vms_count: user.vms.length,
    };
  }

  async getVM(userId: number, vmId: number) {
    let vm = await this.prisma.vM.findFirst({
      where: {
        OR: [
          { id: vmId },
          { proxmox_vmid: vmId },
        ],
        user_id: userId,
      },
      include: {
        node: {
          include: { pop: true },
        },
        plan: true,
        firewall_group: true,
      },
    });

    if (!vm) {
      const checkResult = await this.checkVMExists(userId, vmId);
      if (checkResult.exists && checkResult.synced) {
        vm = await this.prisma.vM.findFirst({
          where: {
            proxmox_vmid: vmId,
            user_id: userId,
          },
          include: {
            node: {
              include: { pop: true },
            },
            plan: true,
            firewall_group: true,
          },
        });
      } else {
        throw new NotFoundException('VM not found');
      }
    }

    if (vm && vm.node) {
      try {
        const proxmoxStatus = await this.proxmoxService.getVMStatus(
          vm.node.hostname,
          vm.proxmox_vmid
        );
        vm.status = this.mapProxmoxStatus(proxmoxStatus.status);
      } catch (error) {
        this.logger.error(`Failed to get VM status: ${error.message}`);
      }
    }

    return vm;
  }

  private mapProxmoxStatus(proxmoxStatus: string): VMStatus {
    const mapping: Record<string, VMStatus> = {
      running: 'running',
      stopped: 'stopped',
      paused: 'suspended',
    };
    return mapping[proxmoxStatus] || 'stopped';
  }

  async startVM(userId: number, vmId: number) {
    let vm = await this.prisma.vM.findFirst({
      where: {
        OR: [
          { id: vmId },
          { proxmox_vmid: vmId },
        ],
        user_id: userId,
      },
      include: { node: true },
    });

    if (!vm) {
      const checkResult = await this.checkVMExists(userId, vmId);
      if (checkResult.exists && checkResult.synced) {
        vm = await this.prisma.vM.findFirst({
          where: {
            proxmox_vmid: vmId,
            user_id: userId,
          },
          include: { node: true },
        });
      }
    }

    if (!vm) {
      throw new NotFoundException('VM not found');
    }

    if (vm.status === 'running') {
      throw new BadRequestException('VM is already running');
    }

    if (vm.plan_type === 'hourly') {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const hourlyRate = (vm.hourly_rate as any).toNumber();
      const minimumBalance = hourlyRate * 24;
      const currentBalance = user.wallet_balance.toNumber();
      
      if (currentBalance < minimumBalance) {
        throw new BadRequestException(
          `Insufficient balance to start VM. Minimum required: $${minimumBalance}`,
        );
      }
    }

    const node = await this.prisma.node.findUnique({
      where: { id: vm.node_id },
    });

    if (!node) {
      throw new NotFoundException('Node not found');
    }

    await this.proxmoxService.startVM(node.hostname, vm.proxmox_vmid);

    await this.prisma.vM.update({
      where: { id: vm.id },
      data: { status: 'running' },
    });

    return { message: 'VM started successfully' };
  }

  async stopVM(userId: number, vmId: number) {
    let vm = await this.prisma.vM.findFirst({
      where: {
        OR: [
          { id: vmId },
          { proxmox_vmid: vmId },
        ],
        user_id: userId,
      },
      include: { node: true },
    });

    if (!vm) {
      const checkResult = await this.checkVMExists(userId, vmId);
      if (checkResult.exists && checkResult.synced) {
        vm = await this.prisma.vM.findFirst({
          where: {
            proxmox_vmid: vmId,
            user_id: userId,
          },
          include: { node: true },
        });
      }
    }

    if (!vm) {
      throw new NotFoundException('VM not found');
    }

    if (vm.status === 'stopped') {
      throw new BadRequestException('VM is already stopped');
    }

    const node = await this.prisma.node.findUnique({
      where: { id: vm.node_id },
    });

    if (!node) {
      throw new NotFoundException('Node not found');
    }

    await this.proxmoxService.stopVM(node.hostname, vm.proxmox_vmid);

    await this.prisma.vM.update({
      where: { id: vm.id },
      data: { status: 'stopped' },
    });

    return { message: 'VM stopped successfully' };
  }

  async restartVM(userId: number, vmId: number) {
    let vm = await this.prisma.vM.findFirst({
      where: {
        OR: [
          { id: vmId },
          { proxmox_vmid: vmId },
        ],
        user_id: userId,
      },
      include: { node: true },
    });

    if (!vm) {
      const checkResult = await this.checkVMExists(userId, vmId);
      if (checkResult.exists && checkResult.synced) {
        vm = await this.prisma.vM.findFirst({
          where: {
            proxmox_vmid: vmId,
            user_id: userId,
          },
          include: { node: true },
        });
      }
    }

    if (!vm) {
      throw new NotFoundException('VM not found');
    }

    if (vm.status !== 'running') {
      throw new BadRequestException('Cannot restart VM that is not running');
    }

    const node = await this.prisma.node.findUnique({
      where: { id: vm.node_id },
    });

    if (!node) {
      throw new NotFoundException('Node not found');
    }

    await this.proxmoxService.restartVM(node.hostname, vm.proxmox_vmid);

    return { message: 'VM restarted successfully' };
  }

  async deleteVM(userId: number, vmId: number) {
    let vm = await this.prisma.vM.findFirst({
      where: {
        OR: [
          { id: vmId },
          { proxmox_vmid: vmId },
        ],
        user_id: userId,
      },
      include: { node: true },
    });

    if (!vm) {
      const checkResult = await this.checkVMExists(userId, vmId);
      if (checkResult.exists && checkResult.synced) {
        vm = await this.prisma.vM.findFirst({
          where: {
            proxmox_vmid: vmId,
            user_id: userId,
          },
          include: { node: true },
        });
      }
    }

    if (!vm) {
      throw new NotFoundException('VM not found');
    }

    const node = await this.prisma.node.findUnique({
      where: { id: vm.node_id },
    });

    if (!node) {
      throw new NotFoundException('Node not found');
    }

    await this.proxmoxService.deleteVM(node.hostname, vm.proxmox_vmid);

    await this.prisma.vM.update({
      where: { id: vm.id },
      data: { status: 'deleted', terminated_at: new Date() },
    });

    return { message: 'VM deleted successfully' };
  }

  async getAllVMs(userId: number, page: number = 1, limit: number = 50, status?: string) {
    const where: any = { user_id: userId };
    if (status) where.status = status;
    
    const skip = (page - 1) * limit;
    
    const [vms, total] = await Promise.all([
      this.prisma.vM.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          node: {
            include: { pop: true },
          },
          plan: true,
        },
      }),
      this.prisma.vM.count({ where }),
    ]);
    
    const transformedVMs = vms.map(vm => ({
      id: vm.id,
      vmid: vm.proxmox_vmid,
      name: vm.name,
      status: vm.status,
      vcpu: vm.vcpu,
      ram_gb: vm.ram_gb,
      ssd_gb: vm.ssd_gb,
      node: vm.node?.hostname,
      plan_type: vm.plan_type,
      created_at: vm.created_at,
      hourly_rate: vm.hourly_rate,
      ip_addresses: [],
    }));
    
    return {
      success: true,
      data: transformedVMs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async rebuildVM(userId: number, vmId: number, data: any) {
    let vm = await this.prisma.vM.findFirst({
      where: {
        OR: [
          { id: vmId },
          { proxmox_vmid: vmId },
        ],
        user_id: userId,
      },
      include: { node: true },
    });

    if (!vm) {
      const checkResult = await this.checkVMExists(userId, vmId);
      if (checkResult.exists && checkResult.synced) {
        vm = await this.prisma.vM.findFirst({
          where: {
            proxmox_vmid: vmId,
            user_id: userId,
          },
          include: { node: true },
        });
      }
    }

    if (!vm) {
      throw new NotFoundException('VM not found');
    }

    const node = await this.prisma.node.findUnique({
      where: { id: vm.node_id },
    });

    if (!node) {
      throw new NotFoundException('Node not found');
    }

    await this.proxmoxService.deleteVM(node.hostname, vm.proxmox_vmid);
    
    const newVmid = await this.proxmoxService.createVM(node.hostname, {
      name: vm.name,
      cores: vm.vcpu,
      memory: vm.ram_gb * 1024,
      disk: vm.ssd_gb,
      ...data,
    });
    
    await this.prisma.vM.update({
      where: { id: vm.id },
      data: {
        proxmox_vmid: newVmid.vmid,
        status: 'rebuilding',
      },
    });
    
    return { message: 'VM rebuild started', vmid: newVmid.vmid };
  }

  async resizeVM(userId: number, vmId: number, data: { vcpu?: number; ram_gb?: number; ssd_gb?: number }) {
    let vm = await this.prisma.vM.findFirst({
      where: {
        OR: [
          { id: vmId },
          { proxmox_vmid: vmId },
        ],
        user_id: userId,
      },
      include: { node: true },
    });

    if (!vm) {
      const checkResult = await this.checkVMExists(userId, vmId);
      if (checkResult.exists && checkResult.synced) {
        vm = await this.prisma.vM.findFirst({
          where: {
            proxmox_vmid: vmId,
            user_id: userId,
          },
          include: { node: true },
        });
      }
    }

    if (!vm) {
      throw new NotFoundException('VM not found');
    }

    const node = await this.prisma.node.findUnique({
      where: { id: vm.node_id },
    });

    if (!node) {
      throw new NotFoundException('Node not found');
    }

    if (vm.status === 'running') {
      await this.proxmoxService.stopVM(node.hostname, vm.proxmox_vmid);
    }
    
    const config: any = {};
    if (data.vcpu) config.cores = data.vcpu;
    if (data.ram_gb) config.memory = data.ram_gb * 1024;
    
    if (Object.keys(config).length) {
      await this.proxmoxService.setVMConfig(node.hostname, vm.proxmox_vmid, config);
    }
    
    if (data.ssd_gb && data.ssd_gb > vm.ssd_gb) {
      await this.proxmoxService.resizeDisk(node.hostname, vm.proxmox_vmid, 'scsi0', data.ssd_gb);
    }
    
    const updateData: any = {};
    if (data.vcpu) updateData.vcpu = data.vcpu;
    if (data.ram_gb) updateData.ram_gb = data.ram_gb;
    if (data.ssd_gb) updateData.ssd_gb = data.ssd_gb;
    
    await this.prisma.vM.update({
      where: { id: vm.id },
      data: updateData,
    });
    
    if (vm.status === 'running') {
      await this.proxmoxService.startVM(node.hostname, vm.proxmox_vmid);
    }
    
    return { message: 'VM resized successfully' };
  }

  async createSnapshot(userId: number, vmId: number, name: string, description?: string) {
    let vm = await this.prisma.vM.findFirst({
      where: {
        OR: [
          { id: vmId },
          { proxmox_vmid: vmId },
        ],
        user_id: userId,
      },
      include: { node: true },
    });

    if (!vm) {
      const checkResult = await this.checkVMExists(userId, vmId);
      if (checkResult.exists && checkResult.synced) {
        vm = await this.prisma.vM.findFirst({
          where: {
            proxmox_vmid: vmId,
            user_id: userId,
          },
          include: { node: true },
        });
      }
    }

    if (!vm) {
      throw new NotFoundException('VM not found');
    }

    const node = await this.prisma.node.findUnique({
      where: { id: vm.node_id },
    });

    if (!node) {
      throw new NotFoundException('Node not found');
    }

    await this.proxmoxService.createSnapshot(node.hostname, vm.proxmox_vmid, name, description);
    
    await this.prisma.vMSnapshot.create({
      data: {
        vm_id: vm.id,
        userId,
        proxmox_snapshot_name: name,
        name,
        description,
      },
    });
    
    return { message: 'Snapshot created successfully' };
  }

  async rollbackSnapshot(userId: number, vmId: number, snapshotName: string) {
    let vm = await this.prisma.vM.findFirst({
      where: {
        OR: [
          { id: vmId },
          { proxmox_vmid: vmId },
        ],
        user_id: userId,
      },
      include: { node: true },
    });

    if (!vm) {
      const checkResult = await this.checkVMExists(userId, vmId);
      if (checkResult.exists && checkResult.synced) {
        vm = await this.prisma.vM.findFirst({
          where: {
            proxmox_vmid: vmId,
            user_id: userId,
          },
          include: { node: true },
        });
      }
    }

    if (!vm) {
      throw new NotFoundException('VM not found');
    }

    const node = await this.prisma.node.findUnique({
      where: { id: vm.node_id },
    });

    if (!node) {
      throw new NotFoundException('Node not found');
    }

    await this.proxmoxService.rollbackSnapshot(node.hostname, vm.proxmox_vmid, snapshotName);
    
    return { message: 'Snapshot rolled back successfully' };
  }

  async getVNCConsole(userId: number, vmId: number) {
    let vm = await this.prisma.vM.findFirst({
      where: {
        OR: [
          { id: vmId },
          { proxmox_vmid: vmId },
        ],
        user_id: userId,
      },
      include: { node: true },
    });

    if (!vm) {
      const checkResult = await this.checkVMExists(userId, vmId);
      if (checkResult.exists && checkResult.synced) {
        vm = await this.prisma.vM.findFirst({
          where: {
            proxmox_vmid: vmId,
            user_id: userId,
          },
          include: { node: true },
        });
      }
    }

    if (!vm) {
      throw new NotFoundException('VM not found');
    }

    const node = await this.prisma.node.findUnique({
      where: { id: vm.node_id },
    });

    if (!node) {
      throw new NotFoundException('Node not found');
    }

    const vncProxy = await this.proxmoxService.getVNCProxy(node.hostname, vm.proxmox_vmid);
    const port = vncProxy.port;
    const host = node.hostname;
    
    return {
      success: true,
      data: {
        vmid: vm.proxmox_vmid,
        port: port,
        vncticket: vncProxy.ticket,
        host: host,
        url: vncProxy.url || `${node.api_url}/vnc/${port}`,
      },
    };
  }

  async getVMStats(userId: number, vmId: number, days: number = 30) {
    const vm = await this.getVM(userId, vmId);
    
    if (!vm) {
      throw new NotFoundException('VM not found');
    }
    
    const metrics = await this.prisma.vMMetric.findMany({
      where: {
        vm_id: vm.id,
        recorded_at: {
          gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { recorded_at: 'asc' },
    });
    
    let realtimeStats = null;
    try {
      realtimeStats = await this.proxmoxService.getVMStatus(vm.node?.hostname, vm.proxmox_vmid);
    } catch (error) {
      this.logger.error(`Failed to get realtime stats: ${error.message}`);
    }
    
    return {
      historical: metrics,
      realtime: realtimeStats,
    };
  }

  async syncVMsFromProxmox(userId: number) {
    try {
      const nodes = await this.proxmoxService.getNodes();
      let syncedCount = 0;
      let errors: any[] = [];

      for (const node of nodes) {
        if (node.status !== 'online') continue;

        try {
          const proxmoxVMs = await this.proxmoxService.getNodeVMs(node.node);
          
          for (const proxmoxVM of proxmoxVMs) {
            const existingVM = await this.prisma.vM.findFirst({
              where: {
                proxmox_vmid: proxmoxVM.vmid,
                user_id: userId,
              },
            });

            if (!existingVM) {
              let dbNode = await this.prisma.node.findFirst({
                where: { hostname: node.node },
              });

              if (!dbNode) {
                const pop = await this.prisma.pop.findFirst();
                dbNode = await this.prisma.node.create({
                  data: {
                    hostname: node.node,
                    pop_id: pop?.id || 1,
                    api_url: `https://${node.node}:8006`,
                    api_token_id: process.env.PROXMOX_TOKEN_ID || '',
                    api_token_secret: process.env.PROXMOX_TOKEN_SECRET || '',
                    max_vcpu: node.maxcpu || 64,
                    max_ram_gb: (node.maxmem || 0) / 1024 / 1024 / 1024,
                    max_storage_gb: (node.maxdisk || 0) / 1024 / 1024 / 1024,
                    status: 'active',
                  },
                });
              }

              let plan = await this.prisma.plan.findFirst({
                where: {
                  vcpu: proxmoxVM.cpus || 1,
                  ram_gb: Math.ceil((proxmoxVM.maxmem || 0) / 1024 / 1024 / 1024),
                  ssd_gb: Math.ceil((proxmoxVM.maxdisk || 0) / 1024 / 1024 / 1024),
                },
              });

              if (!plan) {
                plan = await this.prisma.plan.create({
                  data: {
                    name: `Custom ${proxmoxVM.cpus || 1} vCPU`,
                    type: 'hourly',
                    vcpu: proxmoxVM.cpus || 1,
                    ram_gb: Math.ceil((proxmoxVM.maxmem || 0) / 1024 / 1024 / 1024),
                    ssd_gb: Math.ceil((proxmoxVM.maxdisk || 0) / 1024 / 1024 / 1024),
                    bandwidth_gb: 5000,
                    hourly_price: this.calculateHourlyRate(
                      proxmoxVM.cpus || 1,
                      Math.ceil((proxmoxVM.maxmem || 0) / 1024 / 1024 / 1024),
                      Math.ceil((proxmoxVM.maxdisk || 0) / 1024 / 1024 / 1024)
                    ),
                    is_active: true,
                  },
                });
              }

              await this.prisma.vM.create({
                data: {
                  user_id: userId,
                  node_id: dbNode.id,
                  plan_id: plan.id,
                  proxmox_vmid: proxmoxVM.vmid,
                  name: proxmoxVM.name || `VM-${proxmoxVM.vmid}`,
                  hostname: proxmoxVM.name || `vm-${proxmoxVM.vmid}`,
                  vcpu: proxmoxVM.cpus || 1,
                  ram_gb: Math.ceil((proxmoxVM.maxmem || 0) / 1024 / 1024 / 1024),
                  ssd_gb: Math.ceil((proxmoxVM.maxdisk || 0) / 1024 / 1024 / 1024),
                  plan_type: 'hourly',
                  status: this.mapProxmoxStatus(proxmoxVM.status),
                  hourly_rate: this.calculateHourlyRate(
                    proxmoxVM.cpus || 1,
                    Math.ceil((proxmoxVM.maxmem || 0) / 1024 / 1024 / 1024),
                    Math.ceil((proxmoxVM.maxdisk || 0) / 1024 / 1024 / 1024)
                  ),
                },
              });
              
              syncedCount++;
            }
          }
        } catch (error) {
          errors.push({ node: node.node, error: error.message });
          this.logger.error(`Failed to sync VMs from node ${node.node}:`, error);
        }
      }

      return {
        success: true,
        message: `Synced ${syncedCount} VMs`,
        syncedCount,
        errors,
      };
    } catch (error) {
      this.logger.error('Failed to sync VMs:', error);
      throw new BadRequestException('Failed to sync VMs from Proxmox');
    }
  }

  async checkVMExists(userId: number, vmid: number) {
    try {
      const vm = await this.prisma.vM.findFirst({
        where: {
          proxmox_vmid: vmid,
          user_id: userId,
        },
        include: { node: true },
      });

      if (vm) {
        return { exists: true, inDatabase: true, vm };
      }

      const nodes = await this.proxmoxService.getNodes();
      
      for (const node of nodes) {
        try {
          const status = await this.proxmoxService.getVMStatus(node.node, vmid);
          if (status) {
            const synced = await this.syncSingleVMFromProxmox(userId, node.node, vmid, status);
            return { exists: true, inDatabase: false, synced, vm: synced };
          }
        } catch (error) {
          continue;
        }
      }

      return { exists: false, inDatabase: false };
    } catch (error) {
      this.logger.error(`Failed to check VM ${vmid}:`, error);
      throw new BadRequestException('Failed to check VM existence');
    }
  }

  async syncSingleVM(userId: number, vmid: number): Promise<any> {
    try {
      const nodes = await this.proxmoxService.getNodes();
      let foundNode: any = null;
      let vmStatus: any = null;

      for (const node of nodes) {
        try {
          const status = await this.proxmoxService.getVMStatus(node.node, vmid);
          if (status) {
            foundNode = node;
            vmStatus = status;
            break;
          }
        } catch (error) {
          continue;
        }
      }

      if (!foundNode) {
        throw new NotFoundException(`VM ${vmid} not found in Proxmox`);
      }

      const syncedVM = await this.syncSingleVMFromProxmox(userId, foundNode.node, vmid, vmStatus);
      
      return {
        success: true,
        message: `VM ${vmid} synced successfully`,
        vm: syncedVM,
      };
    } catch (error) {
      this.logger.error(`Failed to sync VM ${vmid}:`, error);
      throw new BadRequestException(error.message || 'Failed to sync VM');
    }
  }

  private async syncSingleVMFromProxmox(userId: number, nodeName: string, vmid: number, status: any) {
    let dbNode = await this.prisma.node.findFirst({
      where: { hostname: nodeName },
    });

    if (!dbNode) {
      const pop = await this.prisma.pop.findFirst();
      dbNode = await this.prisma.node.create({
        data: {
          hostname: nodeName,
          pop_id: pop?.id || 1,
          api_url: `https://${nodeName}:8006`,
          api_token_id: process.env.PROXMOX_TOKEN_ID || '',
          api_token_secret: process.env.PROXMOX_TOKEN_SECRET || '',
          max_vcpu: 64,
          max_ram_gb: 256,
          max_storage_gb: 2000,
          status: 'active',
        },
      });
    }

    const vmConfig = await this.proxmoxService.getVMConfig(nodeName, vmid);
    
    let plan = await this.prisma.plan.findFirst({
      where: {
        vcpu: vmConfig.cores || 1,
        ram_gb: Math.ceil((vmConfig.memory || 0) / 1024),
        ssd_gb: Math.ceil((vmConfig.disk || 0) / 1024 / 1024 / 1024),
      },
    });

    if (!plan) {
      plan = await this.prisma.plan.create({
        data: {
          name: `Custom ${vmConfig.cores || 1} vCPU`,
          type: 'hourly',
          vcpu: vmConfig.cores || 1,
          ram_gb: Math.ceil((vmConfig.memory || 0) / 1024),
          ssd_gb: Math.ceil((vmConfig.disk || 0) / 1024 / 1024 / 1024),
          bandwidth_gb: 5000,
          hourly_price: this.calculateHourlyRate(
            vmConfig.cores || 1,
            Math.ceil((vmConfig.memory || 0) / 1024),
            Math.ceil((vmConfig.disk || 0) / 1024 / 1024 / 1024)
          ),
          is_active: true,
        },
      });
    }

    const existingVM = await this.prisma.vM.findFirst({
      where: {
        proxmox_vmid: vmid,
        user_id: userId,
      },
    });

    if (existingVM) {
      return await this.prisma.vM.update({
        where: { id: existingVM.id },
        data: {
          name: vmConfig.name || `VM-${vmid}`,
          hostname: vmConfig.name || `vm-${vmid}`,
          vcpu: vmConfig.cores || 1,
          ram_gb: Math.ceil((vmConfig.memory || 0) / 1024),
          ssd_gb: Math.ceil((vmConfig.disk || 0) / 1024 / 1024 / 1024),
          status: this.mapProxmoxStatus(status.status),
          hourly_rate: this.calculateHourlyRate(
            vmConfig.cores || 1,
            Math.ceil((vmConfig.memory || 0) / 1024),
            Math.ceil((vmConfig.disk || 0) / 1024 / 1024 / 1024)
          ),
        },
      });
    }

    const vm = await this.prisma.vM.create({
      data: {
        user_id: userId,
        node_id: dbNode.id,
        plan_id: plan.id,
        proxmox_vmid: vmid,
        name: vmConfig.name || `VM-${vmid}`,
        hostname: vmConfig.name || `vm-${vmid}`,
        vcpu: vmConfig.cores || 1,
        ram_gb: Math.ceil((vmConfig.memory || 0) / 1024),
        ssd_gb: Math.ceil((vmConfig.disk || 0) / 1024 / 1024 / 1024),
        plan_type: 'hourly',
        status: this.mapProxmoxStatus(status.status),
        hourly_rate: this.calculateHourlyRate(
          vmConfig.cores || 1,
          Math.ceil((vmConfig.memory || 0) / 1024),
          Math.ceil((vmConfig.disk || 0) / 1024 / 1024 / 1024)
        ),
      },
    });

    return vm;
  }

  private calculateHourlyRate(cores: number, ramGB: number, diskGB: number): number {
    const basePrice = 0.12;
    const cpuPrice = cores * 0.10;
    const ramPrice = ramGB * 0.08;
    const diskPrice = diskGB * 0.012;
    return parseFloat((basePrice + cpuPrice + ramPrice + diskPrice).toFixed(4));
  }

  // BILLING FUNCTIONS

  async getVMBilling(
  userId: number,
  vmId: number,
  startDate?: string,
  endDate?: string,
): Promise<BillingData> {
  this.logger.log(`Getting billing for VM ID: ${vmId}, User: ${userId}`);
  
  // Get the VM - search by both id AND proxmox_vmid
  const vm = await this.prisma.vM.findFirst({
    where: { 
      OR: [
        { id: vmId },           // Search by database ID
        { proxmox_vmid: vmId }, // Search by Proxmox VM ID
      ],
      user_id: userId,
      terminated_at: null,
    },
    include: {
      plan: true,
      node: true,
    },
  });

  if (!vm) {
    // Debug: Check if VM exists but maybe terminated
    const existingVM = await this.prisma.vM.findFirst({
      where: {
        OR: [
          { id: vmId },
          { proxmox_vmid: vmId },
        ],
        user_id: userId,
      },
    });
    
    this.logger.error(`VM not found for ID ${vmId}. User: ${userId}`);
    if (existingVM) {
      this.logger.error(`VM exists but is terminated: ${existingVM.id}, status: ${existingVM.status}`);
    }
    
    throw new NotFoundException(`VM with ID ${vmId} not found`);
  }

  this.logger.log(`Found VM: ${vm.id} (Proxmox ID: ${vm.proxmox_vmid}), Name: ${vm.name}`);
  
  // Rest of your billing calculation...
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate ? new Date(startDate) : vm.created_at;

  const hoursInPeriod = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60)));
  
  const hourlyCost = vm.hourly_rate ? (vm.hourly_rate as any).toNumber() : (vm.plan?.hourly_price?.toNumber() || 0);
  const monthlyCost = vm.monthly_rate ? (vm.monthly_rate as any).toNumber() : (vm.plan?.monthly_price?.toNumber() || 0);
  
  const currentHours = Math.max(1, Math.ceil((new Date().getTime() - vm.created_at.getTime()) / (1000 * 60 * 60)));
  const currentCost = hourlyCost * currentHours;
  
  const estimatedMonthlyCost = monthlyCost > 0 ? monthlyCost : hourlyCost * 730;
  const totalCostToDate = currentCost;

  const metrics = await this.prisma.vMMetric.findMany({
    where: {
      vm_id: vm.id,  // Use database ID here, not the input vmId
      recorded_at: {
        gte: start,
        lte: end,
      },
    },
    orderBy: {
      recorded_at: 'asc',
    },
  });

  const avgCpuUsage = metrics.reduce((sum, m) => sum + (m.cpu_usage || 0), 0) / (metrics.length || 1);
  const avgRamUsage = metrics.reduce((sum, m) => sum + (m.memory_usage || 0), 0) / (metrics.length || 1);
  const avgDiskUsage = metrics.reduce((sum, m) => sum + (m.disk_usage || 0), 0) / (metrics.length || 1);
  const totalBandwidth = metrics.reduce((sum, m) => sum + (m.bandwidth_in_mb || 0) + (m.bandwidth_out_mb || 0), 0);

  const invoiceItems: Array<any> = [];
  const daysInPeriod = Math.ceil(hoursInPeriod / 24);
  
  for (let i = 0; i < daysInPeriod; i++) {
    const dayDate = new Date(start);
    dayDate.setDate(dayDate.getDate() + i);
    if (dayDate <= end) {
      invoiceItems.push({
        date: dayDate,
        amount: Number((hourlyCost * 24).toFixed(4)),
        description: `VM "${vm.name}" hourly usage - ${dayDate.toLocaleDateString()}`,
        type: 'hourly' as const,
      });
    }
  }

  return {
    vmId: vm.id,
    vmName: vm.name || vm.hostname,
    hourlyRate: Number(hourlyCost.toFixed(4)),
    monthlyRate: Number(monthlyCost.toFixed(4)),
    currentCost: Number(currentCost.toFixed(2)),
    estimatedMonthlyCost: Number(estimatedMonthlyCost.toFixed(2)),
    totalCostToDate: Number(totalCostToDate.toFixed(2)),
    billingPeriod: {
      start,
      end,
    },
    usage: {
      hours: hoursInPeriod,
      days: daysInPeriod,
      cpuUsage: Number(avgCpuUsage.toFixed(2)),
      ramUsage: Number(avgRamUsage.toFixed(2)),
      diskUsage: Number(avgDiskUsage.toFixed(2)),
      bandwidthUsed: Number((totalBandwidth / 1024 / 1024).toFixed(2)),
    },
    invoiceItems,
  };
}

  async getAllVMsBillingSummary(userId: number): Promise<any[]> {
    const vms = await this.prisma.vM.findMany({
      where: {
        user_id: userId,
        terminated_at: null,
      },
      include: {
        plan: true,
      },
    });

    const billingSummaries = await Promise.all(
      vms.map(async (vm) => {
        const hourlyRate = vm.hourly_rate ? (vm.hourly_rate as any).toNumber() : (vm.plan?.hourly_price?.toNumber() || 0);
        const hoursRunning = Math.max(1, Math.ceil((new Date().getTime() - vm.created_at.getTime()) / (1000 * 60 * 60)));
        const currentCost = hourlyRate * hoursRunning;
        
        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);
        
        const metrics = await this.prisma.vMMetric.aggregate({
          where: {
            vm_id: vm.id,
            recorded_at: {
              gte: last30Days,
            },
          },
          _avg: {
            cpu_usage: true,
            memory_usage: true,
            disk_usage: true,
          },
        });

        return {
          vmId: vm.id,
          vmName: vm.name || vm.hostname,
          status: vm.status,
          hourlyRate: Number(hourlyRate.toFixed(4)),
          monthlyRate: vm.monthly_rate ? Number((vm.monthly_rate as any).toNumber().toFixed(4)) : (vm.plan?.monthly_price ? Number((vm.plan.monthly_price as any).toNumber().toFixed(4)) : 0),
          currentCost: Number(currentCost.toFixed(2)),
          avgCpuUsage: Number((metrics._avg.cpu_usage || 0).toFixed(2)),
          avgRamUsage: Number((metrics._avg.memory_usage || 0).toFixed(2)),
          avgDiskUsage: Number((metrics._avg.disk_usage || 0).toFixed(2)),
          createdAt: vm.created_at,
        };
      })
    );

    return billingSummaries;
  }

  async getTotalMonthlyCost(userId: number): Promise<number> {
    const vms = await this.prisma.vM.findMany({
      where: {
        user_id: userId,
        terminated_at: null,
      },
      include: {
        plan: true,
      },
    });

    let totalMonthlyCost = 0;
    
    for (const vm of vms) {
      const monthlyRate = vm.monthly_rate ? (vm.monthly_rate as any).toNumber() : (vm.plan?.monthly_price?.toNumber() || 0);
      if (monthlyRate > 0) {
        totalMonthlyCost += monthlyRate;
      } else {
        const hourlyRate = vm.hourly_rate ? (vm.hourly_rate as any).toNumber() : (vm.plan?.hourly_price?.toNumber() || 0);
        totalMonthlyCost += hourlyRate * 730;
      }
    }

    return Number(totalMonthlyCost.toFixed(2));
  }

 async getHourlyBreakdown(userId: number, date?: string): Promise<any> {
  const targetDate = date ? new Date(date) : new Date();
  targetDate.setHours(0, 0, 0, 0);
  
  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const vms = await this.prisma.vM.findMany({
    where: {
      user_id: userId,
      terminated_at: null,
      created_at: {
        lte: nextDay,
      },
    },
    include: {
      plan: true,
    },
  });

  const hourlyBreakdown: Array<{
    hour: number;
    time: string;
    cost: number;
    activeVMs: Array<{ id: number; name: string; rate: number }>;
  }> = [];
  
  for (let hour = 0; hour < 24; hour++) {
    const hourDate = new Date(targetDate);
    hourDate.setHours(hour, 0, 0, 0);
    
    let hourCost = 0;
    const activeVMs: Array<{ id: number; name: string; rate: number }> = [];
    
    for (const vm of vms) {
      if (vm.created_at <= hourDate && (!vm.terminated_at || vm.terminated_at > hourDate)) {
        const hourlyRate = vm.hourly_rate ? (vm.hourly_rate as any).toNumber() : (vm.plan?.hourly_price?.toNumber() || 0);
        hourCost += hourlyRate;
        activeVMs.push({
          id: vm.id,
          name: vm.name || vm.hostname,
          rate: Number(hourlyRate.toFixed(4)),
        });
      }
    }
    
    hourlyBreakdown.push({
      hour,
      time: hourDate.toISOString(),
      cost: Number(hourCost.toFixed(4)),
      activeVMs,
    });
  }

  return {
    date: targetDate.toISOString(),
    totalCost: Number(hourlyBreakdown.reduce((sum, h) => sum + h.cost, 0).toFixed(2)),
    hourlyBreakdown,
  };
}
async generateInvoice(userId: number, vmId?: number, month?: string): Promise<any> {
  const targetDate = month ? new Date(month) : new Date();
  const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
  const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
  
  const whereCondition: any = {
    user_id: userId,
    created_at: {
      lte: endOfMonth,
    },
  };
  
  if (vmId) {
    whereCondition.id = vmId;
  }
  
  if (vmId === undefined) {
    whereCondition.terminated_at = null;
  }
  
  const vms = await this.prisma.vM.findMany({
    where: whereCondition,
    include: {
      plan: true,
    },
  });
  
  let totalAmount = 0;
  const items: Array<{
    vmId: number;
    vmName: string;
    hours: number;
    rate: number;
    amount: number;
    period: { start: Date; end: Date };
  }> = [];
  
  for (const vm of vms) {
    const vmStart = vm.created_at > startOfMonth ? vm.created_at : startOfMonth;
    const vmEnd = vm.terminated_at && vm.terminated_at < endOfMonth ? vm.terminated_at : endOfMonth;
    
    if (vmStart <= vmEnd) {
      const hoursInMonth = Math.ceil((vmEnd.getTime() - vmStart.getTime()) / (1000 * 60 * 60));
      const hourlyRate = vm.hourly_rate ? (vm.hourly_rate as any).toNumber() : (vm.plan?.hourly_price?.toNumber() || 0);
      const cost = hourlyRate * hoursInMonth;
      
      totalAmount += cost;
      items.push({
        vmId: vm.id,
        vmName: vm.name || vm.hostname,
        hours: hoursInMonth,
        rate: Number(hourlyRate.toFixed(4)),
        amount: Number(cost.toFixed(2)),
        period: {
          start: vmStart,
          end: vmEnd,
        },
      });
    }
  }
  
  return {
    invoiceNumber: `INV-${targetDate.getFullYear()}${(targetDate.getMonth() + 1).toString().padStart(2, '0')}${vmId ? `-${vmId}` : ''}`,
    date: new Date().toISOString(),
    period: {
      month: targetDate.getMonth() + 1,
      year: targetDate.getFullYear(),
      start: startOfMonth,
      end: endOfMonth,
    },
    items,
    totalAmount: Number(totalAmount.toFixed(2)),
    currency: 'USD',
  };
}
// vm.service.ts - Updated deployVM method

async deployVM(userId: number, data: any) {
  // Start a transaction to ensure all operations succeed or fail together
  return this.prisma.$transaction(async (prisma) => {
    try {
      // 1. Get user and check balance
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const currentBalance = user.wallet_balance.toNumber();
      
      // Calculate monthly rate
      const monthlyRate = this.calculateMonthlyRate(data);
      const requiredAmount = monthlyRate * 1.2; // Reserve 20% buffer

      console.log('Balance check:', { currentBalance, requiredAmount, monthlyRate });

      if (currentBalance < requiredAmount) {
        throw new BadRequestException(
          `Insufficient balance. Required: $${requiredAmount.toFixed(2)}, Available: $${currentBalance.toFixed(2)}`
        );
      }

      // 2. Reserve funds (deduct from wallet)
      const newBalance = currentBalance - requiredAmount;
      
      await prisma.user.update({
        where: { id: userId },
        data: { wallet_balance: newBalance }
      });

      // 3. Create transaction record for the deduction
      const transaction = await prisma.transaction.create({
        data: {
          user_id: userId,
          amount: -requiredAmount,
          type: 'Usage',
          status: 'completed',
          description: `VM reservation for ${data.hostname}`,
          balance_after: newBalance,
          metadata: {
            vm_name: data.hostname,
            monthly_rate: monthlyRate,
            hourly_rate: data.hourlyRate,
            cores: data.cores,
            memory: data.memory,
            disk: data.disk,
            location: data.location
          }
        }
      });

      console.log('Transaction created:', transaction.id);

      // 4. Get or create plan
      const ramGb = data.memory / 1024;
      const ssdGb = data.disk;
      
      let plan = await prisma.plan.findFirst({
        where: {
          vcpu: data.cores,
          ram_gb: ramGb,
          ssd_gb: ssdGb
        }
      });

      if (!plan) {
        console.log('Creating new plan for:', { vcpu: data.cores, ram_gb: ramGb, ssd_gb: ssdGb });
        plan = await prisma.plan.create({
          data: {
            name: `Custom ${data.cores} vCPU - ${ramGb}GB RAM - ${ssdGb}GB SSD`,
            type: 'hourly',
            vcpu: data.cores,
            ram_gb: ramGb,
            ssd_gb: ssdGb,
            bandwidth_gb: data.bandwidth * 1000,
            hourly_price: data.hourlyRate,
            monthly_price: monthlyRate,
            is_active: true
          }
        });
      }

      console.log('Plan found/created:', plan.id);

      // 5. Get or create node in database (for reference only)
      // The node hostname comes from the location data.location
      let node = await prisma.node.findFirst({
        where: { 
          hostname: data.location
        }
      });

      if (!node) {
        // Create node record for tracking (not required for deployment, just for reference)
        console.log('Creating node record for:', data.location);
        
        // Get or create default POP
        let pop = await prisma.pop.findFirst();
        if (!pop) {
          pop = await prisma.pop.create({
            data: {
              name: 'Default POP',
              city: 'Unknown',
              country: 'Unknown',
              active: true
            }
          });
        }
        
        node = await prisma.node.create({
          data: {
            hostname: data.location,
            pop_id: pop.id,
            api_url: `https://${data.location}:8006`,
            api_token_id: process.env.PROXMOX_TOKEN_ID || '',
            api_token_secret: process.env.PROXMOX_TOKEN_SECRET || '',
            max_vcpu: 64,
            max_ram_gb: 256,
            max_storage_gb: 2000,
            status: 'active',
            ip_address: '151.158.114.130'
          }
        });
      }

      console.log('Node found/created:', node.id, node.hostname);

      // 6. Get SSH keys if provided
      let sshKeys: any[] = [];
      if (data.sshKeyId) {
        sshKeys = await prisma.sSHKey.findMany({
          where: {
            id: parseInt(data.sshKeyId),
            user_id: userId,
            is_active: true
          }
        });
      }

      // 7. Get OS template (look for vztmpl or iso based on the OS name)
      // The OS template comes from the /os-templates API
      const isLXC = data.os?.includes('vztmpl') || data.os?.includes('tar.zst');
      const contentType = isLXC ? 'vztmpl' : 'iso';
      
      // Find the template by name or id
      let osTemplate = await prisma.osTemplate.findFirst({
        where: { 
          OR: [
            { name: { contains: data.os, mode: 'insensitive' } },
            { slug: { contains: data.os, mode: 'insensitive' } }
          ]
        }
      });

      // If not in database, create a reference (or use the data directly)
      if (!osTemplate) {
        console.log('Creating OS template reference for:', data.os);
        osTemplate = await prisma.osTemplate.create({
          data: {
            name: data.os,
            slug: data.os.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            os_type: 'linux',
            version: 'Latest',
            proxmox_template_id: data.os,
            min_ram_gb: 1,
            min_disk_gb: 20,
            is_active: true
          }
        });
      }

      console.log('OS Template found/created:', osTemplate.id, osTemplate.name);

      // 8. Deploy VM in Proxmox
      const sshKeysString = sshKeys.map(k => {
        const parts = k.public_key.trim().split(' ');
        if (parts.length >= 2) {
          return `${parts[0]} ${parts[1]}`;
        }
        return k.public_key;
      }).join('\n');

      // Determine if creating LXC or QEMU VM
      const isLxcTemplate = data.os?.includes('vztmpl') || data.os?.includes('tar.zst');
      
      let proxmoxResult;
      if (isLxcTemplate) {
        // Create LXC container
        proxmoxResult = await this.proxmoxService.createLXC(data.location, {
          vmid: await this.getNextVMID(),
          hostname: data.hostname,
          cores: data.cores,
          memory: data.memory,
          disk: data.disk,
          ostemplate: data.os,
          sshkeys: sshKeysString,
          password: data.password,
          storage: 'local-lvm',
          start: 1
        });
      } else {
        // Create QEMU VM
        proxmoxResult = await this.proxmoxService.createQEMU(data.location, {
          vmid: await this.getNextVMID(),
          name: data.hostname,
          cores: data.cores,
          memory: data.memory,
          disk: data.disk,
          iso: data.os,
          sshkeys: sshKeysString,
          password: data.password,
          storage: 'local-lvm',
          start: 1
        });
      }

      console.log('Proxmox VM created:', proxmoxResult);
// Extract VM ID from the result
let vmId: number;
if (typeof proxmoxResult === 'string' && proxmoxResult.includes('UPID:')) {
  // Parse UPID: UPID:host02-yta:00204D5F:14754853:69D4D6A4:qmcreate:106:root@pam!cloud-ui:
  const match = proxmoxResult.match(/:qmcreate:(\d+):/);
  if (match && match[1]) {
    vmId = parseInt(match[1]);
  } else {
    // Fallback: use the vmid we sent
    vmId = await this.getNextVMID() - 1;
  }
} else if (typeof proxmoxResult === 'object' && proxmoxResult.vmid) {
  vmId = proxmoxResult.vmid;
} else if (typeof proxmoxResult === 'number') {
  vmId = proxmoxResult;
} else {
  // Fallback: get the next VM ID
  vmId = await this.getNextVMID() - 1;
}

console.log('Extracted VM ID:', vmId);
      // 9. Create VM record in database
      const vm = await prisma.vM.create({
        data: {
          user_id: userId,
          node_id: node.id,
          plan_id: plan.id,
          proxmox_vmid: vmId,
          name: data.hostname,
          hostname: data.hostname,
          vcpu: data.cores,
          ram_gb: ramGb,
          ssd_gb: ssdGb,
          plan_type: 'hourly',
          status: 'running',
          hourly_rate: data.hourlyRate,
          monthly_rate: monthlyRate,
          firewall_group_id: data.firewallGroup === 'default' ? null : (parseInt(data.firewallGroup) || null),
          ssh_key_ids: data.sshKeyId ? [parseInt(data.sshKeyId)] : [],
          cloud_init_data: data.userData ? JSON.parse(data.userData) : null,
        }
      });

      console.log('VM created in database:', vm.id);

      // 10. Update transaction with VM reference
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          ref_id: String(vm.id),
          description: `VM reservation for ${data.hostname} (VM ID: ${vm.id})`
        }
      });

      // 11. Log activity
      await prisma.activityLog.create({
        data: {
          user_id: userId,
          action: 'create',
          action_type: 'create',
          description: `Deployed VM "${data.hostname}"`,
          service_type: 'vps',
          service_name: data.hostname,
          status: 'success',
          metadata: {
            vm_id: vm.id,
            proxmox_vmid: proxmoxResult.vmid || proxmoxResult,
            cores: data.cores,
            memory: data.memory,
            disk: data.disk,
            monthly_rate: monthlyRate,
            hourly_rate: data.hourlyRate
          }
        }
      });

      return {
        success: true,
        message: 'VM deployed successfully',
        vm: {
          id: vm.id,
          name: vm.name,
          status: vm.status,
          vmid: vm.proxmox_vmid
        },
        balance: {
          previous: currentBalance,
          deducted: requiredAmount,
          current: newBalance
        }
      };
    } catch (error) {
      console.error('Deployment error:', error);
      throw error; // Transaction will automatically rollback
    }
  });
}

// Helper to get next available VMID
private async getNextVMID(): Promise<number> {
  const highestVM = await this.prisma.vM.findFirst({
    orderBy: { proxmox_vmid: 'desc' },
    select: { proxmox_vmid: true }
  });
  
  const nextId = (highestVM?.proxmox_vmid || 100) + 1;
  return nextId;
}

// Helper method to calculate monthly rate
private calculateMonthlyRate(data: any): number {
  const basePrice = 0.12;
  const cpuPrice = data.cores * 0.10;
  const ramPrice = (data.memory / 1024) * 0.08;
  const diskPrice = data.disk * 0.012;
  const backupPrice = data.enableBackup ? 0.025 : 0;
  const locationMultiplier = 1; // Get from location if needed
  
  const hourly = (basePrice + cpuPrice + ramPrice + diskPrice + backupPrice) * locationMultiplier;
  return parseFloat((hourly * 720).toFixed(2));
}

// Add check balance method
async checkBalance(userId: number, data: { monthlyCost: number; hourlyRate: number }) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  const currentBalance = user.wallet_balance.toNumber();
  const requiredAmount = data.monthlyCost * 1.2; // 20% buffer

  return {
    sufficient: currentBalance >= requiredAmount,
    available: currentBalance,
    required: requiredAmount,
    monthlyCost: data.monthlyCost,
    hourlyRate: data.hourlyRate,
    shortfall: currentBalance >= requiredAmount ? 0 : (requiredAmount - currentBalance)
  };
}





// Add these methods to src/vm/vm.service.ts

// ============ ADMIN VM METHODS ============

async adminGetAllVMs(params: {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  nodeId?: number;
  userId?: number;
}) {
  const { page, limit, search, status, nodeId, userId } = params;
  const skip = (page - 1) * limit;
  
  const where: any = {};
  
  if (status) {
    const statuses = status.split(',').map(s => s.trim());
    if (statuses.length === 1) {
      where.status = statuses[0];
    } else {
      where.status = { in: statuses };
    }
  }
  
  if (nodeId) {
    where.node_id = nodeId;
  }
  
  if (userId) {
    where.user_id = userId;
  }
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { hostname: { contains: search, mode: 'insensitive' } },
    ];
  }
  
  const [vms, total] = await Promise.all([
    this.prisma.vM.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            full_name: true,
          },
        },
        node: {
          include: {
            pop: true,
          },
        },
        plan: true,
        ip_addresses: {
          select: {
            id: true,
            address: true,
            status: true,
          },
        },
      },
    }),
    this.prisma.vM.count({ where }),
  ]);
  
  return {
    data: vms,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

async adminGetVMStats() {
  const vms = await this.prisma.vM.findMany({
    include: {
      plan: true,
    },
  });
  
  const totalVMs = vms.length;
  const runningVMs = vms.filter(v => v.status === 'running').length;
  const stoppedVMs = vms.filter(v => v.status === 'stopped').length;
  const suspendedVMs = vms.filter(v => v.status === 'suspended').length;
  
  const totalVCPU = vms.reduce((sum, v) => sum + v.vcpu, 0);
  const totalRAM = vms.reduce((sum, v) => sum + v.ram_gb, 0);
  const totalStorage = vms.reduce((sum, v) => sum + v.ssd_gb, 0);
  
  const monthlyRevenue = vms.reduce((sum, v) => {
    const monthlyRate = v.monthly_rate?.toNumber() || (v.hourly_rate?.toNumber() || 0) * 730;
    return sum + monthlyRate;
  }, 0);
  
  const hourlyRevenue = vms.filter(v => v.status === 'running').reduce((sum, v) => {
    return sum + (v.hourly_rate?.toNumber() || 0);
  }, 0);
  
  return {
    totalVMs,
    runningVMs,
    stoppedVMs,
    suspendedVMs,
    totalVCPU,
    totalRAM,
    totalStorage,
    monthlyRevenue,
    hourlyRevenue,
  };
}

async adminGetVMById(id: number) {
  const vm = await this.prisma.vM.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          full_name: true,
          wallet_balance: true,
        },
      },
      node: {
        include: {
          pop: true,
        },
      },
      plan: true,
      ip_addresses: true,
      snapshots: true,
      firewall_group: true,
    },
  });
  
  if (!vm) {
    throw new NotFoundException(`VM with ID ${id} not found`);
  }
  
  return vm;
}

async adminCreateVM(data: {
  user_id: number;
  node_id?: number;
  pop_id?: number;
  plan_id?: number;
  os_template_id: string | number;
  name: string;
  hostname: string;
  vcpu?: number;
  ram_gb?: number;
  ssd_gb?: number;
  ssh_key_ids?: number[];
  firewall_group_id?: number;
  cloud_init_data?: string;
}) {
  const user = await this.prisma.user.findUnique({
    where: { id: data.user_id },
  });
  
  if (!user) {
    throw new NotFoundException('User not found');
  }
  
  let vcpu: number;
  let ram_gb: number;
  let ssd_gb: number;
  let hourly_rate: number;
  let monthly_rate: number | null;
  let plan_type: string;
  let plan_id: number | null = null;
  
  // If plan_id is provided, use plan resources
  if (data.plan_id) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: data.plan_id },
    });
    
    if (!plan) {
      throw new NotFoundException(`Plan with ID ${data.plan_id} not found`);
    }
    
    vcpu = plan.vcpu;
    ram_gb = plan.ram_gb;
    ssd_gb = plan.ssd_gb;
    hourly_rate = plan.hourly_price?.toNumber() || 0;
    monthly_rate = plan.monthly_price?.toNumber() || null;
    plan_type = plan.type;
    plan_id = plan.id;
  } else {
    // Use custom resource values
    if (!data.vcpu || !data.ram_gb || !data.ssd_gb) {
      throw new BadRequestException('Either plan_id or vcpu, ram_gb, ssd_gb must be provided');
    }
    
    vcpu = data.vcpu;
    ram_gb = data.ram_gb;
    ssd_gb = data.ssd_gb;
    hourly_rate = this.calculateHourlyRate(vcpu, ram_gb, ssd_gb);
    monthly_rate = hourly_rate * 730;
    plan_type = 'hourly';
    
    // Create a custom plan for tracking
    const customPlan = await this.prisma.plan.create({
      data: {
        name: `Custom ${vcpu}vCPU ${ram_gb}GB ${ssd_gb}GB`,
        type: 'hourly',
        vcpu,
        ram_gb,
        ssd_gb,
        bandwidth_gb: 5000,
        hourly_price: hourly_rate,
        monthly_price: monthly_rate,
        is_active: true,
      },
    });
    plan_id = customPlan.id;
  }
  
  // Handle node selection
  let node_id = data.node_id;
  if (!node_id) {
    if (!data.pop_id) {
      throw new BadRequestException('Either node_id or pop_id must be provided');
    }
    
    const availableNode = await this.findAvailableNode(data.pop_id, vcpu, ram_gb);
    if (!availableNode) {
      throw new BadRequestException('No available nodes found in the selected location');
    }
    node_id = availableNode.id;
  }
  
  const node = await this.prisma.node.findUnique({
    where: { id: node_id },
    include: { pop: true },
  });
  
  if (!node) {
    throw new NotFoundException('Node not found');
  }

  // FIX: Validate node has proper connection details
  if (!node.api_url || !node.hostname) {
    throw new BadRequestException(`Node ${node.hostname} is not properly configured (missing API URL or hostname)`);
  }

  // Try to validate node connectivity before proceeding
  try {
    this.logger.log(`Validating node connectivity: ${node.hostname} (${node.api_url})`);
    // You can add a simple connectivity check here if available
    // await this.proxmoxService.pingNode(node.hostname);
  } catch (error) {
    this.logger.error(`Node ${node.hostname} is unreachable: ${error.message}`);
    throw new BadRequestException(`Node ${node.hostname} is currently unreachable. Please select another node or check node configuration.`);
  }
  
  // Handle OS Template
  const templateIdStr = String(data.os_template_id);
  let osTemplate;
  
  const numericId = typeof data.os_template_id === 'number' 
    ? data.os_template_id 
    : parseInt(data.os_template_id as string);
  
  if (!isNaN(numericId)) {
    osTemplate = await this.prisma.osTemplate.findUnique({
      where: { id: numericId },
    });
  }
  
  if (!osTemplate) {
    osTemplate = await this.prisma.osTemplate.findFirst({
      where: {
        OR: [
          { proxmox_template_id: templateIdStr },
          { name: templateIdStr },
          { name: { contains: templateIdStr, mode: 'insensitive' } },
          { slug: templateIdStr },
          { slug: { contains: templateIdStr, mode: 'insensitive' } },
        ],
      },
    });
  }
  
  if (!osTemplate) {
    const templateName = String(data.os_template_id);
    const templateSlug = templateName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    osTemplate = await this.prisma.osTemplate.create({
      data: {
        name: templateName,
        slug: templateSlug,
        os_type: 'linux',
        version: 'Latest',
        proxmox_template_id: templateName,
        min_ram_gb: 1,
        min_disk_gb: 20,
        is_active: true,
      },
    });
  }
  
  // Get SSH keys
  let sshKeys: any[] = [];
  if (data.ssh_key_ids?.length) {
    sshKeys = await this.prisma.sSHKey.findMany({
      where: {
        id: { in: data.ssh_key_ids },
        user_id: data.user_id,
      },
    });
  }
  
  const sshKeysString = sshKeys.map(k => {
    const parts = k.public_key.trim().split(' ');
    return parts.length >= 2 ? `${parts[0]} ${parts[1]}` : k.public_key;
  }).join('\n');
  
  // Deploy VM to Proxmox with error handling
  let proxmoxResult;
  try {
    this.logger.log(`Deploying VM to node: ${node.hostname}, API URL: ${node.api_url}`);
    
    proxmoxResult = await this.proxmoxService.createVM(node.hostname, {
      name: data.name,
      cores: vcpu,
      memory: ram_gb * 1024,
      disk: ssd_gb,
      ostemplate: osTemplate.proxmox_template_id,
      sshkeys: sshKeysString,
      hostname: data.hostname,
    });
  } catch (error) {
    this.logger.error(`Failed to deploy VM to Proxmox: ${error.message}`);
    
    // Mark node as potentially problematic
    await this.prisma.node.update({
      where: { id: node.id },
      data: { 
 status: 'offline',        // You could add an error_message field to track issues
      },
    }).catch(() => {});
    
    throw new BadRequestException(
      `Failed to deploy VM: ${error.message}. The node may be unreachable or misconfigured.`
    );
  }
  
  // Create VM record
  const vm = await this.prisma.vM.create({
    data: {
      user_id: data.user_id,
      node_id: node.id,
      plan_id: plan_id,
      proxmox_vmid: proxmoxResult.vmid,
      name: data.name,
      hostname: data.hostname,
      vcpu,
      ram_gb,
      ssd_gb,
      plan_type: plan_type as any,
      status: 'creating',
      hourly_rate: hourly_rate,
      monthly_rate: monthly_rate,
      firewall_group_id: data.firewall_group_id,
      ssh_key_ids: data.ssh_key_ids || [],
      cloud_init_data: data.cloud_init_data ? JSON.parse(data.cloud_init_data) : null,
    },
  });
  
  this.logger.log(`Admin created VM: ${vm.name} for user ${data.user_id}`);
  
  return vm;
}

// Helper method to find available node in a POP
private async findAvailableNode(popId: number, requiredVcpu: number, requiredRamGb: number) {
  const nodes = await this.prisma.node.findMany({
    where: {
      pop_id: popId,
      status: 'active',
    },
    include: {
      vms: {
        where: {
          status: { in: ['running', 'stopped', 'creating'] },
          terminated_at: null,
        },
      },
    },
  });
  
  for (const node of nodes) {
    const usedVcpu = node.vms.reduce((sum, vm) => sum + vm.vcpu, 0);
    const usedRam = node.vms.reduce((sum, vm) => sum + vm.ram_gb, 0);
    
    if (usedVcpu + requiredVcpu <= node.max_vcpu && 
        usedRam + requiredRamGb <= node.max_ram_gb) {
      return node;
    }
  }
  
  return null;
}

async adminUpdateVM(id: number, data: any) {
  const vm = await this.prisma.vM.findUnique({
    where: { id },
  });
  
  if (!vm) {
    throw new NotFoundException(`VM with ID ${id} not found`);
  }
  
  const updated = await this.prisma.vM.update({
    where: { id },
    data: {
      name: data.name,
      hostname: data.hostname,
      firewall_group_id: data.firewall_group_id,
      cloud_init_data: data.cloud_init_data,
    },
  });
  
  this.logger.log(`Admin updated VM: ${updated.name}`);
  
  return updated;
}

async adminDeleteVM(id: number) {
  const vm = await this.prisma.vM.findUnique({
    where: { id },
    include: { node: true },
  });
  
  if (!vm) {
    throw new NotFoundException(`VM with ID ${id} not found`);
  }
  
  try {
    await this.proxmoxService.deleteVM(vm.node.hostname, vm.proxmox_vmid);
  } catch (error) {
    this.logger.error(`Failed to delete VM from Proxmox: ${error.message}`);
  }
  
  await this.prisma.vM.update({
    where: { id },
    data: {
      status: 'deleted',
      terminated_at: new Date(),
    },
  });
  
  this.logger.log(`Admin deleted VM: ${vm.name}`);
  
  return { success: true, message: 'VM deleted successfully' };
}

async adminStartVM(id: number) {
  const vm = await this.prisma.vM.findUnique({
    where: { id },
    include: { node: true },
  });
  
  if (!vm) {
    throw new NotFoundException(`VM with ID ${id} not found`);
  }
  
  await this.proxmoxService.startVM(vm.node.hostname, vm.proxmox_vmid);
  
  await this.prisma.vM.update({
    where: { id },
    data: { status: 'running' },
  });
  
  return { success: true, message: 'VM started successfully' };
}

async adminStopVM(id: number) {
  const vm = await this.prisma.vM.findUnique({
    where: { id },
    include: { node: true },
  });
  
  if (!vm) {
    throw new NotFoundException(`VM with ID ${id} not found`);
  }
  
  await this.proxmoxService.stopVM(vm.node.hostname, vm.proxmox_vmid);
  
  await this.prisma.vM.update({
    where: { id },
    data: { status: 'stopped' },
  });
  
  return { success: true, message: 'VM stopped successfully' };
}

async adminRestartVM(id: number) {
  const vm = await this.prisma.vM.findUnique({
    where: { id },
    include: { node: true },
  });
  
  if (!vm) {
    throw new NotFoundException(`VM with ID ${id} not found`);
  }
  
  await this.proxmoxService.restartVM(vm.node.hostname, vm.proxmox_vmid);
  
  return { success: true, message: 'VM restarted successfully' };
}

async adminSuspendVM(id: number, reason?: string) {
  const vm = await this.prisma.vM.findUnique({
    where: { id },
    include: { node: true },
  });
  
  if (!vm) {
    throw new NotFoundException(`VM with ID ${id} not found`);
  }
  
  await this.proxmoxService.suspendVM(vm.node.hostname, vm.proxmox_vmid);
  
  await this.prisma.vM.update({
    where: { id },
    data: {
      status: 'suspended',
      suspended_at: new Date(),
      suspension_reason: reason,
    },
  });
  
  return { success: true, message: 'VM suspended successfully' };
}

async adminResumeVM(id: number) {
  const vm = await this.prisma.vM.findUnique({
    where: { id },
    include: { node: true },
  });
  
  if (!vm) {
    throw new NotFoundException(`VM with ID ${id} not found`);
  }
  
  await this.proxmoxService.resumeVM(vm.node.hostname, vm.proxmox_vmid);
  
  await this.prisma.vM.update({
    where: { id },
    data: {
      status: 'running',
      suspended_at: null,
      suspension_reason: null,
    },
  });
  
  return { success: true, message: 'VM resumed successfully' };
}

async adminResizeVM(id: number, data: { vcpu: number; ram_gb: number; ssd_gb: number }) {
  const vm = await this.prisma.vM.findUnique({
    where: { id },
    include: { node: true },
  });
  
  if (!vm) {
    throw new NotFoundException(`VM with ID ${id} not found`);
  }
  
  if (vm.status === 'running') {
    await this.proxmoxService.stopVM(vm.node.hostname, vm.proxmox_vmid);
  }
  
  const config: any = {};
  if (data.vcpu) config.cores = data.vcpu;
  if (data.ram_gb) config.memory = data.ram_gb * 1024;
  
  if (Object.keys(config).length) {
    await this.proxmoxService.setVMConfig(vm.node.hostname, vm.proxmox_vmid, config);
  }
  
  if (data.ssd_gb && data.ssd_gb > vm.ssd_gb) {
    await this.proxmoxService.resizeDisk(vm.node.hostname, vm.proxmox_vmid, 'scsi0', data.ssd_gb);
  }
  
  const updated = await this.prisma.vM.update({
    where: { id },
    data: {
      vcpu: data.vcpu || vm.vcpu,
      ram_gb: data.ram_gb || vm.ram_gb,
      ssd_gb: data.ssd_gb || vm.ssd_gb,
    },
  });
  
  if (vm.status === 'running') {
    await this.proxmoxService.startVM(vm.node.hostname, vm.proxmox_vmid);
  }
  
  return { success: true, message: 'VM resized successfully', vm: updated };
}

async adminMigrateVM(id: number, targetNodeId: number) {
  const vm = await this.prisma.vM.findUnique({
    where: { id },
    include: { node: true },
  });
  
  if (!vm) {
    throw new NotFoundException(`VM with ID ${id} not found`);
  }
  
  const targetNode = await this.prisma.node.findUnique({
    where: { id: targetNodeId },
  });
  
  if (!targetNode) {
    throw new NotFoundException(`Target node with ID ${targetNodeId} not found`);
  }
  
  await this.proxmoxService.migrateVM(vm.node.hostname, vm.proxmox_vmid, targetNode.hostname);
  
  await this.prisma.vM.update({
    where: { id },
    data: { node_id: targetNodeId },
  });
  
  return { success: true, message: `VM migrated to ${targetNode.hostname}` };
}

async adminGetConsole(id: number) {
  const vm = await this.prisma.vM.findUnique({
    where: { id },
    include: { node: true },
  });
  
  if (!vm) {
    throw new NotFoundException(`VM with ID ${id} not found`);
  }
  
  const vncProxy = await this.proxmoxService.getVNCProxy(vm.node.hostname, vm.proxmox_vmid);
  
  return {
    success: true,
    data: {
      vmid: vm.proxmox_vmid,
      port: vncProxy.port,
      ticket: vncProxy.ticket,
      host: vm.node.hostname,
      url: `ws://${vm.node.hostname}:${vncProxy.port}/websockify`,
    },
  };
}

async adminGetVMStatss(id: number, days: number = 30) {
  const vm = await this.prisma.vM.findUnique({
    where: { id },
    include: { node: true },
  });
  
  if (!vm) {
    throw new NotFoundException(`VM with ID ${id} not found`);
  }
  
  const metrics = await this.prisma.vMMetric.findMany({
    where: {
      vm_id: vm.id,
      recorded_at: {
        gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { recorded_at: 'asc' },
  });
  
  let realtimeStats = null;
  try {
    realtimeStats = await this.proxmoxService.getVMStatus(vm.node.hostname, vm.proxmox_vmid);
  } catch (error) {
    this.logger.error(`Failed to get realtime stats: ${error.message}`);
  }
  
  return {
    vm: {
      id: vm.id,
      name: vm.name,
      vmid: vm.proxmox_vmid,
    },
    historical: metrics,
    realtime: realtimeStats,
  };
}

async adminGetVMBilling(id: number, startDate?: string, endDate?: string) {
  const vm = await this.prisma.vM.findUnique({
    where: { id },
    include: { plan: true },
  });
  
  if (!vm) {
    throw new NotFoundException(`VM with ID ${id} not found`);
  }
  
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate ? new Date(startDate) : vm.created_at;
  
  const hoursInPeriod = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60)));
  const hourlyCost = vm.hourly_rate?.toNumber() || vm.plan?.hourly_price?.toNumber() || 0;
  const monthlyCost = vm.monthly_rate?.toNumber() || vm.plan?.monthly_price?.toNumber() || 0;
  
  const currentCost = hourlyCost * hoursInPeriod;
  const estimatedMonthlyCost = monthlyCost > 0 ? monthlyCost : hourlyCost * 730;
  
  return {
    vmId: vm.id,
    vmName: vm.name,
    hourlyRate: Number(hourlyCost.toFixed(4)),
    monthlyRate: Number(monthlyCost.toFixed(4)),
    currentCost: Number(currentCost.toFixed(2)),
    estimatedMonthlyCost: Number(estimatedMonthlyCost.toFixed(2)),
    billingPeriod: { start, end },
    usage: {
      hours: hoursInPeriod,
      days: Math.ceil(hoursInPeriod / 24),
    },
  };
}





}