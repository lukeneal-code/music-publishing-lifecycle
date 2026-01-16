import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { X, User, DollarSign, Music, Download } from 'lucide-react';
import type { RoyaltyStatement, RoyaltyLineItem } from '@musicpub/types';
import { royaltiesApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/Button';

interface RoyaltyStatementDrawerProps {
  statement: RoyaltyStatement | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusStyles: Record<string, string> = {
  draft: 'bg-notion-gray-bg text-notion-gray-text',
  calculated: 'bg-notion-blue-bg text-notion-blue-text',
  approved: 'bg-notion-green-bg text-notion-green-text',
  sent: 'bg-notion-purple-bg text-notion-purple-text',
  paid: 'bg-notion-green-bg text-notion-green-text',
};

const usageTypeStyles: Record<string, string> = {
  stream: 'bg-notion-blue-bg text-notion-blue-text',
  download: 'bg-notion-green-bg text-notion-green-text',
  radio_play: 'bg-notion-yellow-bg text-notion-yellow-text',
  tv_broadcast: 'bg-notion-orange-bg text-notion-orange-text',
  public_performance: 'bg-notion-purple-bg text-notion-purple-text',
  sync: 'bg-notion-pink-bg text-notion-pink-text',
  mechanical: 'bg-notion-gray-bg text-notion-gray-text',
};

export function RoyaltyStatementDrawer({ statement, isOpen, onClose }: RoyaltyStatementDrawerProps) {
  const { data: statementDetails, isLoading } = useQuery({
    queryKey: ['royalty-statement', statement?.id],
    queryFn: () => royaltiesApi.getStatement(statement!.id),
    enabled: isOpen && !!statement?.id,
  });

  const { data: lineItems, isLoading: loadingLineItems } = useQuery({
    queryKey: ['royalty-statement-line-items', statement?.id],
    queryFn: () => royaltiesApi.getStatementLineItems(statement!.id),
    enabled: isOpen && !!statement?.id,
  });

  const handleDownloadPdf = async () => {
    if (!statement?.id) return;

    try {
      const blob = await royaltiesApi.getStatementPdf(statement.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `royalty_statement_${statement.songwriter?.legal_name || 'Unknown'}_${statement.period?.period_code || 'Unknown'}.pdf`.replace(/\s+/g, '_');
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download PDF:', error);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-[60]" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-notion-popup z-[70] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-notion-border-light px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-notion-text">Statement Details</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={handleDownloadPdf}>
              <Download className="w-3.5 h-3.5 mr-1" />
              PDF
            </Button>
            <button
              onClick={onClose}
              className="p-1 rounded-notion text-notion-text-tertiary hover:bg-notion-bg-hover hover:text-notion-text-secondary transition-colors duration-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="p-4 space-y-4 animate-pulse">
            <div className="h-6 bg-notion-bg-tertiary rounded w-3/4" />
            <div className="h-4 bg-notion-bg-tertiary rounded w-1/2" />
            <div className="h-4 bg-notion-bg-tertiary rounded w-2/3" />
          </div>
        ) : statementDetails ? (
          <div className="p-4 space-y-6">
            {/* Songwriter Info */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-notion-purple-bg rounded-notion-md flex items-center justify-center">
                  <User className="w-5 h-5 text-notion-purple-text" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-notion-text">
                    {statementDetails.songwriter?.legal_name || 'Unknown Songwriter'}
                  </h3>
                  {statementDetails.songwriter?.stage_name && (
                    <p className="text-xs text-notion-text-tertiary">
                      {statementDetails.songwriter.stage_name}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`tag ${statusStyles[statementDetails.status] || statusStyles.draft}`}>
                  {statementDetails.status}
                </span>
                {statementDetails.period && (
                  <span className="tag bg-notion-gray-bg text-notion-gray-text">
                    {statementDetails.period.period_code}
                  </span>
                )}
              </div>
            </div>

            {/* Financial Summary */}
            <div>
              <h4 className="text-xs font-medium text-notion-text mb-3 flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-notion-text-tertiary" />
                Financial Summary
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between p-3 bg-notion-bg-secondary rounded-notion-md">
                  <span className="text-xs text-notion-text-secondary">Gross Royalties</span>
                  <span className="text-xs font-semibold text-notion-text">
                    {formatCurrency(Number(statementDetails.gross_royalties))}
                  </span>
                </div>
                <div className="flex justify-between p-3 bg-notion-bg-secondary rounded-notion-md">
                  <span className="text-xs text-notion-text-secondary">Publisher Share</span>
                  <span className="text-xs text-notion-text">
                    ({formatCurrency(Number(statementDetails.publisher_share))})
                  </span>
                </div>
                <div className="flex justify-between p-3 bg-notion-bg-secondary rounded-notion-md">
                  <span className="text-xs text-notion-text-secondary">Writer Share</span>
                  <span className="text-xs font-semibold text-notion-text">
                    {formatCurrency(Number(statementDetails.writer_share))}
                  </span>
                </div>

                {Number(statementDetails.advance_recoupment) > 0 && (
                  <div className="flex justify-between p-3 bg-notion-orange-bg rounded-notion-md">
                    <span className="text-xs text-notion-orange-text">Advance Recoupment</span>
                    <span className="text-xs text-notion-orange-text">
                      ({formatCurrency(Number(statementDetails.advance_recoupment))})
                    </span>
                  </div>
                )}

                {Number(statementDetails.withholding_tax) > 0 && (
                  <div className="flex justify-between p-3 bg-notion-bg-secondary rounded-notion-md">
                    <span className="text-xs text-notion-text-secondary">Withholding Tax</span>
                    <span className="text-xs text-notion-text">
                      ({formatCurrency(Number(statementDetails.withholding_tax))})
                    </span>
                  </div>
                )}

                {Number(statementDetails.other_deductions) > 0 && (
                  <div className="flex justify-between p-3 bg-notion-bg-secondary rounded-notion-md">
                    <span className="text-xs text-notion-text-secondary">Other Deductions</span>
                    <span className="text-xs text-notion-text">
                      ({formatCurrency(Number(statementDetails.other_deductions))})
                    </span>
                  </div>
                )}

                <div className="flex justify-between p-3 bg-notion-green-bg rounded-notion-md">
                  <span className="text-xs font-medium text-notion-green-text">Net Payable</span>
                  <span className="text-sm font-semibold text-notion-green-text">
                    {formatCurrency(Number(statementDetails.net_payable))}
                  </span>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <h4 className="text-xs font-medium text-notion-text mb-3 flex items-center gap-2">
                <Music className="w-3.5 h-3.5 text-notion-text-tertiary" />
                Line Items ({lineItems?.length || 0})
              </h4>
              {loadingLineItems ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-notion-bg-tertiary rounded-notion-md animate-pulse" />
                  ))}
                </div>
              ) : lineItems && lineItems.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-auto">
                  {lineItems.map((item: RoyaltyLineItem) => (
                    <div
                      key={item.id}
                      className="p-3 bg-notion-bg-secondary rounded-notion-md"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-notion-text truncate">
                            {item.work?.title || 'Unknown Work'}
                          </p>
                          {item.work?.iswc && (
                            <p className="text-[10px] text-notion-text-tertiary">
                              ISWC: {item.work.iswc}
                            </p>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-notion-text">
                          {formatCurrency(Number(item.calculated_royalty))}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`tag text-[10px] ${usageTypeStyles[item.usage_type] || 'bg-notion-gray-bg text-notion-gray-text'}`}>
                          {item.usage_type.replace('_', ' ')}
                        </span>
                        {item.territory && (
                          <span className="tag text-[10px] bg-notion-gray-bg text-notion-gray-text">
                            {item.territory}
                          </span>
                        )}
                        {item.source && (
                          <span className="tag text-[10px] bg-notion-gray-bg text-notion-gray-text">
                            {item.source}
                          </span>
                        )}
                        <span className="text-[10px] text-notion-text-tertiary">
                          {item.usage_count.toLocaleString()} plays
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-notion-text-tertiary p-3 bg-notion-bg-secondary rounded-notion-md">
                  No line items available.
                </p>
              )}
            </div>

            {/* Songwriter Info Details */}
            {statementDetails.songwriter && (
              <div>
                <h4 className="text-xs font-medium text-notion-text mb-3">Songwriter Details</h4>
                <dl className="space-y-2">
                  {statementDetails.songwriter.ipi_number && (
                    <div className="flex justify-between text-xs">
                      <dt className="text-notion-text-secondary">IPI Number</dt>
                      <dd className="text-notion-text">{statementDetails.songwriter.ipi_number}</dd>
                    </div>
                  )}
                  {statementDetails.songwriter.pro_affiliation && (
                    <div className="flex justify-between text-xs">
                      <dt className="text-notion-text-secondary">PRO Affiliation</dt>
                      <dd className="text-notion-text">{statementDetails.songwriter.pro_affiliation}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-notion-text-secondary">Statement not found</div>
        )}
      </div>
    </>,
    document.body
  );
}
