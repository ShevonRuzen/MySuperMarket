import React, { useEffect, useState } from 'react';
import { ShoppingCart, Plus, CheckCircle, Package, ChevronDown, ChevronUp, Search } from 'lucide-react';
import axios from 'axios';

const API = 'http://localhost:3000/api';
const token = () => localStorage.getItem('token');

function badge(status: string) {
  const map: Record<string, string> = {
    DRAFT: 'bg-slate-700 text-slate-300',
    SENT: 'bg-blue-900 text-blue-300',
    PARTIAL: 'bg-amber-900 text-amber-300',
    RECEIVED: 'bg-emerald-900 text-emerald-300',
  };
  return `inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${map[status] || 'bg-slate-700 text-slate-300'}`;
}

export const Purchasing: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNewPO, setShowNewPO] = useState(false);
  const [showGRN, setShowGRN] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // New PO form state
  const [poForm, setPoForm] = useState({
    branchId: '',
    supplierId: '',
    notes: '',
    items: [{ productId: '', orderedQty: 1, costPrice: 0 }],
  });

  // GRN form state
  const [grnItems, setGrnItems] = useState<{ productId: string; receivedQty: number }[]>([]);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [poRes, supRes, prodRes, brRes] = await Promise.all([
        axios.get(`${API}/purchasing`, { headers: { Authorization: `Bearer ${token()}` } }),
        axios.get(`${API}/suppliers`),
        axios.get(`${API}/products`),
        axios.get(`${API}/branches`),
      ]);
      setOrders(poRes.data || []);
      setSuppliers(supRes.data || []);
      setProducts(prodRes.data || []);
      setBranches(brRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function createPO() {
    try {
      await axios.post(`${API}/purchasing/po`, poForm, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setShowNewPO(false);
      setPoForm({ branchId: '', supplierId: '', notes: '', items: [{ productId: '', orderedQty: 1, costPrice: 0 }] });
      loadAll();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to create PO');
    }
  }

  async function processGRN(poId: string) {
    try {
      await axios.post(
        `${API}/purchasing/grn/${poId}`,
        { receivedItems: grnItems },
        { headers: { Authorization: `Bearer ${token()}` } },
      );
      setShowGRN(null);
      setGrnItems([]);
      loadAll();
    } catch (e: any) {
      alert(e.response?.data?.message || 'GRN failed');
    }
  }

  function initGRN(order: any) {
    setGrnItems(order.items.map((i: any) => ({ productId: i.productId, receivedQty: Number(i.orderedQty) - Number(i.receivedQty) })));
    setShowGRN(order.id);
  }

  const filtered = orders.filter(
    (o) =>
      o.supplier?.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.id.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-blue-400" /> Purchase Orders &amp; GRN
          </h1>
          <p className="text-slate-400 text-sm mt-1">Create POs to suppliers · Receive goods to update stock</p>
        </div>
        <button
          onClick={() => setShowNewPO(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow transition"
        >
          <Plus className="w-4 h-4" /> New PO
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          className="w-full pl-9 pr-3 py-2 bg-admin-surface border border-admin-border rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          placeholder="Search by supplier or PO ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* PO List */}
      {loading ? (
        <div className="text-slate-400 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-slate-500 text-sm bg-admin-surface border border-admin-border rounded-2xl p-10 text-center">
          No purchase orders yet. Click <strong>New PO</strong> to create one.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <div key={order.id} className="bg-admin-surface border border-admin-border rounded-2xl overflow-hidden">
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-800/40"
                onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-sm font-bold text-white">{order.supplier?.name}</div>
                    <div className="text-xs font-mono text-slate-500">PO #{order.id.slice(-8).toUpperCase()}</div>
                  </div>
                  <span className={badge(order.status)}>{order.status}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">{order.items?.length} line{order.items?.length !== 1 ? 's' : ''}</div>
                    <div className="text-xs font-mono text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</div>
                  </div>
                  {order.status !== 'RECEIVED' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); initGRN(order); }}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg flex items-center gap-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> GRN
                    </button>
                  )}
                  {expandedId === order.id ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {expandedId === order.id && (
                <div className="border-t border-admin-border px-5 py-4">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-500 font-mono uppercase">
                        <th className="text-left pb-2">Product</th>
                        <th className="text-right pb-2">Ordered</th>
                        <th className="text-right pb-2">Received</th>
                        <th className="text-right pb-2">Short</th>
                        <th className="text-right pb-2">Unit Cost</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-300">
                      {order.items?.map((item: any) => (
                        <tr key={item.id} className="border-t border-slate-800">
                          <td className="py-2">{item.product?.name}</td>
                          <td className="text-right py-2 font-mono">{item.orderedQty}</td>
                          <td className="text-right py-2 font-mono text-emerald-400">{item.receivedQty}</td>
                          <td className="text-right py-2 font-mono text-amber-400">{item.shortQty}</td>
                          <td className="text-right py-2 font-mono">LKR {Number(item.costPrice).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {order.notes && (
                    <div className="mt-3 text-xs text-slate-400 italic">Note: {order.notes}</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New PO Modal */}
      {showNewPO && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-admin-surface border border-admin-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-admin-border flex items-center justify-between">
              <h2 className="text-lg font-black text-white">New Purchase Order</h2>
              <button onClick={() => setShowNewPO(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Branch</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-800 border border-admin-border rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                    value={poForm.branchId}
                    onChange={(e) => setPoForm({ ...poForm, branchId: e.target.value })}
                  >
                    <option value="">Select branch…</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Supplier</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-800 border border-admin-border rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                    value={poForm.supplierId}
                    onChange={(e) => setPoForm({ ...poForm, supplierId: e.target.value })}
                  >
                    <option value="">Select supplier…</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Notes (optional)</label>
                <input
                  className="w-full px-3 py-2 bg-slate-800 border border-admin-border rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  placeholder="Order notes…"
                  value={poForm.notes}
                  onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-400">Order Items</label>
                  <button
                    onClick={() => setPoForm({ ...poForm, items: [...poForm.items, { productId: '', orderedQty: 1, costPrice: 0 }] })}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  {poForm.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_100px_120px_32px] gap-2">
                      <select
                        className="px-3 py-2 bg-slate-800 border border-admin-border rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                        value={item.productId}
                        onChange={(e) => {
                          const items = [...poForm.items];
                          items[idx] = { ...items[idx], productId: e.target.value };
                          setPoForm({ ...poForm, items });
                        }}
                      >
                        <option value="">Select product…</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input
                        type="number"
                        min={1}
                        className="px-3 py-2 bg-slate-800 border border-admin-border rounded-lg text-sm text-slate-200 text-right focus:outline-none focus:border-blue-500"
                        placeholder="Qty"
                        value={item.orderedQty}
                        onChange={(e) => {
                          const items = [...poForm.items];
                          items[idx] = { ...items[idx], orderedQty: Number(e.target.value) };
                          setPoForm({ ...poForm, items });
                        }}
                      />
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        className="px-3 py-2 bg-slate-800 border border-admin-border rounded-lg text-sm text-slate-200 text-right focus:outline-none focus:border-blue-500"
                        placeholder="Cost (LKR)"
                        value={item.costPrice}
                        onChange={(e) => {
                          const items = [...poForm.items];
                          items[idx] = { ...items[idx], costPrice: Number(e.target.value) };
                          setPoForm({ ...poForm, items });
                        }}
                      />
                      <button
                        onClick={() => {
                          const items = poForm.items.filter((_, i) => i !== idx);
                          setPoForm({ ...poForm, items: items.length ? items : [{ productId: '', orderedQty: 1, costPrice: 0 }] });
                        }}
                        className="text-rose-400 hover:text-rose-300 text-sm"
                      >✕</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-admin-border flex justify-end gap-3">
              <button onClick={() => setShowNewPO(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">Cancel</button>
              <button
                onClick={createPO}
                disabled={!poForm.branchId || !poForm.supplierId || poForm.items.some((i) => !i.productId)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition"
              >
                <Package className="w-4 h-4 inline-block mr-1" /> Create PO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GRN Modal */}
      {showGRN && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-admin-surface border border-admin-border rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-admin-border flex items-center justify-between">
              <h2 className="text-lg font-black text-white">Goods Received Note</h2>
              <button onClick={() => setShowGRN(null)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-xs text-slate-400">Confirm received quantities. Stock will be updated automatically.</p>
              {grnItems.map((gi, idx) => {
                const po = orders.find((o) => o.id === showGRN);
                const item = po?.items?.find((i: any) => i.productId === gi.productId);
                return (
                  <div key={gi.productId} className="flex items-center gap-3">
                    <div className="flex-1 text-sm text-slate-200">{item?.product?.name}</div>
                    <div className="text-xs text-slate-500">Ordered: {item?.orderedQty}</div>
                    <input
                      type="number"
                      min={0}
                      className="w-24 px-3 py-1.5 bg-slate-800 border border-admin-border rounded-lg text-sm text-slate-200 text-right focus:outline-none focus:border-emerald-500"
                      value={gi.receivedQty}
                      onChange={(e) => {
                        const items = [...grnItems];
                        items[idx] = { ...items[idx], receivedQty: Number(e.target.value) };
                        setGrnItems(items);
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="p-6 border-t border-admin-border flex justify-end gap-3">
              <button onClick={() => setShowGRN(null)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">Cancel</button>
              <button
                onClick={() => processGRN(showGRN)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" /> Confirm Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
