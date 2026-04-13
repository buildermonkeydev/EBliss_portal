import { PartialType } from '@nestjs/mapped-types';
import { CreateColocationDto } from './create-colocation.dto';

export class UpdateColocationDto extends PartialType(CreateColocationDto) {}