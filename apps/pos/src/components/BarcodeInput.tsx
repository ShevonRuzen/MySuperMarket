import React, { useRef, useEffect, useState } from 'react';
import { Barcode, Search } from 'lucide-react';
import { usePosStore } from '../store/posStore';

export const BarcodeInput: React.FC = () => {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { addItemByBarcode, keyboardMode } = usePosStore();

  // Auto-focus retention
  useEffect(() => {
    if (keyboardMode === 'BARCODE') {
      inputRef.current?.focus();
    }
  }, [keyboardMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;

    const barcode = value.trim();
    setValue(''); // Auto-clear immediately
    const success = await addItemByBarcode(barcode);
    if (!success) {
      // Audio or visual error feedback
      console.warn('Unknown barcode:', barcode);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-sky-400">
        <Barcode className="w-6 h-6" />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={keyboardMode !== 'BARCODE'}
        placeholder="Scan Barcode / Type PLU or Code [F2]..."
        className="w-full pl-12 pr-12 py-3 bg-pos-surface border-2 border-sky-500/60 focus:border-sky-400 rounded-xl text-xl font-mono text-white placeholder-slate-400 outline-none shadow-inner"
        autoFocus
      />
      <button
        type="submit"
        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-sky-400"
      >
        <Search className="w-5 h-5" />
      </button>
    </form>
  );
};
