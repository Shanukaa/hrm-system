import { useMemo, useState } from "react";

/**
 * Client-side pagination: slices `items` into a page of `pageSize`, resets
 * to page 1 whenever the underlying item count changes (e.g. after a
 * search/filter). Returns everything a list page needs to render both the
 * sliced data and a <Pagination /> control.
 */
export function usePagination(items, pageSize = 10) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  return {
    page: safePage,
    setPage,
    totalPages,
    pageItems,
    total: items.length,
    pageSize,
  };
}
