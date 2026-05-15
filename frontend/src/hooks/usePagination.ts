'use client';

import { useState, useCallback, useMemo } from 'react';

// ─── Types ───────────────────────────────────────────────────

interface UsePaginationOptions {
  /** Initial page number (1-based) */
  initialPage?: number;
  /** Items per page */
  initialLimit?: number;
  /** Total number of items */
  total?: number;
}

interface PaginationInfo {
  /** Current page (1-based) */
  page: number;
  /** Items per page */
  limit: number;
  /** Total items */
  total: number;
  /** Total pages */
  totalPages: number;
  /** Offset for API calls */
  offset: number;
  /** Whether there's a next page */
  hasNextPage: boolean;
  /** Whether there's a previous page */
  hasPrevPage: boolean;
  /** Start item index (1-based, human-readable) */
  startIndex: number;
  /** End item index (1-based, human-readable) */
  endIndex: number;
}

interface PaginationActions {
  /** Go to a specific page */
  goToPage: (page: number) => void;
  /** Go to next page */
  nextPage: () => void;
  /** Go to previous page */
  prevPage: () => void;
  /** Go to first page */
  firstPage: () => void;
  /** Go to last page */
  lastPage: () => void;
  /** Change items per page */
  setLimit: (limit: number) => void;
  /** Set total count */
  setTotal: (total: number) => void;
}

interface PaginationUIProps {
  currentPage: number;
  totalPages: number;
  pages: (number | 'ellipsis')[];
  onPageChange: (page: number) => void;
  onPrev: () => void;
  onNext: () => void;
  isFirstPage: boolean;
  isLastPage: boolean;
  limitOptions: number[];
  currentLimit: number;
  onLimitChange: (limit: number) => void;
  totalText: string;
}

interface UsePaginationReturn {
  pagination: PaginationInfo;
  actions: PaginationActions;
  uiProps: PaginationUIProps;
}

// ─── Constants ───────────────────────────────────────────────

const DEFAULT_LIMIT_OPTIONS = [10, 20, 50, 100];

// ─── Hook ────────────────────────────────────────────────────

/**
 * Pagination hook with state management and UI props generation.
 *
 * @example
 * const { pagination, actions, uiProps } = usePagination({ total: 250 });
 *
 * // Use in API call
 * const offset = pagination.offset;
 * const limit = pagination.limit;
 *
 * // Render pagination controls
 * <PaginationControls {...uiProps} />
 */
export function usePagination({
  initialPage = 1,
  initialLimit = 20,
  total = 0,
}: UsePaginationOptions = {}): UsePaginationReturn {
  const [page, setPage] = useState(Math.max(1, initialPage));
  const [limit, setLimitState] = useState(initialLimit);
  const [totalItems, setTotalItems] = useState(total);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalItems / limit)),
    [totalItems, limit]
  );

  const clampedPage = useMemo(
    () => Math.min(page, totalPages),
    [page, totalPages]
  );

  const offset = useMemo(() => (clampedPage - 1) * limit, [clampedPage, limit]);
  const hasNextPage = useMemo(() => clampedPage < totalPages, [clampedPage, totalPages]);
  const hasPrevPage = useMemo(() => clampedPage > 1, [clampedPage]);
  const startIndex = useMemo(() => (totalItems === 0 ? 0 : offset + 1), [totalItems, offset]);
  const endIndex = useMemo(() => Math.min(offset + limit, totalItems), [offset, limit, totalItems]);

  const goToPage = useCallback((targetPage: number) => {
    setPage((p) => Math.max(1, Math.min(targetPage, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => { if (hasNextPage) setPage((p) => p + 1); }, [hasNextPage]);
  const prevPage = useCallback(() => { if (hasPrevPage) setPage((p) => p - 1); }, [hasPrevPage]);
  const firstPage = useCallback(() => setPage(1), []);
  const lastPage = useCallback(() => setPage(totalPages), [totalPages]);

  const setLimit = useCallback((newLimit: number) => {
    setLimitState(newLimit);
    setPage(1);
  }, []);

  const setTotal = useCallback((newTotal: number) => {
    setTotalItems(newTotal);
  }, []);

  const pages = useMemo<(number | 'ellipsis')[]>(() => {
    const result: (number | 'ellipsis')[] = [];
    const current = clampedPage;
    const total = totalPages;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) result.push(i);
      return result;
    }

    result.push(1);
    if (current > 3) result.push('ellipsis');

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) {
      if (i !== 1 && i !== total) result.push(i);
    }

    if (current < total - 2) result.push('ellipsis');
    if (total > 1) result.push(total);

    return result;
  }, [clampedPage, totalPages]);

  const pagination: PaginationInfo = {
    page: clampedPage, limit, total: totalItems, totalPages,
    offset, hasNextPage, hasPrevPage, startIndex, endIndex,
  };

  const actions: PaginationActions = {
    goToPage, nextPage, prevPage, firstPage, lastPage, setLimit, setTotal,
  };

  const uiProps: PaginationUIProps = {
    currentPage: clampedPage, totalPages, pages,
    onPageChange: goToPage, onPrev: prevPage, onNext: nextPage,
    isFirstPage: !hasPrevPage, isLastPage: !hasNextPage,
    limitOptions: DEFAULT_LIMIT_OPTIONS,
    currentLimit: limit, onLimitChange: setLimit,
    totalText: `${startIndex}-${endIndex} of ${totalItems}`,
  };

  return { pagination, actions, uiProps };
}

// ─── PaginationControls Component ────────────────────────────

interface PaginationControlsProps extends PaginationUIProps {
  className?: string;
}

export function PaginationControls({
  currentPage, totalPages, pages,
  onPageChange, onPrev, onNext,
  isFirstPage, isLastPage, className = '',
}: PaginationControlsProps) {
  return (
    <nav className={`flex items-center justify-center gap-1.5 ${className}`} aria-label="Pagination">
      {/* Previous */}
      <button
        onClick={onPrev}
        disabled={isFirstPage}
        className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        aria-label="Previous page"
      >
        <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 0, 'wght' 500" }}>
          chevron_left
        </span>
      </button>

      {/* Page Numbers */}
      {pages.map((page, idx) =>
        page === 'ellipsis' ? (
          <span key={`ellipsis-${idx}`} className="w-9 h-9 flex items-center justify-center text-white/30 text-sm">…</span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`flex items-center justify-center w-9 h-9 rounded-lg text-sm font-bold transition-all duration-200 ${
              page === currentPage
                ? 'bg-[#ff7b00] text-black shadow-[0_0_12px_rgba(255,123,0,0.4)]'
                : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white'
            }`}
            aria-label={`Page ${page}`}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        )
      )}

      {/* Next */}
      <button
        onClick={onNext}
        disabled={isLastPage}
        className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        aria-label="Next page"
      >
        <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 0, 'wght' 500" }}>
          chevron_right
        </span>
      </button>
    </nav>
  );
}

// ─── PageSizeSelector Component ──────────────────────────────

interface PageSizeSelectorProps {
  limitOptions: number[];
  currentLimit: number;
  onLimitChange: (limit: number) => void;
  totalText?: string;
  className?: string;
}

export function PageSizeSelector({
  limitOptions, currentLimit, onLimitChange, totalText, className = '',
}: PageSizeSelectorProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {totalText && <span className="text-sm text-white/40">{totalText}</span>}
      <select
        value={currentLimit}
        onChange={(e) => onLimitChange(Number(e.target.value))}
        className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/60 focus:outline-none focus:ring-2 focus:ring-[#ff7b00]/50 cursor-pointer"
      >
        {limitOptions.map((opt) => (
          <option key={opt} value={opt} className="bg-[#1a1a1a]">{opt} / page</option>
        ))}
      </select>
    </div>
  );
}

export default usePagination;
