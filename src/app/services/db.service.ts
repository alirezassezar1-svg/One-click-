import { Injectable } from '@angular/core';
import { ProjectManifest, FileItem, ProjectSnapshot, TransferReceipt, ActivityLogEntry, AppSettings } from '../models/types';

const DB_NAME = 'NONONICK_HUB_DB';
const DB_VERSION = 1;

@Injectable({
  providedIn: 'root'
})
export class DbService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    if (typeof indexedDB === 'undefined') {
      throw new Error('IndexedDB is not supported in this browser environment');
    }

    this.initPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Projects store
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }

        // Project files store
        if (!db.objectStoreNames.contains('project_files')) {
          const fileStore = db.createObjectStore('project_files', { keyPath: 'id' });
          fileStore.createIndex('projectId', 'parentId', { unique: false });
        }

        // Snapshots store
        if (!db.objectStoreNames.contains('snapshots')) {
          const snapStore = db.createObjectStore('snapshots', { keyPath: 'id' });
          snapStore.createIndex('projectId', 'projectId', { unique: false });
        }

        // Transfer receipts store
        if (!db.objectStoreNames.contains('transfer_receipts')) {
          const receiptStore = db.createObjectStore('transfer_receipts', { keyPath: 'id' });
          receiptStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Activity logs store
        if (!db.objectStoreNames.contains('activity_logs')) {
          const logStore = db.createObjectStore('activity_logs', { keyPath: 'id' });
          logStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.initPromise;
  }

  // --- Projects Operations ---

  async getAllProjects(): Promise<ProjectManifest[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('projects', 'readonly');
      const store = tx.objectStore('projects');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getProject(id: string): Promise<ProjectManifest | undefined> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('projects', 'readonly');
      const store = tx.objectStore('projects');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveProject(project: ProjectManifest): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('projects', 'readwrite');
      const store = tx.objectStore('projects');
      const request = store.put(project);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteProject(id: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['projects', 'project_files', 'snapshots'], 'readwrite');
      tx.objectStore('projects').delete(id);

      // Clean up files belonging to this project
      const fileStore = tx.objectStore('project_files');
      const fileIndex = fileStore.index('projectId');
      const req = fileIndex.openCursor(IDBKeyRange.only(id));
      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- Project Files Operations ---

  async getFilesByProject(projectId: string): Promise<FileItem[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('project_files', 'readonly');
      const store = tx.objectStore('project_files');
      const index = store.index('projectId');
      const request = index.getAll(projectId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveFile(file: FileItem): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('project_files', 'readwrite');
      const store = tx.objectStore('project_files');
      const request = store.put(file);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveFilesBatch(files: FileItem[]): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('project_files', 'readwrite');
      const store = tx.objectStore('project_files');
      for (const file of files) {
        store.put(file);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteFile(id: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('project_files', 'readwrite');
      const store = tx.objectStore('project_files');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Snapshots Operations ---

  async getSnapshots(projectId: string): Promise<ProjectSnapshot[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('snapshots', 'readonly');
      const store = tx.objectStore('snapshots');
      const index = store.index('projectId');
      const request = index.getAll(projectId);
      request.onsuccess = () => {
        const sorted = (request.result || []).sort((a, b) => b.timestamp - a.timestamp);
        resolve(sorted);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveSnapshot(snapshot: ProjectSnapshot): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('snapshots', 'readwrite');
      const store = tx.objectStore('snapshots');
      const request = store.put(snapshot);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Transfer Receipts Operations ---

  async getAllReceipts(limit = 100): Promise<TransferReceipt[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('transfer_receipts', 'readonly');
      const store = tx.objectStore('transfer_receipts');
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev');
      const results: TransferReceipt[] = [];

      request.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveReceipt(receipt: TransferReceipt): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('transfer_receipts', 'readwrite');
      const store = tx.objectStore('transfer_receipts');
      const request = store.put(receipt);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Activity Logs Operations ---

  async getRecentLogs(limit = 100): Promise<ActivityLogEntry[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('activity_logs', 'readonly');
      const store = tx.objectStore('activity_logs');
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev');
      const results: ActivityLogEntry[] = [];

      request.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveLog(log: ActivityLogEntry): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('activity_logs', 'readwrite');
      const store = tx.objectStore('activity_logs');
      const request = store.put(log);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearLogs(): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('activity_logs', 'readwrite');
      const store = tx.objectStore('activity_logs');
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Settings Operations ---

  async getSettings(): Promise<AppSettings | null> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const request = store.get('app_config');
      request.onsuccess = () => resolve(request.result ? request.result.value : null);
      request.onerror = () => reject(request.error);
    });
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      const request = store.put({ key: 'app_config', value: settings });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Complete Database Dump for Backup
   */
  async exportFullBackup(): Promise<string> {
    const projects = await this.getAllProjects();
    const receipts = await this.getAllReceipts(500);
    const logs = await this.getRecentLogs(500);
    const settings = await this.getSettings();

    // Export all files for all projects
    const allFiles: FileItem[] = [];
    for (const p of projects) {
      const files = await this.getFilesByProject(p.id);
      allFiles.push(...files);
    }

    const payload = {
      version: '1.0',
      exportedAt: Date.now(),
      app: 'NONONICK UNIVERSAL CODE HUB',
      projects,
      files: allFiles,
      receipts,
      logs,
      settings: settings ? {
        language: settings.language,
        gdriveRootFolderName: settings.gdriveRootFolderName,
        conflictResolution: settings.conflictResolution,
        autoVerifyTransfers: settings.autoVerifyTransfers
      } : null
    };

    return JSON.stringify(payload, null, 2);
  }

  /**
   * Import Database Dump with Verification
   */
  async importFullBackup(jsonString: string): Promise<{ projectsImported: number; filesImported: number }> {
    const data = JSON.parse(jsonString);
    if (!data || !Array.isArray(data.projects)) {
      throw new Error('Invalid backup file format: Missing projects array');
    }

    let projectsImported = 0;
    let filesImported = 0;

    for (const proj of data.projects) {
      await this.saveProject(proj);
      projectsImported++;
    }

    if (Array.isArray(data.files)) {
      await this.saveFilesBatch(data.files);
      filesImported = data.files.length;
    }

    return { projectsImported, filesImported };
  }
}
