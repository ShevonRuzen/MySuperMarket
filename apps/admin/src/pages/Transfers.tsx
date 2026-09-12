import React, { useEffect, useState } from 'react';
import { ArrowLeftRight, Plus, CheckCircle, XCircle, Package, ChevronDown, ChevronUp, Search, Truck } from 'lucide-react';
import axios from 'axios';

const API = 'http://localhost:3000/api';
const token = () => localStorage.getItem('token');

function badge(status: string) {
  const map: Record<string, string> = {
    REQUESTED: 'bg-blue-900 text-blue-300',
    APPROVED: 'bg-sky-900 text-sky-300',
    IN_TRANSIT: 'bg-amber-900 text-amber-300',
    RECEIVED: 'bg-emerald-900 text-emerald-300',
    REJECTED: 'bg-rose-900 text-rose-300',
  };
  return `inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${map[status] || 'bg-slate-700 text-slate-300'}`;
}

export const Transfers: React.FC = () => {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showReceive, setShowReceive] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({
    fromBranchId: '',
    toBranchId: '',
    notes: '',
    items: [{ productId: '', requestedQty: 1 }],
  });

  const [receiveItems, setReceiveItems] = useState<{ productId: string; confirmedQty: number }[]>([]);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [trRes, brRes, prRes] = await Promise.all([
        axios.get(`${API}/transfers`, { headers: { Authorization: `Bearer ${token()}` } }),
        axios.get(`${API}/branches`),
        axios.get(`${API}/products`),
      ]);
      setTransfers(trRes.data || []);
      setBranches(brRes.data || []);
      setProducts(prRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function createTransfer() {
    try {
      await axios.post(`${API}/transfers/request`, form, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setShowNew(false);
      setForm({ fromBranchId: '', toBranchId: '', notes: '', items: [{ productId: '', requestedQty: 1 }] });
      loadAll();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to create transfer');
    }
  }

  async function approve(id: string) {
    if (!confirm('Approve this transfer? Stock will be deducted from source branch immediately.')) return;
    try {
      await axios.post(`${API}/transfers/${id}/approve`, {}, { headers: { Authorization: `Bearer ${token()}` } });
      loadAll();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Approval failed');
    }
  }

  async function reject(id: string) {
    const reason = prompt('Reason for rejection (optional):');
    try {
      await axios.post(`${API}/transfers/${id}/reject`, { reason }, { headers: { Authorization: `Bearer ${token()}` } });
      loadAll();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Rejection failed');
    }
  }

  async function receive(id: string) {
    try {
      await axios.post(`${API}/transfers/${id}/receive`, { receivedItems: receiveItems }, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setShowReceive(null);
      setReceiveItems([]);
      loadAll();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Receive failed');
    }
  }

  function initReceive(transfer: any) {
    setReceiveItems(transfer.items.map((i: any) => ({ productId: i.productId, confirmedQty: Number(i.requestedQty) })));
    setShowReceive(transfer.id);
  }

  const filtered = transfers.filter(
    (t) =>
      t.fromBranch?.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.toBranch?.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-purple-400" /> Inter-Branch Transfers
          </h1>
          <p className="text-slate-400 text-sm mt-1">Request → Approve (deducts source) → In Transit → Received (adds destination)</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-xl shadow transition"
        >
          <Plus className="w-4 h-4" /> New Transfer
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          className="w-full pl-9 pr-3 py-2 bg-admin-surface border border-admin-border rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
          placeholder="Search by branch or transfer ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Status legend */}
      <div className="flex flex-wrap gap-2 text-[11px]">
        {['REQUESTED', 'IN_TRANSIT', 'RECEIVED', 'REJECTED'].map((s) => (
          <span key={s} className={badge(s)}>{s.replace('_', ' ')}</span>
        ))}
      </div>

      {/* Transfer List */}
      {loading ? (
        <div className="text-slate-400 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-slate-500 text-sm bg-admin-surface border border-admin-border rounded-2xl p-10 text-center">
          No transfers yet. Click <strong>New Transfer</strong> to create one.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((tr) => (
            <div key={tr.id} className="bg-admin-surface border border-admin-border rounded-2xl overflow-hidden">
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-800/40"
                onClick={() => setExpandedId(expandedId === tr.id ? null : tr.id)}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      {tr.fromBranch?.name}
                      <ArrowLeftRight className="w-3 h-3 text-slate-500" />
                      {tr.toBranch?.name}
                    </div>
                    <div className="text-xs font-mono text-slate-500">#{tr.id.slice(-8).toUpperCase()}</div>
                  </div>
                  <span className={badge(tr.status)}>{tr.status.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs font-mono text-slate-500">{new Date(tr.createdAt).toLocaleDateString()}</div>
                  {tr.status === 'REQUESTED' && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); approve(tr.id); }}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg flex items-center gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); reject(tr.id); }}
                        className="px-3 py-1.5 bg-rose-800 hover:bg-rose-700 text-white text-xs font-bold rounded-lg flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </>
                  )}
                  {tr.status === 'IN_TRANSIT' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); initReceive(tr); }}
                      className="px-3 py-1.5 bg-sky-700 hover:bg-sky-600 text-white text-xs font-bold rounded-lg flex items-center gap-1"
                    >
                      <Truck className="w-3.5 h-3.5" /> Receive
                    </button>
                  )}
                  {expandedId === tr.id ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {expandedId === tr.id && (
                <div className="border-t border-admin-border px-5 py-4">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-500 font-mono uppercase">
                        <th className="text-left pb-2">Product</th>
                        <th className="text-right pb-2">Requested</th>
                        <th className="text-right pb-2">Confirmed</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-300">
                      {tr.items?.map((item: any) => (
                        <tr key={item.id} className="border-t border-slate-800">
                          <td className="py-2">{item.product?.name}</td>
                          <td className="text-right py-2 font-mono">{item.requestedQty}</td>
                          <td className="text-right py-2 font-mono text-emerald-400">{item.confirmedQty ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {tr.notes && <div className="mt-3 text-xs text-slate-400 italic">Note: {tr.notes}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New Transfer Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-admin-surface border border-admin-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-admin-border flex items-center justify-between">
              <h2 className="text-lg font-black text-white">New Inter-Branch Transfer</h2>
              <button onClick={() => setShowNew(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">From Branch (Source)</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-800 border border-admin-border rounded-lg text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                    value={form.fromBranchId}
                    onChange={(e) => setForm({ ...form, fromBranchId: e.target.value })}
                  >
                    <option value="">Select source branch…</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">To Branch (Destination)</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-800 border border-admin-border rounded-lg text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                    value={form.toBranchId}
                    onChange={(e) => setForm({ ...form, toBranchId: e.target.value })}
                  >
                    <option value="">Select destination branch…</option>
                    {branches.filter((b) => b.id !== form.fromBranchId).map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Notes (optional)</label>
                <input
                  className="w-full px-3 py-2 bg-slate-800 border border-admin-border rounded-lg text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                  placeholder="Transfer notes…"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-400">Items to Transfer</label>
                  <button
                    onClick={() => setForm({ ...form, items: [...form.items, { productId: '', requestedQty: 1 }] })}
                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  {form.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_100px_32px] gap-2">
                      <select
                        className="px-3 py-2 bg-slate-800 border border-admin-border rounded-lg text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                        value={item.productId}
                        onChange={(e) => {
                          const items = [...form.items];
                          items[idx] = { ...items[idx], productId: e.target.value };
                          setForm({ ...form, items });
                        }}
                      >
                        <option value="">Select product…</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input
                        type="number"
                        min={1}
                        className="px-3 py-2 bg-slate-800 border border-admin-border rounded-lg text-sm text-slate-200 text-right focus:outline-none focus:border-purple-500"
                        placeholder="Qty"
                        value={item.requestedQty}
                        onChange={(e) => {
                          const items = [...form.items];
                          items[idx] = { ...items[idx], requestedQty: Number(e.target.value) };
                          setForm({ ...form, items });
                        }}
                      />
                      <button
                        onClick={() => {
                          const items = form.items.filter((_, i) => i !== idx);
                          setForm({ ...form, items: items.length ? items : [{ productId: '', requestedQty: 1 }] });
                        }}
                        className="text-rose-400 hover:text-rose-300 text-sm"
                      >✕</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-admin-border flex justify-end gap-3">
              <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">Cancel</button>
              <button
                onClick={createTransfer}
                disabled={!form.fromBranchId || !form.toBranchId || form.items.some((i) => !i.productId)}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition flex items-center gap-2"
              >
                <Package className="w-4 h-4" /> Create Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receive Modal */}
      {showReceive && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-admin-surface border border-admin-border rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-admin-border flex items-center justify-between">
              <h2 className="text-lg font-black text-white">Confirm Received Goods</h2>
              <button onClick={() => setShowReceive(null)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-xs text-slate-400">Confirm quantities received. Stock will be added to destination branch.</p>
              {receiveItems.map((ri, idx) => {
                const tr = transfers.find((t) => t.id === showReceive);
                const item = tr?.items?.find((i: any) => i.productId === ri.productId);
                return (
                  <div key={ri.productId} className="flex items-center gap-3">
                    <div className="flex-1 text-sm text-slate-200">{item?.product?.name}</div>
                    <div className="text-xs text-slate-500">Requested: {item?.requestedQty}</div>
                    <input
                      type="number"
                      min={0}
                      className="w-24 px-3 py-1.5 bg-slate-800 border border-admin-border rounded-lg text-sm text-slate-200 text-right focus:outline-none focus:border-sky-500"
                      value={ri.confirmedQty}
                      onChange={(e) => {
                        const items = [...receiveItems];
                        items[idx] = { ...items[idx], confirmedQty: Number(e.target.value) };
                        setReceiveItems(items);
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="p-6 border-t border-admin-border flex justify-end gap-3">
              <button onClick={() => setShowReceive(null)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">Cancel</button>
              <button
                onClick={() => receive(showReceive)}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold rounded-xl transition flex items-center gap-2"
              >
                <Truck className="w-4 h-4" /> Confirm Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
