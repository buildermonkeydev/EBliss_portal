import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  Delete,
  Put,
  NotFoundException,
} from '@nestjs/common';
import { VMService } from './vm.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ProxmoxService } from '../proxmox/proxmox.service';
import { PrismaService } from '../prisma/prisma.service';



@ApiTags('Virtual Machines')
@Controller('vms')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VMController {
  constructor(
    private readonly vmService: VMService,
    private readonly proxmoxService: ProxmoxService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @Throttle({ default: { ttl: 60, limit: 5 } })
  @ApiOperation({ summary: 'Create a new VM' })
  async createVM(@Req() req, @Body() data: any) {
    return this.vmService.createVM(req.user.id, data);
  }

  @Get()
  @ApiOperation({ summary: 'Get all VMs' })
  async getAllVMs(
    @Req() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('status') status?: string,
  ) {
    return this.vmService.getAllVMs(req.user.id, page, limit, status as any);
  }

  @Get('running-cost')
  @ApiOperation({ summary: 'Get total running cost of VMs' })
  async getRunningCost(@Req() req) {
    return this.vmService.getRunningCost(req.user.id);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync VMs from Proxmox' })
  async syncVMs(@Req() req) {
    return this.vmService.syncVMsFromProxmox(req.user.id);
  }

@Get(':vmid/billing')
@ApiOperation({ summary: 'Get billing of each VM' })
async getVMBilling(
  @Param('vmid', ParseIntPipe) vmid: number,
  @Req() req,
  @Query('startDate') startDate?: string,
  @Query('endDate') endDate?: string,
) {
  return this.vmService.getVMBilling(req.user.id, vmid, startDate, endDate);
}
  @Get('billing/summary')
  @ApiOperation({ summary: 'Get billing summary for all VMs' })
  async getAllVMsBillingSummary(@Req() req) {
    return this.vmService.getAllVMsBillingSummary(req.user.id);
  }

  @Get('billing/total-monthly-cost')
  @ApiOperation({ summary: 'Get total monthly cost for all VMs' })
  async getTotalMonthlyCost(@Req() req) {
    const total = await this.vmService.getTotalMonthlyCost(req.user.id);
    return { totalMonthlyCost: total };
  }

  @Get('billing/hourly-breakdown')
  @ApiOperation({ summary: 'Get hourly billing breakdown for a specific date' })
  async getHourlyBreakdown(
    @Req() req,
    @Query('date') date?: string,
  ) {
    return this.vmService.getHourlyBreakdown(req.user.id, date);
  }

  @Get('billing/invoice')
  @ApiOperation({ summary: 'Generate invoice for a specific month' })
  async generateInvoice(
    @Req() req,
    @Query('vmId') vmId?: string,
    @Query('month') month?: string,
  ) {
    return this.vmService.generateInvoice(
      req.user.id,
      vmId ? parseInt(vmId) : undefined,
      month,
    );
  }

  @Get(':vid/billing/projected')
  @ApiOperation({ summary: 'Get projected billing for current month' })
  async getProjectedBilling(
    @Param('vid', ParseIntPipe) vid: number,
    @Req() req,
  ) {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return this.vmService.getVMBilling(req.user.id, vid, now.toISOString(), endOfMonth.toISOString());
  }
  @Post('sync/:vmid')
  @ApiOperation({ summary: 'Sync a specific VM from Proxmox' })
  async syncSingleVM(@Param('vmid', ParseIntPipe) vmid: number, @Req() req) {
    const result = await this.vmService.syncSingleVM(req.user.id, vmid);
    return result;
  }

  @Get(':vmid/vnc-token')
  @ApiOperation({ summary: 'Get VNC token for VM console' })
  async getVncToken(@Param('vmid', ParseIntPipe) vmid: number, @Req() req) {
    const vm = await this.prisma.vM.findFirst({
      where: { proxmox_vmid: vmid, user_id: req.user.id },
      include: { node: true },
    });
    
    if (!vm) {
      throw new NotFoundException('VM not found');
    }

    const vncProxy = await this.proxmoxService.getVNCProxy(vm.node.hostname, vmid);
    const nodeIp = vm.node.ip_address || vm.node.hostname;

    return {
      success: true,
      data: {
        wsUrl: `ws://${nodeIp}:${vncProxy.port}/websockify`,
        port: vncProxy.port,
        ticket: vncProxy.ticket,
        host: nodeIp,
        vmid: vmid,
      },
    };
  }

  @Get(':vmid/exists')
  @ApiOperation({ summary: 'Check if VM exists in Proxmox' })
  async checkVMExists(@Param('vmid', ParseIntPipe) vmid: number, @Req() req) {
    return this.vmService.checkVMExists(req.user.id, vmid);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get VM details' })
  async getVM(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.vmService.getVM(req.user.id, id);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start VM' })
  async startVM(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.vmService.startVM(req.user.id, id);
  }

  @Post(':id/stop')
  @ApiOperation({ summary: 'Stop VM' })
  async stopVM(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.vmService.stopVM(req.user.id, id);
  }

  @Post(':id/restart')
  @ApiOperation({ summary: 'Restart VM' })
  async restartVM(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.vmService.restartVM(req.user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete VM' })
  async deleteVM(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.vmService.deleteVM(req.user.id, id);
  }

  @Post(':id/rebuild')
  @ApiOperation({ summary: 'Rebuild VM' })
  async rebuildVM(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: any,
  ) {
    return this.vmService.rebuildVM(req.user.id, id, data);
  }

  @Put(':id/resize')
  @ApiOperation({ summary: 'Resize VM' })
  async resizeVM(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: any,
  ) {
    return this.vmService.resizeVM(req.user.id, id, data);
  }

  @Post(':id/snapshot')
  @ApiOperation({ summary: 'Create VM snapshot' })
  async createSnapshot(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name: string; description?: string },
  ) {
    return this.vmService.createSnapshot(req.user.id, id, body.name, body.description);
  }

  @Post(':id/snapshot/:snapshotName/rollback')
  @ApiOperation({ summary: 'Rollback snapshot' })
  async rollbackSnapshot(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Param('snapshotName') snapshotName: string,
  ) {
    return this.vmService.rollbackSnapshot(req.user.id, id, snapshotName);
  }

  @Get(':id/console')
  @ApiOperation({ summary: 'Get VNC console access' })
  async getConsole(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.vmService.getVNCConsole(req.user.id, id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get VM statistics' })
  async getStats(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Query('days') days: number = 30,
  ) {
    return this.vmService.getVMStats(req.user.id, id, days);
  }

 // vm.controller.ts - Add these endpoints

@Post('check-balance')
@ApiOperation({ summary: 'Check if user has sufficient balance for deployment' })
async checkBalance(
  @Req() req,
  @Body() body: { monthlyCost: number; hourlyRate: number }
) {
  return this.vmService.checkBalance(req.user.id, body);
}

// In your controller, update the deploy endpoint
@Post('deploy')
@ApiOperation({ summary: 'Deploy a new VM with balance check' })
async deployVM(@Req() req, @Body() data: any) {
  // Map frontend data to expected format
  const deploymentData = {
    hostname: data.hostname,
    password: data.password,
    sshKeyId: data.sshKeyId,
    location: data.location, // This is the node hostname from locations API
    os: data.os, // This is the volumeId from os-templates API
    cores: data.cores,
    memory: data.memory,
    disk: data.disk,
    bandwidth: data.bandwidth,
    firewallGroup: data.firewallGroup,
    userData: data.userData,
    enableBackup: data.enableBackup,
    enableMonitoring: data.enableMonitoring,
    hourlyRate: data.hourlyRate,
    monthlyRate: data.monthlyRate
  };
  
  return this.vmService.deployVM(req.user.id, deploymentData);
}
}