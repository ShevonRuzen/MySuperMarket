import React, { useState, useEffect } from 'react';
import { X, Plus, Barcode, Save } from 'lucide-react';
import axios from 'axios';

interface AddProductModalProps {
  branchId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  branchId,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [barcode, setBarcode] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [initialStock, setInitialStock] = useState('0');
  const [reorderLevel, setReorderLevel] = useState('10');
  const [shelfLocation, setShelfLocation] = useState('');
  const [isWeighed, setIsWeighed] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await axios.get('http://localhost:3000/api/categories');
        setCategories(res.data || []);
        if (res.data?.length > 0) {
          setCategoryId(res.data[0].id);
        }
      } catch (err) {
        console.error('Error loading categories:', err);
      }
    }
    loadCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) {
      setError('Barcode is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('admin_token');
      await axios.post(
        'http://localhost:3000/api/products',
        {
          name,
          categoryId: categoryId || undefined,
          costPrice: parseFloat(costPrice) || 0,
          sellingPrice: parseFloat(sellingPrice) || 0,
          barcodes: [barcode.trim()],
          branchId,
          reorderLevel: parseInt(reorderLevel, 10) || 10,
          shelfLocation: shelfLocation || undefined,
          initialStock: parseFloat(initialStock) || 0,
          isWeighed,
          unit: isWeighed ? 'KG' : 'EACH',
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-admin-surface border border-admin-border rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
        <div className="px-6 py-4 bg-slate-900 flex justify-between items-center border-b border-admin-border">
          <div className="flex items-center space-x-2 font-bold text-lg text-white">
            <Plus className="w-5 h-5 text-blue-400" />
            <span>Add New Product to Catalog</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-mono text-slate-400 mb-1">Product Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Anchor Salted Butter 227g"
                required
                className="w-full px-3 py-2 bg-slate-900 border border-admin-border rounded-xl text-sm text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Primary Barcode *</label>
              <div className="relative">
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Scan or type barcode"
                  required
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-admin-border rounded-xl text-sm font-mono text-white outline-none focus:border-blue-500"
                />
                <Barcode className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-admin-border rounded-xl text-sm text-slate-200 outline-none focus:border-blue-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Cost Price (LKR)</label>
              <input
                type="number"
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="0.00"
                required
                className="w-full px-3 py-2 bg-slate-900 border border-admin-border rounded-xl text-sm font-mono text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Selling Price (LKR) *</label>
              <input
                type="number"
                step="0.01"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="0.00"
                required
                className="w-full px-3 py-2 bg-slate-900 border border-admin-border rounded-xl text-sm font-mono text-emerald-400 font-bold outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Initial Stock Qty</label>
              <input
                type="number"
                step="0.01"
                value={initialStock}
                onChange={(e) => setInitialStock(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-admin-border rounded-xl text-sm font-mono text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Reorder Alert Level</label>
              <input
                type="number"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-admin-border rounded-xl text-sm font-mono text-white outline-none focus:border-blue-500"
              />
            </div>

            <div className="col-span-2 flex items-center space-x-3 p-3 bg-slate-900/60 rounded-xl border border-admin-border">
              <input
                type="checkbox"
                id="isWeighed"
                checked={isWeighed}
                onChange={(e) => setIsWeighed(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700"
              />
              <label htmlFor="isWeighed" className="text-xs text-slate-300 font-medium cursor-pointer">
                Weighed Item (Requires digital scale calculation on checkout, e.g. Vegetables / Fruits / Meat)
              </label>
            </div>
          </div>

          {error && (
            <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 p-2.5 rounded-xl text-center">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-admin-border">
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
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Save Product'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
