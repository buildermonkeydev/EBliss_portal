import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FirewallService } from './firewall.service';
import {
  CreateFirewallRuleDto,
  UpdateFirewallRuleDto,
  CreateFirewallGroupDto,
} from './dto/firewall.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../auth/decorators/user.decorator';

@Controller('firewall')
@UseGuards(JwtAuthGuard)
export class FirewallController {
  constructor(private readonly firewallService: FirewallService) {}

  /**
   * Get all firewall groups
   */
  @Get('groups')
  async getAllGroups() {
    const groups = await this.firewallService.getAllFirewallGroups();
    return {
      success: true,
      groups,
      total: groups.length,
    };
  }

  /**
   * Get a specific firewall group
   */
  @Get('groups/:groupId')
  async getGroup(@Param('groupId') groupId: string) {
    const group = await this.firewallService.getFirewallGroup(groupId);
    return {
      success: true,
      group,
    };
  }

  /**
   * Create a new firewall group
   */
  @Post('groups')
  @Roles('ADMIN' , 'USER')
  @UseGuards(RolesGuard)
  async createGroup(@Body() dto: CreateFirewallGroupDto) {
    const group = await this.firewallService.createFirewallGroup(dto);
    return {
      success: true,
      group,
      message: 'Firewall group created successfully',
    };
  }

  /**
   * Update a firewall group
   */
  @Put('groups/:groupId')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  async updateGroup(
    @Param('groupId') groupId: string,
    @Body() dto: Partial<CreateFirewallGroupDto>,
  ) {
    const group = await this.firewallService.updateFirewallGroup(groupId, dto);
    return {
      success: true,
      group,
      message: 'Firewall group updated successfully',
    };
  }

  /**
   * Delete a firewall group
   */
  @Delete('groups/:groupId')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  async deleteGroup(@Param('groupId') groupId: string) {
    const result = await this.firewallService.deleteFirewallGroup(groupId);
    return {
      success: true,
      message: result.message,
    };
  }

  /**
   * Add a rule to a firewall group
   */
  @Post('groups/:groupId/rules')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  async addRule(
    @Param('groupId') groupId: string,
    @Body() dto: CreateFirewallRuleDto,
  ) {
    const rule = await this.firewallService.addFirewallRule(groupId, dto);
    return {
      success: true,
      rule,
      message: 'Firewall rule added successfully',
    };
  }

  /**
   * Update a firewall rule
   */
  @Put('groups/:groupId/rules/:rulePos')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  async updateRule(
    @Param('groupId') groupId: string,
    @Param('rulePos') rulePos: string,
    @Body() dto: UpdateFirewallRuleDto,
  ) {
    const rule = await this.firewallService.updateFirewallRule(groupId, rulePos, dto);
    return {
      success: true,
      rule,
      message: 'Firewall rule updated successfully',
    };
  }

  /**
   * Delete a firewall rule
   */
  @Delete('groups/:groupId/rules/:rulePos')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  async deleteRule(
    @Param('groupId') groupId: string,
    @Param('rulePos') rulePos: string,
  ) {
    const result = await this.firewallService.deleteFirewallRule(groupId, rulePos);
    return {
      success: true,
      message: result.message,
    };
  }

  /**
   * Apply firewall to a VM
   */
  @Post('apply/:vmId')
  async applyToVM(
    @Param('vmId') vmId: string,
    @Body('groupId') groupId: string,
    @User('id') userId: string,
  ) {
    // Convert string IDs to numbers
    const vmIdNum = parseInt(vmId);
    const userIdNum = parseInt(userId);
    
    // Verify VM belongs to user
    const vm = await this.firewallService['prisma'].vM.findFirst({
      where: { id: vmIdNum, user_id: userIdNum },
    });
    
    if (!vm) {
      return {
        success: false,
        message: 'VM not found or access denied',
      };
    }
    
    const result = await this.firewallService.applyFirewallToVM(vmIdNum, groupId);
    return {
      success: true,
      message: result.message,
    };
  }

  /**
   * Get firewall rules for a VM
   */
  @Get('vm/:vmId')
  async getVMRules(@Param('vmId') vmId: string, @User('id') userId: string) {
    // Convert string IDs to numbers
    const vmIdNum = parseInt(vmId);
    const userIdNum = parseInt(userId);
    
    // Verify VM belongs to user
    const vm = await this.firewallService['prisma'].vM.findFirst({
      where: { id: vmIdNum, user_id: userIdNum },
    });
    
    if (!vm) {
      return {
        success: false,
        message: 'VM not found or access denied',
      };
    }
    
    const rules = await this.firewallService.getVMFirewallRules(vmIdNum);
    return {
      success: true,
      rules,
      total: rules.length,
    };
  }

  /**
   * Get VM firewall options
   */
  @Get('vm/:vmId/options')
  async getVMOptions(@Param('vmId') vmId: string, @User('id') userId: string) {
    // Convert string IDs to numbers
    const vmIdNum = parseInt(vmId);
    const userIdNum = parseInt(userId);
    
    // Verify VM belongs to user
    const vm = await this.firewallService['prisma'].vM.findFirst({
      where: { id: vmIdNum, user_id: userIdNum },
    });
    
    if (!vm) {
      return {
        success: false,
        message: 'VM not found or access denied',
      };
    }
    
    const options = await this.firewallService.getVMFirewallOptions(vmIdNum);
    return {
      success: true,
      options,
    };
  }

  /**
   * Update VM firewall options
   */
  @Put('vm/:vmId/options')
  async updateVMOptions(
    @Param('vmId') vmId: string,
    @Body() options: { enable?: boolean; log_level?: string; policy_in?: string; policy_out?: string },
    @User('id') userId: string,
  ) {
    // Convert string IDs to numbers
    const vmIdNum = parseInt(vmId);
    const userIdNum = parseInt(userId);
    
    // Verify VM belongs to user
    const vm = await this.firewallService['prisma'].vM.findFirst({
      where: { id: vmIdNum, user_id: userIdNum },
    });
    
    if (!vm) {
      return {
        success: false,
        message: 'VM not found or access denied',
      };
    }
    
    const result = await this.firewallService.updateVMFirewallOptions(vmIdNum, options);
    return {
      success: true,
      result,
      message: 'Firewall options updated successfully',
    };
  }
// firewall.controller.ts - Add this endpoint

/**
 * Save multiple firewall rules for a VM (replaces all)
 */
@Post('vm/:vmId/rules')
async saveVMRules(
  @Param('vmId') vmId: string,
  @Body() body: { rules: any[] },
  @User('id') userId: string,
) {
  const proxmoxVmid  = parseInt(vmId);
  const userIdNum = parseInt(userId);
  
  // Verify VM belongs to user
  const vm = await this.firewallService['prisma'].vM.findFirst({
    where: { 
      proxmox_vmid: proxmoxVmid,  // Changed from 'id' to 'proxmox_vmid'
      user_id: userIdNum 
    },
  });
  console.log("Printing VM " , vm);
  if (!vm) {
    return {
      success: false,
      message: 'VM not found or access denied',
    };
  }
  
  const result = await this.firewallService.saveVMFirewallRules(vm.id, body.rules);
  return {
    success: true,
    message: result.message,
  };
}
  /**
   * Test firewall rule before applying
   */
  @Post('test-rule')
  async testRule(@Body() rule: CreateFirewallRuleDto) {
    try {
      if (rule.port < 1 || rule.port > 65535) {
        return {
          success: false,
          message: 'Port must be between 1 and 65535',
        };
      }
      
      const validProtocols = ['tcp', 'udp', 'icmp', 'igmp', 'tcp/udp'];
      if (!validProtocols.includes(rule.protocol)) {
        return {
          success: false,
          message: `Protocol must be one of: ${validProtocols.join(', ')}`,
        };
      }
      
      const validActions = ['ACCEPT', 'DROP', 'REJECT'];
      if (!validActions.includes(rule.action)) {
        return {
          success: false,
          message: `Action must be one of: ${validActions.join(', ')}`,
        };
      }
      
      return {
        success: true,
        message: 'Rule format is valid',
        rule,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}