import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Upload,
  Search,
  RefreshCw,
  AlertTriangle,
  Scale,
} from 'lucide-react';
import axios from 'axios';
import { AddProductModal } from '../components/AddProductModal';
import { StockAdjustModal } from '../components/StockAdjustModal';
import { BulkImportModal } from '../components/BulkImportModal';

export const Products: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<any | null>(null);

  const branchId = 'demo-branch'; // Colombo 07

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        axios.get('http://localhost:3000/api/products'),
        axios.get('http://localhost:3000/api/categories'),
      ]);
      setProducts(productsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = products.filter((p) => {
    const matchesCategory =
      selectedCategory === 'ALL' || p.categoryId === selectedCategory;
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcodes?.some((b: any) => b.barcode.includes(search));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header and Action Buttons */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2">
            <Package className="w-7 h-7 text-blue-400" />
            <span>Product Catalog & Stock Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Manage master SKUs, multiple barcodes, retail prices, and inventory levels
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center space-x-2 shadow transition"
          >
            <Upload className="w-4 h-4 text-sky-400" />
            <span>Bulk CSV Import</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg shadow-blue-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-admin-surface border border-admin-border rounded-2xl flex justify-between items-center gap-4">
        <div className="flex items-center space-x-2 flex-1 max-w-md bg-slate-900 border border-admin-border rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name or scan barcode..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 outline-none"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono text-slate-400">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-900 border border-admin-border rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 outline-none"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Data Table */}
      <div className="bg-admin-surface border border-admin-border rounded-2xl overflow-hidden shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/80 text-slate-400 uppercase border-b border-admin-border">
              <tr>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Barcodes</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Cost (LKR)</th>
                <th className="py-3 px-4 text-right">Selling (LKR)</th>
                <th className="py-3 px-4 text-center">Stock Level</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No products found matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((prod) => {
                  const stock = Number(prod.stocks?.[0]?.quantity || 0);
                  const reorder = Number(prod.branchProducts?.[0]?.reorderLevel || 10);
                  const isLow = stock <= reorder;

                  return (
                    <tr key={prod.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4 font-bold text-white flex items-center space-x-2">
                        <span>{prod.name}</span>
                        {prod.isWeighed && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] flex items-center space-x-0.5">
                            <Scale className="w-3 h-3" />
                            <span>KG</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sky-400">
                        {prod.barcodes?.map((b: any) => b.barcode).join(', ') || 'No barcode'}
                      </td>
                      <td className="py-3 px-4 text-slate-400">{prod.category?.name || 'General'}</td>
                      <td className="py-3 px-4 text-right">{Number(prod.costPrice).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400">
                        {Number(prod.branchProducts?.[0]?.sellingPrice || prod.costPrice).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center space-x-1 ${
                            isLow
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}
                        >
                          {isLow && <AlertTriangle className="w-3 h-3" />}
                          <span>{stock} {prod.unit?.toLowerCase() || 'units'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setAdjustProduct(prod)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-xs font-semibold flex items-center space-x-1 ml-auto border border-slate-700"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Adjust Stock</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddProductModal
          branchId={branchId}
          onClose={() => setShowAddModal(false)}
          onSuccess={loadData}
        />
      )}

      {showImportModal && (
        <BulkImportModal
          branchId={branchId}
          onClose={() => setShowImportModal(false)}
          onSuccess={loadData}
        />
      )}

      {adjustProduct && (
        <StockAdjustModal
          product={adjustProduct}
          branchId={branchId}
          onClose={() => setAdjustProduct(null)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
};
