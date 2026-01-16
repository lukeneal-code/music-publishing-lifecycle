import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Music,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  Loader2,
  Filter,
  Calendar,
} from 'lucide-react';
import type { UsageEventDetail, ListUsageEventsParams } from '@musicpub/api-client';
import { usageApi } from '@/lib/api';
import { Button } from '@/components/Button';
import { formatDate } from '@/lib/utils';
import { UsageEventDetailDrawer } from './UsageEventDetailDrawer';

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; bg: string }> = {
  matched: { icon: CheckCircle2, color: 'text-notion-green-text', bg: 'bg-notion-green-bg' },
  unmatched: { icon: AlertCircle, color: 'text-notion-orange-text', bg: 'bg-notion-orange-bg' },
  pending: { icon: Clock, color: 'text-notion-gray-text', bg: 'bg-notion-gray-bg' },
  processing: { icon: Loader2, color: 'text-notion-blue-text', bg: 'bg-notion-blue-bg' },
  error: { icon: XCircle, color: 'text-notion-red-text', bg: 'bg-notion-red-bg' },
};

const sourceOptions = ['spotify', 'apple_music', 'radio', 'generic'];
const statusOptions = ['pending', 'processing', 'matched', 'unmatched', 'error'];

export function UsageEventsPage() {
  const [selectedEvent, setSelectedEvent] = useState<UsageEventDetail | null>(null);
  const [filters, setFilters] = useState<ListUsageEventsParams>({
    skip: 0,
    limit: 50,
  });
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['usage-events', filters],
    queryFn: () => usageApi.listUsageEvents(filters),
  });

  const handleFilterChange = (key: keyof ListUsageEventsParams, value: string | undefined) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
      skip: 0,
    }));
  };

  const clearFilters = () => {
    setFilters({ skip: 0, limit: 50 });
  };

  const totalPages = Math.ceil((data?.total || 0) / (filters.limit || 50));
  const currentPage = Math.floor((filters.skip || 0) / (filters.limit || 50)) + 1;

  const hasActiveFilters = filters.status || filters.source || filters.start_date || filters.end_date;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/usage"
            className="p-2 rounded-notion text-notion-text-tertiary hover:bg-notion-bg-hover hover:text-notion-text-secondary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-notion-text">Usage Events</h1>
            <p className="text-sm text-notion-text-secondary mt-1">
              View all usage events and their processing status
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={hasActiveFilters ? 'border-notion-blue-text' : ''}
          >
            <Filter className="w-4 h-4 mr-1" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1.5 w-2 h-2 rounded-full bg-notion-blue-text" />
            )}
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-notion-border-light rounded-notion-md p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-notion-text">Filters</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-notion-text-tertiary hover:text-notion-text-secondary"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-xs font-medium text-notion-text-secondary mb-1.5">
                Status
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value as ListUsageEventsParams['status'])}
                className="w-full px-3 py-2 text-sm border border-notion-border rounded-notion focus:outline-none focus:ring-2 focus:ring-notion-blue-text/20 focus:border-notion-blue-text"
              >
                <option value="">All statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Source Filter */}
            <div>
              <label className="block text-xs font-medium text-notion-text-secondary mb-1.5">
                Source
              </label>
              <select
                value={filters.source || ''}
                onChange={(e) => handleFilterChange('source', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-notion-border rounded-notion focus:outline-none focus:ring-2 focus:ring-notion-blue-text/20 focus:border-notion-blue-text"
              >
                <option value="">All sources</option>
                {sourceOptions.map((source) => (
                  <option key={source} value={source}>
                    {source.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-xs font-medium text-notion-text-secondary mb-1.5">
                <Calendar className="w-3 h-3 inline mr-1" />
                Start Date
              </label>
              <input
                type="date"
                value={filters.start_date || ''}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-notion-border rounded-notion focus:outline-none focus:ring-2 focus:ring-notion-blue-text/20 focus:border-notion-blue-text"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-xs font-medium text-notion-text-secondary mb-1.5">
                <Calendar className="w-3 h-3 inline mr-1" />
                End Date
              </label>
              <input
                type="date"
                value={filters.end_date || ''}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-notion-border rounded-notion focus:outline-none focus:ring-2 focus:ring-notion-blue-text/20 focus:border-notion-blue-text"
              />
            </div>
          </div>
        </div>
      )}

      {/* Events Table */}
      <div className="bg-white border border-notion-border-light rounded-notion-md overflow-hidden">
        <div className="px-4 py-3 border-b border-notion-border-light flex items-center justify-between">
          <h2 className="text-sm font-medium text-notion-text flex items-center gap-2">
            <Music className="w-4 h-4 text-notion-text-tertiary" />
            Events
            {data?.total !== undefined && (
              <span className="text-notion-text-tertiary">({data.total.toLocaleString()})</span>
            )}
          </h2>
        </div>

        {isLoading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-notion-text-tertiary" />
          </div>
        ) : data?.items.length === 0 ? (
          <div className="p-8 text-center">
            <Music className="w-12 h-12 text-notion-text-tertiary mx-auto mb-3 opacity-50" />
            <p className="text-sm text-notion-text-secondary">No events found</p>
            <p className="text-xs text-notion-text-tertiary mt-1">
              {hasActiveFilters
                ? 'Try adjusting your filters'
                : 'Usage events will appear here once ingested'}
            </p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 bg-notion-bg-secondary text-xs font-medium text-notion-text-tertiary uppercase tracking-wide">
              <div className="col-span-3">Title / Artist</div>
              <div className="col-span-2">Source</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-2">Plays</div>
              <div className="col-span-1">Confidence</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-notion-border-light">
              {data?.items.map((event) => {
                const status = statusConfig[event.processing_status] || statusConfig.pending;
                const StatusIcon = status.icon;

                return (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className={`w-full text-left px-4 py-3 hover:bg-notion-bg-hover transition-colors ${
                      selectedEvent?.id === event.id ? 'bg-notion-blue-bg' : ''
                    }`}
                  >
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Title / Artist */}
                      <div className="col-span-12 md:col-span-3 flex items-center gap-3">
                        <div className="w-8 h-8 bg-notion-bg-tertiary rounded-notion flex items-center justify-center flex-shrink-0">
                          <Music className="w-4 h-4 text-notion-text-tertiary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-notion-text truncate">
                            {event.reported_title || 'Unknown Title'}
                          </p>
                          <p className="text-xs text-notion-text-secondary truncate">
                            {event.reported_artist || 'Unknown Artist'}
                          </p>
                        </div>
                      </div>

                      {/* Source */}
                      <div className="col-span-6 md:col-span-2">
                        <span className="tag bg-notion-gray-bg text-notion-gray-text">
                          {event.source.replace('_', ' ')}
                        </span>
                        {event.isrc && (
                          <p className="text-[10px] text-notion-text-tertiary mt-1 truncate">
                            ISRC: {event.isrc}
                          </p>
                        )}
                      </div>

                      {/* Status */}
                      <div className="col-span-6 md:col-span-2">
                        <span className={`inline-flex items-center gap-1 tag ${status.bg} ${status.color}`}>
                          <StatusIcon className={`w-3 h-3 ${event.processing_status === 'processing' ? 'animate-spin' : ''}`} />
                          {event.processing_status}
                        </span>
                        {event.match_info && (
                          <p className="text-[10px] text-notion-text-tertiary mt-1 truncate">
                            {event.match_info.work_title}
                          </p>
                        )}
                      </div>

                      {/* Date */}
                      <div className="hidden md:block col-span-2 text-xs text-notion-text-secondary">
                        {formatDate(event.usage_date)}
                      </div>

                      {/* Plays */}
                      <div className="hidden md:block col-span-2 text-sm font-medium text-notion-text">
                        {event.play_count.toLocaleString()}
                      </div>

                      {/* Confidence */}
                      <div className="hidden md:block col-span-1">
                        {event.match_info ? (
                          <span
                            className={`text-xs font-medium ${
                              event.match_info.match_confidence >= 0.9
                                ? 'text-notion-green-text'
                                : event.match_info.match_confidence >= 0.7
                                ? 'text-notion-yellow-text'
                                : 'text-notion-orange-text'
                            }`}
                          >
                            {Math.round(event.match_info.match_confidence * 100)}%
                          </span>
                        ) : (
                          <span className="text-xs text-notion-text-tertiary">-</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-notion-border-light flex items-center justify-between">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setFilters((prev) => ({ ...prev, skip: Math.max(0, (prev.skip || 0) - (prev.limit || 50)) }))}
                  disabled={(filters.skip || 0) === 0}
                >
                  Previous
                </Button>
                <span className="text-xs text-notion-text-tertiary">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setFilters((prev) => ({ ...prev, skip: (prev.skip || 0) + (prev.limit || 50) }))}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Drawer */}
      {selectedEvent && (
        <UsageEventDetailDrawer
          event={selectedEvent}
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onMatchSuccess={() => {
            setSelectedEvent(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}
