import React, { useState, useEffect } from 'react';
import { usePosStore } from '../store/posStore';
import { CreditCard, CheckCircle, X, ShieldCheck } from 'lucide-react';
import axios from 'axios';

export const PayHereModal: React.FC = () => {
  const { cart, branchId, shift, clearCart, setKeyboardMode } = usePosStore();
  const total = cart.reduce((acc, i) => acc + i.lineTotal, 0);

  const [loading, setLoading] = useState(true);
  const [payhereData, setPayhereData] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    async function initPayment() {
      try {
        const orderId = `PAYHERE-${Date.now()}`;
        const res = await axios.post('http://localhost:3000/api/payments/payhere/init', {
          orderId,
          amount: total,
          currency: 'LKR',
        });
        setPayhereData(res.data);
      } catch (err) {
        console.error('Failed to init PayHere:', err);
      } finally {
        setLoading(false);
      }
    }
    initPayment();
  }, [total]);

  const handleSimulatePayment = async () => {
    setProcessing(true);
    // Simulate PayHere gateway processing and verification
    setTimeout(async () => {
      try {
        await axios.post('http://localhost:3000/api/payments/payhere/webhook', {
          merchant_id: payhereData?.merchantId,
          order_id: payhereData?.orderId,
          payhere_amount: total.toFixed(2),
          payhere_currency: 'LKR',
          status_code: '2', // 2 = Success in PayHere
          md5sig: payhereData?.hash,
        });

        // Submit sale
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
              method: 'CARD',
              amount: total,
              reference: payhereData?.orderId,
            },
          ],
          total,
        });

        setPaid(true);
        setTimeout(() => {
          clearCart();
          setKeyboardMode('BARCODE');
        }, 1200);
      } catch (e) {
        console.error('Error completing PayHere sale:', e);
      } finally {
        setProcessing(false);
      }
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-pos-surface border border-pos-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="px-6 py-4 bg-slate-800 flex justify-between items-center border-b border-pos-border">
          <div className="flex items-center space-x-2 font-bold text-lg text-sky-400">
            <CreditCard className="w-6 h-6" />
            <span>PayHere Card Checkout (Sandbox)</span>
          </div>
          <button
            onClick={() => setKeyboardMode('BARCODE')}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {paid ? (
            <div className="text-center py-6 space-y-3">
              <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto animate-bounce" />
              <div className="text-2xl font-bold text-emerald-400">Payment Approved!</div>
              <div className="text-sm text-slate-300">Printing card slip & receipt...</div>
            </div>
          ) : (
            <>
              <div className="bg-sky-950/40 border border-sky-800/60 p-4 rounded-xl text-center">
                <div className="text-xs text-sky-300 uppercase tracking-wider font-mono">
                  Card Payment Amount
                </div>
                <div className="text-3xl font-extrabold text-white mt-1 font-mono">
                  LKR {total.toFixed(2)}
                </div>
              </div>

              {/* Sandbox Card Details for Testing */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs font-mono">
                <div className="flex items-center text-amber-400 font-bold mb-1">
                  <ShieldCheck className="w-4 h-4 mr-1" />
                  <span>PAYHERE SANDBOX TEST CREDENTIALS</span>
                </div>
                <div className="text-slate-300">Test Card: <span className="text-white font-bold">4111 1111 1111 1111</span></div>
                <div className="text-slate-300">Expiry: <span className="text-white font-bold">12/25</span> · CVV: <span className="text-white font-bold">123</span></div>
                <div className="text-slate-400 text-[11px] pt-1">
                  Order ID: {payhereData?.orderId || 'Generating...'}
                </div>
              </div>

              <button
                onClick={handleSimulatePayment}
                disabled={loading || processing}
                className="w-full py-3.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center space-x-2 transition shadow-lg"
              >
                <CreditCard className="w-5 h-5" />
                <span>{processing ? 'Processing Card...' : 'TAP / SWIPE CARD [ENTER]'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
