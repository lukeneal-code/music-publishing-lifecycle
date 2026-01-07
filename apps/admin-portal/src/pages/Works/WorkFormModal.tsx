import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { WorkCreate } from '@musicpub/types';
import { Button } from '@/components/Button';

interface WorkFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: WorkCreate) => void;
  isLoading?: boolean;
}

export function WorkFormModal({ isOpen, onClose, onSubmit, isLoading }: WorkFormModalProps) {
  const [formData, setFormData] = useState<WorkCreate>({
    title: '',
    iswc: '',
    genre: '',
    language: 'en',
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      iswc: formData.iswc || undefined,
      genre: formData.genre || undefined,
    });
    setFormData({ title: '', iswc: '', genre: '', language: 'en' });
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto py-8">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-notion-lg shadow-notion-popup w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-notion-border-light">
          <h2 className="text-sm font-semibold text-notion-text">Add New Work</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-notion text-notion-text-tertiary hover:bg-notion-bg-hover hover:text-notion-text-secondary transition-colors duration-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-notion-text mb-1.5">
              Title <span className="text-notion-red-text">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input-base"
              placeholder="Enter work title"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-notion-text mb-1.5">ISWC</label>
            <input
              type="text"
              value={formData.iswc}
              onChange={(e) => setFormData({ ...formData, iswc: e.target.value })}
              className="input-base"
              placeholder="T-123.456.789-0"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-notion-text mb-1.5">Genre</label>
              <select
                value={formData.genre}
                onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                className="select-base"
              >
                <option value="">Select genre</option>
                <option value="Pop">Pop</option>
                <option value="Rock">Rock</option>
                <option value="R&B">R&B</option>
                <option value="Hip Hop">Hip Hop</option>
                <option value="Country">Country</option>
                <option value="Jazz">Jazz</option>
                <option value="Electronic">Electronic</option>
                <option value="Classical">Classical</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-notion-text mb-1.5">Language</label>
              <select
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                className="select-base"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-notion-text mb-1.5">
              Duration (seconds)
            </label>
            <input
              type="number"
              value={formData.duration_seconds || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  duration_seconds: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              className="input-base"
              placeholder="e.g., 210"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.title}>
              {isLoading ? 'Creating...' : 'Create Work'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
