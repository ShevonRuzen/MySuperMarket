// User and Role types
export type UserRole = 'OWNER' | 'MANAGER' | 'CASHIER' | 'STOCK';

export interface User {
  id: string;
  branchId?: string | null;
  role: UserRole;
  name: string;
  email: string;
  salary?: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  phone: string;
  openingTime?: string | null;
  closingTime?: string | null;
  isActive: boolean;
  createdAt: string;
}

// Product & Inventory types
export interface Product {
  id: string;
  name: string;
  costPrice: number;
  isWeighed: boolean;
  unit: 'EACH' | 'KG' | 'G' | 'L';
  imageUrl?: string | null;
  isActive: boolean;
  barcodes: string[];
}

export interface BranchProduct {
  id: string;
  branchId: string;
  productId: string;
  sellingPrice: number;
  reorderLevel: number;
  shelfLocation?: string | null;
  isActive: boolean;
  product: Product;
  currentStock?: number;
}

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

// Sales & Payments
export type PaymentMethod = 'CASH' | 'CARD' | 'SPLIT_CASH' | 'SPLIT_CARD';
export type SaleStatus = 'PAID' | 'VOIDED' | 'REFUNDED';

export interface SalePayment {
  method: PaymentMethod;
  amount: number;
  cashTendered?: number;
  changeGiven?: number;
  reference?: string;
}

export interface Sale {
  id: string;
  offlineId?: string;
  branchId: string;
  shiftId: string;
  cashierId: string;
  invoiceNo: string;
  subtotal: number;
  discount: number;
  total: number;
  status: SaleStatus;
  items: CartItem[];
  payments: SalePayment[];
  createdAt: string;
}

export interface Shift {
  id: string;
  branchId: string;
  terminalId: string;
  cashierId: string;
  openingFloat: number;
  openedAt: string;
  closedAt?: string | null;
  expectedCash?: number;
  countedCash?: number;
  difference?: number;
  status: 'OPEN' | 'CLOSED';
}

// Hardware & Bridge WebSocket protocols
export type BridgeCommand =
  | { type: 'PRINT_RECEIPT'; payload: { invoiceNo: string; lines: string[]; cutAfter?: boolean } }
  | { type: 'OPEN_DRAWER' }
  | { type: 'GET_SCALE_WEIGHT' }
  | { type: 'GET_STATUS' };

export type BridgeEvent =
  | { type: 'SCALE_WEIGHT'; payload: { weight: number; unit: string; stable: boolean } }
  | { type: 'BARCODE_SCANNED'; payload: { barcode: string; source: 'scanner' | 'phone' | 'usb' } }
  | { type: 'PRINT_OK' }
  | { type: 'PRINT_ERROR'; payload: { message: string } }
  | { type: 'BRIDGE_STATUS'; payload: { printer: string; scale: string; drawer: string; version: string } };
