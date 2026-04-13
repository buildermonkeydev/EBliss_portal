import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as https from 'https';

@Injectable()
export class ProxmoxService {
  private client: AxiosInstance;
  private readonly logger = new Logger(ProxmoxService.name);

constructor(private configService: ConfigService) {
  // Debug: Log all config values
  const host = this.configService.get('PROXMOX_HOST');
  const port = this.configService.get('PROXMOX_PORT');
  const tokenId = this.configService.get('PROXMOX_TOKEN_ID');
  const tokenSecret = this.configService.get('PROXMOX_TOKEN_SECRET');
  
  // console.log('=== PROXMOX CONFIG DEBUG ===');
  // console.log('PROXMOX_HOST:', host);
  // console.log('PROXMOX_PORT:', port);
  // console.log('PROXMOX_TOKEN_ID:', tokenId);
  // console.log('PROXMOX_TOKEN_SECRET:', tokenSecret ? '***SET***' : 'MISSING');
  // console.log('===========================');
  
  // Validate required config
  if (!host) {
    throw new Error('PROXMOX_HOST is not set in .env file');
  }
  if (!port) {
    throw new Error('PROXMOX_PORT is not set in .env file');
  }
  if (!tokenId) {
    throw new Error('PROXMOX_TOKEN_ID is not set in .env file');
  }
  if (!tokenSecret) {
    throw new Error('PROXMOX_TOKEN_SECRET is not set in .env file');
  }
  
  this.client = axios.create({
    baseURL: `https://${host}:${port}/api2/json`,
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    timeout: 30000,
    headers: {
      'Authorization': `PVEAPIToken=${tokenId}=${tokenSecret}`,
    },
  });
  
  console.log('Proxmox client created with baseURL:', `https://${host}:${port}/api2/json`);
}

 private async request<T>(
  method: string, 
  endpoint: string, 
  data?: any, 
  options?: { headers?: any; isFormData?: boolean }
): Promise<T> {
  try {
    const config: any = {
      method,
      url: endpoint,
    };
    
    if (data) {
      config.data = data;
      if (options?.isFormData) {
        config.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
      } else {
        config.headers = { 'Content-Type': 'application/json' };
      }
    }

    const response = await this.client.request(config);
    return response.data.data;
  } catch (error: any) {
    this.logger.error(`Proxmox API error: ${error.message}`, error.response?.data);
    throw new HttpException(
      error.response?.data?.message || 'Proxmox API error',
      error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}


 async setVMFirewallOptions(node: string, vmid: number, options: {
  enable?: boolean;
  log_level?: string;
  policy_in?: string;
  policy_out?: string;
}): Promise<any> {
  // Build JSON object
  const optionsData: any = {};
  if (options.enable !== undefined) optionsData.enable = options.enable ? 1 : 0;
  if (options.log_level) optionsData.log_level = options.log_level;
  if (options.policy_in) optionsData.policy_in = options.policy_in;
  if (options.policy_out) optionsData.policy_out = options.policy_out;
  
  // Send as JSON
  return this.request('PUT', `/nodes/${node}/qemu/${vmid}/firewall/options`, optionsData);
}
  async getVMStats(node: string, vmid: number): Promise<any> {
    return this.request('GET', `/nodes/${node}/qemu/${vmid}/status/current`);
  }

  // ============ Node/Location Methods ============

  async getNodes(): Promise<any[]> {
    return this.request('GET', '/nodes');
  }

  async getNode(node: string): Promise<any> {
    return this.request('GET', `/nodes/${node}/status`);
  }

  async getNodeStatus(node: string): Promise<any> {
    return this.request('GET', `/nodes/${node}/status`);
  }



  async getNodeNetwork(node: string): Promise<any[]> {
    return this.request('GET', `/nodes/${node}/network`);
  }

  async getNodeDNS(node: string): Promise<any> {
    return this.request('GET', `/nodes/${node}/dns`);
  }

  async getNodeStorage(node: string): Promise<any[]> {
    return this.request('GET', `/nodes/${node}/storage`);
  }

 

  async getNodeTasks(node: string): Promise<any[]> {
    return this.request('GET', `/nodes/${node}/tasks`);
  }

 


  async getStorageContent(node: string, storage: string): Promise<any[]> {
    return this.request('GET', `/nodes/${node}/storage/${storage}/content`);
  }

  async getTemplates(node: string, storage: string): Promise<any[]> {
    const contents = await this.getStorageContent(node, storage);
    return contents.filter(c => 
      c.content === 'vztmpl' || 
      c.content === 'iso' ||
      (c.content === 'images' && c.format === 'raw')
    );
  }

  async getAllTemplates(): Promise<any[]> {
    const nodes = await this.getNodes();
    const allTemplates: any[] = [];

    for (const node of nodes) {
      if (node.status !== 'online') continue;

      const storages = await this.getNodeStorage(node.node);
      const templateStorages = storages.filter(s => 
        s.content?.includes('vztmpl') || 
        s.content?.includes('iso') ||
        s.content?.includes('images')
      );

      for (const storage of templateStorages) {
        try {
          const templates = await this.getTemplates(node.node, storage.storage);
          for (const template of templates) {
            allTemplates.push({
              ...template,
              node: node.node,
              storage: storage.storage,
            });
          }
        } catch (error) {
          this.logger.error(`Failed to fetch templates from ${node.node}/${storage.storage}:`, error);
        }
      }
    }

    return allTemplates;
  }

  async getTemplateDetails(node: string, storage: string, volumeId: string): Promise<any> {
    return this.request('GET', `/nodes/${node}/storage/${storage}/content/${encodeURIComponent(volumeId)}`);
  }

  async deleteTemplate(node: string, storage: string, volumeId: string): Promise<any> {
    return this.request('DELETE', `/nodes/${node}/storage/${storage}/content/${encodeURIComponent(volumeId)}`);
  }

  async cloneTemplateToVM(
    node: string,
    templateVolumeId: string,
    newVMID: number,
    options: {
      name?: string;
      storage?: string;
      full?: boolean;
      format?: string;
      target?: string;
    } = {}
  ): Promise<any> {
    const params: any = {
      newid: newVMID,
    };
    
    if (options.name) params.name = options.name;
    if (options.storage) params.storage = options.storage;
    if (options.full !== undefined) params.full = options.full;
    if (options.format) params.format = options.format;
    if (options.target) params.target = options.target;
    
    return this.request('POST', `/nodes/${node}/qemu/${templateVolumeId}/clone`, params);
  }

  async copyTemplate(
    sourceNode: string,
    sourceStorage: string,
    sourceVolume: string,
    targetNode: string,
    targetStorage: string,
    targetVolume?: string
  ): Promise<any> {
    const params = {
      target: `${targetNode}:${targetStorage}/${targetVolume || sourceVolume}`,
    };
    
    return this.request('POST', `/nodes/${sourceNode}/storage/${sourceStorage}/content/${encodeURIComponent(sourceVolume)}/copy`, params);
  }


  async getSSHKeys(): Promise<any[]> {
    try {
      const users = await this.request('GET', '/access/users');
      const sshKeys: any[] = [];
      
      if (users && Array.isArray(users)) {
        for (const user of users) {
          try {
            const keys = await this.request('GET', `/access/users/${user.userid}/ssh_keys`);
            if (keys && Array.isArray(keys) && keys.length > 0) {
              for (const key of keys) {
                sshKeys.push({
                  ...key,
                  userId: user.userid,
                  username: user.userid.split('@')[0],
                  realm: user.userid.split('@')[1] || 'pam',
                });
              }
            }
          } catch (error) {
            this.logger.debug(`No SSH keys for user ${user.userid}`);
          }
        }
      }
      
      return sshKeys;
    } catch (error) {
      this.logger.error('Failed to fetch SSH keys from Proxmox:', error);
      return [];
    }
  }


async addSSHKey(userId: string, keyName: string, publicKey: string): Promise<any> {
  // Clean and format the SSH key properly
  let cleanKey = publicKey.trim();
  
  // Remove any newlines and carriage returns
  cleanKey = cleanKey.replace(/\n/g, ' ').replace(/\r/g, '');
  
  // Replace multiple spaces with single space
  cleanKey = cleanKey.replace(/\s+/g, ' ');
  
  // Ensure the key has the proper format (type key only, no comment)
  const parts = cleanKey.split(' ');
  if (parts.length >= 2) {
    // Only send type and key, remove any comment
    cleanKey = `${parts[0]} ${parts[1]}`;
  }
  
  // IMPORTANT: Proxmox expects the key as a raw string, not URL-encoded
  // Use JSON format instead of form-urlencoded
  const requestBody = {
    key: cleanKey,
    comment: keyName,
  };
  
  return this.request('POST', `/access/users/${userId}/ssh_keys`, requestBody);
}
  async deleteSSHKey(userId: string, keyFingerprint: string): Promise<any> {
    return this.request('DELETE', `/access/users/${userId}/ssh_keys/${encodeURIComponent(keyFingerprint)}`);
  }

  async getUserSSHKeys(userId: string): Promise<any[]> {
    try {
      return await this.request('GET', `/access/users/${userId}/ssh_keys`);
    } catch (error) {
      this.logger.error(`Failed to fetch SSH keys for user ${userId}:`, error);
      return [];
    }
  }

  async validateSSHKey(publicKey: string): Promise<{ valid: boolean; type?: string; fingerprint?: string; message?: string }> {
    try {
      const keyPatterns = [
        { type: 'ssh-rsa', pattern: /^ssh-rsa AAAA[0-9A-Za-z+/]+[=]{0,3} ?.*$/ },
        { type: 'ssh-ed25519', pattern: /^ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI[0-9A-Za-z+/]+ ?.*$/ },
        { type: 'ecdsa-sha2-nistp256', pattern: /^ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBB[0-9A-Za-z+/]+ ?.*$/ },
        { type: 'ecdsa-sha2-nistp384', pattern: /^ecdsa-sha2-nistp384 AAAAE2VjZHNhLXNoYTItbmlzdHAzODQAAAAIbmlzdHAzODQAAABhB[0-9A-Za-z+/]+ ?.*$/ },
        { type: 'ecdsa-sha2-nistp521', pattern: /^ecdsa-sha2-nistp521 AAAAE2VjZHNhLXNoYTItbmlzdHA1MjEAAAAIbmlzdHA1MjEAAACF[0-9A-Za-z+/]+ ?.*$/ },
      ];
      
      let matchedType: string | null = null;
      for (const pattern of keyPatterns) {
        if (pattern.pattern.test(publicKey.trim())) {
          matchedType = pattern.type;
          break;
        }
      }
      
      if (!matchedType) {
        return {
          valid: false,
          message: 'Invalid SSH key format. Supported formats: RSA, ED25519, ECDSA',
        };
      }
      
      const crypto = require('crypto');
      const keyContent = publicKey.trim().split(' ')[1];
      const keyBuffer = Buffer.from(keyContent, 'base64');
      const fingerprint = crypto.createHash('md5')
        .update(keyBuffer)
        .digest('hex')
        .match(/.{2}/g)
        ?.join(':');
      
      return {
        valid: true,
        type: matchedType,
        fingerprint,
        message: 'Valid SSH key',
      };
    } catch (error) {
      return {
        valid: false,
        message: `Invalid SSH key: ${error.message}`,
      };
    }
  }


async removeSSHKeyFromVM(node: string, vmid: number, sshKeyFingerprint: string): Promise<any> {
  try {
    // Get current VM config
    const config = await this.getVMConfig(node, vmid);
    let existingKeys = config.sshkeys || '';
    
    if (!existingKeys) {
      return { success: true, message: 'No SSH keys to remove' };
    }
    
    // Split keys and filter out the one to remove
    const keys = existingKeys.split('\n');
    const filteredKeys = keys.filter(key => {
      // Generate fingerprint for comparison
      const keyContent = key.trim().split(' ')[1];
      if (!keyContent) return true;
      
      const crypto = require('crypto');
      const keyBuffer = Buffer.from(keyContent, 'base64');
      const fingerprint = crypto.createHash('md5')
        .update(keyBuffer)
        .digest('hex')
        .match(/.{2}/g)
        ?.join(':');
      
      return fingerprint !== sshKeyFingerprint;
    });
    
    const newKeys = filteredKeys.join('\n');
    
    // Update VM config
    return await this.setVMConfig(node, vmid, { sshkeys: newKeys });
  } catch (error) {
    this.logger.error(`Failed to remove SSH key from VM ${vmid}:`, error);
    throw error;
  }
}

// proxmox.service.ts - Fix with proper typing

async getVMSSHKeys(node: string, vmid: number): Promise<any[]> {
  try {
    const config = await this.getVMConfig(node, vmid);
    const sshKeys = config.sshkeys || '';
    
    if (!sshKeys) return [];
    
    const keys = sshKeys.split('\n').filter(k => k.trim());
    const result: any[] = [];  // Explicitly type the array
    
    for (const key of keys) {
      const parts = key.trim().split(' ');
      if (parts.length >= 2) {
        const keyContent = parts[1];
        const crypto = require('crypto');
        const keyBuffer = Buffer.from(keyContent, 'base64');
        const fingerprint = crypto.createHash('md5')
          .update(keyBuffer)
          .digest('hex')
          .match(/.{2}/g)
          ?.join(':');
        
        result.push({
          key: key,
          type: parts[0],
          fingerprint: fingerprint,
          comment: parts[2] || ''
        });
      }
    }
    
    return result;
  } catch (error) {
    this.logger.error(`Failed to get SSH keys for VM ${vmid}:`, error);
    return [];
  }
}



  async getFirewallGroups(): Promise<any[]> {
    return this.request('GET', '/cluster/firewall/groups');
  }

  async getFirewallGroup(group: string): Promise<any> {
    return this.request('GET', `/cluster/firewall/groups/${group}`);
  }

  async createFirewallGroup(group: string, options: { comment?: string; enable?: boolean } = {}): Promise<any> {
    const params = new URLSearchParams();
    params.append('group', group);
    if (options.comment) params.append('comment', options.comment);
    if (options.enable !== undefined) params.append('enable', options.enable ? '1' : '0');

    return this.request('POST', '/cluster/firewall/groups', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async updateFirewallGroup(group: string, options: { comment?: string; enable?: boolean; rename?: string }): Promise<any> {
    const params = new URLSearchParams();
    if (options.comment) params.append('comment', options.comment);
    if (options.enable !== undefined) params.append('enable', options.enable ? '1' : '0');
    if (options.rename) params.append('rename', options.rename);

    return this.request('PUT', `/cluster/firewall/groups/${group}`, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async deleteFirewallGroup(group: string): Promise<any> {
    return this.request('DELETE', `/cluster/firewall/groups/${group}`);
  }

  async getFirewallRules(group: string): Promise<any[]> {
    try {
      return this.request('GET', `/cluster/firewall/groups/${group}`);
    } catch (error) {
      if (error.status === 404) {
        return [];
      }
      throw error;
    }
  }

  async createFirewallRule(group: string, rule: {
    action: string;
    dport?: string;
    proto?: string;
    source?: string;
    dest?: string;
    comment?: string;
    enable?: boolean;
    log?: boolean;
  }): Promise<any> {
    const params = new URLSearchParams();
    params.append('action', rule.action);
    if (rule.dport) params.append('dport', rule.dport);
    if (rule.proto) params.append('proto', rule.proto);
    if (rule.source) params.append('source', rule.source);
    if (rule.dest) params.append('dest', rule.dest);
    if (rule.comment) params.append('comment', rule.comment);
    if (rule.enable !== undefined) params.append('enable', rule.enable ? '1' : '0');
    if (rule.log !== undefined) params.append('log', rule.log ? '1' : '0');

    return this.request('POST', `/cluster/firewall/groups/${group}`, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async updateFirewallRule(group: string, rulePos: number, rule: {
    action?: string;
    dport?: string;
    proto?: string;
    source?: string;
    dest?: string;
    comment?: string;
    enable?: boolean;
    log?: boolean;
  }): Promise<any> {
    const params = new URLSearchParams();
    if (rule.action) params.append('action', rule.action);
    if (rule.dport) params.append('dport', rule.dport);
    if (rule.proto) params.append('proto', rule.proto);
    if (rule.source) params.append('source', rule.source);
    if (rule.dest) params.append('dest', rule.dest);
    if (rule.comment) params.append('comment', rule.comment);
    if (rule.enable !== undefined) params.append('enable', rule.enable ? '1' : '0');
    if (rule.log !== undefined) params.append('log', rule.log ? '1' : '0');

    return this.request('PUT', `/cluster/firewall/groups/${group}/${rulePos}`, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async deleteFirewallRule(group: string, rulePos: number): Promise<any> {
    return this.request('DELETE', `/cluster/firewall/groups/${group}/${rulePos}`);
  }

async getVMFirewallRules(node: string, vmid: number): Promise<any[]> {
  try {
    return await this.request('GET', `/nodes/${node}/qemu/${vmid}/firewall/rules`);
  } catch (error: any) {
    if (error.status === 404) {
      return [];
    }
    this.logger.error(`Failed to get VM firewall rules for ${vmid}:`, error);
    throw error;
  }
}

async setVMFirewallGroup(node: string, vmid: number, group: string): Promise<any> {
  // Send as JSON object, not URLSearchParams
  const ruleData = {
    action: 'group',
    group: group
  };
  
  return this.request('PUT', `/nodes/${node}/qemu/${vmid}/firewall/rules`, ruleData);
}


  async getVMFirewallOptions(node: string, vmid: number): Promise<any> {
    return this.request('GET', `/nodes/${node}/qemu/${vmid}/firewall/options`);
  }

// proxmox.service.ts - Replace the incorrect methods with these

/**
 * Get firewall rules for a specific VM
 */
// async getVMFirewallRules(node: string, vmid: number): Promise<any[]> {
//   try {
//     return await this.request('GET', `/nodes/${node}/qemu/${vmid}/firewall/rules`);
//   } catch (error: any) {
//     if (error.status === 404) {
//       return [];
//     }
//     this.logger.error(`Failed to get VM firewall rules for ${vmid}:`, error);
//     throw error;
//   }
// }

async setVMFirewallRules(node: string, vmid: number, rules: any[]): Promise<void> {
  try {
    // First, get existing rules
    const existingRules = await this.getVMFirewallRules(node, vmid);
    
    // Delete all existing rules
    for (const rule of existingRules) {
      if (rule.pos) {
        await this.deleteVMFirewallRule(node, vmid, rule.pos);
      }
    }
    
    // Create new rules
    for (const rule of rules) {
      await this.createVMFirewallRule(node, vmid, rule);
    }
    
    this.logger.log(`Successfully set ${rules.length} firewall rules for VM ${vmid}`);
  } catch (error) {
    this.logger.error(`Failed to set VM firewall rules for ${vmid}:`, error);
    throw error;
  }
}
// proxmox.service.ts - Fix createVMFirewallRule with correct parameters

/**
 * Create a firewall rule for a VM - Using correct Proxmox parameter names and values
 */
async createVMFirewallRule(node: string, vmid: number, rule: any): Promise<void> {
  try {
    // Build JSON object with CORRECT Proxmox parameter names and values
    const ruleData: any = {
      action: rule.action,        // ACCEPT, DROP, REJECT
      proto: rule.protocol,       // tcp, udp, icmp
      enable: rule.enabled !== false ? 1 : 0,
      type: 'in',                 // REQUIRED: 'in' or 'out' for direction
    };
    
    // IMPORTANT: log expects a string value, not 0/1
    // Remove log parameter if not needed, or set to 'nolog'
    if (rule.log === true) {
      ruleData.log = 'info';  // or 'notice', 'debug', etc.
    } else {
      ruleData.log = 'nolog'; // Explicitly set to 'nolog' when disabled
    }
    
    // Add port if not ICMP and port exists
    if (rule.protocol !== 'icmp' && rule.port && rule.port !== 'N/A' && rule.port !== '') {
      ruleData.dport = parseInt(rule.port);
    }
    
    // Add source/destination based on direction
    if (rule.direction === 'IN') {
      if (rule.source) {
        ruleData.source = rule.source;
      }
    } else if (rule.direction === 'OUT') {
      if (rule.destination || rule.source) {
        ruleData.dest = rule.destination || rule.source;
      }
    }
    
    // Add comment if provided
    if (rule.comment) {
      ruleData.comment = rule.comment;
    }
    
    // Log what we're sending for debugging
    this.logger.debug(`Creating firewall rule for VM ${vmid}: ${JSON.stringify(ruleData)}`);
    
    // Send as JSON
    await this.request('POST', `/nodes/${node}/qemu/${vmid}/firewall/rules`, ruleData);
  } catch (error) {
    this.logger.error(`Failed to create VM firewall rule for ${vmid}:`, error);
    throw error;
  }
}





async deleteVMFirewallRule(node: string, vmid: number, pos: number): Promise<void> {
  try {
    await this.request('DELETE', `/nodes/${node}/qemu/${vmid}/firewall/rules/${pos}`);
  } catch (error) {
    this.logger.error(`Failed to delete VM firewall rule for ${vmid}:`, error);
    throw error;
  }
}
/**
 * Get VM firewall options
 */
// async getVMFirewallOptions(node: string, vmid: number): Promise<any> {
//   try {
//     return await this.request('GET', `/nodes/${node}/qemu/${vmid}/firewall/options`);
//   } catch (error: any) {
//     if (error.status === 404) {
//       return {};
//     }
//     this.logger.error(`Failed to get VM firewall options for ${vmid}:`, error);
//     throw error;
//   }
// }

/**
 * Set VM firewall options
 */
// async setVMFirewallOptions(node: string, vmid: number, options: any): Promise<any> {
//   const params = new URLSearchParams();
//   if (options.enable !== undefined) params.append('enable', options.enable ? '1' : '0');
//   if (options.log_level) params.append('log_level', options.log_level);
//   if (options.policy_in) params.append('policy_in', options.policy_in);
//   if (options.policy_out) params.append('policy_out', options.policy_out);
  
//   return this.request('PUT', `/nodes/${node}/qemu/${vmid}/firewall/options`, params.toString(), {
//     headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
//   });
// }

/**
 * Set VM firewall group
 */
// async setVMFirewallGroup(node: string, vmid: number, groupId: string): Promise<void> {
//   const params = new URLSearchParams();
//   params.append('action', 'group');
//   params.append('group', groupId);
  
//   await this.request('PUT', `/nodes/${node}/qemu/${vmid}/firewall/rules`, params.toString(), {
//     headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
//   });
// }
  // backend/src/modules/proxmox/proxmox.service.ts


  async getVMStatus(node: string, vmid: number): Promise<any> {
    return this.request('GET', `/nodes/${node}/qemu/${vmid}/status/current`);
  }

  async startVM(node: string, vmid: number): Promise<any> {
    return this.request('POST', `/nodes/${node}/qemu/${vmid}/status/start`);
  }

  async stopVM(node: string, vmid: number): Promise<any> {
    return this.request('POST', `/nodes/${node}/qemu/${vmid}/status/stop`);
  }

  async restartVM(node: string, vmid: number): Promise<any> {
    return this.request('POST', `/nodes/${node}/qemu/${vmid}/status/reboot`);
  }

  async deleteVM(node: string, vmid: number): Promise<any> {
    return this.request('DELETE', `/nodes/${node}/qemu/${vmid}`);
  }
// proxmox.service.ts - CORRECTED versions

// proxmox.service.ts - Keep setVMConfig simple

async setVMConfig(node: string, vmid: number, config: any): Promise<any> {
  const params = new URLSearchParams();
  
  Object.keys(config).forEach(key => {
    if (config[key] !== undefined && config[key] !== null && config[key] !== '') {
      // For sshkeys, use as-is - URLSearchParams will encode properly
      params.append(key, config[key]);
    }
  });

  // Log what we're sending for debugging
  const logParams = {};
  params.forEach((v, k) => {
    if (k === 'sshkeys') {
      logParams[k] = v.substring(0, 80) + (v.length > 80 ? '...' : '');
    } else {
      logParams[k] = v;
    }
  });
  this.logger.debug(`setVMConfig params: ${JSON.stringify(logParams)}`);
  
  // Use form-data encoding for VM config
  return this.request('PUT', `/nodes/${node}/qemu/${vmid}/config`, params.toString(), {
    isFormData: true
  });
}
// Add this method to ProxmoxService
async enableVMFirewall(node: string, vmid: number): Promise<any> {
  try {
    // Enable firewall for the VM
    const response = await this.client.put(
      `/nodes/${node}/qemu/${vmid}/firewall/options`,
      { enable: 1 },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    this.logger.debug(`Firewall enabled for VM ${vmid}`);
    return response.data;
  } catch (error: any) {
    this.logger.error(`Failed to enable firewall for VM ${vmid}:`, error.response?.data);
    throw error;
  }
}


async addSSHKeyToVM(node: string, vmid: number, sshKey: string): Promise<any> {
  try {
    // First, ensure firewall is enabled
    this.logger.debug(`Checking firewall for VM ${vmid}`);
    const firewallOptions = await this.getVMFirewallOptions(node, vmid);
    
    if (!firewallOptions || firewallOptions.enable !== 1) {
      this.logger.debug(`Enabling firewall for VM ${vmid}`);
      await this.enableVMFirewall(node, vmid);
    }
    
    // Extract only the key type and base64 part
    const match = sshKey.trim().match(/^(ssh-rsa|ssh-ed25519|ecdsa-sha2-nistp\d+)\s+([A-Za-z0-9+/=]+)/);
    
    if (!match) {
      throw new Error('Invalid SSH key format');
    }
    
    const cleanKey = `${match[1]} ${match[2]}`;
    
    this.logger.debug(`Adding SSH key to VM ${vmid}: ${cleanKey}`);
    
    // Use URLSearchParams - it properly encodes spaces as %20
    const params = new URLSearchParams();
    params.append('sshkeys', cleanKey);
    
    const response = await this.client.put(
      `/nodes/${node}/qemu/${vmid}/config`,
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    
    this.logger.debug(`SSH key added successfully to VM ${vmid}`);
    return response.data;
  } catch (error: any) {
    this.logger.error('Failed to add SSH key to VM:', error.response?.data || error.message);
    throw error;
  }
}
async resizeDisk(node: string, vmid: number, disk: string, size: number): Promise<any> {
  const resizeData = {
    disk: disk,
    size: `${size}G`
  };
  
  // Send as JSON
  return this.request('PUT', `/nodes/${node}/qemu/${vmid}/resize`, resizeData);
}

// For LXC Containers (uses ostemplate)
async createLXC(node: string, params: {
  vmid: number;
  hostname: string;
  cores: number;
  memory: number;
  disk: number;
  ostemplate: string;  // Template path like 'local:vztmpl/ubuntu-22.04.tar.zst'
  password?: string;
  sshkeys?: string;
  storage?: string;
  net0?: string;
  start?: number;
  onboot?: number;
}): Promise<any> {
  const requestParams = {
    vmid: params.vmid,
    hostname: params.hostname,
    cores: params.cores,
    memory: params.memory,
    ostemplate: params.ostemplate,  // ✅ Only for LXC
    rootfs: `${params.storage || 'local-lvm'}:${params.disk}`,
    net0: params.net0 || 'name=eth0,bridge=vmbr0,ip=dhcp',
    password: params.password,
    ssh_public_keys: params.sshkeys,
    start: params.start || 1,
    onboot: params.onboot || 1,
    storage: params.storage || 'local-lvm',
  };

  return this.request('POST', `/nodes/${node}/lxc`, requestParams);
}

// For QEMU VMs (uses ISO or cloud-init)
async createQEMU(node: string, params: {
  vmid: number;
  name: string;
  cores: number;
  memory: number;
  disk: number;
  iso?: string;  // ISO file path
  ostemplate?: string;  // For cloud-init images
  password?: string;
  sshkeys?: string;
  hostname?: string;
  storage?: string;
  net0?: string;
  start?: number;
  onboot?: number;
}): Promise<any> {
  const requestParams: any = {
    vmid: params.vmid,
    name: params.name,
    cores: params.cores,
    memory: params.memory,
    scsi0: `${params.storage || 'local-lvm'}:${params.disk},format=qcow2`,
    net0: params.net0 || 'virtio,bridge=vmbr0',
    agent: 1,
    onboot: params.onboot || 1,
    start: params.start || 1,
  };

  // Add ISO if provided
  if (params.iso) {
    requestParams.ide2 = `${params.iso},media=cdrom`;
  }

  // Add cloud-init if hostname provided
  if (params.hostname || params.password || params.sshkeys) {
    requestParams.ide2 = `${params.storage || 'local-lvm'}:cloudinit`;
    requestParams.ciuser = 'root';
    if (params.password) requestParams.cipassword = params.password;
    if (params.sshkeys) requestParams.sshkeys = params.sshkeys;
    if (params.hostname) requestParams.ipconfig0 = 'ip=dhcp';
  }

  // For cloud-init templates
  if (params.ostemplate) {
    requestParams.ostype = 'l26';
    requestParams.boot = 'order=scsi0;ide2';
  }

  return this.request('POST', `/nodes/${node}/qemu`, requestParams);
}

// Auto-detect and create appropriate VM type
async createVM(node: string, params: any): Promise<any> {
  // Detect if it's an LXC template (vztmpl)
  const isLXC = params.ostemplate?.includes('vztmpl') || 
                params.template?.includes('vztmpl') ||
                params.os?.includes('vztmpl');
  
  // Detect if it's an ISO
  const isISO = params.iso || params.os?.includes('.iso');
  
  if (isLXC) {
    return this.createLXC(node, {
      vmid: params.vmid,
      hostname: params.hostname || params.name,
      cores: params.cores,
      memory: params.memory,
      disk: params.disk,
      ostemplate: params.ostemplate || params.template || params.os,
      password: params.password,
      sshkeys: params.sshkeys,
      storage: params.storage,
      start: params.start,
      onboot: params.onboot,
    });
  } else {
    // QEMU VM
    return this.createQEMU(node, {
      vmid: params.vmid,
      name: params.name || params.hostname,
      cores: params.cores,
      memory: params.memory,
      disk: params.disk,
      iso: params.iso || (params.os?.includes('.iso') ? params.os : undefined),
      ostemplate: params.ostemplate,
      password: params.password,
      sshkeys: params.sshkeys,
      hostname: params.hostname,
      storage: params.storage,
      start: params.start,
      onboot: params.onboot,
    });
  }
}
  // proxmox.service.ts - Fix createSnapshot to use JSON

async createSnapshot(node: string, vmid: number, name: string, description?: string): Promise<any> {
  const snapshotData: any = {
    snapname: name
  };
  if (description) snapshotData.description = description;
  
  // Send as JSON
  return this.request('POST', `/nodes/${node}/qemu/${vmid}/snapshot`, snapshotData);
}
  async rollbackSnapshot(node: string, vmid: number, snapshotName: string): Promise<any> {
    return this.request('POST', `/nodes/${node}/qemu/${vmid}/snapshot/${snapshotName}/rollback`);
  }

 async getVNCProxy(node: string, vmid: number): Promise<any> {
  return this.request('POST', `/nodes/${node}/qemu/${vmid}/vncproxy`, { websocket: 1 });
}
async getNodeStats(node: string): Promise<any> {
  try {
    return await this.request('GET', `/nodes/${node}/stats`);
  } catch (error) {
    if (error.status === 501) {
      this.logger.warn(`Stats endpoint not available for node ${node}`);
      return null;
    }
    throw error;
  }
}

async getNodeConfig(node: string): Promise<any> {
  try {
    return await this.request('GET', `/nodes/${node}/config`);
  } catch (error) {
    if (error.status === 501) {
      this.logger.warn(`Config endpoint not available for node ${node}`);
      return null;
    }
    throw error;
  }
}

async getNodeTime(node: string): Promise<any> {
  try {
    return await this.request('GET', `/nodes/${node}/time`);
  } catch (error) {
    if (error.status === 501) {
      this.logger.warn(`Time endpoint not available for node ${node}`);
      return {};
    }
    throw error;
  }
}

async getNodeServices(node: string): Promise<any[]> {
  try {
    return await this.request('GET', `/nodes/${node}/services`);
  } catch (error) {
    if (error.status === 501) {
      this.logger.warn(`Services endpoint not available for node ${node}`);
      return [];
    }
    throw error;
  }
}

// Add to ProxmoxService

/**
 * Get all VMs from a node
 */
async getNodeVMs(node: string): Promise<any[]> {
  return this.request('GET', `/nodes/${node}/qemu`);
}

async getVMConfig(node: string, vmid: number): Promise<any> {
  try {
    const response = await this.client.get(`/nodes/${node}/qemu/${vmid}/config`);
    this.logger.debug(`VM ${vmid} config - sshkeys: "${response.data.data?.sshkeys}"`);
    return response.data.data;
  } catch (error) {
    this.logger.error(`Failed to get VM config for ${vmid}:`, error);
    throw error;
  }
}
// In proxmox.service.ts
async getTermProxy(nodeHostname: string, vmid: number): Promise<any> {
  // Use the existing authenticated axios client, not httpService
  return this.request('POST', `/nodes/${nodeHostname}/qemu/${vmid}/termproxy`, {});
}





// ============ VM Management Methods ============

async suspendVM(node: string, vmid: number): Promise<any> {
  try {
    return await this.request('POST', `/nodes/${node}/qemu/${vmid}/status/suspend`, {});
  } catch (error: any) {
    this.logger.error(`Failed to suspend VM ${vmid} on node ${node}:`, error);
    throw new HttpException(
      `Failed to suspend VM: ${error.message}`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

async resumeVM(node: string, vmid: number): Promise<any> {
  try {
    return await this.request('POST', `/nodes/${node}/qemu/${vmid}/status/resume`, {});
  } catch (error: any) {
    this.logger.error(`Failed to resume VM ${vmid} on node ${node}:`, error);
    throw new HttpException(
      `Failed to resume VM: ${error.message}`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

async migrateVM(sourceNode: string, vmid: number, targetNode: string): Promise<any> {
  try {
    return await this.request('POST', `/nodes/${sourceNode}/qemu/${vmid}/migrate`, {
      target: targetNode,
      online: 1,
    });
  } catch (error: any) {
    this.logger.error(`Failed to migrate VM ${vmid}:`, error);
    throw new HttpException(
      `Failed to migrate VM: ${error.message}`,
      HttpStatus.BAD_REQUEST,
    );
  }
}




async getNodeIPAddresses(node: string): Promise<any[]> {
  try {
    const networks = await this.getNodeNetwork(node);
    const ipAddresses: any[] = [];
    
    for (const net of networks) {
      if (net.address && net.netmask) {
        ipAddresses.push({
          interface: net.iface,
          address: net.address,
          netmask: net.netmask,
          cidr: this.netmaskToCidr(net.netmask),
          gateway: net.gateway,
          type: net.type,
          active: net.active === 1,
        });
      }
    }
    
    return ipAddresses;
  } catch (error) {
    this.logger.error(`Failed to get IP addresses for node ${node}:`, error);
    return [];
  }
}


async scanSubnetForUsedIPs(node: string, subnet: string): Promise<string[]> {
  try {
    // Use Proxmox API to scan network
    const response = await this.request('GET', `/nodes/${node}/scan`);
    const usedIPs: string[] = [];
    
    // Parse scan results
    if (response && Array.isArray(response)) {
      for (const entry of response) {
        if (entry.ip && entry.status === 'used') {
          usedIPs.push(entry.ip);
        }
      }
    }
    
    return usedIPs;
  } catch (error) {
    this.logger.error(`Failed to scan subnet ${subnet}:`, error);
    return [];
  }
}

/**
 * Assign IP address to VM
 */
async assignIPToVM(node: string, vmid: number, ipAddress: string, gateway?: string): Promise<any> {
  try {
    // Get current VM config
    const config = await this.getVMConfig(node, vmid);
    
    // Build new network configuration
    const currentNet = config.net0 || '';
    const netConfig = this.buildNetworkConfig(ipAddress, gateway);
    
    // Update VM config
    return await this.setVMConfig(node, vmid, { net0: netConfig });
  } catch (error) {
    this.logger.error(`Failed to assign IP ${ipAddress} to VM ${vmid}:`, error);
    throw error;
  }
}

/**
 * Release IP address from VM
 */
async releaseIPFromVM(node: string, vmid: number): Promise<any> {
  try {
    const config = await this.getVMConfig(node, vmid);
    const currentNet = config.net0 || '';
    
    // Remove IP configuration
    const cleanedNet = currentNet.replace(/,ip=[^,]+/, '').replace(/,gw=[^,]+/, '');
    
    return await this.setVMConfig(node, vmid, { net0: cleanedNet });
  } catch (error) {
    this.logger.error(`Failed to release IP from VM ${vmid}:`, error);
    throw error;
  }
}

/**
 * Set PTR record for IP
 */
async setPTRRecord(node: string, ipAddress: string, ptrRecord: string): Promise<any> {
  try {
    // This depends on your DNS setup - may need custom implementation
    return await this.request('POST', `/nodes/${node}/dns`, {
      ip: ipAddress,
      ptr: ptrRecord,
    });
  } catch (error) {
    this.logger.error(`Failed to set PTR record for ${ipAddress}:`, error);
    throw error;
  }
}


// Helper methods
private netmaskToCidr(netmask: string): number {
  const parts = netmask.split('.').map(Number);
  let bits = 0;
  for (const part of parts) {
    bits += part.toString(2).split('1').length - 1;
  }
  return bits;
}

private buildNetworkConfig(ip: string, gateway?: string): string {
  let config = `virtio,bridge=vmbr0`;
  if (ip) config += `,ip=${ip}`;
  if (gateway) config += `,gw=${gateway}`;
  return config;
}

private calculateTotalIPs(startIP: string, endIP: string): number {
  const ipToNumber = (ip: string): number => {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);
  };
  
  const start = ipToNumber(startIP);
  const end = ipToNumber(endIP);
  return end - start + 1;
}




}