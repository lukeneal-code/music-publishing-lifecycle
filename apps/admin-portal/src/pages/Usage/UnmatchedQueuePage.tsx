import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, Music, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import type { UsageEvent, UnmatchedListResponse } from '@musicpub/api-client';
import { usageApi, worksApi } from '@/lib/api';
import { Button } from '@/components/Button';
import { formatDate } from '@/lib/utils';

export function UnmatchedQueuePage() {
  const queryClient = useQueryClient();
  const [selectedEvent, setSelectedEvent] = useState<UsageEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [skip, setSkip] = useState(0);
  const limit = 20;

  // Fetch unmatched events
  const { data: unmatchedData, isLoading: loadingUnmatched } = useQuery({
    queryKey: ['unmatched-usage', skip, limit],
    queryFn: () => usageApi.listUnmatched({ skip, limit }),
  });

  // Search works for matching
  const { data: worksData, isLoading: loadingWorks } = useQuery({
    queryKey: ['works-search', searchQuery],
    queryFn: () => worksApi.searchWorks(searchQuery, { limit: 10 }),
    enabled: searchQuery.length >= 2,
  });

  // Manual match mutation
  const matchMutation = useMutation({
    mutationFn: ({ eventId, workId }: { eventId: string; workId: string }) =>
      usageApi.manualMatch({
        usage_event_id: eventId,
        work_id: workId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unmatched-usage'] });
      queryClient.invalidateQueries({ queryKey: ['usage-stats'] });
      setSelectedEvent(null);
      setSearchQuery('');
    },
  });

  const handleMatch = (workId: string) => {
    if (!selectedEvent) return;
    matchMutation.mutate({
      eventId: selectedEvent.id,
      workId,
    });
  };

  const totalPages = Math.ceil((unmatchedData?.total || 0) / limit);
  const currentPage = Math.floor(skip / limit) + 1;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/usage"
          className="p-2 rounded-notion text-notion-text-tertiary hover:bg-notion-bg-hover hover:text-notion-text-secondary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-notion-text">Unmatched Queue</h1>
          <p className="text-sm text-notion-text-secondary mt-1">
            Review and manually match usage events to works
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unmatched Events List */}
        <div className="bg-white border border-notion-border-light rounded-notion-md overflow-hidden">
          <div className="px-4 py-3 border-b border-notion-border-light">
            <h2 className="text-sm font-medium text-notion-text flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-notion-orange-text" />
              Unmatched Events
              {unmatchedData?.total ? (
                <span className="text-notion-text-tertiary">({unmatchedData.total})</span>
              ) : null}
            </h2>
          </div>

          {loadingUnmatched ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-notion-text-tertiary" />
            </div>
          ) : unmatchedData?.items.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-notion-green-text mx-auto mb-3" />
              <p className="text-sm text-notion-text-secondary">All caught up!</p>
              <p className="text-xs text-notion-text-tertiary mt-1">
                No unmatched events to review
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-notion-border-light max-h-[500px] overflow-y-auto">
                {unmatchedData?.items.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => {
                      setSelectedEvent(event);
                      // Pre-fill search with title
                      if (event.reported_title) {
                        setSearchQuery(event.reported_title);
                      }
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-notion-bg-hover transition-colors ${
                      selectedEvent?.id === event.id ? 'bg-notion-blue-bg' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
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
                        <div className="flex items-center gap-2 mt-1">
                          <span className="tag bg-notion-gray-bg text-notion-gray-text">
                            {event.source}
                          </span>
                          {event.isrc && (
                            <span className="text-[10px] text-notion-text-tertiary">
                              ISRC: {event.isrc}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-notion-text-tertiary">
                          {formatDate(event.usage_date)}
                        </p>
                        <p className="text-xs text-notion-text-secondary mt-1">
                          {event.play_count.toLocaleString()} plays
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-notion-border-light flex items-center justify-between">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSkip(Math.max(0, skip - limit))}
                    disabled={skip === 0}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-notion-text-tertiary">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSkip(skip + limit)}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Match Panel */}
        <div className="bg-white border border-notion-border-light rounded-notion-md overflow-hidden">
          <div className="px-4 py-3 border-b border-notion-border-light">
            <h2 className="text-sm font-medium text-notion-text">Match to Work</h2>
          </div>

          {selectedEvent ? (
            <div className="p-4 space-y-4">
              {/* Selected Event Info */}
              <div className="p-3 bg-notion-bg-secondary rounded-notion-md">
                <p className="text-xs text-notion-text-tertiary mb-1">Selected Event</p>
                <p className="text-sm font-medium text-notion-text">
                  {selectedEvent.reported_title || 'Unknown Title'}
                </p>
                <p className="text-xs text-notion-text-secondary">
                  {selectedEvent.reported_artist || 'Unknown Artist'}
                </p>
              </div>

              {/* Search Works */}
              <div>
                <label className="block text-xs font-medium text-notion-text mb-2">
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
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
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

              {matchMutation.isSuccess && (
                <div className="p-3 bg-notion-green-bg text-notion-green-text text-xs rounded-notion-md">
                  Successfully matched!
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Music className="w-12 h-12 text-notion-text-tertiary mx-auto mb-3 opacity-50" />
              <p className="text-sm text-notion-text-secondary">Select an event to match</p>
              <p className="text-xs text-notion-text-tertiary mt-1">
                Click on an unmatched event to find and assign a work
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
