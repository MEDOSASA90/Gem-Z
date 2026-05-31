/**
 * =============================================================================
 * ValidationPipe - تحقق مخصص (extension للبناء في)
 * =============================================================================
 */

import {
  ValidationPipe as NestValidationPipe,
  ValidationError,
  BadRequestException,
  ValidationPipeOptions,
} from '@nestjs/common';

/**
 * Custom Validation Pipe يُوسّع الـ built-in مع تنسيق أخطاء محسّن
 */
export class ValidationPipe extends NestValidationPipe {
  constructor(options?: ValidationPipeOptions) {
    super({
      whitelist: true, // إزالة الحقول غير المعرفة
      forbidNonWhitelisted: true, // رفض الطلبات التي تحتوي على حقول غير معرفة
      transform: true, // تحويل الأنواع تلقائياً
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors: ValidationError[]) => {
        const messages = this.flattenErrors(errors);
        return new BadRequestException(messages);
      },
      ...options,
    });
  }

  /** تسطيح أخطاء class-validator إلى قائمة رسائل */
  private flattenErrors(errors: ValidationError[], parent = ''): string[] {
    const messages: string[] = [];

    for (const error of errors) {
      const propertyPath = parent ? `${parent}.${error.property}` : error.property;

      if (error.constraints) {
        for (const [, message] of Object.entries(error.constraints)) {
          messages.push(`${propertyPath} ${message}`);
        }
      }

      if (error.children && error.children.length > 0) {
        messages.push(...this.flattenErrors(error.children, propertyPath));
      }
    }

    return messages;
  }
}
