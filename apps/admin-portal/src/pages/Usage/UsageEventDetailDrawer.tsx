import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Music,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  Loader2,
  Search,
  ExternalLink,
} from 'lucide-react';
import type { UsageEventDetail } from '@musicpub/api-client';
import { usageApi, worksApi } from '@/lib/api';
import { Button } from '@/components/Button';
import { formatDate } from '@/lib/utils';

interface UsageEventDetailDrawerProps {
  event: UsageEventDetail;
  isOpen: boolean;
  onClose: () => void;
  onMatchSuccess: () => void;
}

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; bg: string; label: string }> = {
  matched: { icon: CheckCircle2, color: 'text-notion-green-text', bg: 'bg-notion-green-bg', label: 'Matched' },
  unmatched: { icon: AlertCircle, color: 'text-notion-orange-text', bg: 'bg-notion-orange-bg', label: 'Unmatched' },
  pending: { icon: Clock, color: 'text-notion-gray-text', bg: 'bg-notion-gray-bg', label: 'Pending' },
  processing: { icon: Loader2, color: 'text-notion-blue-text', bg: 'bg-notion-blue-bg', label: 'Processing' },
  error: { icon: XCircle, color: 'text-notion-red-text', bg: 'bg-notion-red-bg', label: 'Error' },
};

export function UsageEventDetailDrawer({
  event,
  isOpen,
  onClose,
  onMatchSuccess,
}: UsageEventDetailDrawerProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState(event.reported_title || '');

  const status = statusConfig[event.processing_status] || statusConfig.pending;
  const StatusIcon = status.icon;

  // Search works for matching
  const { data: worksData, isLoading: loadingWorks } = useQuery({
    queryKey: ['works-search', searchQuery],
    queryFn: () => worksApi.searchWorks(searchQuery, { limit: 10 }),
    enabled: searchQuery.length >= 2 && event.processing_status !== 'matched',
  });

  // Manual match mutation
  const matchMutation = useMutation({
    mutationFn: ({ eventId, workId }: { eventId: string; workId: string }) =>
      usageApi.manualMatch({
        usage_event_id: eventId,
        work_id: workId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usage-events'] });
      queryClient.invalidateQueries({ queryKey: ['usage-stats'] });
      onMatchSuccess();
    },
  });

  const handleMatch = (workId: string) => {
    matchMutation.mutate({
      eventId: event.id,
      workId,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      {/* Drawer */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-notion-border-light flex items-center justify-between">
          <h2 className="text-lg font-semibold text-notion-text">Event Details</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-notion text-notion-text-tertiary hover:bg-notion-bg-hover hover:text-notion-text-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Event Info Card */}
          <div className="bg-notion-bg-secondary rounded-notion-md p-4 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-notion-bg-tertiary rounded-notion-md flex items-center justify-center flex-shrink-0">
                <Music className="w-6 h-6 text-notion-text-tertiary" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-medium text-notion-text">
                  {event.reported_title || 'Unknown Title'}
                </h3>
                <p className="text-sm text-notion-text-secondary">
                  {event.reported_artist || 'Unknown Artist'}
                </p>
                {event.reported_album && (
                  <p className="text-xs text-notion-text-tertiary mt-1">
                    Album: {event.reported_album}
                  </p>
                )}
              </div>
              <span className={`tag ${status.bg} ${status.color} flex items-center gap-1`}>
                <StatusIcon className={`w-3 h-3 ${event.processing_status === 'processing' ? 'animate-spin' : ''}`} />
                {status.label}
              </span>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-notion-border-light">
              <div>
                <p className="text-xs text-notion-text-tertiary">Source</p>
                <p className="text-sm text-notion-text capitalize mt-0.5">
                  {event.source.replace('_', ' ')}
                </p>
              </div>
              <div>
                <p className="text-xs text-notion-text-tertiary">ISRC</p>
                <p className="text-sm text-notion-text font-mono mt-0.5">
                  {event.isrc || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-notion-text-tertiary">Usage Date</p>
                <p className="text-sm text-notion-text mt-0.5">
                  {formatDate(event.usage_date)}
                </p>
              </div>
              <div>
                <p className="text-xs text-notion-text-tertiary">Play Count</p>
                <p className="text-sm text-notion-text font-medium mt-0.5">
                  {event.play_count.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-notion-text-tertiary">Revenue</p>
                <p className="text-sm text-notion-text mt-0.5">
                  {event.revenue_amount
                    ? `${event.currency || 'USD'} ${event.revenue_amount.toFixed(4)}`
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-notion-text-tertiary">Territory</p>
                <p className="text-sm text-notion-text mt-0.5">
                  {event.territory || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-notion-text-tertiary">Ingested At</p>
                <p className="text-sm text-notion-text mt-0.5">
                  {formatDate(event.ingested_at)}
                </p>
              </div>
              <div>
                <p className="text-xs text-notion-text-tertiary">Reporting Period</p>
                <p className="text-sm text-notion-text mt-0.5">
                  {event.reporting_period || '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Match Info (if matched) */}
          {event.match_info && (
            <div className="bg-notion-green-bg/30 border border-notion-green-text/20 rounded-notion-md p-4">
              <h4 className="text-sm font-medium text-notion-text flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-notion-green-text" />
                Match Information
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-notion-text-secondary">Matched Work</span>
                  <span className="text-sm font-medium text-notion-text">
                    {event.match_info.work_title}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-notion-text-secondary">Confidence</span>
                  <span
                    className={`text-sm font-medium ${
                      event.match_info.match_confidence >= 0.9
                        ? 'text-notion-green-text'
                        : event.match_info.match_confidence >= 0.7
                        ? 'text-notion-yellow-text'
                        : 'text-notion-orange-text'
                    }`}
                  >
                    {Math.round(event.match_info.match_confidence * 100)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-notion-text-secondary">Match Method</span>
                  <span className="tag bg-notion-blue-bg text-notion-blue-text">
                    {event.match_info.match_method.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-notion-text-secondary">Confirmed</span>
                  <span className="text-sm text-notion-text">
                    {event.match_info.is_confirmed ? 'Yes' : 'No'}
                  </span>
                </div>
                {event.match_info.matched_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-notion-text-secondary">Matched At</span>
                    <span className="text-sm text-notion-text">
                      {formatDate(event.match_info.matched_at)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Manual Match Section (if unmatched) */}
          {(event.processing_status === 'unmatched' || event.processing_status === 'pending') && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-notion-text">Manual Match</h4>

              {/* Search Works */}
              <div>
                <label className="block text-xs font-medium text-notion-text-secondary mb-1.5">
                  Search Works
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-notion-text-tertiary" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title..."
                    className="w-full pl-9 pr-4 py-2 text-sm border border-notion-border rounded-notion focus:outline-none focus:ring-2 focus:ring-notion-blue-text/20 focus:border-notion-blue-text"
                  />
                </div>
              </div>

              {/* Search Results */}
              {loadingWorks ? (
                <div className="py-4 flex justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-notion-text-tertiary" />
                </div>
              ) : searchQuery.length >= 2 && worksData?.items ? (
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {worksData.items.length === 0 ? (
                    <p className="text-xs text-notion-text-tertiary text-center py-4">
                      No works found matching "{searchQuery}"
                    </p>
                  ) : (
                    worksData.items.map((work) => (
                      <div
                        key={work.id}
                        className="flex items-center justify-between p-3 bg-notion-bg-secondary rounded-notion-md hover:bg-notion-bg-hover transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-notion-text truncate">
                            {work.title}
                          </p>
                          {work.iswc && (
                            <p className="text-xs text-notion-text-tertiary">
                              ISWC: {work.iswc}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleMatch(work.id)}
                          disabled={matchMutation.isPending}
                        >
                          {matchMutation.isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            'Match'
                          )}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <p className="text-xs text-notion-text-tertiary text-center py-4">
                  Enter at least 2 characters to search
                </p>
              )}

              {matchMutation.isError && (
                <div className="p-3 bg-notion-red-bg text-notion-red-text text-xs rounded-notion-md">
                  Failed to match. Please try again.
                </div>
              )}
            </div>
          )}

          {/* Event ID */}
          <div className="pt-4 border-t border-notion-border-light">
            <p className="text-xs text-notion-text-tertiary">Event ID</p>
            <p className="text-xs text-notion-text font-mono mt-0.5 break-all">
              {event.id}
            </p>
            {event.source_event_id && (
              <>
                <p className="text-xs text-notion-text-tertiary mt-2">Source Event ID</p>
                <p className="text-xs text-notion-text font-mono mt-0.5 break-all">
                  {event.source_event_id}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-notion-border-light">
          <Button variant="secondary" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
