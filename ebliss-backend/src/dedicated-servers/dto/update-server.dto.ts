import { PartialType } from '@nestjs/mapped-types';
import { CreateDedicatedServerDto } from './create-server.dto';

export class UpdateDedicatedServerDto extends PartialType(CreateDedicatedServerDto) {}