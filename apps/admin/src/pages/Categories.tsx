import React, { useState, useEffect } from 'react';
import { Layers, Plus, Trash2, FolderTree } from 'lucide-react';
import axios from 'axios';

export const Categories: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadCategories = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/categories');
      setCategories(res.data || []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('admin_token');
      await axios.post(
        'http://localhost:3000/api/categories',
        {
          name: name.trim(),
          sortOrder: parseInt(sortOrder, 10) || 0,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setName('');
      loadCategories();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this category?')) return;
    try {
      const token = localStorage.getItem('admin_token');
      await axios.delete(`http://localhost:3000/api/categories/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      loadCategories();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2">
          <FolderTree className="w-7 h-7 text-sky-400" />
          <span>Product Category Manager</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          Organize supermarket items into departments and display categories
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Create Category Form */}
        <div className="col-span-4 bg-admin-surface border border-admin-border rounded-2xl p-5 shadow space-y-4">
          <div className="flex items-center space-x-2 font-bold text-white text-sm">
            <Plus className="w-4 h-4 text-sky-400" />
            <span>Add New Category</span>
          </div>

          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Category Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Frozen Foods"
                required
                className="w-full px-3 py-2 bg-slate-900 border border-admin-border rounded-xl text-sm text-white outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Sort Order (Rank)</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-admin-border rounded-xl text-sm font-mono text-white outline-none focus:border-sky-500"
              />
            </div>

            {error && (
              <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 p-2 rounded-xl text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow"
            >
              {loading ? 'Creating...' : 'Create Category'}
            </button>
          </form>
        </div>

        {/* Categories Table */}
        <div className="col-span-8 bg-admin-surface border border-admin-border rounded-2xl overflow-hidden shadow">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/80 text-slate-400 uppercase border-b border-admin-border">
              <tr>
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4">Category Name</th>
                <th className="py-3 px-4 text-center">Products Count</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3 px-4 font-bold text-sky-400">#{c.sortOrder}</td>
                  <td className="py-3 px-4 font-bold text-white text-sm">{c.name}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                      {c._count?.products || 0} SKUs
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                      title="Deactivate Category"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
