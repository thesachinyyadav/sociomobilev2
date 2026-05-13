import Dexie, { Table } from 'dexie';

export interface OfflineEvent {
  id: string;
  data: any;
  updatedAt: number;
}

export interface AttendeeSnapshot {
  qrData: string;
  eventId: string;
  name: string;
  status: 'scanned' | 'already_present' | 'valid';
  synced: boolean;
  updatedAt: number;
}

export interface SyncQueueItem {
  operationId: string;
  eventId: string;
  qrCodeData: string;
  volunteerId: string | undefined;
  scannerInfo: any;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'failed' | 'synced';
  errorDetails?: string;
}

export interface AuthCache {
  id: string;
  sessionData: any;
  userData: any;
  updatedAt: number;
}

export class SocioDB extends Dexie {
  events!: Table<OfflineEvent, string>;
  attendees!: Table<AttendeeSnapshot, string>; // primary key: qrData
  syncQueue!: Table<SyncQueueItem, string>; // primary key: operationId
  auth!: Table<AuthCache, string>; // primary key: 'current'

  constructor() {
    super('SocioOfflineDB');
    this.version(1).stores({
      events: 'id',
      attendees: 'qrData, eventId, status, synced',
      syncQueue: 'operationId, eventId, status, timestamp',
      auth: 'id'
    });
  }
}

export const db = new SocioDB();
