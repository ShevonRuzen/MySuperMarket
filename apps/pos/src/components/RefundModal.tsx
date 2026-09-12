import React, { useState } from 'react';
import { RotateCcw, Search, Check, X, AlertCircle } from 'lucide-react';
import axios from 'axios';

interface RefundModalProps {
  onClose: () => void;
}

export const RefundModal: React.FC<RefundModalProps> = ({ onClose }) => {
  const [invoiceNo, setInvoiceNo] = useState('');
  const [sale, setSale] = useState<any | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('Customer return - damaged or wrong item');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNo.trim()) return;

    setLoading(true);
    setError('');
    setSale(null);

    try {
      const res = await axios.get(`http://localhost:3000/api/sales/invoice/${invoiceNo.trim()}`);
      setSale(res.data);
      // Default refund quantity to 1 for all items
      const initialMap: Record<string, number> = {};
      res.data.items?.forEach((i: any) => {
        initialMap[i.productId] = Number(i.qty);
      });
      setSelectedItems(initialMap);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invoice not found');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRefund = async () => {
    if (!sale) return;
    setLoading(true);
    setError('');

    const refundItems = Object.entries(selectedItems)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, qty]) => ({ productId, qty }));

    if (refundItems.length === 0) {
      setError('Please select at least one item to refund');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('pos_token') || localStorage.getItem('admin_token');
      await axios.post(
        `http://localhost:3000/api/sales/${sale.id}/refund`,
        {
          items: refundItems,
          reason,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Refund processing failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50">
      <div className="bg-pos-surface border border-pos-border rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
        <div className="px-6 py-4 bg-slate-900 flex justify-between items-center border-b border-pos-border">
          <div className="flex items-center space-x-2 font-bold text-lg text-rose-400">
            <RotateCcw className="w-5 h-5" />
            <span>Process Customer Refund</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {success ? (
            <div className="text-center py-8 space-y-2">
              <Check className="w-16 h-16 text-emerald-400 mx-auto" />
              <div className="text-xl font-bold text-white">Refund Successfully Completed!</div>
              <div className="text-xs text-slate-400 font-mono">Stock restored and audit entry created</div>
            </div>
          ) : (
            <>
              {/* Invoice Lookup Field */}
              <form onSubmit={handleLookup} className="flex gap-2">
                <input
                  type="text"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  placeholder="Scan receipt barcode or type Invoice No (e.g. INV-2026...)"
                  className="flex-1 px-3 py-2.5 bg-slate-950 border border-pos-border rounded-xl text-sm font-mono text-white outline-none focus:border-rose-500"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1 border border-slate-700"
                >
                  <Search className="w-4 h-4" />
                  <span>Find</span>
                </button>
              </form>

              {error && (
                <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 p-2.5 rounded-xl text-center">
                  {error}
                </div>
              )}

              {sale && (
                <div className="space-y-4">
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex justify-between items-center text-xs font-mono">
                    <div>
                      <span className="text-slate-400">Invoice: </span>
                      <span className="font-bold text-white">{sale.invoiceNo}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Total: </span>
                      <span className="font-bold text-emerald-400">LKR {Number(sale.total).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {sale.items?.map((item: any) => (
                      <div
                        key={item.id}
                        className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex justify-between items-center text-xs font-mono"
                      >
                        <div>
                          <div className="font-bold text-slate-200">{item.product?.name}</div>
                          <div className="text-[11px] text-slate-400">
                            Purchased: {item.qty} × LKR {Number(item.unitPrice).toFixed(2)}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className="text-slate-400">Refund Qty:</span>
                          <input
                            type="number"
                            min="0"
                            max={item.qty}
                            value={selectedItems[item.productId] ?? item.qty}
                            onChange={(e) =>
                              setSelectedItems({
                                ...selectedItems,
                                [item.productId]: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-center text-white font-bold"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleProcessRefund}
                    disabled={loading}
                    className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-sm transition shadow-lg flex items-center justify-center space-x-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Confirm Refund & Restore Stock</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
