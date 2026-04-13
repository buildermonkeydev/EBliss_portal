import { IsString, IsEnum, IsOptional, IsInt, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TicketDepartment, TicketPriority, TicketStatus } from '@prisma/client';
import { Type, Transform } from 'class-transformer';

export class CreateTicketDto {
  @ApiProperty()
  @IsString()
  subject: string;

  @ApiProperty({ enum: TicketDepartment })
  @IsEnum(TicketDepartment)
  department: TicketDepartment;

  @ApiProperty({ enum: TicketPriority, default: TicketPriority.medium })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiProperty()
  @IsString()
  description: string;
}

export class ReplyToTicketDto {
  @ApiProperty()
  @IsString()
  message: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  attachments?: string[];
}

export class AddInternalNoteDto {
  @ApiProperty()
  @IsString()
  note: string;
}

export class UpdateTicketStatusDto {
  @ApiProperty({ enum: TicketStatus })
  @IsEnum(TicketStatus)
  status: TicketStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  resolution_note?: string;
}

export class AssignTicketDto {
  @ApiProperty()
  @IsInt()
  admin_id: number;
}


export class QueryTicketsDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number = 20;

  @ApiProperty({ required: false, enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiProperty({ required: false, enum: TicketDepartment })
  @IsOptional()
  @IsEnum(TicketDepartment)
  department?: TicketDepartment;

  @ApiProperty({ required: false, enum: TicketPriority })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  assigned_to_me?: boolean;
}