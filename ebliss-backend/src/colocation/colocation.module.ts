import { Module } from '@nestjs/common';
import { ColocationService } from './colocation.service';
import { ColocationController } from './colocation.controller';
import { RackService } from './rack.service';
import { RackController } from './rack.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ColocationController, RackController],
  providers: [ColocationService, RackService, PrismaService],
  exports: [ColocationService, RackService],
})
export class ColocationModule {}