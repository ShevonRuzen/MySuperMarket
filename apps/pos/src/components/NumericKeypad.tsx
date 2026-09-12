import React from 'react';
import { Delete, CornerDownLeft, RotateCcw } from 'lucide-react';

interface NumericKeypadProps {
  onNumber: (digit: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onEnter: () => void;
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({
  onNumber,
  onBackspace,
  onClear,
  onEnter,
}) => {
  const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.'];

  return (
    <div className="grid grid-cols-3 gap-2 p-2 bg-pos-surface border border-pos-border rounded-xl select-none">
      {['7', '8', '9'].map((num) => (
        <button
          key={num}
          onClick={() => onNumber(num)}
          className="h-14 text-2xl font-bold bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg text-slate-100 transition shadow"
        >
          {num}
        </button>
      ))}

      {['4', '5', '6'].map((num) => (
        <button
          key={num}
          onClick={() => onNumber(num)}
          className="h-14 text-2xl font-bold bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg text-slate-100 transition shadow"
        >
          {num}
        </button>
      ))}

      {['1', '2', '3'].map((num) => (
        <button
          key={num}
          onClick={() => onNumber(num)}
          className="h-14 text-2xl font-bold bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg text-slate-100 transition shadow"
        >
          {num}
        </button>
      ))}

      <button
        onClick={() => onNumber('0')}
        className="h-14 text-2xl font-bold bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg text-slate-100 transition shadow"
      >
        0
      </button>

      <button
        onClick={() => onNumber('.')}
        className="h-14 text-2xl font-bold bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg text-slate-100 transition shadow"
      >
        .
      </button>

      <button
        onClick={onBackspace}
        className="h-14 flex items-center justify-center bg-slate-700 hover:bg-slate-600 active:bg-slate-500 rounded-lg text-amber-400 transition shadow"
        title="Backspace"
      >
        <Delete className="w-6 h-6" />
      </button>

      <button
        onClick={onClear}
        className="col-span-1 h-14 flex items-center justify-center font-bold bg-rose-950/60 hover:bg-rose-900 border border-rose-800 rounded-lg text-rose-300 transition shadow"
        title="Clear"
      >
        <RotateCcw className="w-5 h-5 mr-1" /> CLR
      </button>

      <button
        onClick={onEnter}
        className="col-span-2 h-14 flex items-center justify-center font-bold text-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-400 rounded-lg text-white transition shadow"
        title="Enter"
      >
        <CornerDownLeft className="w-6 h-6 mr-1" /> ENTER
      </button>
    </div>
  );
};
