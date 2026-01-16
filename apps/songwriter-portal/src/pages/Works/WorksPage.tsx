import { useQuery } from '@tanstack/react-query';
import { Music, Play, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/auth';
import { royaltiesApi } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
};

export function WorksPage() {
  const songwriter = useAuthStore((state) => state.songwriter);

  const { data: topWorks, isLoading } = useQuery({
    queryKey: ['all-works', songwriter?.id],
    queryFn: () => royaltiesApi.getTopPerformingWorks(songwriter!.id, 50),
    enabled: !!songwriter?.id,
  });

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-start gap-4">
        <div className="w-12 h-12 gradient-purple rounded-studio-md flex items-center justify-center flex-shrink-0 shadow-glow-sm">
          <Music className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">My Works</h1>
          <p className="text-sm text-text-secondary mt-1">
            View your catalog and performance metrics
          </p>
        </div>
      </motion.div>

      {/* Works List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 bg-studio-surface rounded-studio-md shimmer" />
          ))}
        </div>
      ) : topWorks && topWorks.length > 0 ? (
        <motion.div variants={containerVariants} className="space-y-3">
          {topWorks.map((work, index) => (
            <motion.div
              key={work.id}
              variants={itemVariants}
              className="glass-card p-5 hover:bg-studio-surface-hover transition-all duration-200 group glow-hover"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-studio-surface-elevated rounded-studio-md flex items-center justify-center text-base font-bold text-accent-violet shadow-glow-sm group-hover:shadow-glow-md transition-shadow">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-text-primary">
                      {work.title}
                    </h3>
                    <div className="flex items-center gap-4 mt-1.5">
                      {work.iswc && (
                        <span className="text-xs text-text-tertiary">
                          ISWC: {work.iswc}
                        </span>
                      )}
                      {work.genre && (
                        <span className="tag text-[10px] status-draft">
                          {work.genre}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <div className="flex items-center gap-1.5 text-text-tertiary mb-1">
                      <Play className="w-3.5 h-3.5" />
                      <span className="text-xs">Plays</span>
                    </div>
                    <p className="text-base font-bold text-text-primary">
                      {formatNumber(work.total_plays)}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-1.5 text-text-tertiary mb-1">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span className="text-xs">Royalties</span>
                    </div>
                    <p className="text-base font-bold text-gradient-success">
                      {formatCurrency(Number(work.total_royalties))}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="text-center py-16">
          <div className="w-20 h-20 bg-studio-surface rounded-studio-lg flex items-center justify-center mx-auto mb-4">
            <Music className="w-10 h-10 text-text-tertiary" />
          </div>
          <h3 className="text-base font-semibold text-text-primary mb-2">No works yet</h3>
          <p className="text-sm text-text-tertiary">
            Your registered works will appear here.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
