import { db } from './db';
import { apiRequest } from '../apiClient';

class SyncEngine {
  private syncing = false;
  private syncInterval: any;

  start() {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('online', () => this.sync());
    
    // Background interval just in case
    this.syncInterval = setInterval(() => {
      if (navigator.onLine) this.sync();
    }, 30000); // every 30s
  }

  stop() {
    if (this.syncInterval) clearInterval(this.syncInterval);
    window.removeEventListener('online', () => this.sync());
  }

  async sync() {
    if (this.syncing || !navigator.onLine) return;
    this.syncing = true;
    
    try {
      const pendingItems = await db.syncQueue
        .where('status')
        .equals('pending')
        .sortBy('timestamp');

      if (pendingItems.length === 0) return;

      console.log(`[OfflineOps] Starting sync for ${pendingItems.length} items`);

      for (const item of pendingItems) {
        try {
          const payload = {
            operationId: item.operationId,
            qrCodeData: item.qrCodeData,
            volunteerId: item.volunteerId,
            scannerInfo: item.scannerInfo,
          };

          await apiRequest(
            `/events/${encodeURIComponent(item.eventId)}/scan-qr`,
            { 
              method: "POST", 
              body: JSON.stringify(payload), 
              cache: "no-store", 
              timeoutMs: 5000 
            }
          );

          // Success - mark synced and keep for audit, or delete
          console.log(`[OfflineOps] Successfully synced ${item.operationId}`);
          
          // Delete after sync
          await db.syncQueue.delete(item.operationId);

        } catch (err: any) {
          const msg = (err.message || "").toLowerCase();
          const isPermanentFailure =
            msg.includes("not assigned") ||
            msg.includes("volunteer access") ||
            msg.includes("too many") ||
            err.status === 403 ||
            err.status === 429 ||
            err.status === 400 ||
            msg.includes("already checked in") ||
            msg.includes("duplicate");

          if (isPermanentFailure) {
            console.error(`[OfflineOps] Permanent failure for ${item.operationId}:`, err);
            await db.syncQueue.update(item.operationId, { 
              status: 'failed',
              errorDetails: err.message
            });
          } else {
            // Transient, retry later
            console.warn(`[OfflineOps] Transient failure for ${item.operationId}, will retry`);
            await db.syncQueue.update(item.operationId, {
              retryCount: item.retryCount + 1
            });
            // Stop syncing on network error
            break; 
          }
        }
      }
    } finally {
      this.syncing = false;
    }
  }

  async queueScan(eventId: string, qrCodeData: string, volunteerId: string | undefined, scannerInfo: any) {
    const operationId = `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    await db.syncQueue.add({
      operationId,
      eventId,
      qrCodeData,
      volunteerId,
      scannerInfo,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending'
    });

    // Try to sync immediately if online
    if (navigator.onLine) {
      setTimeout(() => this.sync(), 1000);
    }
    
    return operationId;
  }
}

export const syncEngine = new SyncEngine();
