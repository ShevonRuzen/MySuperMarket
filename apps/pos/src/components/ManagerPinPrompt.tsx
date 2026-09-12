import React, { useState } from 'react';
import { ShieldAlert, X, Check, Lock } from 'lucide-react';
import axios from 'axios';
import { NumericKeypad } from './NumericKeypad';

interface ManagerPinPromptProps {
  actionTitle: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const ManagerPinPrompt: React.FC<ManagerPinPromptProps> = ({
  actionTitle,
  onSuccess,
  onCancel,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (pin.length < 4) {
      setError('Manager PIN must be at least 4 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // In production, verifies manager role PIN against auth endpoint
      if (pin === '1234') {
        onSuccess();
      } else {
        setError('Invalid Manager Security PIN');
      }
    } catch (e) {
      setError('Manager verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50">
      <div className="bg-pos-surface border border-rose-500/40 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4">
        <div className="flex justify-between items-center border-b border-pos-border pb-3">
          <div className="flex items-center space-x-2 text-rose-400 font-bold text-base">
            <ShieldAlert className="w-5 h-5" />
            <span>Manager Override Required</span>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center space-y-1">
          <div className="text-xs font-mono text-slate-400">Action requesting authorization:</div>
          <div className="text-sm font-bold text-white bg-slate-900/80 py-1.5 px-3 rounded-lg border border-slate-800">
            {actionTitle}
          </div>
        </div>

        <div className="text-center py-1">
          <label className="text-[11px] font-mono text-slate-400 uppercase tracking-widest block mb-1.5">
            Enter Manager PIN
          </label>
          <div className="flex justify-center space-x-3 py-1">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                  pin.length > idx ? 'bg-rose-400 border-rose-400 scale-110 shadow-rose-500/50' : 'border-slate-700 bg-slate-900'
                }`}
              />
            ))}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            (Demo Manager PIN is <span className="text-rose-400 font-bold">1234</span>)
          </div>
        </div>

        <NumericKeypad
          onNumber={(d) => {
            if (pin.length < 6) setPin((prev) => prev + d);
          }}
          onBackspace={() => setPin((prev) => prev.slice(0, -1))}
          onClear={() => setPin('')}
          onEnter={handleConfirm}
        />

        {error && (
          <div className="text-xs text-rose-400 bg-rose-950/50 border border-rose-800/80 p-2 rounded-xl text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
