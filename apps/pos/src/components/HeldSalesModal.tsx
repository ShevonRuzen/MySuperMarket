import React, { useState, useEffect } from 'react';
import { usePosStore } from '../store/posStore';
import { PauseCircle, ArrowRight, X, Clock } from 'lucide-react';
import axios from 'axios';
import { db } from '../db/db';

export const HeldSalesModal: React.FC = () => {
  const { branchId, setKeyboardMode } = usePosStore();
  const [heldList, setHeldList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHeldSales = async () => {
    try {
      const res = await axios.get(`http://localhost:3000/api/sales/held?branchId=${branchId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('pos_token')}` },
      });
      setHeldList(res.data || []);
    } catch (e) {
      // Fallback to local IndexedDB held sales
      const local = await db.heldSales.toArray();
      setHeldList(local);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHeldSales();
  }, []);

  const handleRecall = async (held: any) => {
    try {
      if (held.id) {
        await axios.delete(`http://localhost:3000/api/sales/held/${held.id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('pos_token')}` },
        });
      }
    } catch (e) {
      // Local delete
      if (held.id) await db.heldSales.delete(held.id);
    }

    const items = held.cartJson?.items || held.cartJson || [];
    usePosStore.setState({ cart: items });
    setKeyboardMode('BARCODE');
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-pos-surface border border-pos-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="px-6 py-4 bg-slate-800 flex justify-between items-center border-b border-pos-border">
          <div className="flex items-center space-x-2 font-bold text-lg text-amber-400">
            <PauseCircle className="w-6 h-6" />
            <span>Recall Held Transaction [F9]</span>
          </div>
          <button
            onClick={() => setKeyboardMode('BARCODE')}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
          {heldList.length === 0 ? (
            <div className="text-center py-8 text-slate-500 font-mono text-sm">
              No held sales on record.
            </div>
          ) : (
            heldList.map((held) => {
              const items = held.cartJson?.items || held.cartJson || [];
              const total = items.reduce((acc: number, i: any) => acc + (i.lineTotal || 0), 0);

              return (
                <div
                  key={held.id || held.holdRef}
                  className="p-4 bg-slate-900 border border-slate-800 hover:border-amber-500/60 rounded-xl flex justify-between items-center transition group"
                >
                  <div>
                    <div className="font-bold text-white font-mono text-sm flex items-center space-x-2">
                      <span className="text-amber-400 font-bold">{held.holdRef}</span>
                      <span className="text-xs text-slate-400">({items.length} items)</span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-1 flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(held.heldAt).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right font-mono">
                      <div className="text-sm font-bold text-emerald-400">
                        LKR {total.toFixed(2)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRecall(held)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1"
                    >
                      <span>Recall</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
