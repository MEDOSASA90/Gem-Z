/**
 * GEM Z — Logging Module Exports
 *
 * Centralized exports for all logging utilities.
 * Prefer importing from here instead of individual files.
 */

export { logger, createLogger, setLogLevel, logPerf, logAudit, createRequestLogger } from './logger';
export type { ErrorContext, AppError } from './error-logger';
export {
    logError,
    logWarning,
    logCritical,
    logUncaught,
    logValidationError,
    logSecurity,
    contextualizeError,
} from './error-logger';
export {
    requestIdMiddleware,
    requestLogger,
    healthCheckHandler,
} from './middleware';
