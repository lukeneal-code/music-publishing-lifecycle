import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: string;
  header: string;
  cell: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  onRowClick?: (item: T) => void;
  pagination?: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  isLoading,
  onRowClick,
  pagination,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="rounded-notion-md overflow-hidden">
        <div className="animate-pulse">
          <div className="h-9 bg-notion-bg-secondary border-b border-notion-border" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 border-b border-notion-border-light px-4 py-3">
              <div className="h-3 bg-notion-bg-tertiary rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-xs text-notion-text-secondary">No results found</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-notion-border">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-3 py-2 text-left text-[11px] font-medium text-notion-text-secondary uppercase tracking-wider',
                    column.className
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr
                key={item.id}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  'border-b border-notion-border-light transition-colors duration-100',
                  onRowClick && 'cursor-pointer hover:bg-notion-bg-hover'
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn('px-3 py-2.5', column.className)}
                  >
                    {column.cell(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="px-3 py-3 flex items-center justify-between border-t border-notion-border-light">
          <span className="text-xs text-notion-text-secondary">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-notion text-notion-text-secondary hover:bg-notion-bg-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1.5 rounded-notion text-notion-text-secondary hover:bg-notion-bg-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-100"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
