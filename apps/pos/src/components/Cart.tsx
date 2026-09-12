import React from 'react';
import { usePosStore } from '../store/posStore';
import { Trash2, ShoppingBag, Banknote, CreditCard, PauseCircle, XCircle } from 'lucide-react';

export const Cart: React.FC = () => {
  const { cart, updateItemQty, removeItem, clearCart, setKeyboardMode, isOnline } = usePosStore();

  const subtotal = cart.reduce((acc, item) => acc + item.unitPrice * item.qty, 0);
  const totalDiscount = cart.reduce((acc, item) => acc + item.discountAmount, 0);
  const total = subtotal - totalDiscount;

  return (
    <div className="flex flex-col h-full bg-pos-surface border border-pos-border rounded-xl overflow-hidden shadow-xl">
      {/* Cart Header */}
      <div className="flex justify-between items-center px-4 py-3 bg-slate-800/80 border-b border-pos-border">
        <div className="flex items-center space-x-2 font-bold text-lg text-slate-100">
          <ShoppingBag className="w-5 h-5 text-sky-400" />
          <span>Active Cart ({cart.length} items)</span>
        </div>
        {cart.length > 0 && (
          <button
            onClick={clearCart}
            className="text-xs text-rose-400 hover:text-rose-300 flex items-center space-x-1"
            title="Clear Cart [ESC]"
          >
            <XCircle className="w-4 h-4" />
            <span>Clear [ESC]</span>
          </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12">
            <ShoppingBag className="w-16 h-16 stroke-1 mb-2" />
            <p className="text-base font-medium">Cart is empty</p>
            <p className="text-xs">Scan a barcode or use the numpad</p>
          </div>
        ) : (
          cart.map((item, index) => (
            <div
              key={`${item.productId}-${index}`}
              className="py-2.5 px-3 flex items-center justify-between hover:bg-slate-800/40 rounded-lg transition"
            >
              <div className="flex-1 pr-2">
                <div className="font-semibold text-slate-200 text-sm flex items-center gap-1.5">
                  <span>{index + 1}.</span>
                  <span>{item.name}</span>
                  {item.isWeighed && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                      {item.weightKg} kg
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  LKR {item.unitPrice.toFixed(2)} × {item.isWeighed ? item.weightKg : item.qty}
                </div>
              </div>

              {/* Quantity Controls */}
              {!item.isWeighed && (
                <div className="flex items-center space-x-1.5 mr-3">
                  <button
                    onClick={() => updateItemQty(index, item.qty - 1)}
                    className="w-7 h-7 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded text-slate-200 font-bold"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-mono font-bold text-sm text-sky-400">
                    {item.qty}
                  </span>
                  <button
                    onClick={() => updateItemQty(index, item.qty + 1)}
                    className="w-7 h-7 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded text-slate-200 font-bold"
                  >
                    +
                  </button>
                </div>
              )}

              <div className="text-right">
                <div className="font-mono font-bold text-base text-slate-100">
                  LKR {item.lineTotal.toFixed(2)}
                </div>
                <button
                  onClick={() => removeItem(index)}
                  className="text-slate-500 hover:text-rose-400 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5 inline" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Summary & Payments */}
      <div className="p-4 bg-slate-900 border-t border-pos-border">
        <div className="space-y-1 text-sm font-mono mb-3">
          <div className="flex justify-between text-slate-400">
            <span>Subtotal</span>
            <span>LKR {subtotal.toFixed(2)}</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex justify-between text-emerald-400">
              <span>Discount</span>
              <span>-LKR {totalDiscount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline pt-2 border-t border-slate-800 text-slate-100">
            <span className="text-sm font-bold uppercase tracking-wider">TOTAL LKR</span>
            <span className="text-3xl font-extrabold text-sky-400 tracking-tight">
              {total.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button
            onClick={() => setKeyboardMode('CASH')}
            disabled={cart.length === 0}
            className="py-3 px-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 active:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center space-x-2 transition shadow-lg"
          >
            <Banknote className="w-5 h-5" />
            <span>CASH [F4]</span>
          </button>

          <button
            onClick={() => setKeyboardMode('PAYHERE')}
            disabled={cart.length === 0 || !isOnline}
            className={`py-3 px-2 font-bold rounded-xl flex items-center justify-center space-x-2 transition shadow-lg ${
              !isOnline
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            <span>PAYHERE [F5]</span>
          </button>

          <button
            onClick={() => console.log('Hold sale')}
            disabled={cart.length === 0}
            className="py-2 px-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 border border-slate-700"
          >
            <PauseCircle className="w-4 h-4" />
            <span>HOLD [F8]</span>
          </button>

          <button
            onClick={() => setKeyboardMode('SCANNER_QR')}
            className="py-2 px-2 bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 border border-slate-700"
          >
            <span>PHONE SCAN [F11]</span>
          </button>
        </div>
      </div>
    </div>
  );
};
