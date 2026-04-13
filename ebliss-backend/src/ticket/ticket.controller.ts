import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { TicketService } from './ticket.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, AdminRole } from '../auth/decorators/roles.decorator';
import {
  CreateTicketDto,
  ReplyToTicketDto,
  AddInternalNoteDto,
  UpdateTicketStatusDto,
  AssignTicketDto,
  QueryTicketsDto,
} from './dto/ticket.dto';

interface RequestWithUser extends Request {
  user: {
    id: string | number;
    [key: string]: any;
  };
}

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  // Customer endpoints
  @Post()
  @UseInterceptors(FilesInterceptor('attachments', 5))
  async createTicket(
    @Req() req: RequestWithUser,
    @Body() dto: CreateTicketDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const userId = parseInt(req.user.id.toString());
    const ticket = await this.ticketService.createTicket(userId, dto, files);
    return { success: true, ticket };
  }

  @Get()
  async getUserTickets(
    @Req() req: RequestWithUser,
    @Query() query: QueryTicketsDto,
  ) {
    const userId = parseInt(req.user.id.toString());
    const result = await this.ticketService.getUserTickets(userId, query);
    return { success: true, ...result };
  }

  @Get(':id')
  async getTicket(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const userId = parseInt(req.user.id.toString());
    const ticket = await this.ticketService.getTicket(userId, id, false);
    return { success: true, ticket };
  }

  @Post(':id/reply')
  async replyToTicket(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReplyToTicketDto,
  ) {
    const userId = parseInt(req.user.id.toString());
    const message = await this.ticketService.replyToTicket(
      userId,
      id,
      dto,
      false,
    );
    return { success: true, message };
  }

  // Admin endpoints
  @Get('admin/all')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL)
  @UseGuards(RolesGuard)
  async getAdminTickets(
    @Req() req: RequestWithUser,
    @Query() query: QueryTicketsDto,
  ) {
    const adminId = parseInt(req.user.id.toString());
   const result = await this.ticketService.getAdminTickets(query, adminId);
  return { 
    success: true, 
    data: result.data,
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
  };
  }

  @Get('admin/stats')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL)
  @UseGuards(RolesGuard)
  async getTicketStats(@Req() req: RequestWithUser) {
    const adminId = parseInt(req.user.id.toString());
    const stats = await this.ticketService.getTicketStats(adminId);
    return { success: true, stats };
  }

  @Get('admin/:id')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL)
  @UseGuards(RolesGuard)
  async getAdminTicket(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const adminId = parseInt(req.user.id.toString());
    const ticket = await this.ticketService.getTicket(adminId, id, true);
    return { success: true, ticket };
  }

  @Post('admin/:id/reply')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL)
  @UseGuards(RolesGuard)
  async adminReplyToTicket(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReplyToTicketDto,
  ) {
    const adminId = parseInt(req.user.id.toString());
    const message = await this.ticketService.replyToTicket(
      adminId,
      id,
      dto,
      true,
      adminId,
    );
    return { success: true, message };
  }

  @Post('admin/:id/internal-note')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL)
  @UseGuards(RolesGuard)
  async addInternalNote(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddInternalNoteDto,
  ) {
    const adminId = parseInt(req.user.id.toString());
    const note = await this.ticketService.addInternalNote(adminId, id, dto);
    return { success: true, note };
  }

  @Put('admin/:id/status')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL)
  @UseGuards(RolesGuard)
  async updateTicketStatus(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    const adminId = parseInt(req.user.id.toString());
    const ticket = await this.ticketService.updateTicketStatus(
      adminId,
      id,
      dto,
    );
    return { success: true, ticket };
  }

  @Post('admin/:id/assign')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL)
  @UseGuards(RolesGuard)
  async assignTicket(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignTicketDto,
  ) {
    const adminId = parseInt(req.user.id.toString());
    const ticket = await this.ticketService.assignTicket(adminId, id, dto);
    return { success: true, ticket };
  }
}