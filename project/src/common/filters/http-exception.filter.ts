/**
 * =============================================================================
 * HttpExceptionFilter - مصيدة استثناءات HTTP
 * =============================================================================
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const exceptionResponse = exception.getResponse();
    let message: string | string[];
    let errorCode = 'HTTP_ERROR';

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const resp = exceptionResponse as Record<string, unknown>;
      message = (resp.message as string | string[]) || exception.message;
      errorCode = (resp.error as string) || `HTTP_${status}`;
    } else {
      message = exception.message;
      errorCode = `HTTP_${status}`;
    }

    this.logger.warn(
      'HTTP Exception: [%s] %s - Status: %d - %s',
      request.method,
      request.url,
      status,
      typeof message === 'string' ? message : JSON.stringify(message),
    );

    response.status(status).json({
      success: false,
      statusCode: status,
      errorCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId: request.headers['x-correlation-id'] as string || undefined,
    });
  }
}
