import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download, Music, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { royaltiesApi } from '@/lib/api';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils';
import { Button } from '@/components/Button';

const statusStyles: Record<string, string> = {
  draft: 'status-draft',
  calculated: 'status-calculated',
  approved: 'status-approved',
  sent: 'status-sent',
  paid: 'status-paid',
};

const usageTypeStyles: Record<string, string> = {
  stream: 'usage-stream',
  download: 'usage-download',
  radio_play: 'usage-radio',
  sync: 'usage-sync',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
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
      <div className="space-y-6">
        <div className="h-8 bg-studio-surface rounded-studio w-1/4 shimmer" />
        <div className="h-28 bg-studio-surface rounded-studio-md shimmer" />
        <div className="h-72 bg-studio-surface rounded-studio-md shimmer" />
      </div>
    );
  }

  if (!statement) {
    return (
      <div className="text-center py-16">
        <p className="text-text-secondary mb-4">Statement not found</p>
        <Button onClick={() => navigate('/royalties')}>
          Back to Statements
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/royalties')}
            className="p-2.5 rounded-studio-md bg-studio-surface hover:bg-studio-surface-hover transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4 text-text-secondary" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-text-primary">
                {statement.period?.period_code || 'Statement'}
              </h1>
              <span className={`tag ${statusStyles[statement.status] || statusStyles.draft}`}>
                {statement.status}
              </span>
            </div>
            {statement.period && (
              <p className="text-sm text-text-tertiary mt-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(statement.period.start_date)} - {formatDate(statement.period.end_date)}
              </p>
            )}
          </div>
        </div>
        <Button variant="gradient" onClick={handleDownloadPdf}>
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-5">
          <p className="text-xs text-text-tertiary mb-1">Gross Royalties</p>
          <p className="text-xl font-bold text-text-primary">
            {formatCurrency(Number(statement.gross_royalties))}
          </p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-text-tertiary mb-1">Publisher Share</p>
          <p className="text-xl font-bold text-text-primary">
            {formatCurrency(Number(statement.publisher_share))}
          </p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-text-tertiary mb-1">Writer Share</p>
          <p className="text-xl font-bold text-text-primary">
            {formatCurrency(Number(statement.writer_share))}
          </p>
        </div>
        <div className="glass-card p-5 glow-emerald-hover" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
          <p className="text-xs text-accent-emerald mb-1">Net Payable</p>
          <p className="text-xl font-bold text-gradient-success">
            {formatCurrency(Number(statement.net_payable))}
          </p>
        </div>
      </motion.div>

      {/* Deductions */}
      {(Number(statement.advance_recoupment) > 0 ||
        Number(statement.withholding_tax) > 0 ||
        Number(statement.other_deductions) > 0) && (
        <motion.div variants={itemVariants} className="glass-card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Deductions</h3>
          <div className="space-y-3">
            {Number(statement.advance_recoupment) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Advance Recoupment</span>
                <span className="text-accent-amber font-medium">
                  -{formatCurrency(Number(statement.advance_recoupment))}
                </span>
              </div>
            )}
            {Number(statement.withholding_tax) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Withholding Tax</span>
                <span className="text-text-primary font-medium">
                  -{formatCurrency(Number(statement.withholding_tax))}
                </span>
              </div>
            )}
            {Number(statement.other_deductions) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Other Deductions</span>
                <span className="text-text-primary font-medium">
                  -{formatCurrency(Number(statement.other_deductions))}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Line Items */}
      <motion.div variants={itemVariants} className="glass-card p-5">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 gradient-purple rounded-studio flex items-center justify-center">
            <Music className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-text-primary">
            Earnings Breakdown ({lineItems?.length || 0} items)
          </h3>
        </div>

        {loadingLineItems ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-studio-surface rounded-studio shimmer" />
            ))}
          </div>
        ) : lineItems && lineItems.length > 0 ? (
          <div className="space-y-3">
            {lineItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 bg-studio-surface-hover rounded-studio-md hover:bg-studio-surface-elevated transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {item.work?.title || 'Unknown Work'}
                    </p>
                    {item.work?.iswc && (
                      <p className="text-xs text-text-tertiary mt-0.5">
                        ISWC: {item.work.iswc}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-bold text-gradient-earnings ml-4">
                    {formatCurrency(Number(item.calculated_royalty))}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`tag text-[10px] ${usageTypeStyles[item.usage_type] || 'status-draft'}`}>
                    {item.usage_type.replace('_', ' ')}
                  </span>
                  {item.territory && (
                    <span className="tag text-[10px] status-draft">
                      {item.territory}
                    </span>
                  )}
                  {item.source && (
                    <span className="tag text-[10px] status-draft">
                      {item.source}
                    </span>
                  )}
                  <span className="text-[10px] text-text-tertiary ml-auto">
                    {formatNumber(item.usage_count)} plays
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-tertiary text-center py-8">
            No line items available.
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
