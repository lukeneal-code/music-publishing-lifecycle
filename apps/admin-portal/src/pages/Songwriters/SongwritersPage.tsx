import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Users, X } from 'lucide-react';
import type { Songwriter } from '@musicpub/types';
import { royaltiesApi } from '@/lib/api';
import { DataTable } from '@/components/DataTable';
import { SongwriterDetailDrawer } from './SongwriterDetailDrawer';

export function SongwritersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSongwriter, setSelectedSongwriter] = useState<Songwriter | null>(null);
  const [page, setPage] = useState(1);

  const { data: songwriters, isLoading } = useQuery({
    queryKey: ['songwriters', { search: searchQuery, page }],
    queryFn: () =>
      royaltiesApi.listSongwriters({
        search: searchQuery || undefined,
        skip: (page - 1) * 25,
        limit: 25,
      }),
  });

  const columns = [
    {
      key: 'name',
      header: 'Songwriter',
      cell: (songwriter: Songwriter) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-notion-purple-bg rounded-notion flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-notion-purple-text" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-notion-text truncate">{songwriter.legal_name}</div>
            {songwriter.stage_name && (
              <div className="text-[11px] text-notion-text-tertiary">
                "{songwriter.stage_name}"
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'ipi',
      header: 'IPI Number',
      cell: (songwriter: Songwriter) => (
        <span className="text-xs text-notion-text-secondary font-mono">
          {songwriter.ipi_number || '-'}
        </span>
      ),
    },
    {
      key: 'pro',
      header: 'PRO Affiliation',
      cell: (songwriter: Songwriter) => (
        songwriter.pro_affiliation ? (
          <span className="tag bg-notion-blue-bg text-notion-blue-text">
            {songwriter.pro_affiliation}
          </span>
        ) : (
          <span className="text-xs text-notion-text-tertiary">-</span>
        )
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-notion-purple-bg rounded-notion-md flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-notion-purple-text" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-notion-text">Songwriters</h1>
            <p className="text-xs text-notion-text-secondary mt-0.5">
              Manage songwriter profiles and view royalty information
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-notion-text-tertiary" />
          <input
            type="text"
            placeholder="Search songwriters..."
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
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={songwriters || []}
        isLoading={isLoading}
        pagination={{
          page,
          totalPages: Math.ceil((songwriters?.length || 0) / 25),
          onPageChange: setPage,
        }}
        onRowClick={(songwriter) => setSelectedSongwriter(songwriter)}
      />

      {/* Detail Drawer */}
      <SongwriterDetailDrawer
        songwriter={selectedSongwriter}
        isOpen={!!selectedSongwriter}
        onClose={() => setSelectedSongwriter(null)}
      />
    </div>
  );
}
