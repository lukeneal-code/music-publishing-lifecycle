import { useQuery } from '@tanstack/react-query';
import { Music, Play, DollarSign } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { royaltiesApi } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/utils';

export function WorksPage() {
  const songwriter = useAuthStore((state) => state.songwriter);

  const { data: topWorks, isLoading } = useQuery({
    queryKey: ['all-works', songwriter?.id],
    queryFn: () => royaltiesApi.getTopPerformingWorks(songwriter!.id, 50),
    enabled: !!songwriter?.id,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-notion-purple-bg rounded-notion-md flex items-center justify-center flex-shrink-0">
          <Music className="w-5 h-5 text-notion-purple-text" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-notion-text">My Works</h1>
          <p className="text-xs text-notion-text-secondary mt-0.5">
            View your catalog and performance metrics
          </p>
        </div>
      </div>

      {/* Works List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-notion-bg-tertiary rounded-notion-md animate-pulse" />
          ))}
        </div>
      ) : topWorks && topWorks.length > 0 ? (
        <div className="space-y-3">
          {topWorks.map((work, index) => (
            <div
              key={work.id}
              className="p-4 bg-notion-bg-secondary rounded-notion-md hover:bg-notion-bg-tertiary transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-notion-md flex items-center justify-center shadow-notion text-sm font-semibold text-notion-purple-text">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-notion-text">
                      {work.title}
                    </h3>
                    <div className="flex items-center gap-4 mt-1">
                      {work.iswc && (
                        <span className="text-xs text-notion-text-tertiary">
                          ISWC: {work.iswc}
                        </span>
                      )}
                      {work.genre && (
                        <span className="tag text-[10px] bg-notion-gray-bg text-notion-gray-text">
                          {work.genre}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-notion-text-secondary">
                      <Play className="w-3 h-3" />
                      <span className="text-xs">Plays</span>
                    </div>
                    <p className="text-sm font-semibold text-notion-text">
                      {formatNumber(work.total_plays)}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-notion-text-secondary">
                      <DollarSign className="w-3 h-3" />
                      <span className="text-xs">Royalties</span>
                    </div>
                    <p className="text-sm font-semibold text-notion-green-text">
                      {formatCurrency(Number(work.total_royalties))}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-notion-bg-secondary rounded-notion-lg flex items-center justify-center mx-auto mb-4">
            <Music className="w-8 h-8 text-notion-text-tertiary" />
          </div>
          <h3 className="text-sm font-semibold text-notion-text mb-1">No works yet</h3>
          <p className="text-xs text-notion-text-tertiary">
            Your registered works will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
