/**
 * =============================================================================
 * ApiResponse - واجهة استجابة API الموحدة
 * =============================================================================
 */

/** استجابة API موحدة */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  meta?: {
    timestamp: string;
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
  message?: string;
  errorCode?: string;
  statusCode?: number;
}

/** استجابة ناجحة */
export interface SuccessResponse<T> extends ApiResponse<T> {
  success: true;
  data: T;
}

/** استجابة خطأ */
export interface ErrorResponse extends ApiResponse<never> {
  success: false;
  message: string;
  errorCode: string;
  statusCode: number;
}
