import React, { useEffect, useState } from 'react';
import { usePosStore } from '../store/posStore';
import { BarcodeInput } from '../components/BarcodeInput';
import { Cart } from '../components/Cart';
import { NumericKeypad } from '../components/NumericKeypad';
import { CashPaymentModal } from '../components/CashPaymentModal';
import { PayHereModal } from '../components/PayHereModal';
import { WeightModal } from '../components/WeightModal';
import { PhoneScannerModal } from '../components/PhoneScannerModal';
import {
  Wifi,
  WifiOff,
  Radio,
  User,
  LogOut,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import axios from 'axios';
import { db } from '../db/db';

export const PosScreen: React.FC = () => {
  const {
    cashier,
    terminalId,
    branchName,
    branchCode,
    isOnline,
    bridgeConnected,
    pendingSyncCount,
    keyboardMode,
    setKeyboardMode,
    logout,
    addItem,
    addItemByBarcode,
    setOnlineStatus,
    setBridgeStatus,
    checkPendingSync,
  } = usePosStore();

  const [quickProducts, setQuickProducts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [showHelp, setShowHelp] = useState(false);

  // Monitor network online/offline state
  useEffect(() => {
    const handleOnline = () => {
      setOnlineStatus(true);
      flushPendingSales();
    };
    const handleOffline = () => setOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Flush pending offline sales when connectivity is restored
  const flushPendingSales = async () => {
    try {
      const pending = await db.pendingSales.where('synced').equals(0 as any).toArray();
      for (const sale of pending) {
        await axios.post('http://localhost:3000/api/sales', sale);
        if (sale.id) {
          await db.pendingSales.update(sale.id, { synced: true });
        }
      }
      await checkPendingSync();
    } catch (e) {
      console.warn('Sync attempt failed, will retry later:', e);
    }
  };

  // Connect to Desktop Hardware Bridge WebSocket
  useEffect(() => {
    let ws: WebSocket | null = null;
    let timer: any = null;

    const connectBridge = () => {
      try {
        ws = new WebSocket('ws://localhost:17777');
        ws.onopen = () => {
          setBridgeStatus(true);
        };
        ws.onmessage = async (event) => {
          const msg = JSON.parse(event.data);
          // Handle barcode scanned from phone scanner PWA
          if (msg.type === 'BARCODE_SCANNED' && msg.payload?.barcode) {
            await addItemByBarcode(msg.payload.barcode);
          }
        };
        ws.onclose = () => {
          setBridgeStatus(false);
          timer = setTimeout(connectBridge, 3000);
        };
        ws.onerror = () => {
          setBridgeStatus(false);
        };
      } catch (e) {
        setBridgeStatus(false);
        timer = setTimeout(connectBridge, 3000);
      }
    };

    connectBridge();
    return () => {
      if (ws) ws.close();
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Fetch products for quick catalog grid
  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await axios.get('http://localhost:3000/api/products');
        if (res.data) {
          const mapped = res.data.map((p: any) => ({
            id: p.id,
            barcode: p.barcodes[0]?.barcode || '0000',
            name: p.name,
            sellingPrice: p.branchProducts[0]?.sellingPrice || p.costPrice,
            costPrice: p.costPrice,
            isWeighed: p.isWeighed,
            unit: p.unit,
            currentStock: p.stocks[0]?.quantity || 0,
            categoryName: p.category?.name || 'General',
          }));
          setQuickProducts(mapped);
          // Cache in Dexie
          for (const item of mapped) {
            await db.products.put(item);
          }
        }
      } catch (err) {
        // Load from local IndexedDB if offline
        const local = await db.products.toArray();
        if (local.length > 0) {
          setQuickProducts(local);
        }
      }
    }
    loadProducts();
    checkPendingSync();
  }, []);

  // Global F-Key Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setShowHelp((prev) => !prev);
      } else if (e.key === 'F2') {
        e.preventDefault();
        setKeyboardMode('BARCODE');
      } else if (e.key === 'F4') {
        e.preventDefault();
        setKeyboardMode('CASH');
      } else if (e.key === 'F5') {
        e.preventDefault();
        if (isOnline) setKeyboardMode('PAYHERE');
      } else if (e.key === 'F11') {
        e.preventDefault();
        setKeyboardMode('SCANNER_QR');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowHelp(false);
        setKeyboardMode('BARCODE');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOnline]);

  const categories = ['ALL', 'Dairy & Eggs', 'Bakery & Bread', 'Rice & Grains', 'Beverages & Tea', 'Fresh Produce'];

  const filteredProducts =
    selectedCategory === 'ALL'
      ? quickProducts
      : quickProducts.filter((p) => p.categoryName.toLowerCase().includes(selectedCategory.toLowerCase().slice(0, 4)));

  return (
    <div className="h-screen w-screen bg-pos-bg flex flex-col select-none overflow-hidden">
      {/* Top Application Bar */}
      <header className="h-14 bg-pos-surface border-b border-pos-border px-4 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-3">
          <span className="text-xl font-black text-white tracking-tight">
            MySuperMarket <span className="text-sky-400 text-sm font-semibold">POS</span>
          </span>
          <span className="text-xs bg-slate-800 text-slate-300 font-mono px-2.5 py-1 rounded-md border border-slate-700">
            {branchName} ({branchCode})
          </span>
          <span className="text-xs text-slate-400 font-mono">Counter: 01</span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Online / Offline status */}
          <div
            className={`flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full font-bold ${
              isOnline
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                : 'bg-amber-950 text-amber-400 border border-amber-800 animate-pulse'
            }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{isOnline ? 'ONLINE' : 'OFFLINE MODE'}</span>
          </div>

          {/* Pending sync indicator */}
          {pendingSyncCount > 0 && (
            <div className="flex items-center space-x-1 text-xs px-2 py-1 bg-amber-500/20 text-amber-300 rounded font-mono">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>{pendingSyncCount} queued</span>
            </div>
          )}

          {/* Bridge connection badge */}
          <div
            className={`flex items-center space-x-1 text-xs px-2.5 py-1 rounded-md border ${
              bridgeConnected
                ? 'bg-slate-800 text-sky-400 border-sky-500/30'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
            title="Desktop Hardware Bridge Status"
          >
            <Radio className="w-3.5 h-3.5" />
            <span className="text-[11px] font-mono">
              {bridgeConnected ? 'HARDWARE READY' : 'BRIDGE STANDBY'}
            </span>
          </div>

          {/* Cashier profile & Logout */}
          <div className="flex items-center space-x-2 pl-3 border-l border-pos-border">
            <div className="flex items-center space-x-1.5 text-sm text-slate-200">
              <User className="w-4 h-4 text-sky-400" />
              <span className="font-semibold">{cashier?.name?.split(' ')[0] || 'Cashier'}</span>
            </div>
            <button
              onClick={logout}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg transition"
              title="Close Shift & Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Terminal Workspace */}
      <div className="flex-1 grid grid-cols-12 gap-3 p-3 overflow-hidden">
        {/* Left 7 Columns: Product Scanner & Catalog Tiles */}
        <div className="col-span-7 flex flex-col space-y-3 overflow-hidden">
          {/* Barcode Search Bar */}
          <BarcodeInput />

          {/* Category Tabs */}
          <div className="flex space-x-1.5 overflow-x-auto pb-1 shrink-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-sky-500 text-white shadow'
                    : 'bg-pos-surface text-slate-400 hover:text-slate-200 border border-pos-border'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Quick-Pick Grid */}
          <div className="flex-1 bg-pos-surface border border-pos-border rounded-xl p-3 overflow-y-auto">
            <div className="grid grid-cols-3 gap-2.5">
              {filteredProducts.map((prod) => (
                <button
                  key={prod.id}
                  onClick={() => {
                    if (prod.isWeighed) {
                      addItemByBarcode(prod.barcode);
                    } else {
                      addItem(prod, 1);
                    }
                  }}
                  className="p-3 bg-slate-800/80 hover:bg-slate-700 active:scale-95 border border-slate-700/80 rounded-xl text-left transition flex flex-col justify-between h-24 shadow group"
                >
                  <div className="font-bold text-slate-100 text-xs line-clamp-2 group-hover:text-sky-400">
                    {prod.name}
                  </div>
                  <div className="flex justify-between items-baseline mt-1 font-mono">
                    <span className="text-[10px] text-slate-400">
                      {prod.isWeighed ? 'KG Scale' : `Stock: ${prod.currentStock}`}
                    </span>
                    <span className="font-extrabold text-sm text-emerald-400">
                      LKR {prod.sellingPrice}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* On-Screen Numeric Keypad for fast quantity/cash entry */}
          <div className="h-44 shrink-0">
            <NumericKeypad
              onNumber={(n) => {
                // Focus barcode input and append
                const input = document.querySelector('input') as HTMLInputElement;
                if (input) {
                  input.value += n;
                  input.focus();
                }
              }}
              onBackspace={() => {
                const input = document.querySelector('input') as HTMLInputElement;
                if (input) {
                  input.value = input.value.slice(0, -1);
                  input.focus();
                }
              }}
              onClear={() => {
                const input = document.querySelector('input') as HTMLInputElement;
                if (input) {
                  input.value = '';
                  input.focus();
                }
              }}
              onEnter={() => {
                const form = document.querySelector('form');
                if (form) form.requestSubmit();
              }}
            />
          </div>
        </div>

        {/* Right 5 Columns: Active Transaction Cart */}
        <div className="col-span-5 h-full overflow-hidden">
          <Cart />
        </div>
      </div>

      {/* Bottom Keyboard Shortcuts Strip */}
      <footer className="h-9 bg-slate-950 border-t border-pos-border px-4 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <div className="flex items-center space-x-4">
          <span><kbd className="bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded">F1</kbd> Help</span>
          <span><kbd className="bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded">F2</kbd> Barcode</span>
          <span><kbd className="bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded">F4</kbd> Cash</span>
          <span><kbd className="bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded">F5</kbd> PayHere Card</span>
          <span><kbd className="bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded">F8</kbd> Hold Sale</span>
          <span><kbd className="bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded">F11</kbd> Phone Scanner</span>
          <span><kbd className="bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded">ESC</kbd> Cancel</span>
        </div>
        <button
          onClick={() => setShowHelp(true)}
          className="flex items-center space-x-1 text-slate-400 hover:text-white"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Shortcuts Guide</span>
        </button>
      </footer>

      {/* Modals */}
      {keyboardMode === 'CASH' && <CashPaymentModal />}
      {keyboardMode === 'PAYHERE' && <PayHereModal />}
      {keyboardMode === 'WEIGHT' && <WeightModal />}
      {keyboardMode === 'SCANNER_QR' && <PhoneScannerModal />}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-pos-surface border border-pos-border rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">POS Cashier Keyboard Shortcuts</h3>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 bg-slate-900 rounded"><span className="text-sky-400 font-bold">F1:</span> Show/Hide Shortcuts</div>
              <div className="p-2 bg-slate-900 rounded"><span className="text-sky-400 font-bold">F2:</span> Focus Barcode Field</div>
              <div className="p-2 bg-slate-900 rounded"><span className="text-sky-400 font-bold">F4:</span> Cash Payment Screen</div>
              <div className="p-2 bg-slate-900 rounded"><span className="text-sky-400 font-bold">F5:</span> PayHere Card Screen</div>
              <div className="p-2 bg-slate-900 rounded"><span className="text-sky-400 font-bold">F8:</span> Hold Current Cart</div>
              <div className="p-2 bg-slate-900 rounded"><span className="text-sky-400 font-bold">F11:</span> Pair Mobile Camera Scanner</div>
              <div className="p-2 bg-slate-900 rounded"><span className="text-sky-400 font-bold">ENTER:</span> Confirm Step</div>
              <div className="p-2 bg-slate-900 rounded"><span className="text-sky-400 font-bold">ESC:</span> Cancel / Clear Field</div>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-sm"
            >
              Close [ESC]
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
