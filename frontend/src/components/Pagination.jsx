import React from "react";

function PageButton({ children, active, disabled, onClick, label }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={[
        "inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium transition-colors",
        active
          ? "bg-indigo-600 text-white"
          : disabled
          ? "text-gray-300 cursor-not-allowed"
          : "text-gray-700 hover:bg-gray-100",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  // Build page numbers to show: always show first, last, current ±1, with ellipsis
  const pages = [];
  const delta = 1;
  const left = page - delta;
  const right = page + delta;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= left && i <= right)) {
      pages.push(i);
    }
  }

  const withEllipsis = [];
  let prev = null;
  for (const p of pages) {
    if (prev !== null && p - prev > 1) {
      withEllipsis.push("...");
    }
    withEllipsis.push(p);
    prev = p;
  }

  return (
    <nav
      className="flex items-center justify-center gap-1"
      aria-label="Pagination"
    >
      <PageButton
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        label="Previous page"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </PageButton>

      {withEllipsis.map((item, idx) =>
        item === "..." ? (
          <span key={`ellipsis-${idx}`} className="w-9 text-center text-gray-400">
            …
          </span>
        ) : (
          <PageButton
            key={item}
            active={item === page}
            onClick={() => onPageChange(item)}
            label={`Page ${item}`}
          >
            {item}
          </PageButton>
        )
      )}

      <PageButton
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        label="Next page"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </PageButton>
    </nav>
  );
}
