'use client';

import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function buildPages(currentPage: number, totalPages: number): number[] {
  if (totalPages <= 1) return [1];
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);
  const adjustedStart = Math.max(1, end - 4);

  return Array.from({ length: end - adjustedStart + 1 }, (_, i) => adjustedStart + i);
}

export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = buildPages(page, totalPages);

  return (
    <div className={cn('flex items-center justify-between gap-2', className)}>
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1.5 text-sm rounded border border-[var(--rpg-border)] text-[var(--rpg-text-primary)] disabled:opacity-40"
      >
        Prev
      </button>

      <div className="flex items-center gap-1">
        {pages.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onPageChange(value)}
            className={cn(
              'min-w-8 px-2 py-1.5 text-sm rounded border',
              value === page
                ? 'border-[var(--rpg-gold)] bg-[var(--rpg-gold)] text-[var(--rpg-background)]'
                : 'border-[var(--rpg-border)] text-[var(--rpg-text-primary)]'
            )}
          >
            {value}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1.5 text-sm rounded border border-[var(--rpg-border)] text-[var(--rpg-text-primary)] disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}
