import Dexie, { Table } from 'dexie';

export interface LocalProduct {
  id: string;
  barcode: string;
  name: string;
  sellingPrice: number;
  costPrice: number;
  isWeighed: boolean;
  unit: string;
  currentStock: number;
  categoryName: string;
  updatedAt?: string;
}

export interface LocalPendingSale {
  id?: number;
  offlineId: string;
  branchId: string;
  shiftId: string;
  items: any[];
  payments: any[];
  total: number;
  createdAt: string;
  synced: boolean;
  attempts?: number;
  lastError?: string;
}

export interface LocalHeldSale {
  id?: number;
  holdRef: string;
  cartJson: any;
  heldAt: string;
}

export interface LocalSyncLog {
  id?: number;
  syncType: 'CATALOG_PULL' | 'SALES_FLUSH';
  status: 'SUCCESS' | 'ERROR';
  itemsSynced: number;
  syncedAt: string;
  message?: string;
}

export interface LocalShift {
  id: string;
  branchId: string;
  terminalId: string;
  cashierId: string;
  openingFloat: number;
  openedAt: string;
  closedAt?: string;
  status: 'OPEN' | 'CLOSED';
}

export class SupermarketDatabase extends Dexie {
  products!: Table<LocalProduct>;
  pendingSales!: Table<LocalPendingSale>;
  heldSales!: Table<LocalHeldSale>;
  syncLog!: Table<LocalSyncLog>;
  shifts!: Table<LocalShift>;

  constructor() {
    super('MySuperMarketPOS_DB');
    this.version(2).stores({
      products: 'id, barcode, name, categoryName',
      pendingSales: '++id, offlineId, synced, createdAt',
      heldSales: '++id, holdRef, heldAt',
      syncLog: '++id, syncType, status, syncedAt',
      shifts: 'id, terminalId, cashierId, status',
    });
  }
}

export const db = new SupermarketDatabase();
