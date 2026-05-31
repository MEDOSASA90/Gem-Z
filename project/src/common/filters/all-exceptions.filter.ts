/**
 * =============================================================================
 * AllExceptionsFilter - مصيدة جميع الاستثناءات
 * =============================================================================
 * يلتقط كل الأخطاء مع تسجيلها وإرجاع استجابة موحدة
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string;
    let errorCode: string;
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp.message as string) || exception.message;
        errorCode = (resp.error as string) || 'HTTP_ERROR';
        details = resp.details as Record<string, unknown> | undefined;
      } else {
        message = exception.message;
        errorCode = 'HTTP_ERROR';
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      errorCode = 'INTERNAL_ERROR';
      details = { originalError: exception.message };
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Unknown error occurred';
      errorCode = 'UNKNOWN_ERROR';
    }

    // تسجيل الخطأ
    this.logger.error(
      '[%s] %s %s - Status: %d - Code: %s - Message: %s',
      request.method,
      request.url,
      request.ip,
      status,
      errorCode,
      exception instanceof Error ? exception.message : 'Unknown',
      exception instanceof Error ? exception.stack : undefined,
    );

    // إرسال استجابة موحدة
    const errorResponse = {
      success: false,
      statusCode: status,
      errorCode,
      message: this.sanitizeMessage(message, status),
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId: request.headers['x-correlation-id'] as string || undefined,
      ...(details && { details }),
    };

    response.status(status).json(errorResponse);
  }

  /** تنظيف رسالة الخطأ للبيئة الإنتاجية */
  private sanitizeMessage(message: string, status: number): string {
    // في بيئة الإنتاج، لا نعرض تفاصيل أخطاء 500
    if (status === HttpStatus.INTERNAL_SERVER_ERROR && process.env.NODE_ENV === 'production') {
      return 'Internal server error. Please contact support.';
    }
    return message;
  }
}
