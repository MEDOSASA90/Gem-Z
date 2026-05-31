/**
 * =============================================================================
 * SagaBuilder - Builder Pattern لإنشاء Sagas
 * =============================================================================
 * يسهل إنشاء الـ Sagas بشكل fluent مع دعم compensation و retry policies
 * 
 * @example
 * ```typescript
 * const saga = new SagaBuilder<OrderInput>()
 *   .name('create-order-saga')
 *   .input(orderData)
 *   .step('validate-payment', validatePayment, rollbackPayment)
 *   .step('reserve-inventory', reserveInventory, releaseInventory)
 *   .retryPolicy({ maxRetries: 3, backoff: 'exponential', ... })
 *   .timeout(30000)
 *   .build();
 * ```
 */

import {
  Saga,
  SagaStep,
  SagaOptions,
  RetryPolicy,
  SagaContext,
  BackoffStrategy,
} from './saga.types';

export class SagaBuilder<T = unknown> {
  private options: SagaOptions<T>;
  private steps: SagaStep<T>[] = [];
  private currentRetryPolicy?: RetryPolicy;
  private currentTimeoutMs?: number;

  constructor() {
    this.options = {
      name: 'unnamed-saga',
      input: {} as T,
    };
  }

  /** تعيين اسم الـ Saga */
  name(name: string): SagaBuilder<T> {
    this.options.name = name;
    return this;
  }

  /** تعيين الـ Input الأولي */
  input(data: T): SagaBuilder<T> {
    this.options.input = data;
    return this;
  }

  /**
   * إضافة خطوة جديدة
   * @param name - اسم الخطوة (فريد)
   * @param execute - دالة التنفيذ
   * @param compensate - دالة التعويض (اختيارية)
   * @param optional - هل الخطوة اختيارية
   */
  step<R>(
    name: string,
    execute: (context: SagaContext<T>) => Promise<R> | R,
    compensate?: (context: SagaContext<T>, result?: R) => Promise<void> | void,
    optional = false,
  ): SagaBuilder<T> {
    const step: SagaStep<T> = {
      name,
      execute,
      compensate: compensate as (ctx: SagaContext<T>, res?: unknown) => Promise<void> | void,
      retryPolicy: this.currentRetryPolicy,
      timeoutMs: this.currentTimeoutMs,
      optional,
    };

    this.steps.push(step);
    return this;
  }

  /**
   * إضافة خطوة مشروطة - تنفذ فقط إذا تحقق الشرط
   */
  conditionalStep<R>(
    name: string,
    condition: (context: SagaContext<T>) => boolean,
    execute: (context: SagaContext<T>) => Promise<R> | R,
    compensate?: (context: SagaContext<T>, result?: R) => Promise<void> | void,
  ): SagaBuilder<T> {
    const step: SagaStep<T> = {
      name,
      execute,
      compensate: compensate as (ctx: SagaContext<T>, res?: unknown) => Promise<void> | void,
      retryPolicy: this.currentRetryPolicy,
      timeoutMs: this.currentTimeoutMs,
      condition,
    };

    this.steps.push(step);
    return this;
  }

  /** تعيين سياسة إعادة المحاولة للخطوات القادمة */
  retryPolicy(policy: Partial<RetryPolicy>): SagaBuilder<T> {
    this.currentRetryPolicy = {
      maxRetries: policy.maxRetries ?? 3,
      backoff: policy.backoff ?? 'exponential',
      initialDelayMs: policy.initialDelayMs ?? 1000,
      maxDelayMs: policy.maxDelayMs ?? 30000,
      multiplier: policy.multiplier ?? 2,
    };
    return this;
  }

  /** مساعد سريع لتعيين سياسة إعادة المحاولة */
  retry(
    maxRetries: number,
    backoff: BackoffStrategy = 'exponential',
    initialDelayMs = 1000,
  ): SagaBuilder<T> {
    return this.retryPolicy({ maxRetries, backoff, initialDelayMs });
  }

  /** تعيين timeout للخطوات القادمة */
  timeout(ms: number): SagaBuilder<T> {
    this.currentTimeoutMs = ms;
    return this;
  }

  /** تعيين timeout كلي للـ Saga */
  totalTimeout(ms: number): SagaBuilder<T> {
    this.options.totalTimeoutMs = ms;
    return this;
  }

  /** Callback عند اكتمال الـ Saga */
  onComplete(callback: (result: import('./saga.types').SagaResult<T>) => void): SagaBuilder<T> {
    this.options.onComplete = callback;
    return this;
  }

  /** Callback عند الفشل */
  onFailure(callback: (result: import('./saga.types').SagaResult<T>) => void): SagaBuilder<T> {
    this.options.onFailure = callback;
    return this;
  }

  /** Callback عند التعويض */
  onCompensated(callback: (result: import('./saga.types').SagaResult<T>) => void): SagaBuilder<T> {
    this.options.onCompensated = callback;
    return this;
  }

  /** تعيين سياسة إعادة المحاولة الافتراضية للـ Saga */
  defaultRetryPolicy(policy: RetryPolicy): SagaBuilder<T> {
    this.options.defaultRetryPolicy = policy;
    return this;
  }

  /** بناء الـ Saga */
  build(): Saga<T> {
    if (this.steps.length === 0) {
      throw new Error('Saga must have at least one step');
    }

    return {
      id: this.generateId(),
      name: this.options.name,
      input: this.options.input,
      steps: [...this.steps],
      totalTimeoutMs: this.options.totalTimeoutMs,
      defaultRetryPolicy: this.options.defaultRetryPolicy,
      onComplete: this.options.onComplete,
      onFailure: this.options.onFailure,
      onCompensated: this.options.onCompensated,
    };
  }

  /** إعادة تعيين الـ Builder لإعادة الاستخدام */
  reset(): SagaBuilder<T> {
    this.steps = [];
    this.currentRetryPolicy = undefined;
    this.currentTimeoutMs = undefined;
    this.options = {
      name: 'unnamed-saga',
      input: {} as T,
    };
    return this;
  }

  /** إنشاء معرف فريد */
  private generateId(): string {
    return `saga_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
