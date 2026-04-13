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
  StreamableFile,
  Res,
} from '@nestjs/common';
import { SSHKeyService } from './ssh-key.service';
import {
  CreateSSHKeyDto,
  UpdateSSHKeyDto,
  AddSSHKeyToVMDto,
  ValidateSSHKeyDto,
} from './dto/ssh-key.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/decorators/user.decorator';
import type { Response } from 'express';

@Controller('ssh-keys')
@UseGuards(JwtAuthGuard)
export class SSHKeyController {
  constructor(private readonly sshKeyService: SSHKeyService) {}

  /**
   * Get all SSH keys for current user
   */
  @Get()
  async getUserSSHKeys(@User('id') userId: string) {
    const keys = await this.sshKeyService.getUserSSHKeys(userId);
    return {
      success: true,
      keys,
      total: keys.length,
    };
  }

  /**
   * Get a specific SSH key
   */
  @Get(':keyId')
  async getSSHKey(
    @Param('keyId') keyId: string,
    @User('id') userId: string,
  ) {
    const key = await this.sshKeyService.getSSHKey(userId, keyId);
    return {
      success: true,
      key,
    };
  }

  /**
   * Create a new SSH key
   */
  @Post()
  async createSSHKey(
    @Body() dto: CreateSSHKeyDto,
    @User('id') userId: string,
  ) {
    const key = await this.sshKeyService.createSSHKey(userId, dto);
    return {
      success: true,
      key,
      message: 'SSH key created successfully',
    };
  }

  /**
   * Update SSH key
   */
  @Put(':keyId')
  async updateSSHKey(
    @Param('keyId') keyId: string,
    @Body() dto: UpdateSSHKeyDto,
    @User('id') userId: string,
  ) {
    const key = await this.sshKeyService.updateSSHKey(userId, keyId, dto);
    return {
      success: true,
      key,
      message: 'SSH key updated successfully',
    };
  }

  /**
   * Delete SSH key
   */
  @Delete(':keyId')
  @HttpCode(HttpStatus.OK)
  async deleteSSHKey(
    @Param('keyId') keyId: string,
    @User('id') userId: string,
  ) {
    const result = await this.sshKeyService.deleteSSHKey(userId, keyId);
    // Return result directly since it already contains success property
    return result;
  }

  /**
   * Add SSH keys to VM
   */
// ssh-key.controller.ts - Update the addToVM endpoint

@Post('add-to-vm')
@UseGuards(JwtAuthGuard)
async addSSHKeysToVM(
  @User('id') userId: string,
  @Body() dto: AddSSHKeyToVMDto,
) {
  const result = await this.sshKeyService.addSSHKeysToVM(userId, dto);
  return {
    success: true,
    message: result.message,
  };
}

@Delete('vm/:vmId/key/:keyId')
@UseGuards(JwtAuthGuard)
async removeSSHKeyFromVM(
  @User('id') userId: string,
  @Param('vmId') vmId: string,
  @Param('keyId') keyId: string,
) {
  const result = await this.sshKeyService.removeSSHKeyFromVM(
    userId,
    parseInt(vmId),
    parseInt(keyId),
  );
  return {
    success: true,
    message: result.message,
  };
}

@Get('vm/:vmId/keys')
@UseGuards(JwtAuthGuard)
async getVMSSHKeys(
  @User('id') userId: string,
  @Param('vmId') vmId: string,
) {
  const keys = await this.sshKeyService.getVMSSHKeys(userId, parseInt(vmId));
  return {
    success: true,
    keys,
    total: keys.length,
  };
}
  /**
   * Validate SSH key format
   */
  @Post('validate')
  async validateSSHKey(@Body() dto: ValidateSSHKeyDto) {
    const validation = await this.sshKeyService.validateSSHKey(dto);
    // Return validation directly since it already contains success property
    return validation;
  }

  /**
   * Sync SSH keys from Proxmox
   */
  // @Post('sync')
  // async syncFromProxmox(@User('id') userId: string) {
  //   const result = await this.sshKeyService.syncFromProxmox(userId);
  //   // Return result directly since it already contains success property
  //   return result;
  // }

  /**
   * Get SSH key statistics
   */
  @Get('stats/summary')
  async getSSHKeyStats(@User('id') userId: string) {
    const stats = await this.sshKeyService.getSSHKeyStats(userId);
    return {
      success: true,
      stats,
    };
  }

  /**
   * Export SSH public key
   */
  @Get(':keyId/export')
  async exportKey(
    @Param('keyId') keyId: string,
    @User('id') userId: string,
    @Res() res: Response,
  ) {
    const publicKey = await this.sshKeyService.exportKey(userId, keyId);
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="ssh-key-${keyId}.pub"`);
    res.send(publicKey);
  }
}