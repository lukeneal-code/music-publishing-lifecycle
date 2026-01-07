import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, MoreHorizontal, Music, X } from 'lucide-react';
import type { Work, WorkCreate } from '@musicpub/types';
import { worksApi } from '@/lib/api';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/Button';
import { WorkFormModal } from './WorkFormModal';
import { WorkDetailDrawer } from './WorkDetailDrawer';

export function WorksPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [page, setPage] = useState(1);

  const { data: worksData, isLoading } = useQuery({
    queryKey: ['works', { search: searchQuery, status: statusFilter, page }],
    queryFn: () =>
      worksApi.listWorks({
        search: searchQuery || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        skip: (page - 1) * 25,
        limit: 25,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (data: WorkCreate) => worksApi.createWork(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['works'] });
      setIsCreateModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => worksApi.deleteWork(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['works'] });
    },
  });

  const columns = [
    {
      key: 'title',
      header: 'Title',
      cell: (work: Work) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-notion-purple-bg rounded-notion flex items-center justify-center flex-shrink-0">
            <Music className="w-4 h-4 text-notion-purple-text" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-notion-text truncate">{work.title}</div>
            {work.iswc && (
              <div className="text-[11px] text-notion-text-tertiary">ISWC: {work.iswc}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'genre',
      header: 'Genre',
      cell: (work: Work) => (
        <span className="text-xs text-notion-text-secondary">{work.genre || '—'}</span>
      ),
    },
    {
      key: 'writers',
      header: 'Writers',
      cell: (work: Work) => (
        <span className="tag bg-notion-gray-bg text-notion-gray-text">
          {work.writers_count} writer{work.writers_count !== 1 ? 's' : ''}
        </span>
      ),
    },
    {
      key: 'recordings',
      header: 'Recordings',
      cell: (work: Work) => (
        <span className="tag bg-notion-blue-bg text-notion-blue-text">
          {work.recordings_count} recording{work.recordings_count !== 1 ? 's' : ''}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (work: Work) => {
        const statusStyles = {
          active: 'bg-notion-green-bg text-notion-green-text',
          disputed: 'bg-notion-red-bg text-notion-red-text',
          inactive: 'bg-notion-gray-bg text-notion-gray-text',
        };
        return (
          <span className={`tag ${statusStyles[work.status as keyof typeof statusStyles] || statusStyles.inactive}`}>
            {work.status}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'w-10',
      cell: (work: Work) => (
        <div className="relative group">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Are you sure you want to delete this work?')) {
                deleteMutation.mutate(work.id);
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
          <div className="w-10 h-10 bg-notion-purple-bg rounded-notion-md flex items-center justify-center flex-shrink-0">
            <Music className="w-5 h-5 text-notion-purple-text" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-notion-text">Works</h1>
            <p className="text-xs text-notion-text-secondary mt-0.5">
              Manage your music catalog
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
            placeholder="Search works..."
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
          className="select-base w-32"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="disputed">Disputed</option>
        </select>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={worksData?.items || []}
        isLoading={isLoading}
        pagination={{
          page,
          totalPages: Math.ceil((worksData?.total || 0) / 25),
          onPageChange: setPage,
        }}
        onRowClick={(work) => setSelectedWork(work)}
      />

      {/* Create Modal */}
      <WorkFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />

      {/* Detail Drawer */}
      <WorkDetailDrawer
        work={selectedWork}
        isOpen={!!selectedWork}
        onClose={() => setSelectedWork(null)}
      />
    </div>
  );
}
