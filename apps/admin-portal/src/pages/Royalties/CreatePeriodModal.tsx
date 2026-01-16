import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { RoyaltyPeriod } from '@musicpub/types';
import { Button } from '@/components/Button';

interface CreatePeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<RoyaltyPeriod>) => void;
  isLoading?: boolean;
}

export function CreatePeriodModal({ isOpen, onClose, onSubmit, isLoading }: CreatePeriodModalProps) {
  const [formData, setFormData] = useState({
    period_code: '',
    period_type: 'quarterly' as 'monthly' | 'quarterly' | 'annual',
    start_date: '',
    end_date: '',
  });

  // Auto-generate period code based on type and dates
  useEffect(() => {
    if (formData.start_date && formData.period_type) {
      const startDate = new Date(formData.start_date);
      const year = startDate.getFullYear();
      const month = startDate.getMonth() + 1;

      let code = '';
      if (formData.period_type === 'monthly') {
        code = `${year}_M${month.toString().padStart(2, '0')}`;
      } else if (formData.period_type === 'quarterly') {
        const quarter = Math.ceil(month / 3);
        code = `${year}_Q${quarter}`;
      } else {
        code = `${year}_ANNUAL`;
      }

      setFormData(prev => ({ ...prev, period_code: code }));
    }
  }, [formData.start_date, formData.period_type]);

  // Auto-set end date based on period type
  useEffect(() => {
    if (formData.start_date && formData.period_type) {
      const startDate = new Date(formData.start_date);
      let endDate: Date;

      if (formData.period_type === 'monthly') {
        endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      } else if (formData.period_type === 'quarterly') {
        const quarterEnd = Math.ceil((startDate.getMonth() + 1) / 3) * 3;
        endDate = new Date(startDate.getFullYear(), quarterEnd, 0);
      } else {
        endDate = new Date(startDate.getFullYear(), 11, 31);
      }

      setFormData(prev => ({ ...prev, end_date: endDate.toISOString().split('T')[0] }));
    }
  }, [formData.start_date, formData.period_type]);

  // Set default start date to beginning of current quarter
  useEffect(() => {
    if (isOpen && !formData.start_date) {
      const now = new Date();
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      setFormData(prev => ({
        ...prev,
        start_date: quarterStart.toISOString().split('T')[0],
      }));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.period_code || !formData.start_date || !formData.end_date) return;
    onSubmit(formData);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto py-8">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-notion-lg shadow-notion-popup w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-notion-border-light">
          <h2 className="text-sm font-semibold text-notion-text">Create Royalty Period</h2>
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
              Period Type <span className="text-notion-red-text">*</span>
            </label>
            <select
              required
              value={formData.period_type}
              onChange={(e) => setFormData({ ...formData, period_type: e.target.value as 'monthly' | 'quarterly' | 'annual' })}
              className="select-base"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-notion-text mb-1.5">
                Start Date <span className="text-notion-red-text">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="input-base"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-notion-text mb-1.5">
                End Date <span className="text-notion-red-text">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="input-base"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-notion-text mb-1.5">
              Period Code <span className="text-notion-red-text">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.period_code}
              onChange={(e) => setFormData({ ...formData, period_code: e.target.value })}
              className="input-base"
              placeholder="2024_Q1"
            />
            <p className="mt-1 text-[11px] text-notion-text-tertiary">
              Auto-generated based on period type and dates
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.period_code || !formData.start_date || !formData.end_date}
            >
              {isLoading ? 'Creating...' : 'Create Period'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
