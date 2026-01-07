import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BarChart3, AlertCircle, CheckCircle2, Clock, Music, ArrowRight } from 'lucide-react';
import { usageApi } from '@/lib/api';

const statCards = [
  { key: 'total_events', label: 'Total Events', icon: Music, color: 'blue' },
  { key: 'matched_count', label: 'Matched', icon: CheckCircle2, color: 'green' },
  { key: 'unmatched_count', label: 'Unmatched', icon: AlertCircle, color: 'orange' },
  { key: 'pending_count', label: 'Pending', icon: Clock, color: 'gray' },
];

const colorStyles: Record<string, { bg: string; text: string; icon: string }> = {
  blue: { bg: 'bg-notion-blue-bg', text: 'text-notion-blue-text', icon: 'text-notion-blue-text' },
  green: { bg: 'bg-notion-green-bg', text: 'text-notion-green-text', icon: 'text-notion-green-text' },
  orange: { bg: 'bg-notion-orange-bg', text: 'text-notion-orange-text', icon: 'text-notion-orange-text' },
  gray: { bg: 'bg-notion-gray-bg', text: 'text-notion-gray-text', icon: 'text-notion-text-tertiary' },
  red: { bg: 'bg-notion-red-bg', text: 'text-notion-red-text', icon: 'text-notion-red-text' },
};

export function UsageDashboardPage() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['usage-stats'],
    queryFn: () => usageApi.getStats(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-notion-bg-tertiary rounded w-1/4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-notion-bg-tertiary rounded-notion-md" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-notion-red-bg text-notion-red-text p-4 rounded-notion-md">
          Failed to load usage statistics. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-notion-text">Usage Dashboard</h1>
          <p className="text-sm text-notion-text-secondary mt-1">
            Monitor usage data ingestion and matching status
          </p>
        </div>
        <Link
          to="/usage/unmatched"
          className="flex items-center gap-2 px-4 py-2 bg-notion-blue-bg text-notion-blue-text rounded-notion text-sm font-medium hover:opacity-80 transition-opacity"
        >
          <AlertCircle className="w-4 h-4" />
          Review Unmatched
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const style = colorStyles[card.color];
          const value = stats?.[card.key as keyof typeof stats] ?? 0;

          return (
            <div
              key={card.key}
              className="bg-white border border-notion-border-light rounded-notion-md p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-notion-text-tertiary">{card.label}</p>
                  <p className="text-2xl font-semibold text-notion-text mt-1">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                  </p>
                </div>
                <div className={`w-10 h-10 ${style.bg} rounded-notion-md flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${style.icon}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Match Rate */}
      <div className="bg-white border border-notion-border-light rounded-notion-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-notion-text">Match Rate</h2>
          <span className="text-2xl font-semibold text-notion-green-text">
            {stats?.match_rate ?? 0}%
          </span>
        </div>
        <div className="w-full bg-notion-bg-tertiary rounded-full h-2">
          <div
            className="bg-notion-green-text h-2 rounded-full transition-all duration-500"
            style={{ width: `${stats?.match_rate ?? 0}%` }}
          />
        </div>
      </div>

      {/* Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Source */}
        <div className="bg-white border border-notion-border-light rounded-notion-md p-4">
          <h2 className="text-sm font-medium text-notion-text mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-notion-text-tertiary" />
            Events by Source
          </h2>
          <div className="space-y-3">
            {stats?.by_source && Object.entries(stats.by_source).length > 0 ? (
              Object.entries(stats.by_source).map(([source, count]) => (
                <div key={source} className="flex items-center justify-between">
                  <span className="text-xs text-notion-text-secondary capitalize">
                    {source.replace('_', ' ')}
                  </span>
                  <span className="text-sm font-medium text-notion-text">
                    {count.toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-notion-text-tertiary">No data available</p>
            )}
          </div>
        </div>

        {/* By Status */}
        <div className="bg-white border border-notion-border-light rounded-notion-md p-4">
          <h2 className="text-sm font-medium text-notion-text mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-notion-text-tertiary" />
            Events by Status
          </h2>
          <div className="space-y-3">
            {stats?.by_status && Object.entries(stats.by_status).length > 0 ? (
              Object.entries(stats.by_status).map(([status, count]) => {
                const statusColor = {
                  matched: 'green',
                  unmatched: 'orange',
                  pending: 'gray',
                  error: 'red',
                }[status] || 'gray';
                const style = colorStyles[statusColor];

                return (
                  <div key={status} className="flex items-center justify-between">
                    <span className={`tag ${style.bg} ${style.text}`}>
                      {status}
                    </span>
                    <span className="text-sm font-medium text-notion-text">
                      {count.toLocaleString()}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-notion-text-tertiary">No data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
