// src/common/interceptors/errors.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorsInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError(err => {
        this.logger.error(err.message, err.stack);
        
        const status = err instanceof HttpException
          ? err.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;
        
        const response = {
          success: false,
          statusCode: status,
          message: err.message || 'Internal server error',
          timestamp: new Date().toISOString(),
          path: context.switchToHttp().getRequest().url,
        };
        
        return throwError(() => new HttpException(response, status));
      }),
    );
  }
}