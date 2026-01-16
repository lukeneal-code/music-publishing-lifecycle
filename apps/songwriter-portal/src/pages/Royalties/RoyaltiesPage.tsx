import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Download, FileText, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/auth';
import { royaltiesApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/Button';

const statusStyles: Record<string, string> = {
  draft: 'status-draft',
  calculated: 'status-calculated',
  approved: 'status-approved',
  sent: 'status-sent',
  paid: 'status-paid',
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
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-start gap-4">
        <div className="w-12 h-12 gradient-success rounded-studio-md flex items-center justify-center flex-shrink-0 shadow-glow-emerald">
          <DollarSign className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Royalty Statements</h1>
          <p className="text-sm text-text-secondary mt-1">
            View and download your royalty statements
          </p>
        </div>
      </motion.div>

      {/* Statements List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-studio-surface rounded-studio-md shimmer" />
          ))}
        </div>
      ) : statements.length > 0 ? (
        <motion.div variants={containerVariants} className="space-y-3">
          {statements.map((statement) => (
            <motion.div
              key={statement.id}
              variants={itemVariants}
              onClick={() => navigate(`/royalties/${statement.id}`)}
              className="glass-card p-5 hover:bg-studio-surface-hover transition-all duration-200 cursor-pointer group glow-hover"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-studio-surface-elevated rounded-studio-md flex items-center justify-center group-hover:shadow-glow-sm transition-shadow">
                    <FileText className="w-7 h-7 text-text-secondary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1.5">
                      <h3 className="text-base font-semibold text-text-primary">
                        {statement.period?.period_code || 'Unknown Period'}
                      </h3>
                      <span className={`tag text-[11px] ${statusStyles[statement.status] || statusStyles.draft}`}>
                        {statement.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-text-tertiary">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
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

                <div className="flex items-center gap-5">
                  <div className="text-right">
                    <p className="text-xs text-text-tertiary mb-0.5">Net Payable</p>
                    <p className="text-xl font-bold text-gradient-success">
                      {formatCurrency(Number(statement.net_payable))}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => handleDownloadPdf(statement.id, e)}
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    PDF
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="text-center py-16">
          <div className="w-20 h-20 bg-studio-surface rounded-studio-lg flex items-center justify-center mx-auto mb-4">
            <FileText className="w-10 h-10 text-text-tertiary" />
          </div>
          <h3 className="text-base font-semibold text-text-primary mb-2">No statements yet</h3>
          <p className="text-sm text-text-tertiary">
            Your royalty statements will appear here once they're generated.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
