import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { X, Music, User, Disc, Calendar, Globe } from 'lucide-react';
import type { Work } from '@musicpub/types';
import { worksApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface WorkDetailDrawerProps {
  work: Work | null;
  isOpen: boolean;
  onClose: () => void;
}

export function WorkDetailDrawer({ work, isOpen, onClose }: WorkDetailDrawerProps) {
  const { data: workDetails, isLoading } = useQuery({
    queryKey: ['work', work?.id],
    queryFn: () => worksApi.getWork(work!.id),
    enabled: isOpen && !!work?.id,
  });

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-notion-popup z-50 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-notion-border-light px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-notion-text">Work Details</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-notion text-notion-text-tertiary hover:bg-notion-bg-hover hover:text-notion-text-secondary transition-colors duration-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="p-4 space-y-4 animate-pulse">
            <div className="h-6 bg-notion-bg-tertiary rounded w-3/4" />
            <div className="h-4 bg-notion-bg-tertiary rounded w-1/2" />
            <div className="h-4 bg-notion-bg-tertiary rounded w-2/3" />
          </div>
        ) : workDetails ? (
          <div className="p-4 space-y-6">
            {/* Title & Basic Info */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-notion-purple-bg rounded-notion-md flex items-center justify-center">
                  <Music className="w-5 h-5 text-notion-purple-text" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-notion-text truncate">
                    {workDetails.title}
                  </h3>
                  {workDetails.iswc && (
                    <p className="text-xs text-notion-text-tertiary">ISWC: {workDetails.iswc}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs">
                  <Globe className="w-3.5 h-3.5 text-notion-text-tertiary" />
                  <span className="text-notion-text-secondary">{workDetails.genre || 'No genre'}</span>
                </div>
                {workDetails.release_date && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-notion-text-tertiary" />
                    <span className="text-notion-text-secondary">{formatDate(workDetails.release_date)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Status */}
            <div>
              {(() => {
                const statusStyles = {
                  active: 'bg-notion-green-bg text-notion-green-text',
                  disputed: 'bg-notion-red-bg text-notion-red-text',
                  inactive: 'bg-notion-gray-bg text-notion-gray-text',
                };
                return (
                  <span className={`tag ${statusStyles[workDetails.status as keyof typeof statusStyles] || statusStyles.inactive}`}>
                    {workDetails.status}
                  </span>
                );
              })()}
            </div>

            {/* Writers */}
            <div>
              <h4 className="text-xs font-medium text-notion-text mb-3 flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-notion-text-tertiary" />
                Writers ({workDetails.writers?.length || 0})
              </h4>
              {workDetails.writers && workDetails.writers.length > 0 ? (
                <div className="space-y-2">
                  {workDetails.writers.map((writer) => (
                    <div
                      key={writer.id}
                      className="flex items-center justify-between p-3 bg-notion-bg-secondary rounded-notion-md"
                    >
                      <div>
                        <p className="text-xs font-medium text-notion-text">
                          {writer.songwriter?.legal_name || 'Unknown'}
                        </p>
                        <p className="text-[11px] text-notion-text-tertiary">
                          {writer.writer_role?.replace('_', ' ')} — {writer.ownership_share}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-notion-text-tertiary">No writers assigned</p>
              )}
            </div>

            {/* Recordings */}
            <div>
              <h4 className="text-xs font-medium text-notion-text mb-3 flex items-center gap-2">
                <Disc className="w-3.5 h-3.5 text-notion-text-tertiary" />
                Recordings ({workDetails.recordings?.length || 0})
              </h4>
              {workDetails.recordings && workDetails.recordings.length > 0 ? (
                <div className="space-y-2">
                  {workDetails.recordings.map((recording) => (
                    <div
                      key={recording.id}
                      className="flex items-center justify-between p-3 bg-notion-bg-secondary rounded-notion-md"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-notion-text truncate">
                          {recording.title}
                        </p>
                        <p className="text-[11px] text-notion-text-tertiary">
                          {recording.artist_name || 'Unknown artist'}
                          {recording.isrc && ` — ISRC: ${recording.isrc}`}
                        </p>
                      </div>
                      {recording.version_type && (
                        <span className="tag bg-notion-blue-bg text-notion-blue-text ml-2 flex-shrink-0">
                          {recording.version_type}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-notion-text-tertiary">No recordings linked</p>
              )}
            </div>

            {/* Metadata */}
            <div>
              <h4 className="text-xs font-medium text-notion-text mb-3">Additional Information</h4>
              <dl className="space-y-2">
                <div className="flex justify-between text-xs">
                  <dt className="text-notion-text-secondary">Language</dt>
                  <dd className="text-notion-text">{workDetails.language || 'Not specified'}</dd>
                </div>
                {workDetails.duration_seconds && (
                  <div className="flex justify-between text-xs">
                    <dt className="text-notion-text-secondary">Duration</dt>
                    <dd className="text-notion-text">
                      {Math.floor(workDetails.duration_seconds / 60)}:
                      {String(workDetails.duration_seconds % 60).padStart(2, '0')}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <dt className="text-notion-text-secondary">Created</dt>
                  <dd className="text-notion-text">{formatDate(workDetails.created_at)}</dd>
                </div>
                <div className="flex justify-between text-xs">
                  <dt className="text-notion-text-secondary">Last Updated</dt>
                  <dd className="text-notion-text">{formatDate(workDetails.updated_at)}</dd>
                </div>
              </dl>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-notion-text-secondary">Work not found</div>
        )}
      </div>
    </>,
    document.body
  );
}
