import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ProxmoxService } from '../proxmox/proxmox.service';
import { PrismaService } from '../prisma/prisma.service';
import { 
  CreateTemplateDto, 
  UploadTemplateDto, 
  DownloadTemplateDto,
  CloneTemplateDto,
  UpdateTemplateMetadataDto,
  OTTemplate 
} from './dto/os-template.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class OsTemplateService {
  private readonly logger = new Logger(OsTemplateService.name);

  constructor(
    private proxmoxService: ProxmoxService,
    private prisma: PrismaService,
  ) {}

  /**
   * Get all templates from Proxmox
   */
  async getAllTemplates(): Promise<OTTemplate[]> {
    try {
      const templates = await this.proxmoxService.getAllTemplates();
      
      // Get saved metadata from database using slug as identifier
      const savedMetadata = await this.prisma.osTemplate.findMany();
      const metadataMap = new Map(savedMetadata.map(m => [m.slug, m]));

      // Format templates
      const formattedTemplates = templates.map(template => {
        const slug = this.generateSlug(template.name);
        const saved = metadataMap.get(slug);
        
        return {
          id: template.volid,
          name: template.name || path.basename(template.volid),
          displayName: saved?.name || template.name,
          volumeId: template.volid,
          node: template.node,
          storage: template.storage,
          size: template.size || 0,
          format: template.format || 'unknown',
          contentType: template.content,
          description: saved?.description || template.description,
          version: saved?.version || this.extractVersion(template.name),
          family: saved?.os_type || this.extractFamily(template.name),
          category: this.extractCategory(template.name),
          minDisk: saved?.min_disk_gb || this.extractMinDisk(template),
          minMemory: saved?.min_ram_gb || this.extractMinMemory(template),
          recommended: false,
          tags: this.extractTags(template),
          createdAt: saved?.created_at || new Date(),
          updatedAt: new Date(),
          metadata: {},
        };
      });

      // Sort by name
      formattedTemplates.sort((a, b) => {
        return a.name.localeCompare(b.name);
      });

      return formattedTemplates;
    } catch (error) {
      this.logger.error('Failed to fetch templates:', error);
      throw new HttpException(
        'Failed to fetch templates from Proxmox',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category: 'linux' | 'windows'): Promise<OTTemplate[]> {
    const templates = await this.getAllTemplates();
    return templates.filter(t => t.category === category);
  }

  /**
   * Get a specific template
   */
  async getTemplate(volumeId: string): Promise<OTTemplate> {
    try {
      // Parse volume ID to get node, storage, and volume
      const [node, storage, ...rest] = volumeId.split(':');
      const actualVolume = rest.join(':');
      
      // Get template details from Proxmox
      const details = await this.proxmoxService.getTemplateDetails(node, storage, actualVolume);
      
      // Get saved metadata
      const slug = this.generateSlug(details.name);
      const saved = await this.prisma.osTemplate.findUnique({
        where: { slug },
      });

      return {
        id: volumeId,
        name: details.name || path.basename(volumeId),
        displayName: saved?.name || details.name,
        volumeId,
        node,
        storage,
        size: details.size || 0,
        format: details.format || 'unknown',
        contentType: details.content,
        description: saved?.description || details.description,
        version: saved?.version || this.extractVersion(details.name),
        family: saved?.os_type || this.extractFamily(details.name),
        category: this.extractCategory(details.name),
        minDisk: saved?.min_disk_gb || this.extractMinDisk(details),
        minMemory: saved?.min_ram_gb || this.extractMinMemory(details),
        recommended: false,
        tags: this.extractTags(details),
        createdAt: saved?.created_at || new Date(),
        updatedAt: new Date(),
        metadata: {},
      };
    } catch (error) {
      this.logger.error(`Failed to fetch template ${volumeId}:`, error);
      throw new HttpException(
        'Template not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * Upload a template file to Proxmox
   */
  async uploadTemplate(
    file: Express.Multer.File,
    dto: UploadTemplateDto
  ): Promise<OTTemplate> {
    try {
      // Validate file
      if (!file) {
        throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
      }

      // Check if file is a valid template
      const validExtensions = ['.tar.gz', '.tar.xz', '.iso', '.img', '.qcow2'];
      const ext = path.extname(file.originalname);
      if (!validExtensions.includes(ext)) {
        throw new HttpException(
          `Invalid file format. Supported formats: ${validExtensions.join(', ')}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Save file temporarily
      const tempPath = path.join('/tmp', file.originalname);
      fs.writeFileSync(tempPath, file.buffer);

      // Note: You need to implement uploadTemplate in ProxmoxService
      // For now, we'll skip the actual upload
      this.logger.warn('Upload template not implemented in ProxmoxService');

      // Clean up temp file
      fs.unlinkSync(tempPath);

      // Get the uploaded template
      const volumeId = `${dto.node}:${dto.storage}/${file.originalname}`;
      const template = await this.getTemplate(volumeId);

      // Save metadata to database
      const slug = this.generateSlug(template.name);
await this.prisma.osTemplate.upsert({
  where: { slug },
  update: {
    name: template.displayName || template.name,
    description: template.description || '',
    version: template.version || 'latest',
    os_type: template.family || 'linux',
    min_ram_gb: template.minMemory || 1,
    min_disk_gb: template.minDisk || 20,
    proxmox_template_id: volumeId,
  },
  create: {
    slug,
    name: template.displayName || template.name,
    description: template.description || '',
    version: template.version || 'latest',
    os_type: template.family || 'linux',
    min_ram_gb: template.minMemory || 1,
    min_disk_gb: template.minDisk || 20,
    proxmox_template_id: volumeId,
    is_active: true,
  },
});

      return template;
    } catch (error) {
      this.logger.error('Failed to upload template:', error);
      throw new HttpException(
        error.message || 'Failed to upload template',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Download template from URL
   */
  async downloadTemplate(dto: DownloadTemplateDto): Promise<OTTemplate> {
    try {
      // Note: You need to implement downloadTemplate in ProxmoxService
      this.logger.warn('Download template not implemented in ProxmoxService');

      // Get the downloaded template
      const volumeId = `${dto.node}:${dto.storage}/${dto.filename}`;
      const template = await this.getTemplate(volumeId);

      // Save metadata to database
      const slug = this.generateSlug(template.name);
   await this.prisma.osTemplate.upsert({
  where: { slug },
  update: {
    name: template.displayName || template.name,
    description: template.description || '',
    version: template.version || 'latest',
    os_type: template.family || 'linux',
    min_ram_gb: template.minMemory || 1,
    min_disk_gb: template.minDisk || 20,
    proxmox_template_id: volumeId,
  },
  create: {
    slug,
    name: template.displayName || template.name,
    description: template.description || '',
    version: template.version || 'latest',
    os_type: template.family || 'linux',
    min_ram_gb: template.minMemory || 1,
    min_disk_gb: template.minDisk || 20,
    proxmox_template_id: volumeId,
    is_active: true,
  },
});

      return template;
    } catch (error) {
      this.logger.error('Failed to download template:', error);
      throw new HttpException(
        error.message || 'Failed to download template',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(volumeId: string): Promise<{ success: boolean; message: string }> {
    try {
      const [node, storage, ...rest] = volumeId.split(':');
      const volume = rest.join(':');

      // Delete from Proxmox
      await this.proxmoxService.deleteTemplate(node, storage, volume);

      // Delete metadata from database
      await this.prisma.osTemplate.deleteMany({
        where: { proxmox_template_id: volumeId },
      });

      return {
        success: true,
        message: `Template ${volumeId} deleted successfully`,
      };
    } catch (error) {
      this.logger.error(`Failed to delete template ${volumeId}:`, error);
      throw new HttpException(
        error.message || 'Failed to delete template',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update template metadata
   */
  async updateTemplateMetadata(
    volumeId: string,
    dto: UpdateTemplateMetadataDto
  ): Promise<OTTemplate> {
    try {
      const template = await this.getTemplate(volumeId);
      const slug = this.generateSlug(template.name);
      
      // Update metadata in database
     await this.prisma.osTemplate.upsert({
  where: { slug },
  update: {
    name: dto.displayName || template.name,
    description: dto.description || '',
    version: dto.version || 'latest',
    os_type: dto.family || 'linux',
    min_ram_gb: dto.minMemory || 1,
    min_disk_gb: dto.minDisk || 20,
  },
  create: {
    slug,
    name: dto.displayName || template.name,
    description: dto.description || '',
    version: dto.version || 'latest',
    os_type: dto.family || 'linux',
    min_ram_gb: dto.minMemory || 1,
    min_disk_gb: dto.minDisk || 20,
    proxmox_template_id: volumeId,
    is_active: true,
  },
});

      // Return updated template
      return this.getTemplate(volumeId);
    } catch (error) {
      this.logger.error(`Failed to update template metadata ${volumeId}:`, error);
      throw new HttpException(
        error.message || 'Failed to update template metadata',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Clone template to VM
   */
  async cloneToVM(volumeId: string, dto: CloneTemplateDto): Promise<any> {
    try {
      const [node, storage, ...rest] = volumeId.split(':');
      const volume = rest.join(':');

      // Clone template to VM
      const result = await this.proxmoxService.cloneTemplateToVM(
        node,
        volume,
        dto.vmid,
        {
          name: dto.name,
          storage: dto.targetStorage,
          full: dto.full !== false,
          target: dto.targetNode,
        }
      );

      return {
        success: true,
        message: `VM created successfully from template`,
        vmid: dto.vmid,
        result,
      };
    } catch (error) {
      this.logger.error(`Failed to clone template ${volumeId}:`, error);
      throw new HttpException(
        error.message || 'Failed to clone template',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Copy template between storages
   */
  async copyTemplate(
    volumeId: string,
    targetStorage: string,
    targetNode?: string
  ): Promise<OTTemplate> {
    try {
      const [sourceNode, sourceStorage, ...rest] = volumeId.split(':');
      const sourceVolume = rest.join(':');
      const targetNodeName = targetNode || sourceNode;

      await this.proxmoxService.copyTemplate(
        sourceNode,
        sourceStorage,
        sourceVolume,
        targetNodeName,
        targetStorage
      );

      // Get new template
      const newVolumeId = `${targetNodeName}:${targetStorage}/${sourceVolume.split('/').pop()}`;
      return this.getTemplate(newVolumeId);
    } catch (error) {
      this.logger.error(`Failed to copy template ${volumeId}:`, error);
      throw new HttpException(
        error.message || 'Failed to copy template',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get template statistics
   */
  async getTemplateStats(): Promise<any> {
    const templates = await this.getAllTemplates();
    
    const stats: any = {
      total: templates.length,
      byCategory: {
        linux: templates.filter(t => t.category === 'linux').length,
        windows: templates.filter(t => t.category === 'windows').length,
      },
      byFamily: {} as Record<string, number>,
      byStorage: {} as Record<string, number>,
      totalSize: 0,
      recommended: templates.filter(t => t.recommended).length,
    };

    templates.forEach(t => {
      // By family
      const family = t.family || 'unknown';
      stats.byFamily[family] = (stats.byFamily[family] || 0) + 1;
      
      // By storage
      const storageKey = `${t.node}:${t.storage}`;
      stats.byStorage[storageKey] = (stats.byStorage[storageKey] || 0) + 1;
      
      // Total size
      stats.totalSize += t.size;
    });

    return stats;
  }

  // ============ Helper Methods ============

  private generateSlug(name: string): string {
    if (!name) return 'unknown';
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private extractVersion(name: string): string {
    if (!name) return 'Latest';
    const match = name.match(/\d+\.?\d*/);
    return match ? match[0] : 'Latest';
  }

  private extractFamily(name: string): string {
    const lower = name?.toLowerCase() || '';
    if (lower.includes('ubuntu')) return 'ubuntu';
    if (lower.includes('debian')) return 'debian';
    if (lower.includes('centos')) return 'centos';
    if (lower.includes('rocky')) return 'rocky';
    if (lower.includes('almalinux')) return 'almalinux';
    if (lower.includes('alpine')) return 'alpine';
    if (lower.includes('windows')) return 'windows';
    if (lower.includes('fedora')) return 'fedora';
    return 'linux';
  }

  private extractCategory(name: string): 'linux' | 'windows' {
    const lower = name?.toLowerCase() || '';
    return lower.includes('windows') ? 'windows' : 'linux';
  }

  private extractMinDisk(template: any): number {
    const sizeGB = template.size / 1024 / 1024 / 1024;
    return Math.ceil(Math.max(sizeGB * 1.2, 20));
  }

  private extractMinMemory(template: any): number {
    const lower = template.name?.toLowerCase() || '';
    if (lower.includes('windows')) return 4;
    if (lower.includes('alpine')) return 0.5;
    if (lower.includes('debian') || lower.includes('ubuntu')) return 1;
    return 1;
  }

  private extractTags(template: any): string[] {
    const tags: string[] = [];
    const lower = template.name?.toLowerCase() || '';
    
    if (lower.includes('lts')) tags.push('lts');
    if (lower.includes('minimal')) tags.push('minimal');
    if (lower.includes('desktop')) tags.push('desktop');
    if (lower.includes('server')) tags.push('server');
    if (template.size < 500 * 1024 * 1024) tags.push('lightweight');
    if (template.size > 2 * 1024 * 1024 * 1024) tags.push('large');
    
    return tags;
  }
}