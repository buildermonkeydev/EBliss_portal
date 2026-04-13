// src/location/admin-location.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { LocationService } from './location.service';
import { CreateLocationDto, UpdateLocationDto } from './dto/location.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, AdminRole } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Admin - Locations')
@Controller('admin/locations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminLocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get()
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL)
  @ApiOperation({ summary: 'Get all locations/POPs (Admin)' })
  @ApiQuery({ name: 'include_inactive', required: false, type: Boolean })
  async getAllLocations(
    @Query('include_inactive') includeInactive: boolean = true,
  ) {
    return this.locationService.adminGetAllLocations(includeInactive);
  }

  @Get('stats')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL, AdminRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get locations statistics (Admin)' })
  async getLocationsStats() {
    return this.locationService.adminGetLocationsStats();
  }

  @Get(':id')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL)
  @ApiOperation({ summary: 'Get location by ID (Admin)' })
  async getLocation(@Param('id') id: string) {
    return this.locationService.adminGetLocationById(id);
  }

  @Post()
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create new location/POP (Admin)' })
  async createLocation(@Body() dto: CreateLocationDto) {
    return this.locationService.adminCreateLocation(dto);
  }

  @Put(':id')
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update location (Admin)' })
  async updateLocation(
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.locationService.adminUpdateLocation(id, dto);
  }

  @Delete(':id')
  @Roles(AdminRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete location (Admin)' })
  async deleteLocation(@Param('id') id: string) {
    return this.locationService.adminDeleteLocation(id);
  }

  @Patch(':id/toggle')
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Toggle location availability (Admin)' })
  async toggleLocationAvailability(@Param('id') id: string) {
    return this.locationService.adminToggleLocationAvailability(id);
  }

  @Get(':id/nodes')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL)
  @ApiOperation({ summary: 'Get nodes in location (Admin)' })
  async getLocationNodes(@Param('id') id: string) {
    return this.locationService.adminGetLocationNodes(id);
  }

  @Get(':id/stats')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL, AdminRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get detailed location statistics (Admin)' })
  async getLocationDetailedStats(@Param('id') id: string) {
    return this.locationService.adminGetLocationDetailedStats(id);
  }

  @Post(':id/sync')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL)
  @ApiOperation({ summary: 'Sync location with Proxmox (Admin)' })
  async syncLocation(@Param('id') id: string) {
    return this.locationService.adminSyncLocation(id);
  }
}