import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProxmoxService } from '../proxmox/proxmox.service';
import { CreateSSHKeyDto, UpdateSSHKeyDto, AddSSHKeyToVMDto, ValidateSSHKeyDto } from './dto/ssh-key.dto';
import * as crypto from 'crypto';

@Injectable()
export class SSHKeyService {
  private readonly logger = new Logger(SSHKeyService.name);

  constructor(
    private prisma: PrismaService,
    private proxmoxService: ProxmoxService,
  ) {}

  /**
   * Get all SSH keys for a user
   */
  async getUserSSHKeys(userId: string): Promise<any[]> {
    try {
      const keys = await this.prisma.sSHKey.findMany({
        where: { user_id: parseInt(userId), is_active: true },
        orderBy: { created_at: 'desc' },
      });

      return keys.map(key => ({
        id: key.id.toString(),
        name: key.label,
        publicKey: key.public_key,
        fingerprint: key.fingerprint,
        type: this.extractKeyType(key.public_key),
        isActive: key.is_active,
        usedCount: 0,
        createdAt: key.created_at,
        updatedAt: key.created_at,
      }));
    } catch (error) {
      this.logger.error('Failed to fetch SSH keys:', error);
      throw new HttpException(
        'Failed to fetch SSH keys',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get a specific SSH key
   */
  async getSSHKey(userId: string, keyId: string): Promise<any> {
    try {
      const key = await this.prisma.sSHKey.findFirst({
        where: { id: parseInt(keyId), user_id: parseInt(userId) },
      });

      if (!key) {
        throw new HttpException('SSH key not found', HttpStatus.NOT_FOUND);
      }

      return {
        id: key.id.toString(),
        name: key.label,
        publicKey: key.public_key,
        fingerprint: key.fingerprint,
        type: this.extractKeyType(key.public_key),
        isActive: key.is_active,
        usedCount: 0,
        createdAt: key.created_at,
        updatedAt: key.created_at,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch SSH key ${keyId}:`, error);
      throw new HttpException(
        error.message || 'Failed to fetch SSH key',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create a new SSH key (store only in DB, not in Proxmox user level)
   */
  async createSSHKey(userId: string, dto: CreateSSHKeyDto): Promise<any> {
    try {
      // Validate SSH key format
      const validation = await this.proxmoxService.validateSSHKey(dto.publicKey);
      
      if (!validation.valid) {
        throw new HttpException(validation.message || 'Invalid SSH key', HttpStatus.BAD_REQUEST);
      }

      // Check for duplicate fingerprint
      const existingKey = await this.prisma.sSHKey.findFirst({
        where: { 
          fingerprint: validation.fingerprint || '',
          user_id: parseInt(userId),
        },
      });

      if (existingKey) {
        throw new HttpException(
          'SSH key with this fingerprint already exists',
          HttpStatus.CONFLICT,
        );
      }

      // Save only to database (not to Proxmox user level)
      const sshKey = await this.prisma.sSHKey.create({
        data: {
          label: dto.name,
          public_key: dto.publicKey,
          fingerprint: validation.fingerprint || '',
          user_id: parseInt(userId),
          is_active: true,
        },
      });

      return {
        id: sshKey.id.toString(),
        name: sshKey.label,
        publicKey: sshKey.public_key,
        fingerprint: sshKey.fingerprint,
        type: validation.type || 'RSA',
        isActive: sshKey.is_active,
        usedCount: 0,
        createdAt: sshKey.created_at,
        updatedAt: sshKey.created_at,
      };
    } catch (error) {
      this.logger.error('Failed to create SSH key:', error);
      throw new HttpException(
        error.message || 'Failed to create SSH key',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update SSH key (database only)
   */
  async updateSSHKey(
    userId: string,
    keyId: string,
    dto: UpdateSSHKeyDto,
  ): Promise<any> {
    try {
      const key = await this.prisma.sSHKey.findFirst({
        where: { id: parseInt(keyId), user_id: parseInt(userId) },
      });

      if (!key) {
        throw new HttpException('SSH key not found', HttpStatus.NOT_FOUND);
      }

      // Update in database only
      const updatedKey = await this.prisma.sSHKey.update({
        where: { id: parseInt(keyId) },
        data: {
          label: dto.name,
          is_active: dto.isActive,
        },
      });

      return {
        id: updatedKey.id.toString(),
        name: updatedKey.label,
        publicKey: updatedKey.public_key,
        fingerprint: updatedKey.fingerprint,
        type: this.extractKeyType(updatedKey.public_key),
        isActive: updatedKey.is_active,
        usedCount: 0,
        createdAt: updatedKey.created_at,
        updatedAt: updatedKey.created_at,
      };
    } catch (error) {
      this.logger.error(`Failed to update SSH key ${keyId}:`, error);
      throw new HttpException(
        error.message || 'Failed to update SSH key',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete SSH key (database only)
   */
  async deleteSSHKey(userId: string, keyId: string): Promise<{ success: boolean; message: string }> {
    try {
      const key = await this.prisma.sSHKey.findFirst({
        where: { id: parseInt(keyId), user_id: parseInt(userId) },
      });

      if (!key) {
        throw new HttpException('SSH key not found', HttpStatus.NOT_FOUND);
      }

      // Delete from database only
      await this.prisma.sSHKey.delete({
        where: { id: parseInt(keyId) },
      });

      return {
        success: true,
        message: 'SSH key deleted successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to delete SSH key ${keyId}:`, error);
      throw new HttpException(
        error.message || 'Failed to delete SSH key',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

// ssh-key.service.ts - Fix the addSSHKeysToVM method

/**
 * Add SSH keys to VM
 */
async addSSHKeysToVM(userId: string, dto: AddSSHKeyToVMDto): Promise<{ success: boolean; message: string }> {
  try {
    // Use vmId if provided, otherwise find by vmid (Proxmox ID)
    let vm;
    
    if (dto.vmId) {
      vm = await this.prisma.vM.findFirst({
        where: { 
          id: dto.vmId, 
          user_id: parseInt(userId),
        },
        include: { node: true },
      });
    } else if (dto.vmid) {
      vm = await this.prisma.vM.findFirst({
        where: { 
          proxmox_vmid: dto.vmid, 
          user_id: parseInt(userId),
        },
        include: { node: true },
      });
    } else {
      throw new HttpException('Either vmId or vmid must be provided', HttpStatus.BAD_REQUEST);
    }

    if (!vm) {
      throw new HttpException('VM not found', HttpStatus.NOT_FOUND);
    }

    // IMPORTANT: Convert keyIds from string to integer
    const keyIds = dto.keyIds.map(id => {
      // If it's a string, parse to int
      if (typeof id === 'string') {
        return parseInt(id);
      }
      // If it's already a number, use as is
      return id;
    });

    this.logger.debug(`Adding SSH keys with IDs: ${keyIds}`);

    // Get SSH keys from database
    const keys = await this.prisma.sSHKey.findMany({
      where: {
        id: { in: keyIds },  // Now keyIds are integers
        user_id: parseInt(userId),
        is_active: true,
      },
    });

    if (keys.length === 0) {
      throw new HttpException('No valid SSH keys found', HttpStatus.BAD_REQUEST);
    }

    // Combine all public keys with newlines
    const sshKeysString = keys.map(k => k.public_key).join('\n');

    // Add to VM in Proxmox
    await this.proxmoxService.addSSHKeyToVM(vm.node.hostname, vm.proxmox_vmid, sshKeysString);

    // Update VM's SSH key IDs in database
    const currentKeys = vm.ssh_key_ids || [];
    const newKeys = [...new Set([...currentKeys, ...keyIds])];
    
    await this.prisma.vM.update({
      where: { id: vm.id },
      data: { ssh_key_ids: newKeys },
    });

    return {
      success: true,
      message: `${keys.length} SSH key(s) added to VM ${vm.name} successfully`,
    };
  } catch (error) {
    this.logger.error('Failed to add SSH keys to VM:', error);
    throw new HttpException(
      error.message || 'Failed to add SSH keys to VM',
      error.status || HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

// ssh-key.service.ts - Update removeSSHKeyFromVM

async removeSSHKeyFromVM(
  userId: string, 
  vmId: number, 
  sshKeyId: number  // Ensure this is already a number
): Promise<{ success: boolean; message: string }> {
  try {
    const vm = await this.prisma.vM.findFirst({
      where: { 
        id: vmId, 
        user_id: parseInt(userId),
      },
      include: { node: true },
    });

    if (!vm) {
      throw new HttpException('VM not found', HttpStatus.NOT_FOUND);
    }

    // Remove from Proxmox by re-applying remaining keys
    const currentKeyIds = vm.ssh_key_ids || [];
    const remainingKeyIds = currentKeyIds.filter(id => id !== sshKeyId);
    
    if (remainingKeyIds.length > 0) {
      const remainingKeys = await this.prisma.sSHKey.findMany({
        where: {
          id: { in: remainingKeyIds },  // remainingKeyIds are already numbers
          user_id: parseInt(userId),
        },
      });
      
      const sshKeysString = remainingKeys.map(k => k.public_key).join('\n');
      await this.proxmoxService.addSSHKeyToVM(vm.node.hostname, vm.proxmox_vmid, sshKeysString);
    } else {
      // No keys left, clear all keys by setting empty string
      await this.proxmoxService.addSSHKeyToVM(vm.node.hostname, vm.proxmox_vmid, '');
    }

    // Update database
    await this.prisma.vM.update({
      where: { id: vm.id },
      data: { ssh_key_ids: remainingKeyIds },
    });

    return {
      success: true,
      message: 'SSH key removed from VM successfully',
    };
  } catch (error) {
    this.logger.error('Failed to remove SSH key from VM:', error);
    throw new HttpException(
      error.message || 'Failed to remove SSH key from VM',
      error.status || HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
  async getVMSSHKeys(userId: string, vmId: number): Promise<any[]> {
    try {
      const vm = await this.prisma.vM.findFirst({
        where: { 
          id: vmId, 
          user_id: parseInt(userId),
        },
        include: { node: true },
      });

      if (!vm) {
        throw new HttpException('VM not found', HttpStatus.NOT_FOUND);
      }

      // Get keys from Proxmox (actual VM state)
      const proxmoxKeys = await this.proxmoxService.getVMSSHKeys(vm.node.hostname, vm.proxmox_vmid);
      
      // Enrich with database info
      const dbKeys = await this.prisma.sSHKey.findMany({
        where: {
          user_id: parseInt(userId),
          id: { in: vm.ssh_key_ids || [] },
        },
      });
      
      const dbKeyMap = new Map(dbKeys.map(k => [k.fingerprint, k]));
      
      return proxmoxKeys.map(key => ({
        ...key,
        name: dbKeyMap.get(key.fingerprint)?.label || 'Unknown',
        isManaged: dbKeyMap.has(key.fingerprint),
      }));
    } catch (error) {
      this.logger.error('Failed to get VM SSH keys:', error);
      throw new HttpException(
        'Failed to get VM SSH keys',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Validate SSH key format
   */
  async validateSSHKey(dto: ValidateSSHKeyDto): Promise<any> {
    return this.proxmoxService.validateSSHKey(dto.publicKey);
  }

  /**
   * Get SSH key statistics
   */
  async getSSHKeyStats(userId: string): Promise<any> {
    try {
      const keys = await this.prisma.sSHKey.findMany({
        where: { user_id: parseInt(userId) },
      });
      
      const stats: any = {
        total: keys.length,
        active: keys.filter(k => k.is_active).length,
        inactive: keys.filter(k => !k.is_active).length,
        byType: {} as Record<string, number>,
        recentlyAdded: keys.slice(0, 5).map(k => ({
          id: k.id,
          name: k.label,
          fingerprint: k.fingerprint,
          createdAt: k.created_at,
        })),
      };
      
      keys.forEach(key => {
        const type = this.extractKeyType(key.public_key);
        stats.byType[type] = (stats.byType[type] || 0) + 1;
      });
      
      return stats;
    } catch (error) {
      this.logger.error('Failed to get SSH key stats:', error);
      throw new HttpException(
        'Failed to get SSH key statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Export SSH public key
   */
  async exportKey(userId: string, keyId: string): Promise<string> {
    try {
      const key = await this.prisma.sSHKey.findFirst({
        where: { id: parseInt(keyId), user_id: parseInt(userId) },
      });
      
      if (!key) {
        throw new HttpException('SSH key not found', HttpStatus.NOT_FOUND);
      }
      
      return key.public_key;
    } catch (error) {
      this.logger.error(`Failed to export SSH key ${keyId}:`, error);
      throw new HttpException(
        error.message || 'Failed to export SSH key',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Extract key type from public key
   */
  private extractKeyType(publicKey: string): string {
    if (publicKey.startsWith('ssh-rsa')) return 'RSA';
    if (publicKey.startsWith('ssh-ed25519')) return 'ED25519';
    if (publicKey.startsWith('ecdsa-sha2-nistp256')) return 'ECDSA (256)';
    if (publicKey.startsWith('ecdsa-sha2-nistp384')) return 'ECDSA (384)';
    if (publicKey.startsWith('ecdsa-sha2-nistp521')) return 'ECDSA (521)';
    return 'Unknown';
  }
}