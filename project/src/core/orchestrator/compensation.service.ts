/**
 * =============================================================================
 * CompensationService - خدمة التعويض (Rollback) للـ Sagas
 * =============================================================================
 * تنفذ compensation actions بترتيب LIFO (Last-In-First-Out)
 * أي تعكس تنفيذ الخطوات من الأخيرة للأولى
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  CompensationAction,
  SagaContext,
  SagaStep,
  StepExecutionResult,
} from './saga.types';

@Injectable()
export class CompensationService {
  private readonly logger = new Logger(CompensationService.name);

  /**
   * تنفيذ compensation لمجموعة من الخطوات
   * @param sagaId - معرف الـ Saga
   * @param executedSteps - الخطوات التي تم تنفيذها (قبل الفشل)
   * @param stepsResults - نتائج تنفيذ الخطوات
   * @param context - سياق الـ Saga
   * @returns نتائج عمليات التعويض
   */
  async compensate<T>(
    sagaId: string,
    executedSteps: SagaStep<T>[],
    stepsResults: Map<string, unknown>,
    context: SagaContext<T>,
  ): Promise<StepExecutionResult[]> {
    this.logger.log('Starting compensation for saga [%s] - %d steps to compensate', 
      sagaId, executedSteps.length);

    const compensationResults: StepExecutionResult[] = [];

    // ترتيب LIFO: نعكس ترتيب الخطوات
    const reversedSteps = [...executedSteps].reverse();

    for (const step of reversedSteps) {
      const startTime = Date.now();
      const stepResult = stepsResults.get(step.name);

      if (!step.compensate) {
        this.logger.warn('Step [%s] has no compensation function, skipping', step.name);
        compensationResults.push({
          stepName: step.name,
          status: 'SKIPPED',
          executionTimeMs: 0,
        });
        continue;
      }

      try {
        this.logger.debug('Compensating step [%s] for saga [%s]', step.name, sagaId);

        await step.compensate(context, stepResult);

        const elapsed = Date.now() - startTime;
        compensationResults.push({
          stepName: step.name,
          status: 'COMPENSATED',
          executionTimeMs: elapsed,
          compensateTimeMs: elapsed,
        });

        this.logger.debug('Step [%s] compensated successfully in %dms', step.name, elapsed);
      } catch (error) {
        const elapsed = Date.now() - startTime;
        const errorMessage = (error as Error).message;

        compensationResults.push({
          stepName: step.name,
          status: 'FAILED',
          executionTimeMs: elapsed,
          compensateTimeMs: elapsed,
          error: errorMessage,
        });

        this.logger.error(
          'Compensation FAILED for step [%s] in saga [%s]: %s',
          step.name,
          sagaId,
          errorMessage,
        );

        // نستمر في compensation حتى لو فشلت خطوة
        // هذا يضمن محاولة تعويض أكبر عدد ممكن من الخطوات
      }
    }

    this.logger.log(
      'Compensation completed for saga [%s] - %d/%d steps compensated',
      sagaId,
      compensationResults.filter((r) => r.status === 'COMPENSATED').length,
      reversedSteps.length,
    );

    return compensationResults;
  }

  /**
   * تسجيل compensation action بدون تنفيذ
   * يُستخدم للتسجيل فقط (logging/audit)
   */
  logCompensationAction(action: CompensationAction): void {
    this.logger.verbose(
      'Compensation action logged: saga=%s, step=%s, executed=%s, success=%s',
      action.sagaId,
      action.stepName,
      action.executed,
      action.success,
    );
  }

  /**
   * التحقق مما إذا كانت compensation ناجحة بالكامل
   */
  isFullyCompensated(results: StepExecutionResult[]): boolean {
    return results.every(
      (r) => r.status === 'COMPENSATED' || r.status === 'SKIPPED',
    );
  }

  /**
   * الحصول على خطوات التعويض الفاشلة فقط
   */
  getFailedCompensations(results: StepExecutionResult[]): StepExecutionResult[] {
    return results.filter((r) => r.status === 'FAILED');
  }
}
