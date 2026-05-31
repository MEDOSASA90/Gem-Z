/**
 * =============================================================================
 * TransformInterceptor - تحويل تنسيق الاستجابة
 * =============================================================================
 * يحول كل الاستجابات إلى التنسيق الموحد: { success, data, meta }
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // إذا كانت البيانات مُعادة بتنسيق ApiResponse بالفعل
        if (data && typeof data === 'object' && 'success' in data) {
          return data as unknown as ApiResponse<T>;
        }

        // إذا كانت البيانات paginated
        if (data && typeof data === 'object' && 'data' in data && 'meta' in data) {
          return {
            success: true,
            data: (data as { data: T }).data,
            meta: {
              timestamp: new Date().toISOString(),
              ...(data as { meta: Record<string, unknown> }).meta,
            },
          };
        }

        // تنسيق عادي
        return {
          success: true,
          data,
          meta: {
            timestamp: new Date().toISOString(),
          },
        };
      }),
    );
  }
}
