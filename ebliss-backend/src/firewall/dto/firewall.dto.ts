import { 
  IsString, 
  IsNotEmpty, 
  IsNumber, 
  IsOptional, 
  IsBoolean, 
  Min, 
  Max,
  IsIn,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFirewallRuleDto {
  @ApiProperty({ description: 'Port number', example: 22, minimum: 1, maximum: 65535 })
  @IsNumber()
  @Min(1)
  @Max(65535)
  port: number;

  @ApiProperty({ description: 'Protocol', example: 'tcp', enum: ['tcp', 'udp', 'icmp', 'igmp', 'tcp/udp'] })
  @IsString()
  @IsIn(['tcp', 'udp', 'icmp', 'igmp', 'tcp/udp'])
  protocol: string;

  @ApiProperty({ description: 'Source IP/CIDR', example: '0.0.0.0/0', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$|^any$/, {
    message: 'Source must be a valid CIDR (e.g., 192.168.1.0/24) or "any"',
  })
  source?: string = '0.0.0.0/0';
  // ADD THIS - Destination IP
  @ApiProperty({ description: 'Destination IP/CIDR', example: '0.0.0.0/0', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$|^any$|^0\.0\.0\.0\/0$/, {
    message: 'Destination must be a valid CIDR (e.g., 192.168.1.0/24) or "any"',
  })
  destination?: string = '0.0.0.0/0';

  // ADD THIS - Direction
  @ApiProperty({ description: 'Traffic direction', example: 'IN', enum: ['IN', 'OUT'], required: false })
  @IsOptional()
  @IsString()
  @IsIn(['IN', 'OUT'])
  direction?: string = 'IN';

    @ApiProperty({ description: 'IP version', example: 'IPv4', enum: ['IPv4', 'IPv6'], required: false })
  @IsOptional()
  @IsString()
  @IsIn(['IPv4', 'IPv6'])
  ipType?: string = 'IPv4';
  @ApiProperty({ description: 'Action', example: 'ACCEPT', enum: ['ACCEPT', 'DROP', 'REJECT'] })
  @IsString()
  @IsIn(['ACCEPT', 'DROP', 'REJECT'])
  action: string;

  @ApiProperty({ description: 'Rule description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Enable rule', default: true, required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;
    @ApiProperty({ description: 'Enable logging', default: false, required: false })
  @IsOptional()
  @IsBoolean()
  log?: boolean = false;
}

// backend/src/modules/firewall/dto/firewall.dto.ts

export class UpdateFirewallRuleDto {
  @ApiProperty({ description: 'Port number', required: false, minimum: 1, maximum: 65535 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(65535)
  port?: number;

  @ApiProperty({ description: 'Protocol', required: false, enum: ['tcp', 'udp', 'icmp', 'igmp', 'tcp/udp'] })
  @IsOptional()
  @IsString()
  @IsIn(['tcp', 'udp', 'icmp', 'igmp', 'tcp/udp'])
  protocol?: string;

  @ApiProperty({ description: 'Source IP/CIDR', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$|^any$/, {
    message: 'Source must be a valid CIDR (e.g., 192.168.1.0/24) or "any"',
  })
  source?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$|^any$|^0\.0\.0\.0\/0$/)
  destination?: string;

  @IsOptional()
  @IsString()
  @IsIn(['IN', 'OUT'])
  direction?: string;

  @IsOptional()
  @IsString()
  @IsIn(['IPv4', 'IPv6'])
  ipType?: string;

  @ApiProperty({ description: 'Action', required: false, enum: ['ACCEPT', 'DROP', 'REJECT'] })
  @IsOptional()
  @IsString()
  @IsIn(['ACCEPT', 'DROP', 'REJECT'])
  action?: string;

  @ApiProperty({ description: 'Rule description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Enable rule', required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

   @IsOptional()
  @IsBoolean()
  log?: boolean;
}
export class CreateFirewallGroupDto {
  @ApiProperty({ description: 'Group name', example: 'web-server' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9-_]+$/, {
    message: 'Group name can only contain letters, numbers, hyphens, and underscores',
  })
  name: string;

  @ApiProperty({ description: 'Group description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Enable group', default: true, required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;

  @ApiProperty({ description: 'Rules to add to the group', type: [CreateFirewallRuleDto], required: false })
  @IsOptional()
  rules?: CreateFirewallRuleDto[];
}

export interface FirewallRule {
  id: string;
  port: number;
  protocol: string;
  source: string;
  destination?: string;
  direction?: string;
  ipType?: string;
  action: string;
  description?: string;
  enabled: boolean;
  log?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
export interface FirewallGroup {
  id: string;
  name: string;
  description: string;
  rules: FirewallRule[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}


