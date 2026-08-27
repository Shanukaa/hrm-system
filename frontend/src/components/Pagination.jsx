/** Prev/Next + numbered pages, with a "showing X–Y of Z" summary. Used on every data-list page. */
export default function Pagination({ page, totalPages, onPageChange, total, pageSize }) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  // Show up to 5 page numbers, centered around the current page.
  const pages = [];
  let from = Math.max(1, page - 2);
  let to = Math.min(totalPages, from + 4);
  from = Math.max(1, to - 4);
  for (let i = from; i <= to; i++) pages.push(i);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
      <p className="text-xs text-muted">
        Showing <span className="text-ink font-medium">{start}–{end}</span> of <span className="text-ink font-medium">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-line text-muted hover:text-ink hover:bg-paper disabled:opacity-40 disabled:hover:bg-transparent transition-all duration-150"
          aria-label="Previous page"
        >
          ‹
        </button>
        {from > 1 && (
          <>
            <PageButton n={1} active={page === 1} onClick={onPageChange} />
            {from > 2 && <span className="px-1 text-muted text-xs">…</span>}
          </>
        )}
        {pages.map((n) => (
          <PageButton key={n} n={n} active={n === page} onClick={onPageChange} />
        ))}
        {to < totalPages && (
          <>
            {to < totalPages - 1 && <span className="px-1 text-muted text-xs">…</span>}
            <PageButton n={totalPages} active={page === totalPages} onClick={onPageChange} />
          </>
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-line text-muted hover:text-ink hover:bg-paper disabled:opacity-40 disabled:hover:bg-transparent transition-all duration-150"
          aria-label="Next page"
        >
          ›
        </button>
      </div>
    </div>
  );
}

function PageButton({ n, active, onClick }) {
  return (
    <button
      onClick={() => onClick(n)}
      className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-all duration-150 ${
        active ? "bg-accent text-white shadow-soft" : "text-muted hover:text-ink hover:bg-paper border border-transparent"
      }`}
    >
      {n}
    </button>
  );
}
