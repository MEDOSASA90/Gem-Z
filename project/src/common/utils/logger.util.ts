/**
 * =============================================================================
 * LoggerUtil - Custom Logger Factory
 * =============================================================================
 * يوفر loggers مخصصة لكل موديول مع ألوان وتنسيق
 */

import { Logger } from '@nestjs/common';

/** ألوان الـ console (للبيئة التطويرية) */
const Colors = {
  RESET: '\x1b[0m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  GRAY: '\x1b[90m',
};

/** مستويات الـ logging */
export enum LogLevel {
  DEBUG = 0,
  LOG = 1,
  WARN = 2,
  ERROR = 3,
  VERBOSE = 4,
}

/** إنشاء logger مخصص لموديول */
export function createLogger(context: string, color?: string): Logger {
  // في بيئة التطوير، يمكن إضافة ألوان
  if (process.env.NODE_ENV === 'development' && color) {
    const prefix = `${color}[${context}]${Colors.RESET}`;
    return new Logger(prefix);
  }
  return new Logger(context);
}

/** Logger Factory - ينشئ loggers للموديولات المختلفة */
export class LoggerFactory {
  private static loggers = new Map<string, Logger>();
  private static colors = [
    Colors.CYAN,
    Colors.GREEN,
    Colors.YELLOW,
    Colors.MAGENTA,
    Colors.BLUE,
    Colors.RED,
  ];
  private static colorIndex = 0;

  /** الحصول على logger (أو إنشاء واحد جديد) */
  static getLogger(context: string): Logger {
    if (!this.loggers.has(context)) {
      const color = this.colors[this.colorIndex % this.colors.length];
      this.colorIndex++;
      this.loggers.set(context, createLogger(context, color));
    }
    return this.loggers.get(context)!;
  }

 /** إنشاء logger للـ repository */
  static getRepositoryLogger(entityName: string): Logger {
    return this.getLogger(`${entityName}Repository`);
  }

  /** إنشاء logger للـ service */
  static getServiceLogger(serviceName: string): Logger {
    return this.getLogger(`${serviceName}Service`);
  }

  /** إنشاء logger للـ controller */
  static getControllerLogger(controllerName: string): Logger {
    return this.getLogger(`${controllerName}Controller`);
  }

  /** إنشاء logger للـ gateway */
  static getGatewayLogger(gatewayName: string): Logger {
    return this.getLogger(`${gatewayName}Gateway`);
  }

  /** مسح كل الـ loggers */
  static clear(): void {
    this.loggers.clear();
    this.colorIndex = 0;
  }
}

/** تسجيل الأداء */
export function logPerformance<T>(
  logger: Logger,
  operation: string,
  fn: () => T | Promise<T>,
): Promise<T> | T {
  const start = Date.now();
  const result = fn();

  if (result instanceof Promise) {
    return result.finally(() => {
      const duration = Date.now() - start;
      logger.debug('%s completed in %dms', operation, duration);
    });
  }

  const duration = Date.now() - start;
  logger.debug('%s completed in %dms', operation, duration);
  return result;
}

/** تسجيل بدء وانتهاء العملية */
export function withLogging<T>(
  logger: Logger,
  operation: string,
  fn: () => Promise<T>,
): Promise<T> {
  logger.debug('Starting: %s', operation);
  const start = Date.now();

  return fn()
    .then((result) => {
      logger.debug('%s completed in %dms', operation, Date.now() - start);
      return result;
    })
    .catch((error) => {
      logger.error('%s failed after %dms: %s', operation, Date.now() - start, (error as Error).message);
      throw error;
    });
}
