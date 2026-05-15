/**
 * GEM Z — API Response Wrapper
 *
 * Standardized JSON response format for ALL API endpoints.
 * Ensures consistent { success, data, message } structure.
 *
 * Usage:
 *   res.json(success(userData));
 *   res.json(success(posts, 'Posts retrieved'));
 *   res.status(404).json(error('User not found', 'NOT_FOUND_USER', 404));
 *   res.json(paginated(users, paginationMeta));
 */

// ─── Types ──────────────────────────────────────────────────────

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

export interface ApiSuccessResponse<T> {
    success: true;
    message?: string;
    data: T;
}

export interface ApiPaginatedResponse<T> {
    success: true;
    message?: string;
    data: T[];
    pagination: PaginationMeta;
}

export interface ApiErrorResponse {
    success: false;
    message: string;
    code: string;
    statusCode: number;
}

// ─── Success Response ───────────────────────────────────────────

export function success<T>(data: T, message?: string): ApiSuccessResponse<T> {
    const response: ApiSuccessResponse<T> = {
        success: true,
        data,
    };

    if (message) {
        response.message = message;
    }

    return response;
}

// ─── Paginated Response ─────────────────────────────────────────

export function paginated<T>(
    data: T[],
    pagination: PaginationMeta,
    message?: string
): ApiPaginatedResponse<T> {
    const response: ApiPaginatedResponse<T> = {
        success: true,
        data,
        pagination,
    };

    if (message) {
        response.message = message;
    }

    return response;
}

// ─── Error Response (for controllers that need manual error building) ─

export function apiError(
    message: string,
    code: string,
    statusCode: number
): ApiErrorResponse {
    return {
        success: false,
        message,
        code,
        statusCode,
    };
}

// ─── Convenience: Empty Success ─────────────────────────────────

export function noContent(message: string = 'Operation successful'): ApiSuccessResponse<null> {
    return {
        success: true,
        message,
        data: null,
    };
}

// ─── Convenience: Created ───────────────────────────────────────

export function created<T>(data: T, message: string = 'Resource created'): ApiSuccessResponse<T> {
    return {
        success: true,
        message,
        data,
    };
}

// ─── Pagination Meta Builder ────────────────────────────────────

export function buildPaginationMeta(
    total: number,
    page: number,
    limit: number
): PaginationMeta {
    const totalPages = Math.ceil(total / limit);

    return {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
    };
}
