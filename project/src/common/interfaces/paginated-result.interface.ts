/**
 * =============================================================================
 * PaginatedResult - نتيجة paginated
 * =============================================================================
 */

/** معلومات الصفحة */
export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/** نتيجة مع Pagination */
export interface PaginatedResult<T> {
  data: T[];
  meta: PageMeta;
}

/** معاملات Pagination */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'ASC' | 'DESC' | 'asc' | 'desc';
}
