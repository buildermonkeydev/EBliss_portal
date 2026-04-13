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
import { RackService } from './rack.service';
import { CreateRackDto } from './dto/create-rack.dto';
import { UpdateRackDto } from './dto/update-rack.dto';
import { CreateRackDeviceDto } from './dto/create-rack-device.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RackStatus, DeviceStatus } from '@prisma/client';

@Controller('racks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RackController {
  constructor(private readonly rackService: RackService) {}

  // ============================================
  // Rack CRUD Endpoints
  // ============================================

  @Post()
  @Roles('admin', 'super_admin')
  createRack(@Body() createDto: CreateRackDto) {
    return this.rackService.createRack(createDto);
  }

  @Get()
  @Roles('admin', 'super_admin', 'technical')
  getAllRacks(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('datacenter') datacenter?: string,
    @Query('status') status?: RackStatus,
    @Query('search') search?: string,
  ) {
    return this.rackService.getAllRacks({ skip, take, datacenter, status, search });
  }

  @Get('statistics')
  @Roles('admin', 'super_admin', 'technical')
  getRackStatistics() {
    return this.rackService.getRackStatistics();
  }

  @Get('available-space')
  @Roles('admin', 'super_admin', 'technical')
  findAvailableRackSpace(
    @Query('datacenter') datacenter: string,
    @Query('requiredUnits', ParseIntPipe) requiredUnits: number,
    @Query('requiredPowerKw') requiredPowerKw?: string,
  ) {
    return this.rackService.findAvailableRackSpace(
      datacenter,
      requiredUnits,
      requiredPowerKw ? parseFloat(requiredPowerKw) : undefined,
    );
  }

  @Get(':id')
  @Roles('admin', 'super_admin', 'technical')
  getRackById(@Param('id') id: string) {
    return this.rackService.getRackById(id);
  }

  @Patch(':id')
  @Roles('admin', 'super_admin')
  updateRack(@Param('id') id: string, @Body() updateDto: UpdateRackDto) {
    return this.rackService.updateRack(id, updateDto);
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  deleteRack(@Param('id') id: string) {
    return this.rackService.deleteRack(id);
  }

  @Patch(':id/status')
  @Roles('admin', 'super_admin', 'technical')
  updateRackStatus(
    @Param('id') id: string,
    @Body('status') status: RackStatus,
    @Body('reason') reason?: string,
  ) {
    return this.rackService.updateRackStatus(id, status, reason);
  }

  @Patch(':id/power')
  @Roles('admin', 'super_admin', 'technical')
  updateRackPower(@Param('id') id: string, @Body('power_used_kw') power_used_kw: number) {
    return this.rackService.updateRackPower(id, power_used_kw);
  }

  @Patch(':id/environment')
  @Roles('admin', 'super_admin', 'technical')
  updateRackEnvironment(
    @Param('id') id: string,
    @Body('temperature_c') temperature_c?: number,
    @Body('humidity_percent') humidity_percent?: number,
  ) {
    return this.rackService.updateRackEnvironment(id, temperature_c, humidity_percent);
  }

  @Post(':id/inspection')
  @Roles('admin', 'super_admin', 'technical')
  performInspection(@Param('id') id: string, @Body('notes') notes?: string) {
    return this.rackService.performInspection(id, notes);
  }

  // ============================================
  // Rack Device Endpoints
  // ============================================

  @Post(':rackId/devices')
  @Roles('admin', 'super_admin', 'technical')
  addDevice(@Param('rackId') rackId: string, @Body() deviceDto: CreateRackDeviceDto) {
    return this.rackService.addDevice(rackId, deviceDto);
  }

  @Get(':rackId/devices')
  @Roles('admin', 'super_admin', 'technical')
  getRackDevices(@Param('rackId') rackId: string) {
    return this.rackService.getRackDevices(rackId);
  }

  @Patch(':rackId/devices/:deviceId')
  @Roles('admin', 'super_admin', 'technical')
  updateDevice(
    @Param('rackId') rackId: string,
    @Param('deviceId') deviceId: string,
    @Body() updateDto: Partial<CreateRackDeviceDto>,
  ) {
    return this.rackService.updateDevice(rackId, deviceId, updateDto);
  }

  @Delete(':rackId/devices/:deviceId')
  @Roles('admin', 'super_admin', 'technical')
  @HttpCode(HttpStatus.OK)
  removeDevice(@Param('rackId') rackId: string, @Param('deviceId') deviceId: string) {
    return this.rackService.removeDevice(rackId, deviceId);
  }

  @Patch(':rackId/devices/:deviceId/status')
  @Roles('admin', 'super_admin', 'technical')
  updateDeviceStatus(
    @Param('rackId') rackId: string,
    @Param('deviceId') deviceId: string,
    @Body('status') status: DeviceStatus,
  ) {
    return this.rackService.updateDeviceStatus(rackId, deviceId, status);
  }
}