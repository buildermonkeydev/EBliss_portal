import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('test-email')
  @ApiOperation({ summary: 'Test email sending' })
  async testEmail(@Req() req) {
    await this.notificationService.sendEmail(
      req.user.email,
      'Test Email',
      'welcome',
      { name: req.user.email.split('@')[0] },
    );
    return { message: 'Test email sent' };
  }

  @Post('send-alert/:userId')
  @Roles('super', 'admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Send custom alert to user' })
  async sendAlert(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() body: { subject: string; message: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    await this.notificationService.sendEmail(
      user.email,
      body.subject,
      'default',
      { message: body.message },
    );

    return { message: 'Alert sent successfully' };
  }

  @Get('templates')
  @Roles('super', 'admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get email templates' })
  getTemplates() {
    return {
      templates: ['welcome', 'low_balance', 'invoice', 'suspension', 'payment_confirmation'],
    };
  }

  @Post('broadcast')
  @Roles('super')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Send broadcast email to all users' })
  async broadcastEmail(
    @Body() body: { subject: string; message: string; userRole?: string },
  ) {
    const where: any = {};
    if (body.userRole) {
      where.role = body.userRole;
    }

    const users = await this.prisma.user.findMany({
      where,
      select: { email: true },
    });

    for (const user of users) {
      await this.notificationService.sendEmail(
        user.email,
        body.subject,
        'default',
        { message: body.message },
      );
    }

    return {
      message: `Broadcast sent to ${users.length} users`,
      recipients: users.length,
    };
  }
}