import { useEffect, useState } from "react";

/**
 * Drives a server-paginated list: calls `fetchPage({ page, pageSize, ...extraParams })`
 * (which must return { items, total, page, pageSize }) whenever the page or
 * any extra param changes, with the search text debounced so it doesn't
 * fire a request on every keystroke.
 */
export function useServerPagination(fetchPage, { pageSize = 20, extraParams = {} } = {}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const reload = () => setReloadToken((t) => t + 1);

  const extraKey = JSON.stringify(extraParams);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Any change to search or the extra filters should reset back to page 1.
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, extraKey]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchPage({ page, pageSize, search: debouncedSearch, ...JSON.parse(extraKey) })
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setTotal(result.total);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.data?.error || "Could not load this list.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, debouncedSearch, extraKey, reloadToken]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return { items, total, page, setPage, totalPages, pageSize, search, setSearch, loading, error, reload };
}
