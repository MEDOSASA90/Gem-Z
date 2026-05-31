/**
 * =============================================================================
 * GemZOrchestrator - منسق العمليات الموزعة (Saga Orchestrator)
 * =============================================================================
 * ينفذ Sagas مع دعم:
 * - Retry مع backoff strategies
 * - Timeout للخطوات والـ Saga كاملة
 * - Compensation/Rollback تلقائي
 * - تتبع الحالة والنتائج
 */

import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  Saga,
  SagaContext,
  SagaResult,
  SagaStatus,
  StepExecutionResult,
  StepResult,
  RetryPolicy,
} from './saga.types';
import { CompensationService } from './compensation.service';

@Injectable()
export class GemZOrchestrator {
  private readonly logger = new Logger(GemZOrchestrator.name);
  private readonly activeSagas = new Map<string, SagaStatus>();
  private readonly sagaResults = new Map<string, SagaResult>();

  constructor(private readonly compensationService: CompensationService) {}

  /**
   * تنفيذ Saga
   * @param saga - تعريف الـ Saga المراد تنفيذه
   * @returns نتيجة التنفيذ
   */
  async executeSaga<T>(saga: Saga<T>): Promise<SagaResult<T>> {
    const sagaId = saga.id || uuidv4();
    const startedAt = new Date().toISOString();
    const startTime = Date.now();

    this.logger.log('Starting saga [%s] "%s" with %d steps', 
      sagaId, saga.name, saga.steps.length);

    // تسجيل الـ Saga كـ running
    this.activeSagas.set(sagaId, SagaStatus.RUNNING);

    // إنشاء سياق الـ Saga
    const context = this.createContext<T>(sagaId, saga);
    const stepsResults: StepExecutionResult[] = [];
    const executedSteps = saga.steps.slice();
    let finalStatus = SagaStatus.COMPLETED;
    let finalError: Error | undefined;
    let finalData: T | undefined;

    // إعداد timeout كلي
    const timeoutPromise = saga.totalTimeoutMs 
      ? this.createTimeoutPromise(saga.totalTimeoutMs, sagaId)
      : null;

    try {
      for (let i = 0; i < saga.steps.length; i++) {
        const step = saga.steps[i];

        // التحقق من timeout الكلي
        if (timeoutPromise?.isTimedOut) {
          throw new Error(`Saga [${sagaId}] timed out after ${saga.totalTimeoutMs}ms`);
        }

        // تنفيذ الخطوة
        const stepResult = await this.executeStep(step, context, saga.defaultRetryPolicy);

        stepsResults.push({
          stepName: step.name,
          status: stepResult.success ? 'SUCCESS' : 'FAILED',
          executionTimeMs: stepResult.executionTimeMs,
          error: stepResult.error?.message,
        });

        if (stepResult.success) {
          context.setStepResult(step.name, stepResult.data);
          this.logger.debug('Step [%s] completed in %dms', step.name, stepResult.executionTimeMs);
        } else {
          // فشلت الخطوة - نبدأ compensation
          finalError = stepResult.error;
          finalStatus = SagaStatus.FAILED;

          this.logger.warn(
            'Step [%d/%d] "%s" failed: %s. Starting compensation...',
            i + 1,
            saga.steps.length,
            step.name,
            stepResult.error?.message,
          );

          // تنفيذ compensation للخطوات المنفذة سابقاً
          const executedSoFar = saga.steps.slice(0, i + 1);
          this.activeSagas.set(sagaId, SagaStatus.COMPENSATING);

          const compensationResults = await this.compensationService.compensate(
            sagaId,
            executedSoFar,
            context.stepsData as Map<string, unknown>,
            context,
          );

          // تحديث نتائج الخطوات بمعلومات التعويض
          for (const compResult of compensationResults) {
            const existingResult = stepsResults.find((r) => r.stepName === compResult.stepName);
            if (existingResult) {
              existingResult.status = compResult.status;
              existingResult.compensateTimeMs = compResult.compensateTimeMs;
            }
          }

          finalStatus = SagaStatus.COMPENSATED;
          break;
        }
      }

      // تخزين النتيجة النهائية
      finalData = context.stepsData.get('final') as T || saga.input;

    } catch (error) {
      finalError = error as Error;
      finalStatus = SagaStatus.FAILED;
      this.logger.error('Saga [%s] failed: %s', sagaId, finalError.message);
    }

    const totalExecutionTimeMs = Date.now() - startTime;
    const completedAt = new Date().toISOString();

    const result: SagaResult<T> = {
      sagaId,
      status: finalStatus,
      data: finalData,
      error: finalError,
      stepsResults,
      startedAt,
      completedAt,
      totalExecutionTimeMs,
    };

    // تحديث الحالة
    this.activeSagas.set(sagaId, finalStatus);
    this.sagaResults.set(sagaId, result as SagaResult);

    // استدعاء الـ callbacks
    if (finalStatus === SagaStatus.COMPLETED && saga.onComplete) {
      saga.onComplete(result);
    }
    if ((finalStatus === SagaStatus.FAILED || finalStatus === SagaStatus.COMPENSATED) && saga.onFailure) {
      saga.onFailure(result);
    }
    if (finalStatus === SagaStatus.COMPENSATED && saga.onCompensated) {
      saga.onCompensated(result);
    }

    this.logger.log(
      'Saga [%s] completed with status [%s] in %dms',
      sagaId,
      finalStatus,
      totalExecutionTimeMs,
    );

    return result;
  }

  /**
   * بدء compensation يدوي لـ Saga
   * @param sagaId - معرف الـ Saga
   */
  async compensate(sagaId: string): Promise<void> {
    this.logger.log('Manual compensation requested for saga [%s]', sagaId);

    const status = this.activeSagas.get(sagaId);
    if (!status) {
      throw new Error(`Saga [${sagaId}] not found`);
    }

    if (status === SagaStatus.COMPENSATED || status === SagaStatus.COMPENSATING) {
      this.logger.warn('Saga [%s] is already compensated/compensating', sagaId);
      return;
    }

    // TODO: استرجاع معلومات الـ Saga من التخزين الدائم
    this.logger.warn('Manual compensation for saga [%s] requires saga persistence (not implemented)', sagaId);
  }

  /**
   * الحصول على حالة Saga
   */
  getSagaStatus(sagaId: string): SagaStatus {
    return this.activeSagas.get(sagaId) || SagaStatus.PENDING;
  }

  /**
   * الحصول على نتيجة Saga
   */
  getSagaResult(sagaId: string): SagaResult | undefined {
    return this.sagaResults.get(sagaId);
  }

  /**
   * قائمة الـ Sagas النشطة
   */
  getActiveSagas(): Array<{ sagaId: string; status: SagaStatus }> {
    return Array.from(this.activeSagas.entries()).map(([sagaId, status]) => ({
      sagaId,
      status,
    }));
  }

  /**
   * إلغاء Saga نشطة
   */
  async cancelSaga(sagaId: string): Promise<void> {
    const status = this.activeSagas.get(sagaId);
    if (status === SagaStatus.RUNNING || status === SagaStatus.PENDING) {
      this.activeSagas.set(sagaId, SagaStatus.COMPENSATING);
      await this.compensate(sagaId);
      this.activeSagas.set(sagaId, SagaStatus.COMPENSATED);
      this.logger.log('Saga [%s] cancelled and compensated', sagaId);
    }
  }

  /**
   * تنظيف الـ Sagas المكتملة من الذاكرة
   */
  cleanupCompletedSagas(maxAgeMs = 3600000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [sagaId, result] of this.sagaResults.entries()) {
      if (result.completedAt) {
        const completedTime = new Date(result.completedAt).getTime();
        if (now - completedTime > maxAgeMs) {
          this.sagaResults.delete(sagaId);
          this.activeSagas.delete(sagaId);
          cleaned++;
        }
      }
    }

    this.logger.debug('Cleaned up %d old saga results', cleaned);
    return cleaned;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /** إنشاء سياق الـ Saga */
  private createContext<T>(sagaId: string, saga: Saga<T>): SagaContext<T> {
    const stepsData = new Map<string, unknown>();

    return {
      sagaId,
      input: saga.input,
      stepsData,
      metadata: {},
      getStepResult<R>(stepName: string): R | undefined {
        return stepsData.get(stepName) as R | undefined;
      },
      setStepResult(stepName: string, result: unknown): void {
        stepsData.set(stepName, result);
      },
    };
  }

  /** تنفيذ خطوة مع دعم retry و timeout */
  private async executeStep<T>(
    step: import('./saga.types').SagaStep<T>,
    context: SagaContext<T>,
    defaultRetryPolicy?: RetryPolicy,
  ): Promise<StepResult> {
    const startTime = Date.now();
    const retryPolicy = step.retryPolicy || defaultRetryPolicy;
    const maxRetries = retryPolicy?.maxRetries ?? 0;
    const timeoutMs = step.timeoutMs;

    // التحقق من الشرط
    if (step.condition && !step.condition(context)) {
      return {
        success: true,
        data: undefined,
        executionTimeMs: 0,
      };
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        let result: unknown;

        if (timeoutMs) {
          result = await this.withTimeout(
            Promise.resolve(step.execute(context)),
            timeoutMs,
            step.name,
          );
        } else {
          result = await step.execute(context);
        }

        return {
          success: true,
          data: result,
          executionTimeMs: Date.now() - startTime,
        };
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries && retryPolicy) {
          const delay = this.calculateRetryDelay(attempt, retryPolicy);
          this.logger.warn(
            'Step [%s] attempt %d/%d failed: %s. Retrying in %dms...',
            step.name,
            attempt + 1,
            maxRetries + 1,
            lastError.message,
            delay,
          );
          await this.delay(delay);
        }
      }
    }

    return {
      success: false,
      error: lastError,
      executionTimeMs: Date.now() - startTime,
    };
  }

  /** حساب تأخير الـ retry */
  private calculateRetryDelay(attempt: number, policy: RetryPolicy): number {
    let delay: number;

    switch (policy.backoff) {
      case 'exponential':
        delay = policy.initialDelayMs * Math.pow(policy.multiplier, attempt);
        break;
      case 'linear':
        delay = policy.initialDelayMs * (attempt + 1);
        break;
      case 'fixed':
      default:
        delay = policy.initialDelayMs;
        break;
    }

    // إضافة jitter عشوائي ±20%
    const jitter = delay * 0.2 * (Math.random() - 0.5);
    delay = Math.min(delay + jitter, policy.maxDelayMs);

    return Math.round(delay);
  }

  /** timeout Promise helper */
  private withTimeout<T>(
    promise: Promise<T>,
    ms: number,
    stepName: string,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Step [${stepName}] timed out after ${ms}ms`));
      }, ms);

      promise
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timeoutId));
    });
  }

  /** إنشاء Promise للـ timeout الكلي */
  private createTimeoutPromise(ms: number, sagaId: string): { isTimedOut: boolean } {
    const state = { isTimedOut: false };

    setTimeout(() => {
      state.isTimedOut = true;
      this.logger.warn('Saga [%s] total timeout triggered after %dms', sagaId, ms);
    }, ms);

    return state;
  }

  /** تأخير */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
