import React, { useState, useEffect } from 'react';
import { usePosStore } from '../store/posStore';
import { Banknote, CornerDownLeft, X } from 'lucide-react';
import axios from 'axios';
import { db } from '../db/db';

export const CashPaymentModal: React.FC = () => {
  const {
    cart,
    shift,
    branchId,
    cashier,
    clearCart,
    setKeyboardMode,
    isOnline,
    checkPendingSync,
  } = usePosStore();

  const total = cart.reduce((acc, i) => acc + i.lineTotal, 0);
  const [tendered, setTendered] = useState<string>(total.toFixed(0));

  const tenderedAmount = parseFloat(tendered) || 0;
  const change = Math.max(0, tenderedAmount - total);
  const isValid = tenderedAmount >= total;

  useEffect(() => {
    setTendered(total.toFixed(0));
  }, [total]);

  const handleConfirm = async () => {
    if (!isValid) return;

    const offlineId = `sale-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const salePayload = {
      offlineId,
      branchId: branchId || 'demo-branch',
      shiftId: shift?.id || 'demo-shift',
      items: cart.map((i) => ({
        productId: i.productId,
        barcode: i.barcode,
        qty: i.weightKg ? i.weightKg : i.qty,
        weightKg: i.weightKg,
        unitPrice: i.unitPrice,
        discountAmount: i.discountAmount,
      })),
      payments: [
        {
          method: 'CASH',
          amount: total,
          cashTendered: tenderedAmount,
          changeGiven: change,
        },
      ],
      total,
      createdAt: new Date().toISOString(),
    };

    // 1. If online, submit to API directly
    if (isOnline) {
      try {
        await axios.post('http://localhost:3000/api/sales', salePayload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('pos_token')}` },
        });
      } catch (err) {
        console.warn('Network error during online sale post. Saving offline queue...', err);
        // Fallback to offline store
        await db.pendingSales.add({
          offlineId,
          branchId: salePayload.branchId,
          shiftId: salePayload.shiftId,
          items: salePayload.items,
          payments: salePayload.payments,
          total: salePayload.total,
          createdAt: salePayload.createdAt,
          synced: false,
        });
      }
    } else {
      // 2. Queue in IndexedDB offline database
      await db.pendingSales.add({
        offlineId,
        branchId: salePayload.branchId,
        shiftId: salePayload.shiftId,
        items: salePayload.items,
        payments: salePayload.payments,
        total: salePayload.total,
        createdAt: salePayload.createdAt,
        synced: false,
      });
    }

    // Check pending count
    await checkPendingSync();

    // Trigger local printer / drawer via Bridge if running
    try {
      const bridgeWs = new WebSocket('ws://localhost:17777');
      bridgeWs.onopen = () => {
        bridgeWs.send(JSON.stringify({ type: 'OPEN_DRAWER' }));
        bridgeWs.send(
          JSON.stringify({
            type: 'PRINT_RECEIPT',
            payload: {
              lines: [
                '*** MYSUPERMARKET COLOMBO 07 ***',
                `Date: ${new Date().toLocaleString()}`,
                `Cashier: ${cashier?.name || 'Kasun'}`,
                '--------------------------------',
                ...cart.map((i) => `${i.name.padEnd(20, ' ')} LKR ${i.lineTotal.toFixed(2)}`),
                '--------------------------------',
                `TOTAL:        LKR ${total.toFixed(2)}`,
                `CASH:         LKR ${tenderedAmount.toFixed(2)}`,
                `CHANGE:       LKR ${change.toFixed(2)}`,
                '--------------------------------',
                'Thank you for shopping with us!',
              ],
            },
          })
        );
        bridgeWs.close();
      };
    } catch (e) {
      // Bridge optional
    }

    clearCart();
    setKeyboardMode('BARCODE');
  };

  const quickNotes = [500, 1000, 2000, 5000];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-pos-surface border border-pos-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="px-6 py-4 bg-slate-800 flex justify-between items-center border-b border-pos-border">
          <div className="flex items-center space-x-2 font-bold text-lg text-emerald-400">
            <Banknote className="w-6 h-6" />
            <span>Cash Payment</span>
          </div>
          <button
            onClick={() => setKeyboardMode('BARCODE')}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400 uppercase tracking-widest font-mono">
              Amount Due
            </div>
            <div className="text-4xl font-extrabold text-white mt-1 font-mono">
              LKR {total.toFixed(2)}
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">
              Cash Tendered (Type on Numpad):
            </label>
            <input
              type="number"
              value={tendered}
              onChange={(e) => setTendered(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isValid) {
                  handleConfirm();
                } else if (e.key === 'Escape') {
                  setKeyboardMode('BARCODE');
                }
              }}
              autoFocus
              className="w-full text-center text-3xl font-mono font-bold py-3 bg-slate-950 border-2 border-emerald-500 rounded-xl text-emerald-400 outline-none"
            />
          </div>

          {/* Quick Banknotes */}
          <div>
            <div className="text-xs font-mono text-slate-400 mb-2">Quick LKR Notes:</div>
            <div className="grid grid-cols-5 gap-2">
              <button
                onClick={() => setTendered(total.toFixed(0))}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg border border-slate-700 text-sky-400"
              >
                Exact
              </button>
              {quickNotes.map((note) => (
                <button
                  key={note}
                  onClick={() => setTendered(note.toString())}
                  className="py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg border border-slate-700 text-slate-200"
                >
                  {note}
                </button>
              ))}
            </div>
          </div>

          {/* Change Display */}
          <div className="flex justify-between items-center bg-emerald-950/40 border border-emerald-800/60 px-4 py-3 rounded-xl">
            <span className="font-semibold text-emerald-300">CHANGE TO RETURN:</span>
            <span className="text-2xl font-mono font-extrabold text-emerald-400">
              LKR {change.toFixed(2)}
            </span>
          </div>

          <button
            onClick={handleConfirm}
            disabled={!isValid}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded-xl text-lg flex items-center justify-center space-x-2 transition shadow-lg"
          >
            <CornerDownLeft className="w-6 h-6" />
            <span>CONFIRM & PRINT RECEIPT [ENTER]</span>
          </button>
        </div>
      </div>
    </div>
  );
};
