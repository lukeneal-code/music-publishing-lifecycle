import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download, Music, Calendar } from 'lucide-react';
import { royaltiesApi } from '@/lib/api';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils';
import { Button } from '@/components/Button';

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
  sync: 'bg-notion-pink-bg text-notion-pink-text',
};

export function StatementDetailPage() {
  const { statementId } = useParams<{ statementId: string }>();
  const navigate = useNavigate();

  const { data: statement, isLoading } = useQuery({
    queryKey: ['statement', statementId],
    queryFn: () => royaltiesApi.getStatement(statementId!),
    enabled: !!statementId,
  });

  const { data: lineItems, isLoading: loadingLineItems } = useQuery({
    queryKey: ['statement-line-items', statementId],
    queryFn: () => royaltiesApi.getStatementLineItems(statementId!),
    enabled: !!statementId,
  });

  const handleDownloadPdf = async () => {
    if (!statementId) return;
    try {
      const blob = await royaltiesApi.getStatementPdf(statementId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `royalty_statement_${statementId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download PDF:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-notion-bg-tertiary rounded w-1/4" />
        <div className="h-24 bg-notion-bg-tertiary rounded-notion-md" />
        <div className="h-64 bg-notion-bg-tertiary rounded-notion-md" />
      </div>
    );
  }

  if (!statement) {
    return (
      <div className="text-center py-12">
        <p className="text-notion-text-secondary">Statement not found</p>
        <Button onClick={() => navigate('/royalties')} className="mt-4">
          Back to Statements
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/royalties')}
            className="p-2 rounded-notion hover:bg-notion-bg-hover transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-notion-text-secondary" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-notion-text">
                {statement.period?.period_code || 'Statement'}
              </h1>
              <span className={`tag ${statusStyles[statement.status] || statusStyles.draft}`}>
                {statement.status}
              </span>
            </div>
            {statement.period && (
              <p className="text-xs text-notion-text-tertiary mt-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(statement.period.start_date)} - {formatDate(statement.period.end_date)}
              </p>
            )}
          </div>
        </div>
        <Button onClick={handleDownloadPdf}>
          <Download className="w-4 h-4 mr-1.5" />
          Download PDF
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-notion-bg-secondary rounded-notion-md">
          <p className="text-xs text-notion-text-tertiary mb-1">Gross Royalties</p>
          <p className="text-lg font-semibold text-notion-text">
            {formatCurrency(Number(statement.gross_royalties))}
          </p>
        </div>
        <div className="p-4 bg-notion-bg-secondary rounded-notion-md">
          <p className="text-xs text-notion-text-tertiary mb-1">Publisher Share</p>
          <p className="text-lg font-semibold text-notion-text">
            {formatCurrency(Number(statement.publisher_share))}
          </p>
        </div>
        <div className="p-4 bg-notion-bg-secondary rounded-notion-md">
          <p className="text-xs text-notion-text-tertiary mb-1">Writer Share</p>
          <p className="text-lg font-semibold text-notion-text">
            {formatCurrency(Number(statement.writer_share))}
          </p>
        </div>
        <div className="p-4 bg-notion-green-bg rounded-notion-md">
          <p className="text-xs text-notion-green-text mb-1">Net Payable</p>
          <p className="text-lg font-semibold text-notion-green-text">
            {formatCurrency(Number(statement.net_payable))}
          </p>
        </div>
      </div>

      {/* Deductions */}
      {(Number(statement.advance_recoupment) > 0 ||
        Number(statement.withholding_tax) > 0 ||
        Number(statement.other_deductions) > 0) && (
        <div className="p-4 bg-notion-bg-secondary rounded-notion-md">
          <h3 className="text-sm font-semibold text-notion-text mb-3">Deductions</h3>
          <div className="space-y-2">
            {Number(statement.advance_recoupment) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-notion-text-secondary">Advance Recoupment</span>
                <span className="text-notion-orange-text">
                  -{formatCurrency(Number(statement.advance_recoupment))}
                </span>
              </div>
            )}
            {Number(statement.withholding_tax) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-notion-text-secondary">Withholding Tax</span>
                <span className="text-notion-text">
                  -{formatCurrency(Number(statement.withholding_tax))}
                </span>
              </div>
            )}
            {Number(statement.other_deductions) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-notion-text-secondary">Other Deductions</span>
                <span className="text-notion-text">
                  -{formatCurrency(Number(statement.other_deductions))}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Line Items */}
      <div className="p-4 bg-notion-bg-secondary rounded-notion-md">
        <div className="flex items-center gap-2 mb-4">
          <Music className="w-4 h-4 text-notion-text-tertiary" />
          <h3 className="text-sm font-semibold text-notion-text">
            Earnings Breakdown ({lineItems?.length || 0} items)
          </h3>
        </div>

        {loadingLineItems ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-notion-bg-tertiary rounded-notion animate-pulse" />
            ))}
          </div>
        ) : lineItems && lineItems.length > 0 ? (
          <div className="space-y-2">
            {lineItems.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-white rounded-notion"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-notion-text truncate">
                      {item.work?.title || 'Unknown Work'}
                    </p>
                    {item.work?.iswc && (
                      <p className="text-xs text-notion-text-tertiary">
                        ISWC: {item.work.iswc}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-notion-text ml-4">
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
                    {formatNumber(item.usage_count)} plays
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-notion-text-tertiary text-center py-4">
            No line items available.
          </p>
        )}
      </div>
    </div>
  );
}
