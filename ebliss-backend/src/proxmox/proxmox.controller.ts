import { Controller, Post, Get, Body, UseGuards, Req, HttpCode, HttpStatus, Query, Param, Logger } from '@nestjs/common';
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
    private readonly logger = new Logger(ProxmoxController.name);

  constructor(
    private readonly proxmoxService: ProxmoxService,
    private readonly prisma: PrismaService,
  ) {}

@Post('deploy')
  @HttpCode(HttpStatus.CREATED)
  async deployVM(@Body() dto: any, @Req() req: any) {
    this.logger.log('=== DEPLOY VM START ===');
    this.logger.log(`User: ${req.user.id}, Hostname: ${dto.hostname}`);
    
    try {
      const vmid = Math.floor(Math.random() * 900000) + 100000;
      
      const isLXC = dto.os?.includes('vztmpl') || dto.os?.includes('tar.zst') || dto.os?.includes('tar.gz');
      const isISO = dto.os?.includes('.iso');
      
      this.logger.log(`Template type: ${isLXC ? 'LXC' : isISO ? 'ISO' : 'Cloud-Init/QEMU'}`);
      
      let result;
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
        this.logger.log(`Created default POP with ID: ${pop.id}`);
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
            ip_address: dto.location,
          },
        });
        this.logger.log(`Created node with ID: ${node.id}`);
      }
      
      const ramGb = dto.memory / 1024;
      const diskGb = dto.disk;
      const cores = dto.cores;
      const hourlyRate = dto.hourlyRate || this.calculateHourlyRate(cores, ramGb, diskGb);
      const monthlyRate = dto.monthlyRate || hourlyRate * 730;
      
      // ✅ Create or find plan
      let plan = await this.prisma.plan.findFirst({
        where: {
          vcpu: cores,
          ram_gb: ramGb,
          ssd_gb: diskGb,
        },
      });
      
      if (!plan) {
        this.logger.log(`Creating new plan: ${cores}vCPU, ${ramGb}GB RAM, ${diskGb}GB SSD`);
        
        plan = await this.prisma.plan.create({
          data: {
            name: `Custom ${cores} vCPU, ${ramGb} GB RAM, ${diskGb} GB SSD`,
            type: 'hourly',
            vcpu: cores,
            ram_gb: ramGb,
            ssd_gb: diskGb,
            bandwidth_gb: dto.bandwidth || 5000,
            hourly_price: hourlyRate,
            monthly_price: monthlyRate,
            is_active: true,
          },
        });
        this.logger.log(`✅ Plan created with ID: ${plan.id}`);
      } else {
        this.logger.log(`✅ Using existing plan with ID: ${plan.id}`);
      }
      
      // ✅ CRITICAL: Verify plan exists in database before using it
      const planVerify = await this.prisma.plan.findUnique({
        where: { id: plan.id }
      });
      
      if (!planVerify) {
        throw new Error(`Plan with ID ${plan.id} does not exist in database`);
      }
      
      this.logger.log(`✅ Plan verified in database. Plan ID: ${plan.id}`);
      
      // Get SSH key content if provided
      let sshKeyContent: string | undefined;
      if (dto.sshKeyId) {
        const sshKey = await this.prisma.sSHKey.findFirst({
          where: { 
            id: parseInt(dto.sshKeyId), 
            user_id: userId 
          },
        });
        sshKeyContent = sshKey?.public_key;
        this.logger.log(`SSH Key found: ${sshKey ? 'Yes' : 'No'}`);
      }
      
      // Deploy to Proxmox
      if (isLXC) {
        this.logger.log('Creating LXC container...');
        result = await this.proxmoxService.createLXC(dto.location, {
          vmid: vmid,
          hostname: dto.hostname,
          cores: cores,
          memory: dto.memory,
          disk: diskGb,
          ostemplate: dto.os,
          password: dto.password,
          sshkeys: sshKeyContent,
          start: 1,
          onboot: 1,
        });
      } else if (isISO) {
        this.logger.log('Creating QEMU VM with ISO...');
        result = await this.proxmoxService.createQEMU(dto.location, {
          vmid: vmid,
          name: dto.hostname,
          cores: cores,
          memory: dto.memory,
          disk: diskGb,
          iso: dto.os,
          password: dto.password,
          sshkeys: sshKeyContent,
          hostname: dto.hostname,
          start: 1,
          onboot: 1,
        });
      } else {
        this.logger.log('Creating QEMU VM with Cloud-Init...');
        result = await this.proxmoxService.createQEMU(dto.location, {
          vmid: vmid,
          name: dto.hostname,
          cores: cores,
          memory: dto.memory,
          disk: diskGb,
          ostemplate: dto.os,
          password: dto.password,
          sshkeys: sshKeyContent,
          hostname: dto.hostname,
          start: 1,
          onboot: 1,
        });
      }
      
      this.logger.log(`Proxmox deployment result: ${JSON.stringify(result)}`);
      
      // ✅ Create VM record with VERIFIED plan_id
      const vmConfig = {
        user_id: userId,
        node_id: node.id,
        plan_id: plan.id,  // ✅ Now guaranteed to exist
        proxmox_vmid: vmid,
        name: dto.hostname,
        hostname: dto.hostname,
        vcpu: cores,
        ram_gb: ramGb,
        ssd_gb: diskGb,
        plan_type: 'hourly' as const,
        status: 'creating' as const,
        hourly_rate: hourlyRate,
        monthly_rate: monthlyRate,
        ssh_key_ids: dto.sshKeyId ? [parseInt(dto.sshKeyId)] : [],
        cloud_init_data: dto.userData ? JSON.parse(dto.userData) : null,
      };
      
      this.logger.log(`Creating VM with config: ${JSON.stringify({
        ...vmConfig,
        cloud_init_data: vmConfig.cloud_init_data ? '[REDACTED]' : null
      })}`);
      
      const savedVM = await this.prisma.vM.create({
        data: vmConfig,
      });
      
      this.logger.log(`✅ VM created in database with ID: ${savedVM.id}`);
      
      // Create activity log
      await this.prisma.activityLog.create({
        data: {
          user_id: userId,
          action: 'VM_DEPLOYED',
          action_type: 'create',
          description: `Deployed VM ${dto.hostname} with ${cores} cores, ${ramGb} GB RAM, ${diskGb} GB storage`,
          service_type: 'vps',
          service_name: dto.hostname,
          status: 'success',
          metadata: {
            vmid: vmid,
            cores: cores,
            memory: dto.memory,
            disk: diskGb,
            os: dto.os,
            plan_id: plan.id,
            node_id: node.id,
          },
        },
      });
      
      // Optional: Deduct from wallet if you want to handle billing here
      // This can be done in a separate transaction or service
      
      return {
        success: true,
        message: 'VM deployed successfully',
        data: { 
          id: savedVM.id,
          vmid: vmid, 
          hostname: dto.hostname, 
          status: 'creating',
          plan_id: plan.id,
        },
      };
    } catch (error) {
      this.logger.error('Deployment error:', error);
      return {
        success: false,
        message: error.message || 'Failed to deploy VM',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
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