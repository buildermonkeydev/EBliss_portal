// src/common/interceptors/activity-log.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ActivityLogsService } from '../../activity-logs/activity-logs.service';
import { ActivityType, ServiceType, ActivityStatus } from '../../activity-logs/dto/activity-log.dto';

@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  constructor(private activityLogsService: ActivityLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const method = request.method;
    const url = request.url;
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    const userAgent = request.headers['user-agent'] || 'unknown';
    
    return next.handle().pipe(
      tap(async (response) => {
        if (userId) {
          // Determine action type based on endpoint
          let actionType = ActivityType.OTHER;
          let serviceType = ServiceType.OTHER;
          let action = '';
          
          if (url.includes('/vms')) {
            serviceType = ServiceType.VPS;
            if (method === 'POST') actionType = ActivityType.CREATE;
            if (method === 'DELETE') actionType = ActivityType.DELETE;
            if (url.includes('/start')) actionType = ActivityType.START;
            if (url.includes('/stop')) actionType = ActivityType.STOP;
            if (url.includes('/reboot')) actionType = ActivityType.REBOOT;
          } else if (url.includes('/firewall')) {
            serviceType = ServiceType.FIREWALL;
            actionType = ActivityType.UPDATE;
          } else if (url.includes('/ssh-keys')) {
            serviceType = ServiceType.SSH;
            actionType = ActivityType.CREATE;
          }
          
          await this.activityLogsService.logUserAction(
            parseInt(userId),
            `${method} ${url}`,
            actionType,
            `${method} request to ${url} completed`,
            serviceType,
            ActivityStatus.SUCCESS,
            {
              ipAddress: ip,
              userAgent: userAgent,
              metadata: { responseStatus: response?.statusCode || 200 }
            },
          );
        }
      }),
    );
  }
}