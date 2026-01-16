import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Calendar, Calculator, CheckCircle, DollarSign, User, FileText } from 'lucide-react';
import type { RoyaltyPeriod, RoyaltyStatement } from '@musicpub/types';
import { royaltiesApi } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/Button';
import { RoyaltyStatementDrawer } from './RoyaltyStatementDrawer';

interface RoyaltyPeriodDetailDrawerProps {
  period: RoyaltyPeriod | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusStyles: Record<string, string> = {
  open: 'bg-notion-gray-bg text-notion-gray-text',
  calculating: 'bg-notion-yellow-bg text-notion-yellow-text',
  calculated: 'bg-notion-blue-bg text-notion-blue-text',
  approved: 'bg-notion-green-bg text-notion-green-text',
  paid: 'bg-notion-purple-bg text-notion-purple-text',
};

const periodTypeLabels: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
};

export function RoyaltyPeriodDetailDrawer({ period, isOpen, onClose }: RoyaltyPeriodDetailDrawerProps) {
  const queryClient = useQueryClient();
  const [selectedStatement, setSelectedStatement] = useState<RoyaltyStatement | null>(null);

  const { data: periodDetails, isLoading } = useQuery({
    queryKey: ['royalty-period', period?.id],
    queryFn: () => royaltiesApi.getPeriod(period!.id),
    enabled: isOpen && !!period?.id,
  });

  const { data: statementsData, isLoading: loadingStatements } = useQuery({
    queryKey: ['royalty-statements', { period_id: period?.id }],
    queryFn: () => royaltiesApi.listStatements({ period_id: period!.id, limit: 100 }),
    enabled: isOpen && !!period?.id,
  });

  const calculateMutation = useMutation({
    mutationFn: () => royaltiesApi.calculatePeriod(period!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['royalty-period', period?.id] });
      queryClient.invalidateQueries({ queryKey: ['royalty-statements', { period_id: period?.id }] });
      queryClient.invalidateQueries({ queryKey: ['royalty-periods'] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => royaltiesApi.approvePeriod(period!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['royalty-period', period?.id] });
      queryClient.invalidateQueries({ queryKey: ['royalty-statements', { period_id: period?.id }] });
      queryClient.invalidateQueries({ queryKey: ['royalty-periods'] });
    },
  });

  if (!isOpen) return null;

  const statements = statementsData?.items || [];
  const totalNetPayable = statements.reduce((sum, s) => sum + Number(s.net_payable), 0);
  const totalGross = statements.reduce((sum, s) => sum + Number(s.gross_royalties), 0);

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-notion-popup z-50 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-notion-border-light px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-notion-text">Period Details</h2>
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
        ) : periodDetails ? (
          <div className="p-4 space-y-6">
            {/* Header Info */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-notion-green-bg rounded-notion-md flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-notion-green-text" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-notion-text">
                    {periodDetails.period_code}
                  </h3>
                  <p className="text-xs text-notion-text-tertiary">
                    {periodTypeLabels[periodDetails.period_type] || periodDetails.period_type}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`tag ${statusStyles[periodDetails.status] || statusStyles.open}`}>
                  {periodDetails.status}
                </span>
                {periodDetails.status === 'open' && (
                  <Button
                    size="sm"
                    onClick={() => calculateMutation.mutate()}
                    disabled={calculateMutation.isPending}
                  >
                    <Calculator className="w-3.5 h-3.5 mr-1" />
                    {calculateMutation.isPending ? 'Calculating...' : 'Calculate'}
                  </Button>
                )}
                {periodDetails.status === 'calculated' && (
                  <Button
                    size="sm"
                    onClick={() => approveMutation.mutate()}
                    disabled={approveMutation.isPending}
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    {approveMutation.isPending ? 'Approving...' : 'Approve'}
                  </Button>
                )}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <h4 className="text-xs font-medium text-notion-text mb-3 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-notion-text-tertiary" />
                Date Range
              </h4>
              <div className="p-3 bg-notion-bg-secondary rounded-notion-md">
                <p className="text-xs text-notion-text">
                  {formatDate(periodDetails.start_date)} - {formatDate(periodDetails.end_date)}
                </p>
              </div>
            </div>

            {/* Summary Stats */}
            <div>
              <h4 className="text-xs font-medium text-notion-text mb-3 flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-notion-text-tertiary" />
                Summary
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-notion-bg-secondary rounded-notion-md">
                  <p className="text-[11px] text-notion-text-tertiary">Statements</p>
                  <p className="text-sm font-semibold text-notion-text">{statements.length}</p>
                </div>
                <div className="p-3 bg-notion-bg-secondary rounded-notion-md">
                  <p className="text-[11px] text-notion-text-tertiary">Gross Royalties</p>
                  <p className="text-sm font-semibold text-notion-text">{formatCurrency(totalGross)}</p>
                </div>
                <div className="p-3 bg-notion-green-bg rounded-notion-md col-span-2">
                  <p className="text-[11px] text-notion-green-text">Total Net Payable</p>
                  <p className="text-lg font-semibold text-notion-green-text">{formatCurrency(totalNetPayable)}</p>
                </div>
              </div>
            </div>

            {/* Statements List */}
            <div>
              <h4 className="text-xs font-medium text-notion-text mb-3 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-notion-text-tertiary" />
                Statements ({statements.length})
              </h4>
              {loadingStatements ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-notion-bg-tertiary rounded-notion-md animate-pulse" />
                  ))}
                </div>
              ) : statements.length > 0 ? (
                <div className="space-y-2">
                  {statements.map((statement) => (
                    <button
                      key={statement.id}
                      onClick={() => setSelectedStatement(statement)}
                      className="w-full flex items-center justify-between p-3 bg-notion-bg-secondary rounded-notion-md hover:bg-notion-bg-tertiary transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-notion-purple-bg rounded-notion flex items-center justify-center">
                          <User className="w-4 h-4 text-notion-purple-text" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-notion-text truncate">
                            {statement.songwriter?.legal_name || 'Unknown Songwriter'}
                          </p>
                          <p className="text-[11px] text-notion-text-tertiary">
                            {statement.line_items_count || 0} line items
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-notion-text">
                          {formatCurrency(Number(statement.net_payable))}
                        </p>
                        <p className="text-[11px] text-notion-text-tertiary">
                          net payable
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-notion-text-tertiary p-3 bg-notion-bg-secondary rounded-notion-md">
                  No statements generated yet. Run calculation to generate statements.
                </p>
              )}
            </div>

            {/* Timestamps */}
            <div>
              <h4 className="text-xs font-medium text-notion-text mb-3">Timeline</h4>
              <dl className="space-y-2">
                <div className="flex justify-between text-xs">
                  <dt className="text-notion-text-secondary">Created</dt>
                  <dd className="text-notion-text">{formatDate(periodDetails.created_at)}</dd>
                </div>
                {periodDetails.calculation_started_at && (
                  <div className="flex justify-between text-xs">
                    <dt className="text-notion-text-secondary">Calculation Started</dt>
                    <dd className="text-notion-text">{formatDate(periodDetails.calculation_started_at)}</dd>
                  </div>
                )}
                {periodDetails.calculation_completed_at && (
                  <div className="flex justify-between text-xs">
                    <dt className="text-notion-text-secondary">Calculation Completed</dt>
                    <dd className="text-notion-text">{formatDate(periodDetails.calculation_completed_at)}</dd>
                  </div>
                )}
                {periodDetails.approved_at && (
                  <div className="flex justify-between text-xs">
                    <dt className="text-notion-text-secondary">Approved</dt>
                    <dd className="text-notion-text">{formatDate(periodDetails.approved_at)}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-notion-text-secondary">Period not found</div>
        )}
      </div>

      {/* Statement Drawer */}
      <RoyaltyStatementDrawer
        statement={selectedStatement}
        isOpen={!!selectedStatement}
        onClose={() => setSelectedStatement(null)}
      />
    </>,
    document.body
  );
}
