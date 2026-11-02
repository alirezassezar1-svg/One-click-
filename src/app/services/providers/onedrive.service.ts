import { Injectable, inject } from '@angular/core';
import { AuthSessionService } from '../auth-session.service';
import { FileItem } from '../../models/types';
import { CryptoService } from '../crypto.service';

@Injectable({
  providedIn: 'root'
})
export class OneDriveService {
  private authSession = inject(AuthSessionService);
  private crypto = inject(CryptoService);

  private readonly API_BASE = 'https://graph.microsoft.com/v1.0/me/drive';

  private getHeaders(): HeadersInit {
    const token = this.authSession.getOnedriveToken();
    if (!token) throw new Error('Not connected to Microsoft OneDrive.');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Real connection test to Microsoft Graph
   */
  async testConnection(tokenInput?: string): Promise<{ driveType: string; owner: string; quota: string }> {
    const token = tokenInput || this.authSession.getOnedriveToken();
    if (!token) {
      this.authSession.onedriveStatus.set('disconnected');
      throw new Error('OneDrive token not provided.');
    }

    this.authSession.onedriveStatus.set('authorizing');

    try {
      const res = await fetch(this.API_BASE, {
        headers: { Authorization: `Bearer ${token.trim()}` }
      });

      if (res.status === 401 || res.status === 403) {
        this.authSession.onedriveStatus.set('permission_denied');
        throw new Error('Microsoft Graph authorization denied. Token expired or Files.ReadWrite scope missing.');
      }

      if (!res.ok) {
        this.authSession.onedriveStatus.set('connection_error');
        throw new Error(`Microsoft Graph error (${res.status}): ${res.statusText}`);
      }

      const data = await res.json();
      const ownerName = data.owner?.user?.displayName || 'Microsoft Account';

      this.authSession.setOnedriveToken(token, 3600, ownerName);

      return {
        driveType: data.driveType || 'personal',
        owner: ownerName,
        quota: data.quota ? `${this.crypto.formatBytes(data.quota.used)} used of ${this.crypto.formatBytes(data.quota.total)}` : 'Available'
      };
    } catch (err) {
      this.authSession.onedriveStatus.set('connection_error');
      throw err;
    }
  }

  /**
   * List files and folders in OneDrive
   */
  async listItems(folderId = 'root'): Promise<FileItem[]> {
    const url = folderId === 'root'
      ? `${this.API_BASE}/root/children`
      : `${this.API_BASE}/items/${folderId}/children`;

    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error(`Failed to list OneDrive items: ${res.statusText}`);

    const data = await res.json();
    return (data.value || []).map((item: {
      id: string;
      name: string;
      size: number;
      folder?: unknown;
      file?: { mimeType: string };
      lastModifiedDateTime: string;
      '@microsoft.graph.downloadUrl'?: string;
    }) => ({
      id: item.id,
      name: item.name,
      path: item.name,
      size: item.size || 0,
      mimeType: item.folder ? 'application/vnd.microsoft.folder' : (item.file?.mimeType || 'application/octet-stream'),
      lastModified: item.lastModifiedDateTime ? new Date(item.lastModifiedDateTime).getTime() : Date.now(),
      provider: 'onedrive',
      isFolder: !!item.folder,
      parentId: folderId,
      remoteId: item.id,
      downloadUrl: item['@microsoft.graph.downloadUrl']
    }));
  }

  /**
   * Upload file to OneDrive (Supports direct upload for files up to 4MB, with progress)
   */
  async uploadFile(
    fileName: string,
    content: Blob | ArrayBuffer | Uint8Array,
    parentFolderId = 'root'
  ): Promise<{ id: string; name: string; size: number }> {
    const token = this.authSession.getOnedriveToken();
    if (!token) throw new Error('Not connected to Microsoft OneDrive.');

    const blob = content instanceof Blob ? content : new Blob([content as ArrayBuffer]);
    const cleanName = encodeURIComponent(fileName);

    const url = parentFolderId === 'root'
      ? `${this.API_BASE}/root:/${cleanName}:/content`
      : `${this.API_BASE}/items/${parentFolderId}:/${cleanName}:/content`;

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': blob.type || 'application/octet-stream'
      },
      body: blob
    });

    if (!res.ok) {
      throw new Error(`OneDrive upload failed (${res.status}): ${res.statusText}`);
    }

    const data = await res.json();
    return {
      id: data.id,
      name: data.name,
      size: data.size
    };
  }

  /**
   * Download file from OneDrive
   */
  async downloadFile(itemId: string): Promise<Blob> {
    const res = await fetch(`${this.API_BASE}/items/${itemId}/content`, {
      headers: this.getHeaders()
    });

    if (!res.ok) throw new Error(`OneDrive download failed: ${res.statusText}`);
    return res.blob();
  }

  /**
   * Delete item
   */
  async deleteItem(itemId: string): Promise<void> {
    const res = await fetch(`${this.API_BASE}/items/${itemId}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });

    if (!res.ok && res.status !== 204) {
      throw new Error(`OneDrive deletion failed: ${res.statusText}`);
    }
  }
}
