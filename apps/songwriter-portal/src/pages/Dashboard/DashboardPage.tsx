import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, Music, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { royaltiesApi } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/utils';

export function DashboardPage() {
  const songwriter = useAuthStore((state) => state.songwriter);

  const { data: summary, isLoading } = useQuery({
    queryKey: ['royalty-summary', songwriter?.id],
    queryFn: () => royaltiesApi.getSongwriterSummary(songwriter!.id),
    enabled: !!songwriter?.id,
  });

  const { data: topWorks, isLoading: loadingWorks } = useQuery({
    queryKey: ['top-works', songwriter?.id],
    queryFn: () => royaltiesApi.getTopPerformingWorks(songwriter!.id, 5),
    enabled: !!songwriter?.id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-notion-bg-tertiary rounded w-1/3" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-notion-bg-tertiary rounded-notion-md" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-notion-text">
          Welcome back, {songwriter?.stage_name || songwriter?.legal_name}
        </h1>
        <p className="text-sm text-notion-text-secondary mt-1">
          Here's an overview of your royalty earnings
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-notion-bg-secondary rounded-notion-md">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-notion-green-bg rounded-notion flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-notion-green-text" />
            </div>
            <span className="text-xs text-notion-text-secondary">This Quarter</span>
          </div>
          <div className="text-2xl font-semibold text-notion-text">
            {formatCurrency(Number(summary?.current_quarter_earnings || 0))}
          </div>
          {summary?.quarter_change !== undefined && summary.quarter_change !== null && (
            <div className={`flex items-center gap-1 mt-1 text-xs ${Number(summary.quarter_change) >= 0 ? 'text-notion-green-text' : 'text-notion-red-text'}`}>
              {Number(summary.quarter_change) >= 0 ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {Math.abs(Number(summary.quarter_change)).toFixed(1)}% vs last quarter
            </div>
          )}
        </div>

        <div className="p-4 bg-notion-bg-secondary rounded-notion-md">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-notion-blue-bg rounded-notion flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-notion-blue-text" />
            </div>
            <span className="text-xs text-notion-text-secondary">Year to Date</span>
          </div>
          <div className="text-2xl font-semibold text-notion-text">
            {formatCurrency(Number(summary?.ytd_earnings || 0))}
          </div>
        </div>

        <div className="p-4 bg-notion-green-bg rounded-notion-md">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-white/50 rounded-notion flex items-center justify-center">
              <Calendar className="w-4 h-4 text-notion-green-text" />
            </div>
            <span className="text-xs text-notion-green-text">Pending Payout</span>
          </div>
          <div className="text-2xl font-semibold text-notion-green-text">
            {formatCurrency(Number(summary?.pending_payout || 0))}
          </div>
          {summary?.next_payment_date && (
            <p className="text-xs text-notion-green-text mt-1">
              Next: {new Date(summary.next_payment_date).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="p-4 bg-notion-bg-secondary rounded-notion-md">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-notion-purple-bg rounded-notion flex items-center justify-center">
              <Music className="w-4 h-4 text-notion-purple-text" />
            </div>
            <span className="text-xs text-notion-text-secondary">Active Works</span>
          </div>
          <div className="text-2xl font-semibold text-notion-text">
            {summary?.active_works_count || 0}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Earnings Chart */}
        <div className="p-4 bg-notion-bg-secondary rounded-notion-md">
          <h3 className="text-sm font-semibold text-notion-text mb-4">Monthly Earnings</h3>
          <div className="h-48 flex items-end gap-2">
            {summary?.monthly_earnings?.slice(-6).map((month, index) => {
              const maxAmount = Math.max(...(summary.monthly_earnings?.map(m => Number(m.amount)) || [1]));
              const height = maxAmount > 0 ? (Number(month.amount) / maxAmount) * 100 : 0;
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-notion-blue-bg rounded-t transition-all"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                  <span className="text-[10px] text-notion-text-tertiary">
                    {month.month.split('-')[1]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Revenue by Source */}
        <div className="p-4 bg-notion-bg-secondary rounded-notion-md">
          <h3 className="text-sm font-semibold text-notion-text mb-4">Revenue by Source</h3>
          <div className="space-y-3">
            {summary?.revenue_by_source?.slice(0, 5).map((source, index) => (
              <div key={index}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-notion-text-secondary">{source.source}</span>
                  <span className="text-notion-text font-medium">{formatCurrency(Number(source.amount))}</span>
                </div>
                <div className="h-2 bg-notion-bg-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-notion-blue-text rounded-full transition-all"
                    style={{ width: `${Number(source.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Performing Works */}
      <div className="p-4 bg-notion-bg-secondary rounded-notion-md">
        <h3 className="text-sm font-semibold text-notion-text mb-4">Top Performing Works</h3>
        {loadingWorks ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-notion-bg-tertiary rounded-notion animate-pulse" />
            ))}
          </div>
        ) : topWorks && topWorks.length > 0 ? (
          <div className="space-y-2">
            {topWorks.map((work, index) => (
              <div
                key={work.id}
                className="flex items-center justify-between p-3 bg-white rounded-notion"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-notion-purple-bg rounded-notion flex items-center justify-center text-sm font-semibold text-notion-purple-text">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-notion-text">{work.title}</p>
                    <p className="text-xs text-notion-text-tertiary">
                      {formatNumber(work.total_plays)} plays
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-notion-text">
                    {formatCurrency(Number(work.total_royalties))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-notion-text-tertiary p-4 text-center">
            No performance data available yet.
          </p>
        )}
      </div>
    </div>
  );
}
