import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import type { DealCreate } from '@musicpub/types';
import { Button } from '@/components/Button';
import { dealsApi } from '@/lib/api';

interface DealFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DealCreate) => void;
  isLoading?: boolean;
}

const TERRITORIES = [
  { value: 'WORLD', label: 'Worldwide' },
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'UK', label: 'United Kingdom' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'AU', label: 'Australia' },
  { value: 'JP', label: 'Japan' },
];

export function DealFormModal({ isOpen, onClose, onSubmit, isLoading }: DealFormModalProps) {
  const [formData, setFormData] = useState<Partial<DealCreate>>({
    deal_number: '',
    songwriter_id: '',
    deal_type: 'publishing',
    advance_amount: 0,
    publisher_share: 50,
    writer_share: 50,
    effective_date: new Date().toISOString().split('T')[0],
    term_months: 36,
    territories: ['WORLD'],
    rights_granted: ['ALL'],
  });

  const { data: songwriters } = useQuery({
    queryKey: ['songwriters'],
    queryFn: () => dealsApi.listSongwriters(),
    enabled: isOpen,
  });

  // Generate deal number on mount
  useEffect(() => {
    if (isOpen && !formData.deal_number) {
      const year = new Date().getFullYear();
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      setFormData(prev => ({ ...prev, deal_number: `DEAL-${year}-${random}` }));
    }
  }, [isOpen]);

  // Validate shares sum to 100
  const handleShareChange = (field: 'publisher_share' | 'writer_share', value: number) => {
    const otherField = field === 'publisher_share' ? 'writer_share' : 'publisher_share';
    const otherValue = 100 - value;
    setFormData(prev => ({
      ...prev,
      [field]: value,
      [otherField]: otherValue >= 0 ? otherValue : prev[otherField],
    }));
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.deal_number || !formData.songwriter_id) return;

    onSubmit({
      deal_number: formData.deal_number,
      songwriter_id: formData.songwriter_id,
      deal_type: formData.deal_type as DealCreate['deal_type'],
      advance_amount: formData.advance_amount,
      publisher_share: formData.publisher_share!,
      writer_share: formData.writer_share!,
      effective_date: formData.effective_date!,
      expiration_date: formData.expiration_date,
      term_months: formData.term_months,
      territories: formData.territories,
      rights_granted: formData.rights_granted,
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto py-8">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-notion-lg shadow-notion-popup w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-notion-border-light">
          <h2 className="text-sm font-semibold text-notion-text">Create New Deal</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-notion text-notion-text-tertiary hover:bg-notion-bg-hover hover:text-notion-text-secondary transition-colors duration-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[70vh] overflow-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-notion-text mb-1.5">
                Deal Number <span className="text-notion-red-text">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.deal_number}
                onChange={(e) => setFormData({ ...formData, deal_number: e.target.value })}
                className="input-base"
                placeholder="DEAL-2024-001"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-notion-text mb-1.5">
                Deal Type <span className="text-notion-red-text">*</span>
              </label>
              <select
                required
                value={formData.deal_type}
                onChange={(e) => setFormData({ ...formData, deal_type: e.target.value as DealCreate['deal_type'] })}
                className="select-base"
              >
                <option value="publishing">Publishing</option>
                <option value="co_publishing">Co-Publishing</option>
                <option value="administration">Administration</option>
                <option value="sub_publishing">Sub-Publishing</option>
                <option value="sync_license">Sync License</option>
                <option value="mechanical_license">Mechanical License</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-notion-text mb-1.5">
              Songwriter <span className="text-notion-red-text">*</span>
            </label>
            <select
              required
              value={formData.songwriter_id}
              onChange={(e) => setFormData({ ...formData, songwriter_id: e.target.value })}
              className="select-base"
            >
              <option value="">Select songwriter...</option>
              {songwriters?.map((songwriter) => (
                <option key={songwriter.id} value={songwriter.id}>
                  {songwriter.legal_name}
                  {songwriter.stage_name && ` (${songwriter.stage_name})`}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-notion-text mb-1.5">
                Publisher Share (%) <span className="text-notion-red-text">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                max="100"
                value={formData.publisher_share}
                onChange={(e) => handleShareChange('publisher_share', Number(e.target.value))}
                className="input-base"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-notion-text mb-1.5">
                Writer Share (%) <span className="text-notion-red-text">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                max="100"
                value={formData.writer_share}
                onChange={(e) => handleShareChange('writer_share', Number(e.target.value))}
                className="input-base"
              />
            </div>
          </div>

          {(formData.publisher_share || 0) + (formData.writer_share || 0) !== 100 && (
            <p className="text-xs text-notion-red-text">Shares must sum to 100%</p>
          )}

          <div>
            <label className="block text-xs font-medium text-notion-text mb-1.5">
              Advance Amount ($)
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              value={formData.advance_amount}
              onChange={(e) => setFormData({ ...formData, advance_amount: Number(e.target.value) })}
              className="input-base"
              placeholder="0"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-notion-text mb-1.5">
                Effective Date <span className="text-notion-red-text">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.effective_date}
                onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                className="input-base"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-notion-text mb-1.5">
                Expiration Date
              </label>
              <input
                type="date"
                value={formData.expiration_date || ''}
                onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value || undefined })}
                className="input-base"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-notion-text mb-1.5">
              Term (months)
            </label>
            <input
              type="number"
              min="1"
              value={formData.term_months || ''}
              onChange={(e) => setFormData({ ...formData, term_months: e.target.value ? Number(e.target.value) : undefined })}
              className="input-base"
              placeholder="36"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-notion-text mb-1.5">
              Territories
            </label>
            <div className="flex flex-wrap gap-2">
              {TERRITORIES.map((territory) => (
                <label
                  key={territory.value}
                  className={`inline-flex items-center px-2 py-1 rounded-notion text-xs cursor-pointer transition-colors ${
                    formData.territories?.includes(territory.value)
                      ? 'bg-notion-blue-bg text-notion-blue-text'
                      : 'bg-notion-bg-secondary text-notion-text-secondary hover:bg-notion-bg-tertiary'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={formData.territories?.includes(territory.value)}
                    onChange={(e) => {
                      const newTerritories = e.target.checked
                        ? [...(formData.territories || []), territory.value]
                        : (formData.territories || []).filter(t => t !== territory.value);
                      setFormData({ ...formData, territories: newTerritories });
                    }}
                  />
                  {territory.label}
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading ||
                !formData.deal_number ||
                !formData.songwriter_id ||
                (formData.publisher_share || 0) + (formData.writer_share || 0) !== 100
              }
            >
              {isLoading ? 'Creating...' : 'Create Deal'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
