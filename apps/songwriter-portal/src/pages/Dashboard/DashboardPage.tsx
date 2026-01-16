import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, Music, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuthStore } from '@/stores/auth';
import { royaltiesApi } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function AnimatedNumber({ value, prefix = '' }: { value: number; prefix?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {prefix}{value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </motion.span>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="glass-elevated px-3 py-2 rounded-studio">
        <p className="text-xs text-text-tertiary mb-1">{label}</p>
        <p className="text-sm font-semibold text-text-primary">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
}

export function DashboardPage() {
  const songwriter = useAuthStore((state) => state.songwriter);

  const { data: summary, isLoading } = useQuery({
    queryKey: ['royalty-summary', songwriter?.id],
    queryFn: () => royaltiesApi.getSongwriterSummary(songwriter!.id),
    enabled: !!songwriter?.id,
  });

  const { data: topWorks, isLoading: loadingWorks } = useQuery({
    queryKey: ['top-works', songwriter?.id],
    queryFn: () => royaltiesApi.getTopPerformingWorks(songwriter!.id, 5),
    enabled: !!songwriter?.id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-studio-surface rounded-studio w-1/3 shimmer" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-studio-surface rounded-studio-md shimmer" />
          ))}
        </div>
      </div>
    );
  }

  const chartData = summary?.monthly_earnings?.slice(-6).map((month) => ({
    month: month.month.split('-')[1],
    amount: Number(month.amount),
  })) || [];

  const revenueData = summary?.revenue_by_source?.slice(0, 5).map((source) => ({
    name: source.source,
    amount: Number(source.amount),
    percentage: Number(source.percentage),
  })) || [];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-semibold text-text-primary">
          Welcome back, {songwriter?.stage_name || songwriter?.legal_name}
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Here's an overview of your royalty earnings
        </p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* This Quarter */}
        <div className="glass-card p-5 glow-hover">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 gradient-success rounded-studio-md flex items-center justify-center shadow-glow-emerald">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs text-text-secondary font-medium">This Quarter</span>
          </div>
          <div className="text-2xl font-bold text-gradient-earnings">
            <AnimatedNumber value={Number(summary?.current_quarter_earnings || 0)} prefix="$" />
          </div>
          {summary?.quarter_change !== undefined && summary.quarter_change !== null && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${Number(summary.quarter_change) >= 0 ? 'text-accent-emerald' : 'text-status-error'}`}>
              {Number(summary.quarter_change) >= 0 ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              {Math.abs(Number(summary.quarter_change)).toFixed(1)}% vs last quarter
            </div>
          )}
        </div>

        {/* Year to Date */}
        <div className="glass-card p-5 glow-hover">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 gradient-streaming rounded-studio-md flex items-center justify-center shadow-glow-cyan">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs text-text-secondary font-medium">Year to Date</span>
          </div>
          <div className="text-2xl font-bold text-text-primary">
            <AnimatedNumber value={Number(summary?.ytd_earnings || 0)} prefix="$" />
          </div>
        </div>

        {/* Pending Payout */}
        <div className="glass-card p-5 glow-emerald-hover" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/20 rounded-studio-md flex items-center justify-center">
              <Calendar className="w-5 h-5 text-accent-emerald" />
            </div>
            <span className="text-xs text-accent-emerald-light font-medium">Pending Payout</span>
          </div>
          <div className="text-2xl font-bold text-accent-emerald-light">
            <AnimatedNumber value={Number(summary?.pending_payout || 0)} prefix="$" />
          </div>
          {summary?.next_payment_date && (
            <p className="text-xs text-accent-emerald mt-2">
              Next: {new Date(summary.next_payment_date).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Active Works */}
        <div className="glass-card p-5 glow-hover">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 gradient-purple rounded-studio-md flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs text-text-secondary font-medium">Active Works</span>
          </div>
          <div className="text-2xl font-bold text-text-primary">
            {summary?.active_works_count || 0}
          </div>
        </div>
      </motion.div>

      {/* Charts Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Earnings Chart */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Monthly Earnings</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" vertical={false} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#earningsGradient)"
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by Source */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Revenue by Source</h3>
          <div className="space-y-4">
            {revenueData.map((source, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-text-secondary">{source.name}</span>
                  <span className="text-text-primary font-medium">{formatCurrency(source.amount)}</span>
                </div>
                <div className="h-2 bg-studio-surface rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${source.percentage}%` }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${
                        index === 0 ? '#6366f1' : index === 1 ? '#8b5cf6' : index === 2 ? '#06b6d4' : index === 3 ? '#10b981' : '#f59e0b'
                      }, ${
                        index === 0 ? '#8b5cf6' : index === 1 ? '#a78bfa' : index === 2 ? '#22d3ee' : index === 3 ? '#34d399' : '#fbbf24'
                      })`,
                    }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Top Performing Works */}
      <motion.div variants={itemVariants} className="glass-card p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Top Performing Works</h3>
        {loadingWorks ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-studio-surface rounded-studio shimmer" />
            ))}
          </div>
        ) : topWorks && topWorks.length > 0 ? (
          <div className="space-y-3">
            {topWorks.map((work, index) => (
              <motion.div
                key={work.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 bg-studio-surface-hover rounded-studio-md hover:bg-studio-surface-elevated transition-all duration-200 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 gradient-purple rounded-studio flex items-center justify-center text-sm font-bold text-white shadow-glow-sm group-hover:shadow-glow-md transition-shadow">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{work.title}</p>
                    <p className="text-xs text-text-tertiary">
                      {formatNumber(work.total_plays)} plays
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gradient-earnings">
                    {formatCurrency(Number(work.total_royalties))}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-tertiary p-4 text-center">
            No performance data available yet.
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
