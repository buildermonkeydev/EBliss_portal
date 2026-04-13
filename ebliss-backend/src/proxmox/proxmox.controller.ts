import { Controller, Post,Get, Body, UseGuards, Req, HttpCode, HttpStatus , Query , Param } from '@nestjs/common';
import { ProxmoxService } from './proxmox.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

interface DeployVMDto {
  hostname: string;
  password?: string;
  sshKeyId?: string | null;
  location: string;
  os: string;
  cores: number;
  memory: number;
  disk: number;
  bandwidth: number;
  firewallGroup?: string;
  userData?: string | null;
  enableBackup?: boolean;
  enableMonitoring?: boolean;
}

@Controller('proxmox')
@UseGuards(JwtAuthGuard)
export class ProxmoxController {
  constructor(
    private readonly proxmoxService: ProxmoxService,
    private readonly prisma: PrismaService,
  ) {}

@Post('deploy')
@HttpCode(HttpStatus.CREATED)
async deployVM(@Body() dto: any, @Req() req: any) {
  try {
    const vmid = Math.floor(Math.random() * 900000) + 100000;
    
    const isLXC = dto.os?.includes('vztmpl');
    const isISO = dto.os?.includes('.iso');
    
    let result;
    let vmConfig: any = {};
    
    const userId = parseInt(req.user.id);
    
    // Get or create POP first
    let pop = await this.prisma.pop.findFirst();
    if (!pop) {
      pop = await this.prisma.pop.create({
        data: {
          name: 'Default Data Center',
          city: 'Frankfurt',
          country: 'Germany',
          active: true,
        },
      });
    }
    
    // Get or create node
    let node = await this.prisma.node.findFirst({
      where: { hostname: dto.location },
    });
    
    if (!node) {
      node = await this.prisma.node.create({
        data: {
          hostname: dto.location,
          pop_id: pop.id,
          api_url: `https://${dto.location}:8006`,
          api_token_id: process.env.PROXMOX_TOKEN_ID || '',
          api_token_secret: process.env.PROXMOX_TOKEN_SECRET || '',
          max_vcpu: 64,
          max_ram_gb: 256,
          max_storage_gb: 2000,
          status: 'active',
        },
      });
    }
    
    // Get or create plan
    let plan = await this.prisma.plan.findFirst({
      where: {
        vcpu: dto.cores,
        ram_gb: dto.memory / 1024,
        ssd_gb: dto.disk,
      },
    });
    
    if (!plan) {
      plan = await this.prisma.plan.create({
        data: {
          name: `Custom ${dto.cores} vCPU, ${dto.memory / 1024} GB RAM`,
          type: 'hourly',
          vcpu: dto.cores,
          ram_gb: dto.memory / 1024,
          ssd_gb: dto.disk,
          bandwidth_gb: dto.bandwidth || 5000,
          hourly_price: this.calculateHourlyRate(dto.cores, dto.memory / 1024, dto.disk),
          is_active: true,
        },
      });
    }
    
    if (isLXC) {
      result = await this.proxmoxService.createLXC(dto.location, {
        vmid: vmid,
        hostname: dto.hostname,
        cores: dto.cores,
        memory: dto.memory,
        disk: dto.disk,
        ostemplate: dto.os,
        password: dto.password,
        sshkeys: dto.sshKeyId ? await this.getSSHKeyContent(dto.sshKeyId, userId) : undefined,
        start: 1,
        onboot: 1,
      });
      
      vmConfig = {
        user_id: userId,
        node_id: node.id,
        plan_id: plan.id,
        proxmox_vmid: vmid,
        name: dto.hostname,
        hostname: dto.hostname,
        vcpu: dto.cores,
        ram_gb: dto.memory / 1024,
        ssd_gb: dto.disk,
        plan_type: 'hourly',
        status: 'creating',
        hourly_rate: this.calculateHourlyRate(dto.cores, dto.memory / 1024, dto.disk),
        ssh_key_ids: dto.sshKeyId ? [parseInt(dto.sshKeyId)] : [],
      };
      
    } else if (isISO) {
      result = await this.proxmoxService.createQEMU(dto.location, {
        vmid: vmid,
        name: dto.hostname,
        cores: dto.cores,
        memory: dto.memory,
        disk: dto.disk,
        iso: dto.os,
        password: dto.password,
        sshkeys: dto.sshKeyId ? await this.getSSHKeyContent(dto.sshKeyId, userId) : undefined,
        hostname: dto.hostname,
        start: 1,
        onboot: 1,
      });
      
      vmConfig = {
        user_id: userId,
        node_id: node.id,
        plan_id: plan.id,
        proxmox_vmid: vmid,
        name: dto.hostname,
        hostname: dto.hostname,
        vcpu: dto.cores,
        ram_gb: dto.memory / 1024,
        ssd_gb: dto.disk,
        plan_type: 'hourly',
        status: 'creating',
        hourly_rate: this.calculateHourlyRate(dto.cores, dto.memory / 1024, dto.disk),
        ssh_key_ids: dto.sshKeyId ? [parseInt(dto.sshKeyId)] : [],
      };
      
    } else {
      result = await this.proxmoxService.createQEMU(dto.location, {
        vmid: vmid,
        name: dto.hostname,
        cores: dto.cores,
        memory: dto.memory,
        disk: dto.disk,
        password: dto.password,
        sshkeys: dto.sshKeyId ? await this.getSSHKeyContent(dto.sshKeyId, userId) : undefined,
        hostname: dto.hostname,
        start: 1,
        onboot: 1,
      });
      
      vmConfig = {
        user_id: userId,
        node_id: node.id,
        plan_id: plan.id,
        proxmox_vmid: vmid,
        name: dto.hostname,
        hostname: dto.hostname,
        vcpu: dto.cores,
        ram_gb: dto.memory / 1024,
        ssd_gb: dto.disk,
        plan_type: 'hourly',
        status: 'creating',
        hourly_rate: this.calculateHourlyRate(dto.cores, dto.memory / 1024, dto.disk),
        ssh_key_ids: dto.sshKeyId ? [parseInt(dto.sshKeyId)] : [],
      };
    }
    
    const savedVM = await this.prisma.vM.create({
      data: vmConfig,
    });
    
    await this.prisma.activityLog.create({
      data: {
        user_id: userId,
        action: 'VM_DEPLOYED',
        action_type: 'create',
        description: `Deployed VM ${dto.hostname} with ${dto.cores} cores, ${dto.memory / 1024} GB RAM, ${dto.disk} GB storage`,
        service_type: 'vps',
        service_name: dto.hostname,
        status: 'success',
        metadata: {
          vmid: vmid,
          cores: dto.cores,
          memory: dto.memory,
          disk: dto.disk,
          os: dto.os,
        },
      },
    });
    
    return {
      success: true,
      message: 'VM deployed successfully',
      data: { 
        id: savedVM.id,
        vmid: vmid, 
        hostname: dto.hostname, 
        status: 'creating' 
      },
    };
  } catch (error) {
    console.error('Deployment error:', error);
    return {
      success: false,
      message: error.message || 'Failed to deploy VM',
    };
  }
}
  @Get('status')
  async getVMStatus(@Query('vmid') vmid: string, @Req() req: any) {
    try {
      const userId = parseInt(req.user.id);
      const vmId = parseInt(vmid);
      
      // First, check if VM belongs to user
      const vm = await this.prisma.vM.findFirst({
        where: {
          proxmox_vmid: vmId,
          user_id: userId,
        },
        include: {
          node: true,
        },
      });
      
      if (!vm) {
        return {
          success: false,
          message: 'VM not found or access denied',
        };
      }
      
      // Get status from Proxmox
      const status = await this.proxmoxService.getVMStatus(vm.node.hostname, vmId);
      
      return {
        success: true,
        data: {
          vmid: vmId,
          name: vm.name,
          status: status.status,
          cpu: status.cpu,
          maxcpu: status.maxcpu,
          mem: status.mem,
          maxmem: status.maxmem,
          disk: status.disk,
          maxdisk: status.maxdisk,
          netin: status.netin,
          netout: status.netout,
          diskread: status.diskread,
          diskwrite: status.diskwrite,
          uptime: status.uptime,
          cpus: status.cpus,
        },
      };
    } catch (error) {
      console.error('Failed to get VM status:', error);
      return {
        success: false,
        message: error.message || 'Failed to get VM status',
      };
    }
  }

  // Alternative: Get status by VM ID from database
  @Get('status/:id')
  async getVMStatusById(@Param('id') id: string, @Req() req: any) {
    try {
      const userId = parseInt(req.user.id);
      const vmId = parseInt(id);
      
      const vm = await this.prisma.vM.findFirst({
        where: {
          id: vmId,
          user_id: userId,
        },
        include: {
          node: true,
        },
      });
      
      if (!vm) {
        return {
          success: false,
          message: 'VM not found or access denied',
        };
      }
      
      const status = await this.proxmoxService.getVMStatus(vm.node.hostname, vm.proxmox_vmid);
      
      return {
        success: true,
        data: {
          id: vm.id,
          vmid: vm.proxmox_vmid,
          name: vm.name,
          status: status.status,
          cpu: status.cpu,
          maxcpu: status.maxcpu,
          mem: status.mem,
          maxmem: status.maxmem,
          disk: status.disk,
          maxdisk: status.maxdisk,
          netin: status.netin,
          netout: status.netout,
          diskread: status.diskread,
          diskwrite: status.diskwrite,
          uptime: status.uptime,
          cpus: status.cpus,
        },
      };
    } catch (error) {
      console.error('Failed to get VM status:', error);
      return {
        success: false,
        message: error.message || 'Failed to get VM status',
      };
    }
  }
  private calculateHourlyRate(cores: number, ramGB: number, diskGB: number): number {
    const basePrice = 0.12;
    const cpuPrice = cores * 0.10;
    const ramPrice = ramGB * 0.08;
    const diskPrice = diskGB * 0.012;
    return parseFloat((basePrice + cpuPrice + ramPrice + diskPrice).toFixed(4));
  }

  private async getSSHKeyContent(sshKeyId: string, userId: number): Promise<string> {
    const sshKey = await this.prisma.sSHKey.findFirst({
      where: { id: parseInt(sshKeyId), user_id: userId },
    });
    return sshKey?.public_key || '';
  }

  private async generateVMID(): Promise<number> {
    return Math.floor(Math.random() * 999900) + 100;
  }
}