import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, DollarSign, Calculator, CheckCircle, Clock, X, Calendar } from 'lucide-react';
import type { RoyaltyPeriod } from '@musicpub/types';
import { royaltiesApi } from '@/lib/api';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/Button';
import { CreatePeriodModal } from './CreatePeriodModal';
import { RoyaltyPeriodDetailDrawer } from './RoyaltyPeriodDetailDrawer';
import { formatCurrency, formatDate } from '@/lib/utils';

export function RoyaltiesPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<RoyaltyPeriod | null>(null);
  const [page, setPage] = useState(1);

  const { data: periodsData, isLoading } = useQuery({
    queryKey: ['royalty-periods', { status: statusFilter, page }],
    queryFn: () =>
      royaltiesApi.listPeriods({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        skip: (page - 1) * 25,
        limit: 25,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<RoyaltyPeriod>) => royaltiesApi.createPeriod(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['royalty-periods'] });
      setIsCreateModalOpen(false);
    },
  });

  const calculateMutation = useMutation({
    mutationFn: (id: string) => royaltiesApi.calculatePeriod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['royalty-periods'] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => royaltiesApi.approvePeriod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['royalty-periods'] });
    },
  });

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

  // Calculate stats
  const stats = {
    total: periodsData?.total || 0,
    open: periodsData?.items?.filter(p => p.status === 'open').length || 0,
    calculated: periodsData?.items?.filter(p => p.status === 'calculated').length || 0,
    approved: periodsData?.items?.filter(p => p.status === 'approved').length || 0,
  };

  const columns = [
    {
      key: 'period_code',
      header: 'Period',
      cell: (period: RoyaltyPeriod & { statements_count?: number }) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-notion-green-bg rounded-notion flex items-center justify-center flex-shrink-0">
            <Calendar className="w-4 h-4 text-notion-green-text" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-notion-text truncate">{period.period_code}</div>
            <div className="text-[11px] text-notion-text-tertiary">
              {periodTypeLabels[period.period_type] || period.period_type}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'dates',
      header: 'Date Range',
      cell: (period: RoyaltyPeriod) => (
        <div className="text-xs text-notion-text-secondary">
          {formatDate(period.start_date)} - {formatDate(period.end_date)}
        </div>
      ),
    },
    {
      key: 'statements',
      header: 'Statements',
      cell: (period: RoyaltyPeriod & { statements_count?: number }) => (
        <span className="tag bg-notion-gray-bg text-notion-gray-text">
          {period.statements_count || 0} statement{(period.statements_count || 0) !== 1 ? 's' : ''}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Total Payable',
      cell: (period: RoyaltyPeriod & { total_net_payable?: number }) => (
        <span className="text-xs font-medium text-notion-text">
          {formatCurrency(period.total_net_payable || 0)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (period: RoyaltyPeriod) => (
        <span className={`tag ${statusStyles[period.status] || statusStyles.open}`}>
          {period.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-32',
      cell: (period: RoyaltyPeriod) => (
        <div className="flex gap-1">
          {period.status === 'open' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                calculateMutation.mutate(period.id);
              }}
              disabled={calculateMutation.isPending}
            >
              <Calculator className="w-3 h-3 mr-1" />
              Calculate
            </Button>
          )}
          {period.status === 'calculated' && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                approveMutation.mutate(period.id);
              }}
              disabled={approveMutation.isPending}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Approve
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-notion-green-bg rounded-notion-md flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-5 h-5 text-notion-green-text" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-notion-text">Royalties</h1>
            <p className="text-xs text-notion-text-secondary mt-0.5">
              Manage royalty periods and generate statements
            </p>
          </div>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          New Period
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-notion-bg-secondary rounded-notion-md">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-notion-text-tertiary" />
            <span className="text-xs text-notion-text-tertiary">Total Periods</span>
          </div>
          <div className="text-2xl font-semibold text-notion-text">{stats.total}</div>
        </div>
        <div className="p-4 bg-notion-bg-secondary rounded-notion-md">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-notion-text-tertiary" />
            <span className="text-xs text-notion-text-tertiary">Open</span>
          </div>
          <div className="text-2xl font-semibold text-notion-text">{stats.open}</div>
        </div>
        <div className="p-4 bg-notion-bg-secondary rounded-notion-md">
          <div className="flex items-center gap-2 mb-2">
            <Calculator className="w-4 h-4 text-notion-text-tertiary" />
            <span className="text-xs text-notion-text-tertiary">Calculated</span>
          </div>
          <div className="text-2xl font-semibold text-notion-text">{stats.calculated}</div>
        </div>
        <div className="p-4 bg-notion-bg-secondary rounded-notion-md">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-notion-text-tertiary" />
            <span className="text-xs text-notion-text-tertiary">Approved</span>
          </div>
          <div className="text-2xl font-semibold text-notion-text">{stats.approved}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-notion-text-tertiary" />
          <input
            type="text"
            placeholder="Search periods..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="input-base pl-8"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-notion-bg-hover"
            >
              <X className="w-3.5 h-3.5 text-notion-text-tertiary" />
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="select-base w-36"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="calculating">Calculating</option>
          <option value="calculated">Calculated</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={periodsData?.items || []}
        isLoading={isLoading}
        pagination={{
          page,
          totalPages: Math.ceil((periodsData?.total || 0) / 25),
          onPageChange: setPage,
        }}
        onRowClick={(period) => setSelectedPeriod(period)}
      />

      {/* Create Modal */}
      <CreatePeriodModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />

      {/* Detail Drawer */}
      <RoyaltyPeriodDetailDrawer
        period={selectedPeriod}
        isOpen={!!selectedPeriod}
        onClose={() => setSelectedPeriod(null)}
      />
    </div>
  );
}
