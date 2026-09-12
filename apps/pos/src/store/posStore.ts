import { create } from 'zustand';
import { db, LocalProduct } from '../db/db';
import axios from 'axios';

export interface CartItem {
  productId: string;
  barcode: string;
  name: string;
  unitPrice: number;
  qty: number;
  weightKg?: number;
  discountAmount: number;
  lineTotal: number;
  isWeighed: boolean;
}

export type KeyboardMode = 'BARCODE' | 'CASH' | 'PAYHERE' | 'WEIGHT' | 'SCANNER_QR' | 'QTY';

interface PosState {
  // Session
  cashier: any | null;
  shift: any | null;
  terminalId: string;
  branchId: string;
  branchName: string;
  branchCode: string;
  
  // Connection & Offline
  isOnline: boolean;
  bridgeConnected: boolean;
  pendingSyncCount: number;

  // Cart
  cart: CartItem[];
  keyboardMode: KeyboardMode;
  activeWeighedProduct: LocalProduct | null;

  // Actions
  setSession: (cashier: any, shift: any) => void;
  logout: () => void;
  setKeyboardMode: (mode: KeyboardMode) => void;
  addItemByBarcode: (barcode: string) => Promise<boolean>;
  addItem: (product: LocalProduct, qty?: number, weightKg?: number) => void;
  updateItemQty: (index: number, qty: number) => void;
  removeItem: (index: number) => void;
  clearCart: () => void;
  setActiveWeighedProduct: (prod: LocalProduct | null) => void;
  setOnlineStatus: (status: boolean) => void;
  setBridgeStatus: (status: boolean) => void;
  checkPendingSync: () => Promise<void>;
}

export const usePosStore = create<PosState>((set, get) => ({
  cashier: null,
  shift: null,
  terminalId: '',
  branchId: '',
  branchName: 'Colombo 07',
  branchCode: 'C07',

  isOnline: navigator.onLine,
  bridgeConnected: false,
  pendingSyncCount: 0,

  cart: [],
  keyboardMode: 'BARCODE',
  activeWeighedProduct: null,

  setSession: (cashier, shift) => {
    set({
      cashier,
      shift,
      terminalId: cashier.terminalId,
      branchId: cashier.branchId,
      branchName: cashier.branchName,
      branchCode: cashier.branchCode,
    });
  },

  logout: () => {
    set({ cashier: null, shift: null, cart: [] });
  },

  setKeyboardMode: (mode) => set({ keyboardMode: mode }),

  setActiveWeighedProduct: (prod) => set({ activeWeighedProduct: prod }),

  setOnlineStatus: (status) => set({ isOnline: status }),
  setBridgeStatus: (status) => set({ bridgeConnected: status }),

  checkPendingSync: async () => {
    const count = await db.pendingSales.where('synced').equals(0 as any).count();
    set({ pendingSyncCount: count });
  },

  addItem: (product, qty = 1, weightKg) => {
    const { cart } = get();
    const effectiveQty = weightKg ? weightKg : qty;
    const lineTotal = Number(product.sellingPrice) * effectiveQty;

    // Check if already in cart (non-weighed)
    if (!product.isWeighed) {
      const existingIdx = cart.findIndex((i) => i.productId === product.id);
      if (existingIdx !== -1) {
        const updated = [...cart];
        updated[existingIdx].qty += qty;
        updated[existingIdx].lineTotal = updated[existingIdx].qty * updated[existingIdx].unitPrice - updated[existingIdx].discountAmount;
        set({ cart: updated });
        return;
      }
    }

    const newItem: CartItem = {
      productId: product.id,
      barcode: product.barcode,
      name: product.name,
      unitPrice: Number(product.sellingPrice),
      qty: product.isWeighed ? 1 : qty,
      weightKg: weightKg,
      discountAmount: 0,
      lineTotal,
      isWeighed: product.isWeighed,
    };

    set({ cart: [newItem, ...cart] });
  },

  addItemByBarcode: async (barcode: string) => {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) return false;

    // 1. Check local IndexedDB cache first for instant response (< 5ms)
    let prod = await db.products.where('barcode').equals(cleanBarcode).first();

    // 2. If not found locally and online, fetch from backend API
    if (!prod && get().isOnline) {
      try {
        const res = await axios.get(`http://localhost:3000/api/products/barcode/${cleanBarcode}?branchId=${get().branchId}`);
        if (res.data) {
          prod = {
            id: res.data.id,
            barcode: res.data.barcode,
            name: res.data.name,
            sellingPrice: res.data.sellingPrice,
            costPrice: res.data.costPrice,
            isWeighed: res.data.isWeighed,
            unit: res.data.unit,
            currentStock: res.data.currentStock,
            categoryName: res.data.categoryName,
          };
          // Cache locally
          await db.products.put(prod);
        }
      } catch (err) {
        console.warn('Barcode not found in API:', cleanBarcode);
      }
    }

    if (!prod) {
      return false;
    }

    // 3. If product is weighed, trigger WEIGHT modal
    if (prod.isWeighed) {
      set({ activeWeighedProduct: prod, keyboardMode: 'WEIGHT' });
      return true;
    }

    // 4. Add normal product directly to cart
    get().addItem(prod, 1);
    return true;
  },

  updateItemQty: (index, qty) => {
    const { cart } = get();
    if (qty <= 0) {
      get().removeItem(index);
      return;
    }
    const updated = [...cart];
    updated[index].qty = qty;
    updated[index].lineTotal = qty * updated[index].unitPrice - updated[index].discountAmount;
    set({ cart: updated });
  },

  removeItem: (index) => {
    const { cart } = get();
    const updated = cart.filter((_, i) => i !== index);
    set({ cart: updated });
  },

  clearCart: () => set({ cart: [] }),
}));
