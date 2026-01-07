import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, FileText, User, Music, Calendar, DollarSign, Globe, CheckCircle } from 'lucide-react';
import type { Deal } from '@musicpub/types';
import { dealsApi } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/Button';

interface DealDetailDrawerProps {
  deal: Deal | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusStyles: Record<string, string> = {
  draft: 'bg-notion-gray-bg text-notion-gray-text',
  pending_signature: 'bg-notion-yellow-bg text-notion-yellow-text',
  active: 'bg-notion-green-bg text-notion-green-text',
  expired: 'bg-notion-orange-bg text-notion-orange-text',
  terminated: 'bg-notion-red-bg text-notion-red-text',
};

const dealTypeLabels: Record<string, string> = {
  publishing: 'Publishing',
  co_publishing: 'Co-Publishing',
  administration: 'Administration',
  sub_publishing: 'Sub-Publishing',
  sync_license: 'Sync License',
  mechanical_license: 'Mechanical License',
};

export function DealDetailDrawer({ deal, isOpen, onClose }: DealDetailDrawerProps) {
  const queryClient = useQueryClient();

  const { data: dealDetails, isLoading } = useQuery({
    queryKey: ['deal', deal?.id],
    queryFn: () => dealsApi.getDeal(deal!.id),
    enabled: isOpen && !!deal?.id,
  });

  const signMutation = useMutation({
    mutationFn: () => dealsApi.signDeal(deal!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal', deal?.id] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
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
          <h2 className="text-sm font-semibold text-notion-text">Deal Details</h2>
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
        ) : dealDetails ? (
          <div className="p-4 space-y-6">
            {/* Header Info */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-notion-blue-bg rounded-notion-md flex items-center justify-center">
                  <FileText className="w-5 h-5 text-notion-blue-text" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-notion-text">
                    {dealDetails.deal_number}
                  </h3>
                  <p className="text-xs text-notion-text-tertiary">
                    {dealTypeLabels[dealDetails.deal_type] || dealDetails.deal_type}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`tag ${statusStyles[dealDetails.status] || statusStyles.draft}`}>
                  {dealDetails.status.replace('_', ' ')}
                </span>
                {dealDetails.status === 'draft' || dealDetails.status === 'pending_signature' ? (
                  <Button
                    size="sm"
                    onClick={() => signMutation.mutate()}
                    disabled={signMutation.isPending}
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    {signMutation.isPending ? 'Signing...' : 'Sign Deal'}
                  </Button>
                ) : null}
              </div>
            </div>

            {/* Songwriter */}
            <div>
              <h4 className="text-xs font-medium text-notion-text mb-3 flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-notion-text-tertiary" />
                Songwriter
              </h4>
              {dealDetails.songwriter ? (
                <div className="p-3 bg-notion-bg-secondary rounded-notion-md">
                  <p className="text-xs font-medium text-notion-text">
                    {dealDetails.songwriter.legal_name}
                  </p>
                  {dealDetails.songwriter.stage_name && (
                    <p className="text-[11px] text-notion-text-tertiary">
                      Stage name: {dealDetails.songwriter.stage_name}
                    </p>
                  )}
                  {dealDetails.songwriter.ipi_number && (
                    <p className="text-[11px] text-notion-text-tertiary">
                      IPI: {dealDetails.songwriter.ipi_number}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-notion-text-tertiary">No songwriter assigned</p>
              )}
            </div>

            {/* Financial Terms */}
            <div>
              <h4 className="text-xs font-medium text-notion-text mb-3 flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-notion-text-tertiary" />
                Financial Terms
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-notion-bg-secondary rounded-notion-md">
                  <p className="text-[11px] text-notion-text-tertiary">Publisher Share</p>
                  <p className="text-sm font-semibold text-notion-text">{dealDetails.publisher_share}%</p>
                </div>
                <div className="p-3 bg-notion-bg-secondary rounded-notion-md">
                  <p className="text-[11px] text-notion-text-tertiary">Writer Share</p>
                  <p className="text-sm font-semibold text-notion-text">{dealDetails.writer_share}%</p>
                </div>
                <div className="p-3 bg-notion-bg-secondary rounded-notion-md">
                  <p className="text-[11px] text-notion-text-tertiary">Advance</p>
                  <p className="text-sm font-semibold text-notion-text">
                    {formatCurrency(Number(dealDetails.advance_amount))}
                  </p>
                </div>
                <div className="p-3 bg-notion-bg-secondary rounded-notion-md">
                  <p className="text-[11px] text-notion-text-tertiary">Recouped</p>
                  <p className="text-sm font-semibold text-notion-text">
                    {formatCurrency(Number(dealDetails.advance_recouped))}
                  </p>
                </div>
              </div>
            </div>

            {/* Term Dates */}
            <div>
              <h4 className="text-xs font-medium text-notion-text mb-3 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-notion-text-tertiary" />
                Term
              </h4>
              <dl className="space-y-2">
                <div className="flex justify-between text-xs">
                  <dt className="text-notion-text-secondary">Effective Date</dt>
                  <dd className="text-notion-text">{formatDate(dealDetails.effective_date)}</dd>
                </div>
                {dealDetails.expiration_date && (
                  <div className="flex justify-between text-xs">
                    <dt className="text-notion-text-secondary">Expiration Date</dt>
                    <dd className="text-notion-text">{formatDate(dealDetails.expiration_date)}</dd>
                  </div>
                )}
                {dealDetails.term_months && (
                  <div className="flex justify-between text-xs">
                    <dt className="text-notion-text-secondary">Term Length</dt>
                    <dd className="text-notion-text">{dealDetails.term_months} months</dd>
                  </div>
                )}
                {dealDetails.signed_at && (
                  <div className="flex justify-between text-xs">
                    <dt className="text-notion-text-secondary">Signed</dt>
                    <dd className="text-notion-text">{formatDate(dealDetails.signed_at)}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Territories */}
            <div>
              <h4 className="text-xs font-medium text-notion-text mb-3 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-notion-text-tertiary" />
                Territories
              </h4>
              <div className="flex flex-wrap gap-2">
                {dealDetails.territories?.map((territory) => (
                  <span key={territory} className="tag bg-notion-blue-bg text-notion-blue-text">
                    {territory}
                  </span>
                ))}
              </div>
            </div>

            {/* Works */}
            <div>
              <h4 className="text-xs font-medium text-notion-text mb-3 flex items-center gap-2">
                <Music className="w-3.5 h-3.5 text-notion-text-tertiary" />
                Works ({dealDetails.works?.length || 0})
              </h4>
              {dealDetails.works && dealDetails.works.length > 0 ? (
                <div className="space-y-2">
                  {dealDetails.works.map((dw) => (
                    <div
                      key={dw.id}
                      className="flex items-center justify-between p-3 bg-notion-bg-secondary rounded-notion-md"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-notion-text truncate">
                          {dw.work?.title || 'Unknown Work'}
                        </p>
                        {dw.work?.iswc && (
                          <p className="text-[11px] text-notion-text-tertiary">
                            ISWC: {dw.work.iswc}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-notion-text-tertiary">No works assigned to this deal</p>
              )}
            </div>

            {/* Metadata */}
            <div>
              <h4 className="text-xs font-medium text-notion-text mb-3">Additional Information</h4>
              <dl className="space-y-2">
                <div className="flex justify-between text-xs">
                  <dt className="text-notion-text-secondary">Created</dt>
                  <dd className="text-notion-text">{formatDate(dealDetails.created_at)}</dd>
                </div>
                <div className="flex justify-between text-xs">
                  <dt className="text-notion-text-secondary">Last Updated</dt>
                  <dd className="text-notion-text">{formatDate(dealDetails.updated_at)}</dd>
                </div>
              </dl>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-notion-text-secondary">Deal not found</div>
        )}
      </div>
    </>,
    document.body
  );
}
