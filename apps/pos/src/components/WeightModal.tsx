import React, { useState, useEffect } from 'react';
import { usePosStore } from '../store/posStore';
import { Scale, CornerDownLeft, X, RefreshCw } from 'lucide-react';

export const WeightModal: React.FC = () => {
  const { activeWeighedProduct, addItem, setKeyboardMode, setActiveWeighedProduct } = usePosStore();
  const [weight, setWeight] = useState<string>('1.000');
  const [scaleConnected, setScaleConnected] = useState(false);

  useEffect(() => {
    // Attempt WebSocket connection to Bridge to receive scale weight automatically
    try {
      const ws = new WebSocket('ws://localhost:17777');
      ws.onopen = () => {
        setScaleConnected(true);
        ws.send(JSON.stringify({ type: 'GET_SCALE_WEIGHT' }));
      };
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'SCALE_WEIGHT' && msg.payload?.weight) {
          setWeight(msg.payload.weight.toFixed(3));
        }
      };
      return () => ws.close();
    } catch (e) {
      setScaleConnected(false);
    }
  }, []);

  if (!activeWeighedProduct) return null;

  const weightNum = parseFloat(weight) || 0;
  const unitPrice = activeWeighedProduct.sellingPrice;
  const lineTotal = weightNum * unitPrice;

  const handleConfirm = () => {
    if (weightNum <= 0) return;
    addItem(activeWeighedProduct, 1, weightNum);
    setActiveWeighedProduct(null);
    setKeyboardMode('BARCODE');
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-pos-surface border border-pos-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="px-6 py-4 bg-slate-800 flex justify-between items-center border-b border-pos-border">
          <div className="flex items-center space-x-2 font-bold text-lg text-amber-400">
            <Scale className="w-6 h-6" />
            <span>Weighed Produce Item</span>
          </div>
          <button
            onClick={() => {
              setActiveWeighedProduct(null);
              setKeyboardMode('BARCODE');
            }}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="text-center">
            <h3 className="text-xl font-bold text-slate-100">{activeWeighedProduct.name}</h3>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Rate: LKR {unitPrice.toFixed(2)} / {activeWeighedProduct.unit.toLowerCase()}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-2">
              <span>SCALE INPUT (KG)</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${scaleConnected ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400'}`}>
                {scaleConnected ? 'BRIDGE SCALE ACTIVE' : 'MANUAL KEYPAD ENTRY'}
              </span>
            </div>
            <input
              type="number"
              step="0.001"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirm();
                if (e.key === 'Escape') {
                  setActiveWeighedProduct(null);
                  setKeyboardMode('BARCODE');
                }
              }}
              autoFocus
              className="w-full text-center text-4xl font-mono font-black py-2 bg-transparent text-amber-400 outline-none"
            />
          </div>

          <div className="flex justify-between items-center bg-amber-950/30 border border-amber-800/50 p-4 rounded-xl">
            <span className="text-sm font-semibold text-amber-200">ITEM TOTAL:</span>
            <span className="text-2xl font-mono font-extrabold text-amber-400">
              LKR {lineTotal.toFixed(2)}
            </span>
          </div>

          <button
            onClick={handleConfirm}
            disabled={weightNum <= 0}
            className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-lg flex items-center justify-center space-x-2 transition shadow-lg"
          >
            <CornerDownLeft className="w-6 h-6" />
            <span>CONFIRM WEIGHT & ADD [ENTER]</span>
          </button>
        </div>
      </div>
    </div>
  );
};
