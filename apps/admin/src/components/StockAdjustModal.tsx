import React, { useState } from 'react';
import { X, RefreshCw, Check } from 'lucide-react';
import axios from 'axios';

interface StockAdjustModalProps {
  product: any;
  branchId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const StockAdjustModal: React.FC<StockAdjustModalProps> = ({
  product,
  branchId,
  onClose,
  onSuccess,
}) => {
  const [qtyDelta, setQtyDelta] = useState('0');
  const [reason, setReason] = useState('Shelf count discrepancy');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentStock = Number(product.stocks?.[0]?.quantity || 0);
  const deltaNum = parseFloat(qtyDelta) || 0;
  const newStock = currentStock + deltaNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deltaNum === 0) {
      setError('Adjustment quantity cannot be 0');
      return;
    }
    if (!reason.trim()) {
      setError('Reason is mandatory for inventory audit trail');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('admin_token');
      await axios.post(
        'http://localhost:3000/api/products/stock/adjust',
        {
          branchId,
          productId: product.id,
          qtyDelta: deltaNum,
          reason,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to adjust stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-admin-surface border border-admin-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="px-6 py-4 bg-slate-900 flex justify-between items-center border-b border-admin-border">
          <div className="flex items-center space-x-2 font-bold text-lg text-white">
            <RefreshCw className="w-5 h-5 text-amber-400" />
            <span>Stock Adjustment (Audit Logged)</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <div className="text-xs text-slate-400 font-mono">Product</div>
            <div className="text-base font-bold text-white mt-0.5">{product.name}</div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-900/60 rounded-xl border border-admin-border text-center font-mono">
            <div>
              <span className="text-[11px] text-slate-400">CURRENT STOCK</span>
              <div className="text-lg font-bold text-slate-200">{currentStock}</div>
            </div>
            <div>
              <span className="text-[11px] text-slate-400">NEW PROJECTED</span>
              <div className={`text-lg font-bold ${newStock < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {newStock}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">
              Quantity Adjustment (+ to increase, - to decrease) *
            </label>
            <input
              type="number"
              step="0.01"
              value={qtyDelta}
              onChange={(e) => setQtyDelta(e.target.value)}
              placeholder="e.g. -5 or +10"
              required
              autoFocus
              className="w-full px-3 py-2 bg-slate-900 border border-admin-border rounded-xl text-base font-mono font-bold text-white outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">
              Audit Reason (Mandatory) *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-admin-border rounded-xl text-xs text-slate-200 outline-none focus:border-blue-500 mb-2"
            >
              <option value="Shelf count discrepancy">Shelf count discrepancy</option>
              <option value="Damaged / Broken goods write-off">Damaged / Broken goods write-off</option>
              <option value="Expired product disposal">Expired product disposal</option>
              <option value="Supplier delivery correction">Supplier delivery correction</option>
              <option value="Customer return restock">Customer return restock</option>
            </select>
          </div>

          {error && (
            <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 p-2 rounded-xl text-center">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-3 border-t border-admin-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Updating...' : 'Confirm Adjustment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
