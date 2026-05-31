/**
 * =============================================================================
 * Saga Types - تعريفات أنماط Saga Pattern للعمليات الموزعة
 * =============================================================================
 * يوفر كل الـ interfaces والـ types المستخدمة في نظام الـ Orchestrator
 */

/** حالة الـ Saga */
export enum SagaStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  COMPENSATING = 'COMPENSATING',
  COMPENSATED = 'COMPENSATED',
  TIMED_OUT = 'TIMED_OUT',
}

/** نتيجة تنفيذ خطوة */
export interface StepResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: Error;
  executionTimeMs: number;
}

/** نتيجة الـ Saga كاملة */
export interface SagaResult<T = unknown> {
  sagaId: string;
  status: SagaStatus;
  data?: T;
  error?: Error;
  stepsResults: StepExecutionResult[];
  startedAt: string;
  completedAt?: string;
  totalExecutionTimeMs: number;
}

/** نتيجة تنفيذ خطوة محددة */
export interface StepExecutionResult {
  stepName: string;
  status: 'SUCCESS' | 'FAILED' | 'COMPENSATED' | 'SKIPPED';
  executionTimeMs: number;
  compensateTimeMs?: number;
  error?: string;
}

/** خطوة في الـ Saga */
export interface SagaStep<T = unknown, R = unknown> {
  /** اسم الخطوة (فريد) */
  name: string;
  /** دالة التنفيذ */
  execute: (context: SagaContext<T>) => Promise<R> | R;
  /** دالة التعويض (rollback) */
  compensate?: (context: SagaContext<T>, executeResult?: R) => Promise<void> | void;
  /** سياسة إعادة المحاولة */
  retryPolicy?: RetryPolicy;
  /** timeout بالمللي ثانية */
  timeoutMs?: number;
  /** هل الخطوة اختيارية؟ */
  optional?: boolean;
  /** شروط التنفيذ */
  condition?: (context: SagaContext<T>) => boolean;
}

/** سياق الـ Saga - يحمل البيانات المشتركة بين الخطوات */
export interface SagaContext<T = unknown> {
  sagaId: string;
  input: T;
  stepsData: Map<string, unknown>;
  metadata: Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getStepResult<R = any>(stepName: string): R | undefined;
  setStepResult(stepName: string, result: unknown): void;
}

/** سياسة إعادة المحاولة */
export interface RetryPolicy {
  /** الحد الأقصى لعدد المحاولات */
  maxRetries: number;
  /** Backoff strategy */
  backoff: BackoffStrategy;
  /** Delay أولي بالمللي ثانية */
  initialDelayMs: number;
  /** الحد الأقصى للتأخير */
  maxDelayMs: number;
  /** Multiplier للـ exponential backoff */
  multiplier: number;
}

/** استراتيجية الـ Backoff */
export type BackoffStrategy = 'fixed' | 'exponential' | 'linear';

/** تعريف الـ Saga */
export interface Saga<T = unknown> {
  /** معرف فريد */
  id: string;
  /** اسم الـ Saga */
  name: string;
  /** الخطوات */
  steps: SagaStep<T>[];
  /** Input أولي */
  input: T;
  /** Timeout كلي */
  totalTimeoutMs?: number;
  /** سياسة إعادة المحاولة الافتراضية */
  defaultRetryPolicy?: RetryPolicy;
  /** Callback عند اكتمال الـ Saga */
  onComplete?: (result: SagaResult<T>) => void;
  /** Callback عند الفشل */
  onFailure?: (result: SagaResult<T>) => void;
  /** Callback عند التعويض */
  onCompensated?: (result: SagaResult<T>) => void;
}

/** إعدادات الـ Saga */
export interface SagaOptions<T = unknown> {
  name: string;
  input: T;
  totalTimeoutMs?: number;
  defaultRetryPolicy?: RetryPolicy;
  onComplete?: (result: SagaResult<T>) => void;
  onFailure?: (result: SagaResult<T>) => void;
  onCompensated?: (result: SagaResult<T>) => void;
}

/** إجراء التعويض (Compensation) */
export interface CompensationAction {
  sagaId: string;
  stepName: string;
  stepIndex: number;
  executeResult?: unknown;
  compensateFn: (context: SagaContext, result?: unknown) => Promise<void> | void;
  executed: boolean;
  success: boolean;
  error?: string;
  executedAt?: string;
}

/** سجل التنفيذ (Execution Log) */
export interface ExecutionLog {
  sagaId: string;
  stepName: string;
  action: 'EXECUTE' | 'COMPENSATE' | 'RETRY' | 'TIMEOUT';
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  timestamp: string;
  durationMs: number;
  error?: string;
}

/** إعدادات الـ Orchestrator */
export interface OrchestratorConfig {
  maxConcurrentSagas: number;
  defaultTimeoutMs: number;
  enablePersistence: boolean;
  enableMetrics: boolean;
  compensationOrder: 'LIFO' | 'REVERSE';
}
