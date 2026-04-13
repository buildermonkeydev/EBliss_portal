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
import { ColocationService } from './colocation.service';
import { CreateColocationDto } from './dto/create-colocation.dto';
import { UpdateColocationDto } from './dto/update-colocation.dto';
import { AssignColocationDto } from './dto/assign-colocation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ColocationStatus } from '@prisma/client';

@Controller('colocations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ColocationController {
  constructor(private readonly colocationService: ColocationService) {}

  @Post()
  @Roles('admin', 'super_admin')
  create(@Body() createDto: CreateColocationDto) {
    return this.colocationService.create(createDto);
  }

  @Get()
  @Roles('admin', 'super_admin', 'technical', 'customer')
  findAll(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('status') status?: ColocationStatus,
    @Query('datacenter') datacenter?: string,
    @Query('userId', new DefaultValuePipe(0), ParseIntPipe) userId?: number,
    @Query('search') search?: string,
  ) {
    return this.colocationService.findAll({
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
    return this.colocationService.getStatistics();
  }

  @Get('racks')
  @Roles('admin', 'super_admin', 'technical')
  getAvailableRacks(@Query('datacenter') datacenter?: string) {
    return this.colocationService.getAvailableRacks(datacenter);
  }

  @Get('racks/:rackId/availability')
  @Roles('admin', 'super_admin', 'technical')
  getRackAvailability(@Param('rackId') rackId: string) {
    return this.colocationService.getRackAvailability(rackId);
  }

  @Get('user/me')
  @Roles('admin', 'super_admin', 'technical', 'customer')
  getUserColocations(@CurrentUser() user: any) {
    return this.colocationService.findAll({ userId: user.id });
  }

  @Get(':id')
  @Roles('admin', 'super_admin', 'technical')
  findOne(@Param('id') id: string) {
    return this.colocationService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin', 'super_admin')
  update(@Param('id') id: string, @Body() updateDto: UpdateColocationDto) {
    return this.colocationService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.colocationService.remove(id);
  }

  @Post(':id/assign')
  @Roles('admin', 'super_admin')
  assignToUser(@Param('id') id: string, @Body() assignDto: AssignColocationDto) {
    return this.colocationService.assignToUser(id, assignDto);
  }

  @Post(':id/unassign')
  @Roles('admin', 'super_admin')
  unassignColocation(@Param('id') id: string) {
    return this.colocationService.unassignColocation(id);
  }

  @Patch(':id/status')
  @Roles('admin', 'super_admin', 'technical')
  updateStatus(@Param('id') id: string, @Body('status') status: ColocationStatus) {
    return this.colocationService.updateStatus(id, status);
  }

  @Patch(':id/power')
  @Roles('admin', 'super_admin', 'technical')
  updatePowerUsage(@Param('id') id: string, @Body('power_used_kw') power_used_kw: number) {
    return this.colocationService.updatePowerUsage(id, power_used_kw);
  }

  @Patch(':id/bandwidth')
  @Roles('admin', 'super_admin', 'technical')
  updateBandwidthUsage(@Param('id') id: string, @Body('bandwidth_used_mbps') bandwidth_used_mbps: number) {
    return this.colocationService.updateBandwidthUsage(id, bandwidth_used_mbps);
  }

  @Post(':id/access')
  @Roles('admin', 'super_admin', 'technical')
  logAccess(@Param('id') id: string, @Body() data: any) {
    return this.colocationService.logAccess(id, data);
  }

  @Get(':id/access-logs')
  @Roles('admin', 'super_admin', 'technical')
  getAccessLogs(@Param('id') id: string, @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number) {
    return this.colocationService.getAccessLogs(id, limit);
  }
}