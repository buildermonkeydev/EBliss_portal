import { Module } from '@nestjs/common';
import { TicketController } from './ticket.controller';
import { TicketService } from './ticket.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailService } from '../auth/services/email.service';

@Module({
  imports: [PrismaModule],
  controllers: [TicketController],
  providers: [TicketService, EmailService],
  exports: [TicketService],
})
export class TicketModule {}