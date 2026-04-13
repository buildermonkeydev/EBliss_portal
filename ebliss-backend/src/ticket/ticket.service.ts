import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../auth/services/email.service';
import { CreateTicketDto, ReplyToTicketDto, AddInternalNoteDto, UpdateTicketStatusDto, AssignTicketDto, QueryTicketsDto } from './dto/ticket.dto';
import { TicketStatus, TicketPriority, TicketDepartment } from '@prisma/client';

@Injectable()
export class TicketService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  // Generate unique ticket number
  private generateTicketNumber(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `TKT-${year}-${random}`;
  }

  // Create new ticket
  async createTicket(userId: number, dto: CreateTicketDto, files?: Express.Multer.File[]) {
    const ticketNumber = this.generateTicketNumber();
    
    // Get SLA policy for priority
    const slaPolicy = await this.prisma.sLAPolicy.findUnique({
      where: { priority: dto.priority || TicketPriority.medium },
    });

    const responseDueAt = slaPolicy 
      ? new Date(Date.now() + slaPolicy.first_response_hours * 60 * 60 * 1000)
      : null;
    const resolutionDueAt = slaPolicy
      ? new Date(Date.now() + slaPolicy.resolution_hours * 60 * 60 * 1000)
      : null;

    // Remove attachments for now - will be handled by separate attachment model
    const ticket = await this.prisma.ticket.create({
      data: {
        ticket_number: ticketNumber,
        user_id: userId,
        subject: dto.subject,
        department: dto.department,
        priority: dto.priority || TicketPriority.medium,
        status: TicketStatus.open,
        description: dto.description,
        response_due_at: responseDueAt,
        resolution_due_at: resolutionDueAt,
      },
      include: {
        user: {
          select: { email: true, full_name: true },
        },
      },
    });

    // Send email notification to customer
    await this.emailService.sendTicketCreatedEmail(ticket.user.email, ticket.user.full_name, {
      ticketNumber: ticket.ticket_number,
      subject: ticket.subject,
      department: ticket.department,
      priority: ticket.priority,
      description: ticket.description,
    });

    // Notify admins (in production, this would be a queue job)
    await this.notifyAdminsNewTicket(ticket);

    return ticket;
  }

// In getUserTickets method, convert page and limit to numbers
async getUserTickets(userId: number, query: QueryTicketsDto) {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const { status, department, priority, search } = query;
  const skip = (page - 1) * limit;

  const where: any = { user_id: userId };
  if (status) where.status = status;
  if (department) where.department = department;
  if (priority) where.priority = priority;
  if (search) {
    where.OR = [
      { subject: { contains: search, mode: 'insensitive' } },
      { ticket_number: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [tickets, total] = await Promise.all([
    this.prisma.ticket.findMany({
      where,
      skip,
      take: limit, // Now limit is a number
      orderBy: { created_at: 'desc' },
      include: {
        messages: {
          take: 1,
          orderBy: { created_at: 'desc' },
        },
        assigned_to_admin: {
          select: { email: true },
        },
      },
    }),
    this.prisma.ticket.count({ where }),
  ]);

  return {
    tickets,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
  // Get single ticket with full history
  async getTicket(userId: number, ticketId: number, isAdmin: boolean = false) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: { id: true, email: true, full_name: true, phone: true },
        },
        messages: {
          orderBy: { created_at: 'asc' },
          include: {
            user: { select: { full_name: true, email: true } },
            admin: { select: { email: true } },
          },
        },
        internalNotes: {
          orderBy: { created_at: 'asc' },
          include: {
            admin: { select: { email: true } },
          },
        },
        assigned_to_admin: {
          select: { id: true, email: true },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Check authorization
    if (ticket.user_id !== userId && !isAdmin) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    return ticket;
  }

  // Reply to ticket
  async replyToTicket(
    userId: number,
    ticketId: number,
    dto: ReplyToTicketDto,
    isAdmin: boolean = false,
    adminId?: number,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { user: true },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.user_id !== userId && !isAdmin) {
      throw new ForbiddenException('You cannot reply to this ticket');
    }

    if (ticket.status === TicketStatus.closed) {
      throw new BadRequestException('Cannot reply to a closed ticket');
    }

    // Update ticket status to in_progress if it was open
    const newStatus = ticket.status === TicketStatus.open ? TicketStatus.in_progress : ticket.status;

    // Create message
    const message = await this.prisma.ticketMessage.create({
      data: {
        ticket_id: ticketId,
        user_id: !isAdmin ? userId : null,
        admin_id: isAdmin ? adminId : null,
        message: dto.message,
      },
    });

    // Update ticket
    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: newStatus,
        last_reply_at: new Date(),
        ...(ticket.first_response_at === null && { first_response_at: new Date() }),
      },
    });

    // Send email notification
    const recipientEmail = isAdmin ? ticket.user.email : 'support@ebliss.com';
    const recipientName = isAdmin ? ticket.user.full_name : 'Support Team';

    await this.emailService.sendTicketReplyEmail(recipientEmail, recipientName, {
      ticketNumber: ticket.ticket_number,
      subject: ticket.subject,
      message: dto.message,
      replyBy: isAdmin ? 'Support Agent' : ticket.user.full_name,
    });

    return message;
  }

  // Add internal note (admin only)
  async addInternalNote(adminId: number, ticketId: number, dto: AddInternalNoteDto) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return this.prisma.ticketInternalNote.create({
      data: {
        ticket_id: ticketId,
        admin_id: adminId,
        note: dto.note,
      },
    });
  }

  // Update ticket status
  async updateTicketStatus(
    adminId: number,
    ticketId: number,
    dto: UpdateTicketStatusDto,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const updateData: any = { status: dto.status };

    if (dto.status === TicketStatus.resolved) {
      updateData.resolved_at = new Date();
    } else if (dto.status === TicketStatus.closed) {
      updateData.closed_at = new Date();
    }

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
    });

    // Send notification
    const user = await this.prisma.user.findUnique({
      where: { id: ticket.user_id },
    });

    if (user) {
      await this.emailService.sendTicketStatusUpdateEmail(user.email, user.full_name, {
        ticketNumber: ticket.ticket_number,
        subject: ticket.subject,
        status: dto.status,
        note: dto.resolution_note,
      });
    }

    return updated;
  }

  // Assign ticket to admin
  async assignTicket(adminId: number, ticketId: number, dto: AssignTicketDto) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        assigned_to: dto.admin_id,
        status: TicketStatus.in_progress,
      },
    });
  }

 // src/ticket/ticket.service.ts

async getAdminTickets(query: QueryTicketsDto, adminId: number) {
  // Ensure page and limit are numbers
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (query.status) where.status = query.status;
  if (query.department) where.department = query.department;
  if (query.priority) where.priority = query.priority;
  if (query.assigned_to_me) where.assigned_to = adminId;
  
  if (query.search) {
    where.OR = [
      { subject: { contains: query.search, mode: 'insensitive' } },
      { ticket_number: { contains: query.search, mode: 'insensitive' } },
      { user: { full_name: { contains: query.search, mode: 'insensitive' } } },
      { user: { email: { contains: query.search, mode: 'insensitive' } } },
    ];
  }

  const [tickets, total] = await Promise.all([
    this.prisma.ticket.findMany({
      where,
      skip,
      take: limit, // Now guaranteed to be a number
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: { id: true, email: true, full_name: true },
        },
        assigned_to_admin: {
          select: { id: true, email: true },
        },
        messages: {
          take: 1,
          orderBy: { created_at: 'desc' },
        },
      },
    }),
    this.prisma.ticket.count({ where }),
  ]);

  // Transform tickets to include user_name and assigned_to_name
  const transformedTickets = tickets.map(ticket => ({
    ...ticket,
    user_name: ticket.user?.full_name || 'Unknown',
    user_email: ticket.user?.email || '',
    assigned_to_name: ticket.assigned_to_admin?.email || null,
  }));

  // Get counts by status
  const counts = await this.prisma.ticket.groupBy({
    by: ['status'],
    _count: { status: true },
  });

  const statusCounts = {
    open: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
  };
  
  counts.forEach(c => {
    const statusKey = c.status.toLowerCase();
    if (statusKey in statusCounts) {
      statusCounts[statusKey] = c._count.status;
    }
  });

  return {
    data: transformedTickets,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    counts: statusCounts,
  };
}

  // Get ticket statistics for dashboard
  async getTicketStats(adminId: number) {
    const [total, open, inProgress, resolved, closed, overdue, assignedToMe] = await Promise.all([
      this.prisma.ticket.count(),
      this.prisma.ticket.count({ where: { status: TicketStatus.open } }),
      this.prisma.ticket.count({ where: { status: TicketStatus.in_progress } }),
      this.prisma.ticket.count({ where: { status: TicketStatus.resolved } }),
      this.prisma.ticket.count({ where: { status: TicketStatus.closed } }),
      this.prisma.ticket.count({ where: { response_due_at: { lt: new Date() }, status: { not: TicketStatus.closed } } }),
      this.prisma.ticket.count({ where: { assigned_to: adminId, status: { not: TicketStatus.closed } } }),
    ]);

    return {
      total,
      open,
      in_progress: inProgress,
      resolved,
      closed,
      overdue,
      assigned_to_me: assignedToMe,
    };
  }

  // SLA check cron job (to be run every hour)
  async checkSLAViolations() {
    const overdueTickets = await this.prisma.ticket.findMany({
      where: {
        response_due_at: { lt: new Date() },
        status: { in: [TicketStatus.open, TicketStatus.in_progress] },
        sla_breached: false,
      },
    });

    for (const ticket of overdueTickets) {
      await this.prisma.ticket.update({
        where: { id: ticket.id },
        data: { sla_breached: true },
      });

      // Notify admins about SLA breach
      console.log(`SLA breached for ticket ${ticket.ticket_number}`);
    }
  }

  private async notifyAdminsNewTicket(ticket: any) {
    // In production, this would send notifications to all admins
    // Could be email, Slack, or in-app notification
    console.log(`New ticket created: ${ticket.ticket_number} - ${ticket.subject}`);
  }
}