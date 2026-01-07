import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, MoreHorizontal, FileText, X } from 'lucide-react';
import type { Deal, DealCreate } from '@musicpub/types';
import { dealsApi } from '@/lib/api';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/Button';
import { DealFormModal } from './DealFormModal';
import { DealDetailDrawer } from './DealDetailDrawer';
import { formatCurrency, formatDate } from '@/lib/utils';

export function DealsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dealTypeFilter, setDealTypeFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [page, setPage] = useState(1);

  const { data: dealsData, isLoading } = useQuery({
    queryKey: ['deals', { search: searchQuery, status: statusFilter, deal_type: dealTypeFilter, page }],
    queryFn: () =>
      dealsApi.listDeals({
        search: searchQuery || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        deal_type: dealTypeFilter !== 'all' ? dealTypeFilter : undefined,
        skip: (page - 1) * 25,
        limit: 25,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (data: DealCreate) => dealsApi.createDeal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      setIsCreateModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => dealsApi.deleteDeal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });

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
    mechanical_license: 'Mechanical',
  };

  const columns = [
    {
      key: 'deal_number',
      header: 'Deal',
      cell: (deal: Deal) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-notion-blue-bg rounded-notion flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-notion-blue-text" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-notion-text truncate">{deal.deal_number}</div>
            <div className="text-[11px] text-notion-text-tertiary">
              {deal.songwriter?.legal_name || 'Unknown'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'deal_type',
      header: 'Type',
      cell: (deal: Deal) => (
        <span className="tag bg-notion-purple-bg text-notion-purple-text">
          {dealTypeLabels[deal.deal_type] || deal.deal_type}
        </span>
      ),
    },
    {
      key: 'shares',
      header: 'Shares',
      cell: (deal: Deal) => (
        <div className="text-xs text-notion-text-secondary">
          <span className="font-medium">{deal.publisher_share}%</span>
          <span className="text-notion-text-tertiary"> / </span>
          <span className="font-medium">{deal.writer_share}%</span>
        </div>
      ),
    },
    {
      key: 'advance',
      header: 'Advance',
      cell: (deal: Deal) => (
        <span className="text-xs text-notion-text-secondary">
          {formatCurrency(Number(deal.advance_amount))}
        </span>
      ),
    },
    {
      key: 'dates',
      header: 'Term',
      cell: (deal: Deal) => (
        <div className="text-xs text-notion-text-secondary">
          {formatDate(deal.effective_date)}
          {deal.expiration_date && (
            <>
              <span className="text-notion-text-tertiary"> - </span>
              {formatDate(deal.expiration_date)}
            </>
          )}
        </div>
      ),
    },
    {
      key: 'works',
      header: 'Works',
      cell: (deal: Deal) => (
        <span className="tag bg-notion-gray-bg text-notion-gray-text">
          {deal.works_count || 0} work{(deal.works_count || 0) !== 1 ? 's' : ''}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (deal: Deal) => (
        <span className={`tag ${statusStyles[deal.status] || statusStyles.draft}`}>
          {deal.status.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-10',
      cell: (deal: Deal) => (
        <div className="relative group">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Are you sure you want to delete this deal?')) {
                deleteMutation.mutate(deal.id);
              }
            }}
            className="opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-notion-blue-bg rounded-notion-md flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-notion-blue-text" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-notion-text">Deals</h1>
            <p className="text-xs text-notion-text-secondary mt-0.5">
              Manage publishing agreements and contracts
            </p>
          </div>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          New
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-notion-text-tertiary" />
          <input
            type="text"
            placeholder="Search deals..."
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
          <option value="draft">Draft</option>
          <option value="pending_signature">Pending</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="terminated">Terminated</option>
        </select>
        <select
          value={dealTypeFilter}
          onChange={(e) => {
            setDealTypeFilter(e.target.value);
            setPage(1);
          }}
          className="select-base w-40"
        >
          <option value="all">All Types</option>
          <option value="publishing">Publishing</option>
          <option value="co_publishing">Co-Publishing</option>
          <option value="administration">Administration</option>
          <option value="sub_publishing">Sub-Publishing</option>
          <option value="sync_license">Sync License</option>
          <option value="mechanical_license">Mechanical</option>
        </select>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={dealsData?.items || []}
        isLoading={isLoading}
        pagination={{
          page,
          totalPages: Math.ceil((dealsData?.total || 0) / 25),
          onPageChange: setPage,
        }}
        onRowClick={(deal) => setSelectedDeal(deal)}
      />

      {/* Create Modal */}
      <DealFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />

      {/* Detail Drawer */}
      <DealDetailDrawer
        deal={selectedDeal}
        isOpen={!!selectedDeal}
        onClose={() => setSelectedDeal(null)}
      />
    </div>
  );
}
