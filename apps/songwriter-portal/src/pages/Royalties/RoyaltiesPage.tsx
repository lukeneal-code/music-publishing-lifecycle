import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Download, FileText, Calendar } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { royaltiesApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/Button';

const statusStyles: Record<string, string> = {
  draft: 'bg-notion-gray-bg text-notion-gray-text',
  calculated: 'bg-notion-blue-bg text-notion-blue-text',
  approved: 'bg-notion-green-bg text-notion-green-text',
  sent: 'bg-notion-purple-bg text-notion-purple-text',
  paid: 'bg-notion-green-bg text-notion-green-text',
};

export function RoyaltiesPage() {
  const navigate = useNavigate();
  const songwriter = useAuthStore((state) => state.songwriter);

  const { data: statementsData, isLoading } = useQuery({
    queryKey: ['songwriter-statements', songwriter?.id],
    queryFn: () => royaltiesApi.getSongwriterRoyalties(songwriter!.id),
    enabled: !!songwriter?.id,
  });

  const handleDownloadPdf = async (statementId: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const statements = statementsData?.items || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-notion-green-bg rounded-notion-md flex items-center justify-center flex-shrink-0">
          <DollarSign className="w-5 h-5 text-notion-green-text" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-notion-text">Royalty Statements</h1>
          <p className="text-xs text-notion-text-secondary mt-0.5">
            View and download your royalty statements
          </p>
        </div>
      </div>

      {/* Statements List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-notion-bg-tertiary rounded-notion-md animate-pulse" />
          ))}
        </div>
      ) : statements.length > 0 ? (
        <div className="space-y-3">
          {statements.map((statement) => (
            <div
              key={statement.id}
              onClick={() => navigate(`/royalties/${statement.id}`)}
              className="p-4 bg-notion-bg-secondary rounded-notion-md hover:bg-notion-bg-tertiary transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-notion-md flex items-center justify-center shadow-notion">
                    <FileText className="w-6 h-6 text-notion-text-secondary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-sm font-semibold text-notion-text">
                        {statement.period?.period_code || 'Unknown Period'}
                      </h3>
                      <span className={`tag text-[10px] ${statusStyles[statement.status] || statusStyles.draft}`}>
                        {statement.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-notion-text-tertiary">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {statement.period ? (
                          <>
                            {formatDate(statement.period.start_date)} - {formatDate(statement.period.end_date)}
                          </>
                        ) : (
                          'N/A'
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-notion-text-tertiary">Net Payable</p>
                    <p className="text-lg font-semibold text-notion-green-text">
                      {formatCurrency(Number(statement.net_payable))}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => handleDownloadPdf(statement.id, e)}
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    PDF
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-notion-bg-secondary rounded-notion-lg flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-notion-text-tertiary" />
          </div>
          <h3 className="text-sm font-semibold text-notion-text mb-1">No statements yet</h3>
          <p className="text-xs text-notion-text-tertiary">
            Your royalty statements will appear here once they're generated.
          </p>
        </div>
      )}
    </div>
  );
}
