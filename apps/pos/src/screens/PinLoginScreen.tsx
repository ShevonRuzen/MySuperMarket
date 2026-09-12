import React, { useState, useEffect } from 'react';
import { usePosStore } from '../store/posStore';
import { NumericKeypad } from '../components/NumericKeypad';
import { Store, ShieldCheck, Banknote } from 'lucide-react';
import axios from 'axios';

export const PinLoginScreen: React.FC = () => {
  const { setSession, isOnline } = usePosStore();

  const [pin, setPin] = useState('');
  const [openingFloat, setOpeningFloat] = useState('5000');
  const [step, setStep] = useState<'PIN' | 'FLOAT'>('PIN');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [terminals, setTerminals] = useState<any[]>([]);
  const [selectedTerminalId, setSelectedTerminalId] = useState('');

  useEffect(() => {
    // Fetch active branches and terminals
    async function fetchTerminals() {
      try {
        const res = await axios.get('http://localhost:3000/api/branches');
        if (res.data && res.data.length > 0) {
          const allTerminals = res.data.flatMap((b: any) =>
            b.terminals.map((t: any) => ({
              ...t,
              branchName: b.name,
              branchCode: b.code,
            }))
          );
          setTerminals(allTerminals);
          if (allTerminals.length > 0) {
            setSelectedTerminalId(allTerminals[0].id);
          }
        }
      } catch (e) {
        // Fallback demo terminal for offline start
        const fallback = {
          id: 'demo-term-01',
          name: 'POS Terminal 01',
          branchName: 'Colombo 07 - Flagship Store',
          branchCode: 'C07',
          branchId: 'demo-branch',
        };
        setTerminals([fallback]);
        setSelectedTerminalId(fallback.id);
      }
    }
    fetchTerminals();
  }, []);

  // Capture physical USB keyboard / numpad strokes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        if (step === 'PIN' && pin.length < 6) {
          setPin((prev) => prev + e.key);
        } else if (step === 'FLOAT') {
          setOpeningFloat((prev) => prev + e.key);
        }
      } else if (e.key === 'Backspace') {
        if (step === 'PIN') setPin((prev) => prev.slice(0, -1));
        else setOpeningFloat((prev) => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        handleEnter();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, openingFloat, step, selectedTerminalId]);

  const handleEnter = async () => {
    setError('');
    if (step === 'PIN') {
      if (pin.length < 4) {
        setError('PIN must be at least 4 digits');
        return;
      }
      setStep('FLOAT');
    } else {
      // Step: FLOAT -> complete login & open shift
      setLoading(true);
      try {
        let authRes;
        try {
          authRes = await axios.post('http://localhost:3000/api/auth/pos/pin-login', {
            terminalId: selectedTerminalId,
            pin,
          });
          localStorage.setItem('pos_token', authRes.data.accessToken);
        } catch (authErr) {
          if (isOnline) {
            setError('Invalid PIN or Terminal ID');
            setStep('PIN');
            setPin('');
            setLoading(false);
            return;
          }
        }

        const cashierInfo = authRes?.data?.cashier || {
          id: 'cashier-1',
          name: 'Kasun Bandara (Cashier)',
          role: 'CASHIER',
          branchId: 'demo-branch',
          branchName: 'Colombo 07 - Flagship Store',
          branchCode: 'C07',
          terminalId: selectedTerminalId,
        };

        const shiftInfo = {
          id: `shift-${Date.now()}`,
          openingFloat: parseFloat(openingFloat) || 5000,
          openedAt: new Date().toISOString(),
        };

        setSession(cashierInfo, shiftInfo);
      } catch (err) {
        setError('Failed to start cashier session');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-pos-bg flex items-center justify-center p-4">
      <div className="bg-pos-surface border border-pos-border rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex p-3 bg-sky-500/10 border border-sky-500/30 rounded-2xl text-sky-400 mb-2">
            <Store className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">MySuperMarket POS</h1>
          <p className="text-xs text-slate-400">Cashier Terminal Authentication</p>
        </div>

        {/* Terminal Selection */}
        <div>
          <label className="block text-xs font-mono text-slate-400 mb-1">Select Counter / Terminal:</label>
          <select
            value={selectedTerminalId}
            onChange={(e) => setSelectedTerminalId(e.target.value)}
            className="w-full bg-slate-900 border border-pos-border rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-200 outline-none"
          >
            {terminals.map((t) => (
              <option key={t.id} value={t.id}>
                {t.branchName} — {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Step 1: PIN Input */}
        {step === 'PIN' ? (
          <div className="space-y-4">
            <div className="text-center">
              <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-2">
                Enter Cashier Security PIN (4-6 digits)
              </label>
              <div className="flex justify-center space-x-3 py-2">
                {[0, 1, 2, 3, 4, 5].map((idx) => (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full border-2 transition-all ${
                      pin.length > idx
                        ? 'bg-sky-400 border-sky-400 scale-110 shadow-lg shadow-sky-500/50'
                        : 'border-slate-600 bg-slate-800'
                    }`}
                  />
                ))}
              </div>
              <div className="text-[11px] text-slate-500 mt-2 font-mono">
                Hint: Demo PIN is <span className="text-sky-400 font-bold">1234</span>
              </div>
            </div>

            <NumericKeypad
              onNumber={(digit) => {
                if (pin.length < 6) setPin((prev) => prev + digit);
              }}
              onBackspace={() => setPin((prev) => prev.slice(0, -1))}
              onClear={() => setPin('')}
              onEnter={handleEnter}
            />
          </div>
        ) : (
          /* Step 2: Opening Float Input */
          <div className="space-y-4">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 text-emerald-400 font-bold mb-1">
                <Banknote className="w-5 h-5" />
                <span className="text-sm">Opening Cash Float</span>
              </div>
              <p className="text-xs text-slate-400 mb-2">Count cash in drawer before starting:</p>
              <div className="text-3xl font-mono font-black text-emerald-400 py-1">
                LKR {parseFloat(openingFloat || '0').toFixed(2)}
              </div>
            </div>

            <NumericKeypad
              onNumber={(digit) => setOpeningFloat((prev) => prev + digit)}
              onBackspace={() => setOpeningFloat((prev) => prev.slice(0, -1))}
              onClear={() => setOpeningFloat('')}
              onEnter={handleEnter}
            />
          </div>
        )}

        {error && (
          <div className="bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs py-2 px-3 rounded-xl text-center">
            {error}
          </div>
        )}

        <div className="flex justify-between items-center text-[11px] text-slate-500 font-mono pt-2 border-t border-pos-border">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Encrypted Session</span>
          </div>
          <div>{isOnline ? '🟢 Cloud Online' : '🟠 Offline Mode'}</div>
        </div>
      </div>
    </div>
  );
};
