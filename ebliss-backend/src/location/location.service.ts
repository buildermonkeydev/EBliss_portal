import { Injectable, HttpException, HttpStatus, Logger , NotFoundException , ConflictException , BadRequestException} from '@nestjs/common';
import { ProxmoxService } from '../proxmox/proxmox.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationDto, UpdateLocationDto, Location } from './dto/location.dto';

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  constructor(
    private proxmoxService: ProxmoxService,
    private prisma: PrismaService,
  ) {}

  // Helper function to convert Prisma JsonValue to Record<string, any>
  private convertMetadata(metadata: any): Record<string, any> {
    if (!metadata) return {};
    if (typeof metadata === 'object' && metadata !== null) {
      return metadata as Record<string, any>;
    }
    return {};
  }

  async getAllLocations(): Promise<Location[]> {
    try {
      const nodes = await this.proxmoxService.getNodes();
      
      if (!nodes || nodes.length === 0) {
        return [];
      }

      const savedLocations = await this.prisma.location.findMany();
      const savedMap = new Map(savedLocations.map(l => [l.name, l]));

      const locations = await Promise.all(
        nodes.map(async (node: any) => {
          try {
            // Only fetch what's available
            const [status, network, dns] = await Promise.all([
              this.proxmoxService.getNodeStatus(node.node).catch(() => ({ status: node.status })),
              this.proxmoxService.getNodeNetwork(node.node).catch(() => []),
              this.proxmoxService.getNodeDNS(node.node).catch(() => ({ search: [], nameserver: [] })),
            ]);

            const saved = savedMap.get(node.node);
            
            // Convert metadata
            const metadata = this.convertMetadata(saved?.metadata);
            
            return {
              id: node.node,
              name: node.node,
              displayName: saved?.displayName || this.generateDisplayName(node.node),
              country: saved?.country || this.getCountry(node.node),
              city: saved?.city || this.getCity(node.node),
              flag: saved?.flag || this.getFlagEmoji(node.node),
              latency: saved?.latency || this.calculateLatency(node.node),
              priceMultiplier: saved?.priceMultiplier || this.getPriceMultiplier(node.node),
              available: saved?.available !== undefined ? saved.available : node.status === 'online',
              features: saved?.features || [],
              status: {
                online: node.status === 'online',
                cpu: node.cpu || 0,
                memory: {
                  total: node.maxmem || 0,
                  used: node.mem || 0,
                  free: (node.maxmem || 0) - (node.mem || 0),
                  usagePercent: node.maxmem > 0 ? ((node.mem || 0) / node.maxmem) * 100 : 0,
                },
                disk: {
                  total: node.maxdisk || 0,
                  used: node.disk || 0,
                  free: (node.maxdisk || 0) - (node.disk || 0),
                  usagePercent: node.maxdisk > 0 ? ((node.disk || 0) / node.maxdisk) * 100 : 0,
                },
                uptime: node.uptime || 0,
                loadavg: [node.loadavg?.[0] || 0, node.loadavg?.[1] || 0, node.loadavg?.[2] || 0],
              },
              hardware: {
                cpus: node.cpus || 0,
                sockets: node.sockets || 0,
                cores: node.cpuinfo?.cpus || 0,
                threads: node.cpuinfo?.threads || 0,
                model: node.cpuinfo?.model || 'Unknown',
              },
              network: {
                interfaces: network.map((iface: any) => ({
                  name: iface.iface,
                  type: iface.type,
                  active: iface.active === 1,
                  address: iface.address || '',
                  netmask: iface.netmask || '',
                  mac: iface.mac || '',
                })),
                dns: [...(dns.nameserver || []), ...(dns.search || [])],
              },
              version: node.version || '',
              createdAt: saved?.createdAt || new Date(),
              updatedAt: new Date(),
              metadata: metadata,
            };
          } catch (error) {
            this.logger.error(`Failed to fetch details for node ${node.node}:`, error);
            return this.getBasicLocationInfo(node, savedMap.get(node.node));
          }
        })
      );

      locations.sort((a, b) => {
        if (a.available !== b.available) return a.available ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      return locations;
    } catch (error) {
      this.logger.error('Failed to fetch locations:', error);
      throw new HttpException(
        'Failed to fetch locations from Proxmox',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get a single location by ID (node name)
   */
  async getLocation(locationId: string): Promise<Location> {
    try {
      // Get node from Proxmox
      const node = await this.proxmoxService.getNode(locationId);
      
      if (!node) {
        throw new HttpException('Location not found', HttpStatus.NOT_FOUND);
      }

      // Get saved metadata from database
      const saved = await this.prisma.location.findUnique({
        where: { name: locationId },
      });

      // Get additional details with error handling for missing endpoints
      const [status, stats, config, network, dns, time, services] = await Promise.all([
        this.proxmoxService.getNodeStatus(locationId).catch(() => ({ status: node.status })),
        this.proxmoxService.getNodeStats(locationId).catch(() => null),
        this.proxmoxService.getNodeConfig(locationId).catch(() => null),
        this.proxmoxService.getNodeNetwork(locationId).catch(() => []),
        this.proxmoxService.getNodeDNS(locationId).catch(() => ({ search: [], nameserver: [] })),
        this.proxmoxService.getNodeTime(locationId).catch(() => ({})),
        this.proxmoxService.getNodeServices(locationId).catch(() => []),
      ]);

      // Convert metadata to proper type
      const metadata = this.convertMetadata(saved?.metadata);

      return {
        id: locationId,
        name: locationId,
        displayName: saved?.displayName || this.generateDisplayName(locationId),
        country: saved?.country || this.getCountry(locationId),
        city: saved?.city || this.getCity(locationId),
        flag: saved?.flag || this.getFlagEmoji(locationId),
        latency: saved?.latency || this.calculateLatency(locationId),
        priceMultiplier: saved?.priceMultiplier || this.getPriceMultiplier(locationId),
        available: saved?.available !== undefined ? saved.available : node.status === 'online',
        features: saved?.features || this.getNodeFeatures(node, services || []),
        status: {
          online: node.status === 'online',
          cpu: node.cpu || 0,
          memory: {
            total: node.maxmem || 0,
            used: node.mem || 0,
            free: (node.maxmem || 0) - (node.mem || 0),
            usagePercent: node.maxmem > 0 ? ((node.mem || 0) / node.maxmem) * 100 : 0,
          },
          disk: {
            total: node.maxdisk || 0,
            used: node.disk || 0,
            free: (node.maxdisk || 0) - (node.disk || 0),
            usagePercent: node.maxdisk > 0 ? ((node.disk || 0) / node.maxdisk) * 100 : 0,
          },
          uptime: node.uptime || 0,
          loadavg: [node.loadavg?.[0] || 0, node.loadavg?.[1] || 0, node.loadavg?.[2] || 0],
        },
        hardware: {
          cpus: node.cpus || 0,
          sockets: node.sockets || 0,
          cores: node.cpuinfo?.cpus || 0,
          threads: node.cpuinfo?.threads || 0,
          model: node.cpuinfo?.model || 'Unknown',
        },
        network: {
          interfaces: network.map((iface: any) => ({
            name: iface.iface,
            type: iface.type,
            active: iface.active === 1,
            address: iface.address || '',
            netmask: iface.netmask || '',
            mac: iface.mac || '',
          })),
          dns: [...(dns.nameserver || []), ...(dns.search || [])],
        },
        version: node.version || '',
        createdAt: saved?.createdAt || new Date(),
        updatedAt: new Date(),
        metadata: metadata,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch location ${locationId}:`, error);
      throw new HttpException(
        error.message || 'Failed to fetch location',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create/Update location metadata in database
   */
  async upsertLocation(locationId: string, dto: CreateLocationDto): Promise<Location> {
    try {
      // Verify location exists in Proxmox
      await this.proxmoxService.getNode(locationId);

      // Save to database
      await this.prisma.location.upsert({
        where: { name: locationId },
        update: {
          displayName: dto.displayName,
          country: dto.country,
          city: dto.city,
          flag: dto.flag,
          latency: dto.latency,
          priceMultiplier: dto.priceMultiplier,
          available: dto.available,
          features: dto.features,
          metadata: dto.metadata as any,
          updatedAt: new Date(),
        },
        create: {
          name: locationId,
          displayName: dto.displayName,
          country: dto.country,
          city: dto.city,
          flag: dto.flag,
          latency: dto.latency,
          priceMultiplier: dto.priceMultiplier,
          available: dto.available,
          features: dto.features,
          metadata: dto.metadata as any,
        },
      });

      // Return full location data
      return this.getLocation(locationId);
    } catch (error) {
      this.logger.error(`Failed to upsert location ${locationId}:`, error);
      throw new HttpException(
        error.message || 'Failed to update location',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update location metadata
   */
  async updateLocation(locationId: string, dto: UpdateLocationDto): Promise<Location> {
    try {
      // Verify location exists in Proxmox
      await this.proxmoxService.getNode(locationId);

      // Update in database
      await this.prisma.location.update({
        where: { name: locationId },
        data: {
          displayName: dto.displayName,
          country: dto.country,
          city: dto.city,
          flag: dto.flag,
          latency: dto.latency,
          priceMultiplier: dto.priceMultiplier,
          available: dto.available,
          features: dto.features,
          metadata: dto.metadata as any,
          updatedAt: new Date(),
        },
      });

      return this.getLocation(locationId);
    } catch (error) {
      this.logger.error(`Failed to update location ${locationId}:`, error);
      throw new HttpException(
        error.message || 'Failed to update location',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete location metadata (only from database, not from Proxmox)
   */
  async deleteLocation(locationId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Verify location exists in Proxmox
      await this.proxmoxService.getNode(locationId);

      // Delete from database
      await this.prisma.location.delete({
        where: { name: locationId },
      });

      return {
        success: true,
        message: `Location metadata for ${locationId} deleted successfully`,
      };
    } catch (error) {
      this.logger.error(`Failed to delete location ${locationId}:`, error);
      
      if (error.code === 'P2025') {
        throw new HttpException('Location metadata not found', HttpStatus.NOT_FOUND);
      }
      
      throw new HttpException(
        error.message || 'Failed to delete location',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get location statistics
   */
  async getLocationStats(locationId: string): Promise<any> {
    try {
      const [node, stats, tasks] = await Promise.all([
        this.proxmoxService.getNode(locationId),
        this.proxmoxService.getNodeStats(locationId).catch(() => null),
        this.proxmoxService.getNodeTasks(locationId).catch(() => []),
      ]);

      // Get VMs count from database
      const vmCount = await this.prisma.vM.count({
        where: { node_id: parseInt(locationId) || 0 },
      });

      return {
        node: locationId,
        status: node.status,
        resources: {
          cpu: {
            usage: node.cpu || 0,
            cores: node.cpus || 0,
            loadavg: node.loadavg || [0, 0, 0],
          },
          memory: {
            total: node.maxmem || 0,
            used: node.mem || 0,
            free: (node.maxmem || 0) - (node.mem || 0),
          },
          disk: {
            total: node.maxdisk || 0,
            used: node.disk || 0,
            free: (node.maxdisk || 0) - (node.disk || 0),
          },
        },
        vms: {
          total: vmCount,
          running: await this.getRunningVMsCount(locationId),
        },
        tasks: {
          total: tasks?.length || 0,
          running: tasks?.filter(t => t.status === 'running').length || 0,
        },
        uptime: node.uptime,
        version: node.version,
      };
    } catch (error) {
      this.logger.error(`Failed to get stats for location ${locationId}:`, error);
      throw new HttpException(
        'Failed to fetch location statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get location health status
   */
  async getLocationHealth(locationId: string): Promise<any> {
    try {
      const location = await this.getLocation(locationId);
      
      const healthChecks = {
        online: location.status.online,
        cpu: location.status.cpu < 90,
        memory: location.status.memory.usagePercent < 90,
        disk: location.status.disk.usagePercent < 85,
        network: location.network.interfaces.some(i => i.active),
        services: {
          pveproxy: await this.checkServiceStatus(locationId, 'pveproxy'),
          pvedaemon: await this.checkServiceStatus(locationId, 'pvedaemon'),
          pvestatd: await this.checkServiceStatus(locationId, 'pvestatd'),
        },
      };

      const overallHealth = Object.values(healthChecks).every(v => v === true);
      
      return {
        location: locationId,
        overall: overallHealth ? 'healthy' : 'degraded',
        checks: healthChecks,
        issues: this.getHealthIssues(healthChecks),
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get health for location ${locationId}:`, error);
      throw new HttpException(
        'Failed to fetch location health',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============ Helper Methods ============

  private async checkServiceStatus(node: string, service: string): Promise<boolean> {
    try {
      const services = await this.proxmoxService.getNodeServices(node);
      const svc = services.find(s => s.service === service);
      return svc?.state === 'running';
    } catch {
      return false;
    }
  }

  private async getRunningVMsCount(nodeName: string): Promise<number> {
    try {
      const node = await this.prisma.node.findFirst({
        where: { hostname: nodeName },
      });
      
      if (!node) return 0;
      
      const vms = await this.prisma.vM.findMany({
        where: { node_id: node.id, status: 'running' },
      });
      return vms.length;
    } catch {
      return 0;
    }
  }

  private getHealthIssues(checks: any): string[] {
    const issues: string[] = [];
    if (!checks.online) issues.push('Node is offline');
    if (!checks.cpu) issues.push('CPU usage critical (>90%)');
    if (!checks.memory) issues.push('Memory usage critical (>90%)');
    if (!checks.disk) issues.push('Disk usage critical (>85%)');
    if (!checks.network) issues.push('Network interfaces down');
    if (!checks.services.pveproxy) issues.push('PVEProxy service not running');
    if (!checks.services.pvedaemon) issues.push('PVEDaemon service not running');
    if (!checks.services.pvestatd) issues.push('PVEStatd service not running');
    return issues;
  }

  private getBasicLocationInfo(node: any, saved: any): Location {
    // Convert metadata to proper type
    const metadata = this.convertMetadata(saved?.metadata);

    return {
      id: node.node,
      name: node.node,
      displayName: saved?.displayName || this.generateDisplayName(node.node),
      country: saved?.country || this.getCountry(node.node),
      city: saved?.city || this.getCity(node.node),
      flag: saved?.flag || this.getFlagEmoji(node.node),
      latency: saved?.latency || this.calculateLatency(node.node),
      priceMultiplier: saved?.priceMultiplier || this.getPriceMultiplier(node.node),
      available: saved?.available !== undefined ? saved.available : node.status === 'online',
      features: saved?.features || [],
      status: {
        online: node.status === 'online',
        cpu: node.cpu || 0,
        memory: {
          total: node.maxmem || 0,
          used: node.mem || 0,
          free: (node.maxmem || 0) - (node.mem || 0),
          usagePercent: node.maxmem > 0 ? ((node.mem || 0) / node.maxmem) * 100 : 0,
        },
        disk: {
          total: node.maxdisk || 0,
          used: node.disk || 0,
          free: (node.maxdisk || 0) - (node.disk || 0),
          usagePercent: node.maxdisk > 0 ? ((node.disk || 0) / node.maxdisk) * 100 : 0,
        },
        uptime: node.uptime || 0,
        loadavg: [0, 0, 0],
      },
      hardware: {
        cpus: node.cpus || 0,
        sockets: node.sockets || 0,
        cores: 0,
        threads: 0,
        model: 'Unknown',
      },
      network: {
        interfaces: [],
        dns: [],
      },
      version: node.version || '',
      createdAt: saved?.createdAt || new Date(),
      updatedAt: new Date(),
      metadata: metadata,
    };
  }

  private generateDisplayName(nodeName: string): string {
    const parts = nodeName.split('-');
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  }

  private getFlagEmoji(nodeName: string): string {
    const map: Record<string, string> = {
      'nyc': '🇺🇸', 'lax': '🇺🇸', 'sfo': '🇺🇸', 'chi': '🇺🇸',
      'fra': '🇩🇪', 'ams': '🇳🇱', 'lon': '🇬🇧', 'par': '🇫🇷',
      'sin': '🇸🇬', 'tok': '🇯🇵', 'syd': '🇦🇺', 'bom': '🇮🇳',
    };
    
    for (const [key, flag] of Object.entries(map)) {
      if (nodeName.toLowerCase().includes(key)) return flag;
    }
    return '🌍';
  }

  private getCountry(nodeName: string): string {
    const map: Record<string, string> = {
      'nyc': 'United States', 'lax': 'United States', 'sfo': 'United States',
      'fra': 'Germany', 'ams': 'Netherlands', 'lon': 'United Kingdom',
      'sin': 'Singapore', 'tok': 'Japan', 'syd': 'Australia', 'bom': 'India',
    };
    
    for (const [key, country] of Object.entries(map)) {
      if (nodeName.toLowerCase().includes(key)) return country;
    }
    return 'Unknown';
  }

  private getCity(nodeName: string): string {
    const map: Record<string, string> = {
      'nyc': 'New York', 'lax': 'Los Angeles', 'sfo': 'San Francisco',
      'fra': 'Frankfurt', 'ams': 'Amsterdam', 'lon': 'London',
      'sin': 'Singapore', 'tok': 'Tokyo', 'syd': 'Sydney', 'bom': 'Mumbai',
    };
    
    for (const [key, city] of Object.entries(map)) {
      if (nodeName.toLowerCase().includes(key)) return city;
    }
    return nodeName.toUpperCase();
  }

  private calculateLatency(nodeName: string): number {
    const baseLatency: Record<string, number> = {
      'nyc': 15, 'lax': 45, 'sfo': 30, 'fra': 95,
      'ams': 100, 'lon': 85, 'sin': 180, 'tok': 150,
    };
    
    for (const [key, latency] of Object.entries(baseLatency)) {
      if (nodeName.toLowerCase().includes(key)) return latency;
    }
    return 100;
  }

  private getPriceMultiplier(nodeName: string): number {
    const multipliers: Record<string, number> = {
      'fra': 1.05, 'ams': 1.05, 'lon': 1.07,
      'sin': 1.08, 'tok': 1.10, 'syd': 1.07,
    };
    
    for (const [key, multiplier] of Object.entries(multipliers)) {
      if (nodeName.toLowerCase().includes(key)) return multiplier;
    }
    return 1.0;
  }

  private getNodeFeatures(node: any, services: any[]): string[] {
    const features: string[] = [];
    
    if (node.cpus >= 64) features.push('High Performance Computing');
    if (node.maxmem >= 512 * 1024 * 1024 * 1024) features.push('Large Memory Capacity');
    features.push('DDoS Protection');
    features.push('NVMe Storage');
    
    if (node.gpus && node.gpus.length > 0) features.push('GPU Support');
    if (services && services.some(s => s.service === 'ceph')) features.push('Ceph Storage');
    if (services && services.some(s => s.service === 'zfs')) features.push('ZFS Support');
    
    return features;
  }

// src/location/location.service.ts - Add these methods
// src/location/location.service.ts

// Replace all admin methods to use Pop model (which has relations)
async adminGetAllLocations(includeInactive: boolean = true) {
  const where = includeInactive ? {} : { active: true };
  
  const pops = await this.prisma.pop.findMany({
    where,
    include: {
      nodes: {
        select: {
          id: true,
          hostname: true,
          status: true,
          max_vcpu: true,
          max_ram_gb: true,
          max_storage_gb: true,
        },
      },
      _count: {
        select: {
          nodes: true,
          ip_addresses: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return {
    success: true,
    data: pops,
    total: pops.length,
  };
}

async adminGetLocationsStats() {
  const pops = await this.prisma.pop.findMany({
    include: {
      nodes: {
        include: {
          vms: {
            select: {
              id: true,
              status: true,
              hourly_rate: true,
            },
          },
        },
      },
    },
  });

  const stats = pops.map(pop => {
    const nodes = pop.nodes;
    const totalNodes = nodes.length;
    const activeNodes = nodes.filter(n => n.status === 'active').length;
    const totalVMs = nodes.reduce((sum, n) => sum + n.vms.length, 0);
    const runningVMs = nodes.reduce((sum, n) => sum + n.vms.filter(v => v.status === 'running').length, 0);
    const totalRevenue = nodes.reduce((sum, n) => 
      sum + n.vms.filter(v => v.status === 'running').reduce((s, v) => s + (v.hourly_rate?.toNumber() || 0), 0), 0
    );

    return {
      id: pop.id,
      name: pop.name,
      city: pop.city,
      country: pop.country,
      available: pop.active,
      stats: {
        totalNodes,
        activeNodes,
        totalVMs,
        runningVMs,
        hourlyRevenue: totalRevenue,
      },
    };
  });

  const summary = {
    totalLocations: pops.length,
    activeLocations: pops.filter(p => p.active).length,
    totalNodes: stats.reduce((sum, s) => sum + s.stats.totalNodes, 0),
    totalVMs: stats.reduce((sum, s) => sum + s.stats.totalVMs, 0),
    runningVMs: stats.reduce((sum, s) => sum + s.stats.runningVMs, 0),
    totalHourlyRevenue: stats.reduce((sum, s) => sum + s.stats.hourlyRevenue, 0),
  };

  return {
    success: true,
    summary,
    locations: stats,
  };
}

async adminGetLocationById(id: string) {
  // Try to find by Pop ID first (number)
  const popId = parseInt(id);
  
  if (!isNaN(popId)) {
    const pop = await this.prisma.pop.findUnique({
      where: { id: popId },
      include: {
        nodes: {
          select: {
            id: true,
            hostname: true,
            api_url: true,
            ip_address: true,
            status: true,
            max_vcpu: true,
            max_ram_gb: true,
            max_storage_gb: true,
            created_at: true,
            _count: {
              select: { vms: true },
            },
          },
          orderBy: { created_at: 'desc' },
        },
        ip_addresses: {
          where: { status: 'available' },
          take: 20,
        },
      },
    });

    if (pop) {
      return {
        success: true,
        data: pop,
      };
    }
  }

  // Fallback to Location model
  const location = await this.prisma.location.findUnique({
    where: { id },
  });

  if (!location) {
    throw new NotFoundException(`Location with ID ${id} not found`);
  }

  return {
    success: true,
    data: location,
  };
}

async adminCreateLocation(dto: CreateLocationDto) {
  // Create in Pop model (main location storage)
  const existing = await this.prisma.pop.findFirst({
    where: {
      OR: [
        { name: dto.name },
      ],
    },
  });

  if (existing) {
    throw new ConflictException('Location with this name already exists');
  }

  const pop = await this.prisma.pop.create({
    data: {
      name: dto.name,
      city: dto.city || dto.name,
      country: dto.country || 'Unknown',
      active: dto.available ?? true,
    },
  });

  // Also create in Location model for metadata
  await this.prisma.location.create({
    data: {
      id: dto.id || dto.name.toLowerCase().replace(/\s+/g, '-'),
      name: dto.name,
      displayName: dto.displayName || dto.name,
      country: dto.country,
      city: dto.city,
      flag: dto.flag,
      latency: dto.latency,
      priceMultiplier: dto.priceMultiplier || 1.0,
      available: dto.available ?? true,
      features: dto.features || [],
      metadata: dto.metadata,
    },
  });

  this.logger.log(`Location created: ${pop.name} (ID: ${pop.id})`);

  return {
    success: true,
    data: pop,
    message: 'Location created successfully',
  };
}

async adminUpdateLocation(id: string, dto: UpdateLocationDto) {
  const popId = parseInt(id);
  
  if (!isNaN(popId)) {
    const pop = await this.prisma.pop.findUnique({
      where: { id: popId },
    });

    if (pop) {
      const updated = await this.prisma.pop.update({
        where: { id: popId },
        data: {
          name: dto.name || pop.name,
          city: dto.city || pop.city,
          country: dto.country || pop.country,
          active: dto.available ?? pop.active,
        },
      });

      // Also update Location metadata
      await this.prisma.location.upsert({
        where: { id: id },
        update: {
          displayName: dto.displayName,
          flag: dto.flag,
          latency: dto.latency,
          priceMultiplier: dto.priceMultiplier,
          available: dto.available,
          features: dto.features,
          metadata: dto.metadata,
        },
        create: {
          id: id,
          name: pop.name,
          displayName: dto.displayName,
          country: dto.country,
          city: dto.city,
          flag: dto.flag,
          latency: dto.latency,
          priceMultiplier: dto.priceMultiplier,
          available: dto.available,
          features: dto.features || [],
          metadata: dto.metadata,
        },
      });

      return {
        success: true,
        data: updated,
        message: 'Location updated successfully',
      };
    }
  }

  // Fallback to Location only
  const location = await this.prisma.location.findUnique({
    where: { id },
  });

  if (!location) {
    throw new NotFoundException(`Location with ID ${id} not found`);
  }

  const updated = await this.prisma.location.update({
    where: { id },
    data: {
      displayName: dto.displayName,
      country: dto.country,
      city: dto.city,
      flag: dto.flag,
      latency: dto.latency,
      priceMultiplier: dto.priceMultiplier,
      available: dto.available,
      features: dto.features,
      metadata: dto.metadata,
    },
  });

  return {
    success: true,
    data: updated,
    message: 'Location updated successfully',
  };
}

async adminDeleteLocation(id: string) {
  const popId = parseInt(id);
  
  if (!isNaN(popId)) {
    const pop = await this.prisma.pop.findUnique({
      where: { id: popId },
      include: {
        nodes: { select: { id: true } },
        ip_addresses: { select: { id: true } },
      },
    });

    if (pop) {
      if (pop.nodes.length > 0) {
        throw new BadRequestException('Cannot delete location with existing nodes. Delete nodes first.');
      }

      await this.prisma.pop.delete({
        where: { id: popId },
      });

      // Also delete Location metadata
      await this.prisma.location.deleteMany({
        where: { name: pop.name },
      });

      return {
        success: true,
        message: 'Location deleted successfully',
      };
    }
  }

  // Fallback to Location only
  await this.prisma.location.delete({
    where: { id },
  });

  return {
    success: true,
    message: 'Location metadata deleted successfully',
  };
}


async adminToggleLocationAvailability(id: string) {
  const location = await this.prisma.location.findUnique({
    where: { id },
  });

  if (!location) {
    throw new NotFoundException(`Location with ID ${id} not found`);
  }

  const updated = await this.prisma.location.update({
    where: { id },
    data: { available: !location.available },
  });

  this.logger.log(`Location ${updated.name} availability toggled to ${updated.available}`);

  return {
    success: true,
    data: updated,
    message: `Location is now ${updated.available ? 'available' : 'unavailable'}`,
  };
}

async adminGetLocationNodes(id: string) {
  const location = await this.prisma.location.findUnique({
    where: { id },
  });

  if (!location) {
    throw new NotFoundException(`Location with ID ${id} not found`);
  }

  const nodes = await this.prisma.node.findMany({
    where: { pop_id: parseInt(id) || location.id as any },
    include: {
      _count: {
        select: { vms: true },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  return {
    success: true,
    location: {
      id: location.id,
      name: location.name,
    },
    nodes,
    total: nodes.length,
  };
}


  async adminGetLocationDetailedStats(id: string) {
    const popId = parseInt(id);
    
    if (isNaN(popId)) {
      const popByName = await this.prisma.pop.findFirst({
        where: { name: id },
        include: {
          nodes: {
            include: {
              vms: {
                select: {
                  id: true,
                  status: true,
                  vcpu: true,
                  ram_gb: true,
                  ssd_gb: true,
                  hourly_rate: true,
                  created_at: true,
                },
              },
            },
          },
          ip_addresses: {
            select: { status: true },
          },
        },
      });

      if (popByName) {
        return this.buildDetailedStats(popByName);
      }
      
      throw new NotFoundException(`Location with ID ${id} not found`);
    }

    const pop = await this.prisma.pop.findUnique({
      where: { id: popId },
      include: {
        nodes: {
          include: {
            vms: {
              select: {
                id: true,
                status: true,
                vcpu: true,
                ram_gb: true,
                ssd_gb: true,
                hourly_rate: true,
                created_at: true,
              },
            },
          },
        },
        ip_addresses: {
          select: { status: true },
        },
      },
    });

    if (!pop) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }

    return this.buildDetailedStats(pop);
  }

  private buildDetailedStats(pop: any) {
    const nodes = pop.nodes || [];
    const ipAddresses = pop.ip_addresses || [];
    
    const totalVMs = nodes.reduce((sum: number, n: any) => sum + (n.vms?.length || 0), 0);
    const runningVMs = nodes.reduce((sum: number, n: any) => 
      sum + (n.vms?.filter((v: any) => v.status === 'running').length || 0), 0);
    const stoppedVMs = nodes.reduce((sum: number, n: any) => 
      sum + (n.vms?.filter((v: any) => v.status === 'stopped').length || 0), 0);
    const suspendedVMs = nodes.reduce((sum: number, n: any) => 
      sum + (n.vms?.filter((v: any) => v.status === 'suspended').length || 0), 0);
    
    const totalVCPU = nodes.reduce((sum: number, n: any) => 
      sum + (n.vms?.reduce((s: number, v: any) => s + v.vcpu, 0) || 0), 0);
    const totalRAM = nodes.reduce((sum: number, n: any) => 
      sum + (n.vms?.reduce((s: number, v: any) => s + v.ram_gb, 0) || 0), 0);
    const totalStorage = nodes.reduce((sum: number, n: any) => 
      sum + (n.vms?.reduce((s: number, v: any) => s + v.ssd_gb, 0) || 0), 0);
    
    const maxVCPU = nodes.reduce((sum: number, n: any) => sum + (n.max_vcpu || 0), 0);
    const maxRAM = nodes.reduce((sum: number, n: any) => sum + (n.max_ram_gb || 0), 0);
    const maxStorage = nodes.reduce((sum: number, n: any) => sum + (n.max_storage_gb || 0), 0);
    
    const hourlyRevenue = nodes.reduce((sum: number, n: any) => 
      sum + (n.vms?.filter((v: any) => v.status === 'running')
        .reduce((s: number, v: any) => s + (Number(v.hourly_rate) || 0), 0) || 0), 0);

    const ipStats = {
      total: ipAddresses.length,
      available: ipAddresses.filter((ip: any) => ip.status === 'available').length,
      assigned: ipAddresses.filter((ip: any) => ip.status === 'assigned').length,
      reserved: ipAddresses.filter((ip: any) => ip.status === 'reserved').length,
    };

    const vmsByMonth: Record<string, number> = {};
    nodes.forEach((n: any) => {
      (n.vms || []).forEach((v: any) => {
        if (v.created_at) {
          const month = new Date(v.created_at).toISOString().slice(0, 7);
          vmsByMonth[month] = (vmsByMonth[month] || 0) + 1;
        }
      });
    });

    return {
      success: true,
      location: {
        id: String(pop.id),
        name: pop.name,
        displayName: pop.name, // Use name as displayName
        country: pop.country,
        city: pop.city,
        available: pop.active,
      },
      resources: {
        vcpu: { used: totalVCPU, max: maxVCPU, percentage: maxVCPU > 0 ? (totalVCPU / maxVCPU) * 100 : 0 },
        ram: { used: totalRAM, max: maxRAM, percentage: maxRAM > 0 ? (totalRAM / maxRAM) * 100 : 0 },
        storage: { used: totalStorage, max: maxStorage, percentage: maxStorage > 0 ? (totalStorage / maxStorage) * 100 : 0 },
      },
      vms: {
        total: totalVMs,
        running: runningVMs,
        stopped: stoppedVMs,
        suspended: suspendedVMs,
        byMonth: vmsByMonth,
      },
      nodes: {
        total: nodes.length,
        active: nodes.filter((n: any) => n.status === 'active').length,
        maintenance: nodes.filter((n: any) => n.status === 'maintenance').length,
        offline: nodes.filter((n: any) => n.status === 'offline').length,
      },
      ipAddresses: ipStats,
      revenue: {
        hourly: hourlyRevenue,
        daily: hourlyRevenue * 24,
        monthly: hourlyRevenue * 24 * 30,
      },
    };
  }

  async adminSyncLocation(id: string) {
    const popId = parseInt(id);
    let pop: any;
    
    if (isNaN(popId)) {
      pop = await this.prisma.pop.findFirst({
        where: { name: id },
        include: { nodes: true },
      });
    } else {
      pop = await this.prisma.pop.findUnique({
        where: { id: popId },
        include: { nodes: true },
      });
    }

    if (!pop) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }

    const results: any[] = [];
    
    // Sync each node using ProxmoxService directly
    for (const node of pop.nodes) {
      try {
        // Fetch latest status from Proxmox
        const status = await this.proxmoxService.getNodeStatus(node.hostname).catch(() => null);
        const stats = await this.proxmoxService.getNodeStats(node.hostname).catch(() => null);
        
        // Update node in database
        await this.prisma.node.update({
          where: { id: node.id },
          data: {
            status: status?.status === 'online' ? 'active' : 'offline',
            max_vcpu: stats?.cpu || node.max_vcpu,
            max_ram_gb: stats?.memory?.total ? Math.floor(stats.memory.total / 1024 / 1024 / 1024) : node.max_ram_gb,
            max_storage_gb: stats?.disk?.total ? Math.floor(stats.disk.total / 1024 / 1024 / 1024) : node.max_storage_gb,
          },
        });
        
        results.push({
          nodeId: node.id,
          hostname: node.hostname,
          success: true,
        });
      } catch (error: any) {
        results.push({
          nodeId: node.id,
          hostname: node.hostname,
          error: error.message,
        });
      }
    }

    const succeeded = results.filter(r => !r.error).length;
    const failed = results.filter(r => r.error).length;

    this.logger.log(`Location ${pop.name} synced: ${succeeded} succeeded, ${failed} failed`);

    return {
      success: true,
      message: `Sync completed: ${succeeded} nodes synced, ${failed} failed`,
      location: {
        id: String(pop.id),
        name: pop.name,
      },
      results,
    };
  }


}