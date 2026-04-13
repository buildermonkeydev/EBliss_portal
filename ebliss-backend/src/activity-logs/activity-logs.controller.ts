import { Controller, Get, Post, Query, Param, UseGuards, Req, Res, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { ActivityLogsService } from './activity-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QueryActivityLogsDto } from './dto/activity-log.dto';

@Controller('activity-logs')
@UseGuards(JwtAuthGuard)
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @Get()
  async getLogs(@Req() req, @Query() query: QueryActivityLogsDto) {
    const userId = parseInt(req.user.id);
    const result = await this.activityLogsService.findAll(userId, query);
    return {
      success: true,
      ...result,
    };
  }

  @Get('stats')
  async getStats(@Req() req) {
    const userId = parseInt(req.user.id);
    const stats = await this.activityLogsService.getStats(userId);
    return {
      success: true,
      stats,
    };
  }

  @Get('summary')
  async getSummary(@Req() req) {
    const userId = parseInt(req.user.id);
    const summary = await this.activityLogsService.getUserActivitySummary(userId);
    return {
      success: true,
      summary,
    };
  }

  @Get('export')
  async exportLogs(@Req() req, @Query() query: QueryActivityLogsDto, @Res() res: Response) {
    const userId = parseInt(req.user.id);
    const logs = await this.activityLogsService.exportLogs(userId, query);
    
    // Convert to CSV
    const csvRows = [
      ['ID', 'Action', 'Description', 'Service Type', 'Service Name', 'IP Address', 'Status', 'Timestamp'],
      ...logs.map(log => [
        log.id,
        log.action,
        log.description,
        log.service_type,
        log.service_name || '',
        log.ip_address || '',
        log.status,
        new Date(log.created_at).toLocaleString(),
      ]),
    ];
    
    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=activity-logs-${Date.now()}.csv`);
    res.status(HttpStatus.OK).send(csvContent);
  }
}