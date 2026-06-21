export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}

/** Builds a Paginated envelope from a result page and the query params. */
export function paginate<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): Paginated<T> {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    items,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

/**
 * Validates a user-supplied sort column against an allow-list, falling back to
 * a default. Prevents arbitrary/injection-prone orderBy keys.
 */
export function resolveSortColumn(
  sortBy: string | undefined,
  allowed: readonly string[],
  fallback: string,
): string {
  return sortBy && allowed.includes(sortBy) ? sortBy : fallback;
}
