import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { X, User, DollarSign, FileText, Music, TrendingUp } from 'lucide-react';
import type { Songwriter } from '@musicpub/types';
import { royaltiesApi, dealsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface SongwriterDetailDrawerProps {
  songwriter: Songwriter | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SongwriterDetailDrawer({ songwriter, isOpen, onClose }: SongwriterDetailDrawerProps) {
  const { data: songwriterDetails, isLoading } = useQuery({
    queryKey: ['songwriter', songwriter?.id],
    queryFn: () => royaltiesApi.getSongwriter(songwriter!.id),
    enabled: isOpen && !!songwriter?.id,
  });

  const { data: royaltySummary, isLoading: loadingSummary } = useQuery({
    queryKey: ['songwriter-summary', songwriter?.id],
    queryFn: () => royaltiesApi.getSongwriterSummary(songwriter!.id),
    enabled: isOpen && !!songwriter?.id,
  });

  const { data: statementsData, isLoading: loadingStatements } = useQuery({
    queryKey: ['songwriter-statements', songwriter?.id],
    queryFn: () => royaltiesApi.getSongwriterRoyalties(songwriter!.id),
    enabled: isOpen && !!songwriter?.id,
  });

  const { data: topWorks, isLoading: loadingWorks } = useQuery({
    queryKey: ['songwriter-top-works', songwriter?.id],
    queryFn: () => royaltiesApi.getTopPerformingWorks(songwriter!.id, 5),
    enabled: isOpen && !!songwriter?.id,
  });

  const { data: deals, isLoading: loadingDeals } = useQuery({
    queryKey: ['songwriter-deals', songwriter?.id],
    queryFn: () => dealsApi.listDeals({ songwriter_id: songwriter!.id, limit: 10 }),
    enabled: isOpen && !!songwriter?.id,
  });

  if (!isOpen) return null;

  const statements = statementsData?.items || [];
  const activeDeals = deals?.items?.filter(d => d.status === 'active') || [];

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-notion-popup z-50 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-notion-border-light px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-notion-text">Songwriter Details</h2>
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
        ) : songwriterDetails ? (
          <div className="p-4 space-y-6">
            {/* Header Info */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-notion-purple-bg rounded-notion-md flex items-center justify-center">
                  <User className="w-6 h-6 text-notion-purple-text" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-notion-text">
                    {songwriterDetails.legal_name}
                  </h3>
                  {songwriterDetails.stage_name && (
                    <p className="text-xs text-notion-text-tertiary">
                      "{songwriterDetails.stage_name}"
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {songwriterDetails.ipi_number && (
                  <span className="tag bg-notion-gray-bg text-notion-gray-text">
                    IPI: {songwriterDetails.ipi_number}
                  </span>
                )}
                {songwriterDetails.pro_affiliation && (
                  <span className="tag bg-notion-blue-bg text-notion-blue-text">
                    {songwriterDetails.pro_affiliation}
                  </span>
                )}
              </div>
            </div>

            {/* Earnings Summary */}
            {!loadingSummary && royaltySummary && (
              <div>
                <h4 className="text-xs font-medium text-notion-text mb-3 flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5 text-notion-text-tertiary" />
                  Earnings Summary
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-notion-bg-secondary rounded-notion-md">
                    <p className="text-[11px] text-notion-text-tertiary">This Quarter</p>
                    <p className="text-sm font-semibold text-notion-text">
                      {formatCurrency(Number(royaltySummary.current_quarter_earnings))}
                    </p>
                    {royaltySummary.quarter_change !== undefined && royaltySummary.quarter_change !== null && (
                      <p className={`text-[10px] ${Number(royaltySummary.quarter_change) >= 0 ? 'text-notion-green-text' : 'text-notion-red-text'}`}>
                        {Number(royaltySummary.quarter_change) >= 0 ? '+' : ''}{Number(royaltySummary.quarter_change).toFixed(1)}% vs prev
                      </p>
                    )}
                  </div>
                  <div className="p-3 bg-notion-bg-secondary rounded-notion-md">
                    <p className="text-[11px] text-notion-text-tertiary">YTD Earnings</p>
                    <p className="text-sm font-semibold text-notion-text">
                      {formatCurrency(Number(royaltySummary.ytd_earnings))}
                    </p>
                  </div>
                  <div className="p-3 bg-notion-green-bg rounded-notion-md">
                    <p className="text-[11px] text-notion-green-text">Pending Payout</p>
                    <p className="text-sm font-semibold text-notion-green-text">
                      {formatCurrency(Number(royaltySummary.pending_payout))}
                    </p>
                  </div>
                  <div className="p-3 bg-notion-bg-secondary rounded-notion-md">
                    <p className="text-[11px] text-notion-text-tertiary">Active Works</p>
                    <p className="text-sm font-semibold text-notion-text">
                      {royaltySummary.active_works_count}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Active Deals */}
            <div>
              <h4 className="text-xs font-medium text-notion-text mb-3 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-notion-text-tertiary" />
                Active Deals ({activeDeals.length})
              </h4>
              {loadingDeals ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-12 bg-notion-bg-tertiary rounded-notion-md animate-pulse" />
                  ))}
                </div>
              ) : activeDeals.length > 0 ? (
                <div className="space-y-2">
                  {activeDeals.slice(0, 5).map((deal) => (
                    <div
                      key={deal.id}
                      className="flex items-center justify-between p-3 bg-notion-bg-secondary rounded-notion-md"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-notion-text truncate">
                          {deal.deal_number}
                        </p>
                        <p className="text-[11px] text-notion-text-tertiary">
                          {deal.deal_type.replace('_', ' ')} - {deal.writer_share}% writer
                        </p>
                      </div>
                      <span className="tag bg-notion-green-bg text-notion-green-text">
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-notion-text-tertiary p-3 bg-notion-bg-secondary rounded-notion-md">
                  No active deals.
                </p>
              )}
            </div>

            {/* Top Performing Works */}
            <div>
              <h4 className="text-xs font-medium text-notion-text mb-3 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-notion-text-tertiary" />
                Top Performing Works
              </h4>
              {loadingWorks ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-notion-bg-tertiary rounded-notion-md animate-pulse" />
                  ))}
                </div>
              ) : topWorks && topWorks.length > 0 ? (
                <div className="space-y-2">
                  {topWorks.map((work, index) => (
                    <div
                      key={work.id}
                      className="flex items-center justify-between p-3 bg-notion-bg-secondary rounded-notion-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-notion-purple-bg rounded-notion flex items-center justify-center text-xs font-medium text-notion-purple-text">
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-notion-text truncate">
                            {work.title}
                          </p>
                          <p className="text-[11px] text-notion-text-tertiary">
                            {work.total_plays?.toLocaleString() || 0} plays
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-notion-text">
                        {formatCurrency(Number(work.total_royalties || 0))}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-notion-text-tertiary p-3 bg-notion-bg-secondary rounded-notion-md">
                  No performance data available yet.
                </p>
              )}
            </div>

            {/* Recent Statements */}
            <div>
              <h4 className="text-xs font-medium text-notion-text mb-3 flex items-center gap-2">
                <Music className="w-3.5 h-3.5 text-notion-text-tertiary" />
                Recent Statements ({statements.length})
              </h4>
              {loadingStatements ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-notion-bg-tertiary rounded-notion-md animate-pulse" />
                  ))}
                </div>
              ) : statements.length > 0 ? (
                <div className="space-y-2">
                  {statements.slice(0, 5).map((statement) => (
                    <div
                      key={statement.id}
                      className="flex items-center justify-between p-3 bg-notion-bg-secondary rounded-notion-md"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-notion-text truncate">
                          {statement.period?.period_code || 'Unknown Period'}
                        </p>
                        <p className="text-[11px] text-notion-text-tertiary">
                          {statement.status}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-notion-text">
                        {formatCurrency(Number(statement.net_payable))}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-notion-text-tertiary p-3 bg-notion-bg-secondary rounded-notion-md">
                  No statements generated yet.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-notion-text-secondary">Songwriter not found</div>
        )}
      </div>
    </>,
    document.body
  );
}
