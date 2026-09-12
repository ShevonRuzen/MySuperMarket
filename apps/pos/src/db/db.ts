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
}

export interface LocalHeldSale {
  id?: number;
  holdRef: string;
  cartJson: any;
  heldAt: string;
}

export class SupermarketDatabase extends Dexie {
  products!: Table<LocalProduct>;
  pendingSales!: Table<LocalPendingSale>;
  heldSales!: Table<LocalHeldSale>;

  constructor() {
    super('MySuperMarketPOS_DB');
    this.version(1).stores({
      products: 'id, barcode, name',
      pendingSales: '++id, offlineId, synced, createdAt',
      heldSales: '++id, holdRef, heldAt',
    });
  }
}

export const db = new SupermarketDatabase();
