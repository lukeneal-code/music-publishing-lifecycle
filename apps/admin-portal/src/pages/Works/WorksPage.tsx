import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, Music, X } from 'lucide-react';
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
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Music className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{work.title}</div>
            {work.iswc && <div className="text-sm text-gray-500">ISWC: {work.iswc}</div>}
          </div>
        </div>
      ),
    },
    {
      key: 'genre',
      header: 'Genre',
      cell: (work: Work) => (
        <span className="text-sm text-gray-600">{work.genre || '-'}</span>
      ),
    },
    {
      key: 'writers',
      header: 'Writers',
      cell: (work: Work) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {work.writers_count} writers
        </span>
      ),
    },
    {
      key: 'recordings',
      header: 'Recordings',
      cell: (work: Work) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {work.recordings_count} recordings
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (work: Work) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            work.status === 'active'
              ? 'bg-green-100 text-green-800'
              : work.status === 'disputed'
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-800'
          }`}
        >
          {work.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (work: Work) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSelectedWork(work)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Are you sure you want to delete this work?')) {
                deleteMutation.mutate(work.id);
              }
            }}
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Works</h1>
          <p className="text-gray-500">Manage your music catalog</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Work
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search works..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
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
