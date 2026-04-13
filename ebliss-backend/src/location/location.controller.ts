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
} from '@nestjs/common';
import { LocationService } from './location.service';
import { CreateLocationDto, UpdateLocationDto } from './dto/location.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('locations')
@UseGuards(JwtAuthGuard)
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  /**
   * Get all locations (Proxmox nodes)
   */
  @Get()
  async getAllLocations() {
    const locations = await this.locationService.getAllLocations();
    return {
      success: true,
      locations,
      total: locations.length,
      available: locations.filter(l => l.available).length,
    };
  }

  /**
   * Get a single location by ID
   */
  @Get(':locationId')
  async getLocation(@Param('locationId') locationId: string) {
    const location = await this.locationService.getLocation(locationId);
    return {
      success: true,
      location,
    };
  }

  /**
   * Create/Update location metadata
   */
  @Post(':locationId')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  async upsertLocation(
    @Param('locationId') locationId: string,
    @Body() dto: CreateLocationDto,
  ) {
    const location = await this.locationService.upsertLocation(locationId, dto);
    return {
      success: true,
      location,
      message: 'Location metadata updated successfully',
    };
  }

  /**
   * Update location metadata
   */
  @Put(':locationId')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  async updateLocation(
    @Param('locationId') locationId: string,
    @Body() dto: UpdateLocationDto,
  ) {
    const location = await this.locationService.updateLocation(locationId, dto);
    return {
      success: true,
      location,
      message: 'Location updated successfully',
    };
  }

  /**
   * Delete location metadata
   */
  /**
 * Delete location metadata
 */
@Delete(':locationId')
@Roles('ADMIN')
@UseGuards(RolesGuard)
@HttpCode(HttpStatus.OK)
async deleteLocation(@Param('locationId') locationId: string) {
  const result = await this.locationService.deleteLocation(locationId);
  return {
    ...result,
  };
}
  /**
   * Get location statistics
   */
  @Get(':locationId/stats')
  async getLocationStats(@Param('locationId') locationId: string) {
    const stats = await this.locationService.getLocationStats(locationId);
    return {
      success: true,
      stats,
    };
  }

  /**
   * Get location health status
   */
  @Get(':locationId/health')
  async getLocationHealth(@Param('locationId') locationId: string) {
    const health = await this.locationService.getLocationHealth(locationId);
    return {
      success: true,
      health,
    };
  }

  /**
   * Get all available locations for deployment
   */
  @Get('available/deploy')
  async getAvailableLocations() {
    const locations = await this.locationService.getAllLocations();
    const available = locations.filter(l => l.available);
    return {
      success: true,
      locations: available,
      total: available.length,
    };
  }
}