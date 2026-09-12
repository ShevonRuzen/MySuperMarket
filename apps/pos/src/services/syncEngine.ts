import axios from 'axios';
import { db, LocalProduct } from '../db/db';

export type SyncState = 'ONLINE' | 'OFFLINE' | 'SYNCING';

class SyncEngine {
  private syncInterval: any = null;
  private isSyncing = false;
  private onStatusChangeCallbacks: ((status: SyncState, queueCount: number) => void)[] = [];

  constructor() {
    // Listen to network status changes
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkOnline());
      window.addEventListener('offline', () => this.handleNetworkOffline());
    }
  }

  public subscribe(callback: (status: SyncState, queueCount: number) => void) {
    this.onStatusChangeCallbacks.push(callback);
    return () => {
      this.onStatusChangeCallbacks = this.onStatusChangeCallbacks.filter((cb) => cb !== callback);
    };
  }

  private notify(status: SyncState, queueCount: number) {
    this.onStatusChangeCallbacks.forEach((cb) => cb(status, queueCount));
  }

  public start(branchId: string) {
    this.stop();

    // 1. Initial sync immediately
    if (navigator.onLine) {
      this.pullProductCatalog(branchId);
      this.flushPendingQueue();
    }

    // 2. Periodic sync every 60 seconds
    this.syncInterval = setInterval(() => {
      if (navigator.onLine && !this.isSyncing) {
        this.pullProductCatalog(branchId);
        this.flushPendingQueue();
      }
    }, 60000);
  }

  public stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private async handleNetworkOnline() {
    console.log('[SyncEngine] 🟢 Network connected. Flushing pending queue...');
    this.notify('SYNCING', await this.getPendingCount());
    await this.flushPendingQueue();
    this.notify('ONLINE', await this.getPendingCount());
  }

  private async handleNetworkOffline() {
    console.log('[SyncEngine] 🟠 Network disconnected. Running offline mode.');
    this.notify('OFFLINE', await this.getPendingCount());
  }

  public async getPendingCount(): Promise<number> {
    return db.pendingSales.where('synced').equals(0 as any).count();
  }

  /**
   * Generates deterministic offline invoice sequence:
   * e.g. C07-20260912-T01-00042
   */
  public generateOfflineInvoiceNo(branchCode: string, terminalId: string, localSeq: number): string {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const cleanTerm = terminalId.slice(-3).toUpperCase();
    const seqStr = String(localSeq).padStart(5, '0');
    return `${branchCode}-${today}-${cleanTerm}-${seqStr}`;
  }

  /**
   * Pulls latest product catalog from server and updates IndexedDB cache.
   * Conflict resolution: Server pricing always wins for new transactions.
   */
  public async pullProductCatalog(branchId: string) {
    try {
      const res = await axios.get(`http://localhost:3000/api/products?branchId=${branchId}`, { timeout: 10000 });
      if (Array.isArray(res.data)) {
        for (const item of res.data) {
          const localProd: LocalProduct = {
            id: item.id,
            barcode: item.barcodes?.[0]?.barcode || '0000',
            name: item.name,
            sellingPrice: Number(item.branchProducts?.[0]?.sellingPrice || item.costPrice),
            costPrice: Number(item.costPrice),
            isWeighed: item.isWeighed,
            unit: item.unit,
            currentStock: Number(item.stocks?.[0]?.quantity || 0),
            categoryName: item.category?.name || 'General',
            updatedAt: new Date().toISOString(),
          };
          await db.products.put(localProd);
        }

        await db.syncLog.add({
          syncType: 'CATALOG_PULL',
          status: 'SUCCESS',
          itemsSynced: res.data.length,
          syncedAt: new Date().toISOString(),
          message: `Updated ${res.data.length} catalog products`,
        });
      }
    } catch (err: any) {
      console.warn('[SyncEngine] Catalog pull failed (offline or server busy):', err.message);
    }
  }

  /**
   * Flushes queued sales made during offline periods to server.
   * Uses idempotent offlineId to guarantee no double charges.
   */
  public async flushPendingQueue() {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const pending = await db.pendingSales.where('synced').equals(0 as any).toArray();
      if (pending.length === 0) {
        this.isSyncing = false;
        return;
      }

      this.notify('SYNCING', pending.length);

      let successCount = 0;
      for (const sale of pending) {
        try {
          await axios.post('http://localhost:3000/api/sales', sale, {
            timeout: 15000,
            headers: { Authorization: `Bearer ${localStorage.getItem('pos_token')}` },
          });

          if (sale.id) {
            await db.pendingSales.update(sale.id, { synced: true });
          }
          successCount++;
        } catch (postErr: any) {
          console.error('[SyncEngine] Error syncing sale:', sale.offlineId, postErr.message);
          if (sale.id) {
            await db.pendingSales.update(sale.id, {
              attempts: (sale.attempts || 0) + 1,
              lastError: postErr.message,
            });
          }
        }
      }

      await db.syncLog.add({
        syncType: 'SALES_FLUSH',
        status: successCount === pending.length ? 'SUCCESS' : 'ERROR',
        itemsSynced: successCount,
        syncedAt: new Date().toISOString(),
        message: `Successfully synchronized ${successCount} of ${pending.length} offline transactions`,
      });

      const remaining = await this.getPendingCount();
      this.notify(navigator.onLine ? 'ONLINE' : 'OFFLINE', remaining);
    } catch (e) {
      console.error('[SyncEngine] Queue flush exception:', e);
    } finally {
      this.isSyncing = false;
    }
  }
}

export const syncEngine = new SyncEngine();
