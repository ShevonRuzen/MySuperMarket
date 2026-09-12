import React, { useState } from 'react';
import { usePosStore } from '../store/posStore';
import { CreditCard, Banknote, CornerDownLeft, X, ArrowRight } from 'lucide-react';
import axios from 'axios';

interface SplitPaymentModalProps {
  onClose?: () => void;
}

export const SplitPaymentModal: React.FC<SplitPaymentModalProps> = ({ onClose }) => {
  const { cart, branchId, shift, clearCart, setKeyboardMode, isOnline } = usePosStore();
  const total = cart.reduce((acc, i) => acc + i.lineTotal, 0);

  const [cashPart, setCashPart] = useState<string>((total / 2).toFixed(0));
  const [step, setStep] = useState<'CASH_ENTRY' | 'CARD_PROCESSING'>('CASH_ENTRY');
  const [processing, setProcessing] = useState(false);

  const cashAmount = Math.min(total, Math.max(0, parseFloat(cashPart) || 0));
  const cardAmount = Math.max(0, total - cashAmount);

  const handleProceedToCard = () => {
    if (cashAmount <= 0 || cashAmount >= total) return;
    setStep('CARD_PROCESSING');
  };

  const handleConfirmSplit = async () => {
    setProcessing(true);
    try {
      await axios.post('http://localhost:3000/api/sales', {
        branchId,
        shiftId: shift?.id || 'shift-1',
        items: cart.map((i) => ({
          productId: i.productId,
          barcode: i.barcode,
          qty: i.qty,
          unitPrice: i.unitPrice,
          discountAmount: i.discountAmount,
        })),
        payments: [
          {
            method: 'SPLIT_CASH',
            amount: cashAmount,
            cashTendered: cashAmount,
            changeGiven: 0,
          },
          {
            method: 'SPLIT_CARD',
            amount: cardAmount,
            reference: `PAYHERE-SPLIT-${Date.now()}`,
          },
        ],
        total,
      });

      clearCart();
      setKeyboardMode('BARCODE');
    } catch (e) {
      console.error('Error in split checkout:', e);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-pos-surface border border-pos-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="px-6 py-4 bg-slate-800 flex justify-between items-center border-b border-pos-border">
          <div className="flex items-center space-x-2 font-bold text-lg text-amber-400">
            <CreditCard className="w-6 h-6" />
            <span>Split Payment (Cash + Card)</span>
          </div>
          <button onClick={() => { if (onClose) onClose(); else setKeyboardMode('BARCODE'); }} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="text-center bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="text-xs text-slate-400 uppercase tracking-widest font-mono">Total Due</div>
            <div className="text-3xl font-extrabold text-white mt-1 font-mono">
              LKR {total.toFixed(2)}
            </div>
          </div>

          {step === 'CASH_ENTRY' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  1. Cash Amount to Tender (Keypad):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={cashPart}
                    onChange={(e) => setCashPart(e.target.value)}
                    autoFocus
                    className="w-full text-center text-3xl font-mono font-bold py-2.5 bg-slate-950 border-2 border-emerald-500 rounded-xl text-emerald-400 outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-300">
                  <span>Cash Portion:</span>
                  <span className="font-bold text-emerald-400">LKR {cashAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Remaining to Card:</span>
                  <span className="font-bold text-sky-400">LKR {cardAmount.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleProceedToCard}
                disabled={cashAmount <= 0 || cashAmount >= total}
                className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-base flex items-center justify-center space-x-2 transition shadow-lg"
              >
                <span>Proceed to Card Portion</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-sky-950/40 border border-sky-800/60 rounded-xl text-center space-y-1">
                <div className="text-xs text-sky-300 font-mono uppercase tracking-wider">
                  Swipe / Tap Card for Balance
                </div>
                <div className="text-3xl font-mono font-extrabold text-white">
                  LKR {cardAmount.toFixed(2)}
                </div>
              </div>

              <button
                onClick={handleConfirmSplit}
                disabled={processing}
                className="w-full py-3.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-base flex items-center justify-center space-x-2 transition shadow-lg"
              >
                <CornerDownLeft className="w-5 h-5" />
                <span>{processing ? 'Processing...' : 'CONFIRM SPLIT PAYMENT [ENTER]'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
