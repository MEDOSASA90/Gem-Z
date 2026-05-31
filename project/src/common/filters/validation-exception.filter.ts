/**
 * =============================================================================
 * ValidationExceptionFilter - مصيدة أخطاء التحقق
 * =============================================================================
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ValidationError {
  field: string;
  errors: string[];
  value?: unknown;
}

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const exceptionResponse = exception.getResponse() as Record<string, unknown>;
    const rawMessage = exceptionResponse.message;

    let validationErrors: ValidationError[];

    if (Array.isArray(rawMessage)) {
      // Class-validator errors
      validationErrors = this.parseValidationErrors(rawMessage as string[]);
    } else if (typeof rawMessage === 'string') {
      validationErrors = [{ field: 'general', errors: [rawMessage] }];
    } else {
      validationErrors = [{ field: 'unknown', errors: ['Validation failed'] }];
    }

    this.logger.warn(
      'Validation failed: [%s] %s - %d errors',
      request.method,
      request.url,
      validationErrors.length,
    );

    response.status(status).json({
      success: false,
      statusCode: status,
      errorCode: 'VALIDATION_ERROR',
      message: 'Validation failed',
      errors: validationErrors,
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId: request.headers['x-correlation-id'] as string || undefined,
    });
  }

  private parseValidationErrors(messages: string[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const fieldMap = new Map<string, string[]>();

    for (const message of messages) {
      // تنسيق class-validator: "property error_message"
      const colonIndex = message.indexOf(' ');
      if (colonIndex > 0) {
        const field = message.substring(0, colonIndex);
        const error = message.substring(colonIndex + 1);

        if (!fieldMap.has(field)) {
          fieldMap.set(field, []);
        }
        fieldMap.get(field)!.push(error);
      } else {
        if (!fieldMap.has('general')) {
          fieldMap.set('general', []);
        }
        fieldMap.get('general')!.push(message);
      }
    }

    for (const [field, fieldErrors] of fieldMap) {
      errors.push({ field, errors: fieldErrors });
    }

    return errors;
  }
}
