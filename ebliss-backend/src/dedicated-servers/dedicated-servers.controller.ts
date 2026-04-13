import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DedicatedServersService } from './dedicated-servers.service';
import { CreateDedicatedServerDto } from './dto/create-server.dto';
import { UpdateDedicatedServerDto } from './dto/update-server.dto';
import { AssignServerDto } from './dto/assign-server.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ServerStatus, ProvisioningStatus } from '@prisma/client';

@Controller('dedicated-servers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DedicatedServersController {
  constructor(private readonly dedicatedServersService: DedicatedServersService) {}

  // ============================================
  // CRUD Endpoints
  // ============================================

  @Post()
  @Roles('admin', 'super_admin')
  create(@Body() createDto: CreateDedicatedServerDto) {
    return this.dedicatedServersService.create(createDto);
  }

  @Get()
  @Roles('admin', 'super_admin', 'technical' , 'customer' )
  findAll(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('status') status?: ServerStatus,
    @Query('datacenter') datacenter?: string,
    @Query('userId', new DefaultValuePipe(0), ParseIntPipe) userId?: number,
    @Query('search') search?: string,
  ) {
    return this.dedicatedServersService.findAll({
      skip,
      take,
      status,
      datacenter,
      userId: userId || undefined,
      search,
    });
  }

  @Get('statistics')
  @Roles('admin', 'super_admin', 'technical')
  getStatistics() {
    return this.dedicatedServersService.getStatistics();
  }

  @Get('racks')
  @Roles('admin', 'super_admin', 'technical')
  getAvailableRacks(@Query('datacenter') datacenter?: string) {
    return this.dedicatedServersService.getAvailableRacks(datacenter);
  }

  @Get(':id')
  @Roles('admin', 'super_admin', 'technical')
  findOne(@Param('id') id: string) {
    return this.dedicatedServersService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin', 'super_admin')
  update(@Param('id') id: string, @Body() updateDto: UpdateDedicatedServerDto) {
    return this.dedicatedServersService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.dedicatedServersService.remove(id);
  }

  // ============================================
  // User Assignment
  // ============================================

  @Post(':id/assign')
  @Roles('admin', 'super_admin')
  assignToUser(@Param('id') id: string, @Body() assignDto: AssignServerDto) {
    return this.dedicatedServersService.assignToUser(id, assignDto);
  }

  @Post(':id/unassign')
  @Roles('admin', 'super_admin')
  unassignServer(@Param('id') id: string) {
    return this.dedicatedServersService.unassignServer(id);
  }

  @Get('user/me')
  @Roles('admin', 'super_admin', 'technical', 'customer')
  getUserServers(@CurrentUser() user: any) {
    return this.dedicatedServersService.findAll({ userId: user.id });
  }

  // ============================================
  // Status Management
  // ============================================

  @Patch(':id/status')
  @Roles('admin', 'super_admin', 'technical')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: ServerStatus,
    @Body('reason') reason?: string,
  ) {
    return this.dedicatedServersService.updateStatus(id, status, reason);
  }

  @Patch(':id/provisioning-status')
  @Roles('admin', 'super_admin', 'technical')
  updateProvisioningStatus(
    @Param('id') id: string,
    @Body('status') status: ProvisioningStatus,
  ) {
    return this.dedicatedServersService.updateProvisioningStatus(id, status);
  }

  @Post(':id/reboot')
  @Roles('admin', 'super_admin', 'technical')
  reboot(@Param('id') id: string) {
    return this.dedicatedServersService.reboot(id);
  }

  // ============================================
  // Bandwidth & Monitoring
  // ============================================

  @Get(':id/bandwidth')
  @Roles('admin', 'super_admin', 'technical')
  getBandwidthStats(
    @Param('id') id: string,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.dedicatedServersService.getBandwidthStats(id, days);
  }

  @Post(':id/bandwidth')
  @Roles('admin', 'super_admin')
  recordBandwidthUsage(
    @Param('id') id: string,
    @Body('in_gb') in_gb: number,
    @Body('out_gb') out_gb: number,
  ) {
    return this.dedicatedServersService.recordBandwidthUsage(id, in_gb, out_gb);
  }

  @Post(':id/power')
  @Roles('admin', 'super_admin')
  recordPowerUsage(
    @Param('id') id: string,
    @Body('power_watts') power_watts: number,
    @Body('voltage') voltage?: number,
    @Body('current_amps') current_amps?: number,
  ) {
    return this.dedicatedServersService.recordPowerUsage(id, power_watts, voltage, current_amps);
  }

  // ============================================
  // Maintenance Windows
  // ============================================

  @Post(':id/maintenance')
  @Roles('admin', 'super_admin', 'technical')
  scheduleMaintenance(
    @Param('id') id: string,
    @Body() data: { title: string; description?: string; start_at: string; end_at: string },
    @CurrentUser() user: any,
  ) {
    return this.dedicatedServersService.scheduleMaintenance(id, {
      ...data,
      start_at: new Date(data.start_at),
      end_at: new Date(data.end_at),
      created_by: user.id,
    });
  }

  // ============================================
  // Server Logs
  // ============================================

  @Get(':id/logs')
  @Roles('admin', 'super_admin', 'technical')
  getServerLogs(
    @Param('id') id: string,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
    @Query('type') logType?: string,
  ) {
    return this.dedicatedServersService.getServerLogs(id, limit, logType);
  }
}