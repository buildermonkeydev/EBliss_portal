import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ProxmoxService } from '../proxmox/proxmox.service';
import { PrismaService } from '../prisma/prisma.service';
import { 
  CreateFirewallRuleDto, 
  UpdateFirewallRuleDto, 
  CreateFirewallGroupDto,
  FirewallRule,
  FirewallGroup 
} from './dto/firewall.dto';

@Injectable()
export class FirewallService {
  private readonly logger = new Logger(FirewallService.name);

  constructor(
    private proxmoxService: ProxmoxService,
    private prisma: PrismaService,
  ) {}

  /**
   * Get all firewall groups from Proxmox
   */
  async getAllFirewallGroups(): Promise<FirewallGroup[]> {
    try {
      const groups = await this.proxmoxService.getFirewallGroups();
      
      if (!groups || groups.length === 0) {
        return [];
      }

      const firewallGroups = await Promise.all(
        groups.map(async (group: any) => {
          try {
            const rules = await this.proxmoxService.getFirewallRules(group.group);
            
            return {
              id: group.group,
              name: group.group,
              description: group.comment || '',
              rules: this.formatRules(rules),
              enabled: group.enable !== false,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          } catch (error) {
            this.logger.error(`Failed to fetch rules for group ${group.group}:`, error);
            return {
              id: group.group,
              name: group.group,
              description: group.comment || '',
              rules: [],
              enabled: group.enable !== false,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          }
        })
      );

      return firewallGroups;
    } catch (error) {
      this.logger.error('Failed to fetch firewall groups:', error);
      throw new HttpException(
        'Failed to fetch firewall groups from Proxmox',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get a specific firewall group
   */
  async getFirewallGroup(groupId: string): Promise<FirewallGroup> {
    try {
      const group = await this.proxmoxService.getFirewallGroup(groupId);
      const rules = await this.proxmoxService.getFirewallRules(groupId);
      
      return {
        id: groupId,
        name: groupId,
        description: group.comment || '',
        rules: this.formatRules(rules),
        enabled: group.enable !== false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to fetch firewall group ${groupId}:`, error);
      throw new HttpException(
        'Firewall group not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * Create a new firewall group in Proxmox
   */
  async createFirewallGroup(dto: CreateFirewallGroupDto): Promise<FirewallGroup> {
    try {
      if (!dto.name.match(/^[a-zA-Z0-9-_]+$/)) {
        throw new HttpException(
          'Group name can only contain letters, numbers, hyphens, and underscores',
          HttpStatus.BAD_REQUEST,
        );
      }

      await this.proxmoxService.createFirewallGroup(dto.name, {
        comment: dto.description,
        enable: dto.enabled !== false,
      });

      if (dto.rules && dto.rules.length > 0) {
        for (const rule of dto.rules) {
          await this.proxmoxService.createFirewallRule(dto.name, {
            action: rule.action,
            dport: rule.port.toString(),
            proto: rule.protocol,
            source: rule.source || '0.0.0.0/0',
            comment: rule.description,
            enable: rule.enabled !== false,
            log: false,
          });
        }
      }

      return this.getFirewallGroup(dto.name);
    } catch (error) {
      this.logger.error('Failed to create firewall group:', error);
      throw new HttpException(
        error.message || 'Failed to create firewall group',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update a firewall group
   */
  async updateFirewallGroup(
    groupId: string,
    dto: Partial<CreateFirewallGroupDto>,
  ): Promise<FirewallGroup> {
    try {
      await this.proxmoxService.updateFirewallGroup(groupId, {
        comment: dto.description,
        enable: dto.enabled,
        rename: dto.name !== groupId ? dto.name : undefined,
      });

      return this.getFirewallGroup(dto.name || groupId);
    } catch (error) {
      this.logger.error(`Failed to update firewall group ${groupId}:`, error);
      throw new HttpException(
        error.message || 'Failed to update firewall group',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete a firewall group from Proxmox
   */
  async deleteFirewallGroup(groupId: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.proxmoxService.deleteFirewallGroup(groupId);
      
      return {
        success: true,
        message: `Firewall group ${groupId} deleted successfully`,
      };
    } catch (error) {
      this.logger.error(`Failed to delete firewall group ${groupId}:`, error);
      throw new HttpException(
        error.message || 'Failed to delete firewall group',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Add a rule to a firewall group
   */
  async addFirewallRule(
    groupId: string,
    dto: CreateFirewallRuleDto,
  ): Promise<FirewallRule> {
    try {
      this.validateFirewallRule(dto);

      await this.proxmoxService.createFirewallRule(groupId, {
        action: dto.action,
        dport: dto.port.toString(),
        proto: dto.protocol,
        source: dto.source || '0.0.0.0/0',
        comment: dto.description,
        enable: dto.enabled !== false,
        log: false,
      });

      const rules = await this.proxmoxService.getFirewallRules(groupId);
      const newRule = rules[rules.length - 1];
      
      return {
        id: newRule.pos?.toString() || `${Date.now()}`,
        port: dto.port,
        protocol: dto.protocol,
        source: dto.source || '0.0.0.0/0',
        action: dto.action,
        description: dto.description,
        enabled: dto.enabled !== false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to add rule to group ${groupId}:`, error);
      throw new HttpException(
        error.message || 'Failed to add firewall rule',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  
  async deleteFirewallRule(
    groupId: string,
    rulePos: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const pos = parseInt(rulePos);
      if (isNaN(pos)) {
        throw new HttpException('Invalid rule position', HttpStatus.BAD_REQUEST);
      }

      await this.proxmoxService.deleteFirewallRule(groupId, pos);

      return {
        success: true,
        message: `Firewall rule deleted successfully`,
      };
    } catch (error) {
      this.logger.error(`Failed to delete rule ${rulePos} from group ${groupId}:`, error);
      throw new HttpException(
        error.message || 'Failed to delete firewall rule',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

/**
 * Apply firewall group to a specific VM
 */
async applyFirewallToVM(
  vmId: number,
  groupId: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const vm = await this.prisma.vM.findUnique({
      where: { id: vmId },
      include: { node: true },
    });

    if (!vm) {
      throw new HttpException('VM not found', HttpStatus.NOT_FOUND);
    }

    const node = await this.prisma.node.findUnique({
      where: { id: vm.node_id },
    });

    if (!node) {
      throw new HttpException('Node not found', HttpStatus.NOT_FOUND);
    }

    // Use only hostname
    await this.proxmoxService.setVMFirewallGroup(node.hostname, vm.proxmox_vmid, groupId);

    await this.prisma.vM.update({
      where: { id: vmId },
      data: {
        firewall_group_id: parseInt(groupId) || null,
      },
    });

    return {
      success: true,
      message: `Firewall group ${groupId} applied to VM ${vm.name}`,
    };
  } catch (error) {
    this.logger.error(`Failed to apply firewall to VM ${vmId}:`, error);
    throw new HttpException(
      error.message || 'Failed to apply firewall to VM',
      error.status || HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

/**
 * Get firewall rules for a specific VM
 */
async getVMFirewallRules(vmId: number): Promise<FirewallRule[]> {
  try {
    const vm = await this.prisma.vM.findUnique({
      where: { id: vmId },
      include: { node: true },
    });

    if (!vm) {
      throw new HttpException('VM not found', HttpStatus.NOT_FOUND);
    }

    const node = await this.prisma.node.findUnique({
      where: { id: vm.node_id },
    });

    if (!node) {
      throw new HttpException('Node not found', HttpStatus.NOT_FOUND);
    }

    // Use only hostname
    const rules = await this.proxmoxService.getVMFirewallRules(node.hostname, vm.proxmox_vmid);
    return this.formatRules(rules);
  } catch (error) {
    this.logger.error(`Failed to fetch firewall rules for VM ${vmId}:`, error);
    throw new HttpException(
      'Failed to fetch VM firewall rules',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}





async getVMFirewallOptions(vmId: number): Promise<any> {
  try {
    const vm = await this.prisma.vM.findUnique({
      where: { id: vmId },
      include: { node: true },
    });

    if (!vm) {
      throw new HttpException('VM not found', HttpStatus.NOT_FOUND);
    }

    const node = await this.prisma.node.findUnique({
      where: { id: vm.node_id },
    });

    if (!node) {
      throw new HttpException('Node not found', HttpStatus.NOT_FOUND);
    }

    // Use only hostname since node doesn't have 'name' property
    return await this.proxmoxService.getVMFirewallOptions(node.hostname, vm.proxmox_vmid);
  } catch (error) {
    this.logger.error(`Failed to fetch VM firewall options for ${vmId}:`, error);
    throw new HttpException(
      'Failed to fetch VM firewall options',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

/**
 * Update VM firewall options
 */
async updateVMFirewallOptions(vmId: number, options: {
  enable?: boolean;
  log_level?: string;
  policy_in?: string;
  policy_out?: string;
}): Promise<any> {
  try {
    const vm = await this.prisma.vM.findUnique({
      where: { id: vmId },
      include: { node: true },
    });

    if (!vm) {
      throw new HttpException('VM not found', HttpStatus.NOT_FOUND);
    }

    const node = await this.prisma.node.findUnique({
      where: { id: vm.node_id },
    });

    if (!node) {
      throw new HttpException('Node not found', HttpStatus.NOT_FOUND);
    }

    // Use only hostname since node doesn't have 'name' property
    return await this.proxmoxService.setVMFirewallOptions(node.hostname, vm.proxmox_vmid, options);
  } catch (error) {
    this.logger.error(`Failed to update VM firewall options for ${vmId}:`, error);
    throw new HttpException(
      'Failed to update VM firewall options',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
  /**
   * Validate a firewall rule
   */
  private validateFirewallRule(rule: CreateFirewallRuleDto): void {
    if (rule.port < 1 || rule.port > 65535) {
      throw new HttpException('Port must be between 1 and 65535', HttpStatus.BAD_REQUEST);
    }

    const validProtocols = ['tcp', 'udp', 'icmp', 'igmp', 'tcp/udp'];
    if (!validProtocols.includes(rule.protocol)) {
      throw new HttpException(
        `Protocol must be one of: ${validProtocols.join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const validActions = ['ACCEPT', 'DROP', 'REJECT'];
    if (!validActions.includes(rule.action)) {
      throw new HttpException(
        `Action must be one of: ${validActions.join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (rule.source) {
      const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$|^0\.0\.0\.0\/0$|^any$/;
      if (!cidrRegex.test(rule.source)) {
        throw new HttpException(
          'Invalid source format. Use CIDR notation (e.g., 192.168.1.0/24) or "any"',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  /**
   * Format Proxmox rules to our format
   */
  private formatRules(rules: any[]): FirewallRule[] {
    if (!rules || !Array.isArray(rules)) return [];
    
    return rules
      .filter(rule => rule.type !== 'group')
      .map(rule => ({
        id: rule.pos?.toString() || `${rule.dport}-${rule.proto}`,
        port: parseInt(rule.dport) || 0,
        protocol: rule.proto || 'tcp',
        source: rule.source || '0.0.0.0/0',
        action: rule.action || 'ACCEPT',
        description: rule.comment || '',
        enabled: rule.enable !== false,
        log: rule.log === 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
  }

async updateFirewallRule(
  groupId: string,
  rulePos: string,
  dto: UpdateFirewallRuleDto,
): Promise<FirewallRule> {
  try {
    const pos = parseInt(rulePos);
    if (isNaN(pos)) {
      throw new HttpException('Invalid rule position', HttpStatus.BAD_REQUEST);
    }

    const updateData: any = {};
    
    if (dto.action !== undefined) updateData.action = dto.action;
    if (dto.port !== undefined) updateData.dport = dto.port.toString();
    if (dto.protocol !== undefined) updateData.proto = dto.protocol;
    if (dto.source !== undefined) updateData.source = dto.source;
    if (dto.description !== undefined) updateData.comment = dto.description;
    if (dto.enabled !== undefined) updateData.enable = dto.enabled;

    await this.proxmoxService.updateFirewallRule(groupId, pos, updateData);

    const currentRules = await this.proxmoxService.getFirewallRules(groupId);
    const currentRule = currentRules.find(r => r.pos === pos);
    
    return {
      id: rulePos,
      port: dto.port !== undefined ? dto.port : (currentRule?.dport ? parseInt(currentRule.dport) : 0),
      protocol: dto.protocol !== undefined ? dto.protocol : (currentRule?.proto || 'tcp'),
      source: dto.source !== undefined ? dto.source : (currentRule?.source || '0.0.0.0/0'),
      action: dto.action !== undefined ? dto.action : (currentRule?.action || 'ACCEPT'),
      description: dto.description !== undefined ? dto.description : (currentRule?.comment || ''),
      enabled: dto.enabled !== undefined ? dto.enabled : (currentRule?.enable !== false),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (error) {
    this.logger.error(`Failed to update rule ${rulePos} in group ${groupId}:`, error);
    throw new HttpException(
      error.message || 'Failed to update firewall rule',
      error.status || HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
// firewall.service.ts - Add this method

/**
 * Save multiple firewall rules for a VM (replaces all rules)
 */
async saveVMFirewallRules(vmId: number, rules: any[]): Promise<{ success: boolean; message: string }> {
  try {
    const vm = await this.prisma.vM.findUnique({
      where: { id: vmId },
      include: { node: true },
    });

    if (!vm) {
      throw new HttpException('VM not xcfofdsvdvund', HttpStatus.NOT_FOUND);
    }

    const node = await this.prisma.node.findUnique({
      where: { id: vm.node_id },
    });

    if (!node) {
      throw new HttpException('Node not found', HttpStatus.NOT_FOUND);
    }

    // Format rules for Proxmox
    const formattedRules = rules.map(rule => ({
      action: rule.action,
      protocol: rule.protocol,
      port: rule.port && rule.port !== 'N/A' ? rule.port : null,
      source: rule.direction === 'IN' ? rule.source : null,
      destination: rule.direction === 'OUT' ? (rule.dest || rule.source) : null,
      comment: rule.comment,
      enabled: rule.enabled,
      log: rule.log || false,
      direction: rule.direction,
    }));

    await this.proxmoxService.setVMFirewallRules(node.hostname, vm.proxmox_vmid, formattedRules);

    return {
      success: true,
      message: 'Firewall rules saved successfully',
    };
  } catch (error) {
    this.logger.error(`Failed to save VM firewall rules for ${vmId}:`, error);
    throw new HttpException(
      error.message || 'Failed to save firewall rules',
      error.status || HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
}