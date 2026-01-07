import { useQuery } from '@tanstack/react-query';
import { X, Music, User, Disc, Calendar, Globe } from 'lucide-react';
import type { Work, WorkWithDetails } from '@musicpub/types';
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

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-xl z-50 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Work Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="p-6 space-y-4 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        ) : workDetails ? (
          <div className="p-6 space-y-6">
            {/* Title & Basic Info */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Music className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{workDetails.title}</h3>
                  {workDetails.iswc && (
                    <p className="text-sm text-gray-500">ISWC: {workDetails.iswc}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{workDetails.genre || 'No genre'}</span>
                </div>
                {workDetails.release_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{formatDate(workDetails.release_date)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Status */}
            <div>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  workDetails.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : workDetails.status === 'disputed'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                }`}
              >
                {workDetails.status}
              </span>
            </div>

            {/* Writers */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Writers ({workDetails.writers?.length || 0})
              </h4>
              {workDetails.writers && workDetails.writers.length > 0 ? (
                <div className="space-y-2">
                  {workDetails.writers.map((writer) => (
                    <div
                      key={writer.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {writer.songwriter?.legal_name || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {writer.writer_role?.replace('_', ' ')} - {writer.ownership_share}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No writers assigned</p>
              )}
            </div>

            {/* Recordings */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Disc className="w-4 h-4" />
                Recordings ({workDetails.recordings?.length || 0})
              </h4>
              {workDetails.recordings && workDetails.recordings.length > 0 ? (
                <div className="space-y-2">
                  {workDetails.recordings.map((recording) => (
                    <div
                      key={recording.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{recording.title}</p>
                        <p className="text-sm text-gray-500">
                          {recording.artist_name || 'Unknown artist'}
                          {recording.isrc && ` - ISRC: ${recording.isrc}`}
                        </p>
                      </div>
                      {recording.version_type && (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          {recording.version_type}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No recordings linked</p>
              )}
            </div>

            {/* Metadata */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Additional Information</h4>
              <dl className="space-y-2">
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-500">Language</dt>
                  <dd className="text-gray-900">{workDetails.language || 'Not specified'}</dd>
                </div>
                {workDetails.duration_seconds && (
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Duration</dt>
                    <dd className="text-gray-900">
                      {Math.floor(workDetails.duration_seconds / 60)}:
                      {String(workDetails.duration_seconds % 60).padStart(2, '0')}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-500">Created</dt>
                  <dd className="text-gray-900">{formatDate(workDetails.created_at)}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-500">Last Updated</dt>
                  <dd className="text-gray-900">{formatDate(workDetails.updated_at)}</dd>
                </div>
              </dl>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">Work not found</div>
        )}
      </div>
    </>
  );
}
