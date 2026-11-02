import { Injectable, signal, inject } from '@angular/core';
import { ActivityLogEntry } from '../models/types';
import { DbService } from './db.service';
import { CryptoService } from './crypto.service';

@Injectable({
  providedIn: 'root'
})
export class ActivityLogService {
  private db = inject(DbService);
  private crypto = inject(CryptoService);

  logs = signal<ActivityLogEntry[]>([]);

  async loadRecentLogs() {
    try {
      const items = await this.db.getRecentLogs(100);
      this.logs.set(items);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    }
  }

  async log(
    category: ActivityLogEntry['category'],
    level: ActivityLogEntry['level'],
    messageEn: string,
    messageFa: string,
    details?: Record<string, unknown>
  ): Promise<ActivityLogEntry> {
    const entry: ActivityLogEntry = {
      id: this.crypto.generateId(),
      timestamp: Date.now(),
      category,
      level,
      messageEn,
      messageFa,
      details
    };

    // Update in-memory state
    this.logs.update((current) => [entry, ...current.slice(0, 99)]);

    // Persist to IndexedDB
    try {
      await this.db.saveLog(entry);
    } catch (err) {
      console.warn('Could not persist log entry to IndexedDB:', err);
    }

    return entry;
  }

  async clearAll() {
    await this.db.clearLogs();
    this.logs.set([]);
  }
}
