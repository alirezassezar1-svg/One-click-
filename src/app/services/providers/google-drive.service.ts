import { Injectable, inject } from '@angular/core';
import { AuthSessionService } from '../auth-session.service';
import { FileItem } from '../../models/types';
import { CryptoService } from '../crypto.service';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; expires_in?: number; error?: string }) => void;
            error_callback?: (err: unknown) => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

@Injectable({
  providedIn: 'root'
})
export class GoogleDriveService {
  private authSession = inject(AuthSessionService);
  private crypto = inject(CryptoService);

  private readonly API_BASE = 'https://www.googleapis.com/drive/v3';
  private readonly UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3/files';

  /**
   * Request OAuth token using Google Identity Services (GIS) Token Client
   */
  async requestOAuthToken(clientId: string): Promise<string> {
    if (typeof window === 'undefined') {
      throw new Error('OAuth requires a browser window environment.');
    }

    if (!window.google?.accounts?.oauth2) {
      throw new Error('Google Identity Services script is not yet loaded. Please ensure you are connected to the internet.');
    }

    return new Promise((resolve, reject) => {
      try {
        const client = window.google!.accounts.oauth2.initTokenClient({
          client_id: clientId.trim(),
          scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email',
          callback: (response) => {
            if (response.error) {
              reject(new Error(`Google OAuth error: ${response.error}`));
              return;
            }
            if (response.access_token) {
              const expiresIn = response.expires_in || 3599;
              // Fetch user profile to display identity
              this.fetchUserProfile(response.access_token).then((profile) => {
                this.authSession.setGoogleDriveToken(response.access_token!, expiresIn, profile.email);
                resolve(response.access_token!);
              }).catch(() => {
                this.authSession.setGoogleDriveToken(response.access_token!, expiresIn);
                resolve(response.access_token!);
              });
            } else {
              reject(new Error('No access token received from Google Identity Services.'));
            }
          },
          error_callback: (err) => {
            reject(new Error(`GIS error: ${JSON.stringify(err)}`));
          }
        });

        client.requestAccessToken({ prompt: 'consent' });
      } catch (err: unknown) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  private async fetchUserProfile(token: string): Promise<{ email: string; name?: string }> {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Could not fetch user profile');
    return res.json();
  }

  /**
   * Real API Connection Test
   */
  async testConnection(): Promise<{ email: string; storageQuota: { limit?: string; usage: string } }> {
    const token = this.authSession.getGoogleDriveToken();
    if (!token) {
      this.authSession.gdriveStatus.set('disconnected');
      throw new Error('Google Drive token is not set or has expired.');
    }

    this.authSession.gdriveStatus.set('authorizing');

    try {
      const res = await fetch(`${this.API_BASE}/about?fields=user,storageQuota`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 401 || res.status === 403) {
        this.authSession.gdriveStatus.set('permission_denied');
        throw new Error('Google Drive API authorization denied. Token expired or invalid scope.');
      }

      if (!res.ok) {
        this.authSession.gdriveStatus.set('connection_error');
        throw new Error(`Google Drive API responded with status ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      this.authSession.gdriveStatus.set('connected');
      if (data.user?.emailAddress) {
        this.authSession.gdriveUser.set(data.user.emailAddress);
      }

      return {
        email: data.user?.emailAddress || 'Authorized User',
        storageQuota: {
          limit: data.storageQuota?.limit ? this.crypto.formatBytes(Number(data.storageQuota.limit)) : 'Unlimited',
          usage: this.crypto.formatBytes(Number(data.storageQuota?.usage || 0))
        }
      };
    } catch (err) {
      this.authSession.gdriveStatus.set('connection_error');
      throw err;
    }
  }

  /**
   * Create or locate application root folder
   */
  async getOrCreateRootFolder(folderName = 'NONONICK_UNIVERSAL_CODE_HUB'): Promise<string> {
    const token = this.authSession.getGoogleDriveToken();
    if (!token) throw new Error('Not connected to Google Drive.');

    // Query for folder
    const q = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`;
    const searchRes = await fetch(`${this.API_BASE}/files?q=${encodeURIComponent(q)}&fields=files(id,name)`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!searchRes.ok) throw new Error('Failed to query root folder in Google Drive.');
    const searchData = await searchRes.json();

    if (searchData.files && searchData.files.length > 0) {
      const folderId = searchData.files[0].id;
      this.authSession.setGoogleRootFolderId(folderId);
      return folderId;
    }

    // Create new folder
    const createRes = await fetch(`${this.API_BASE}/files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      })
    });

    if (!createRes.ok) throw new Error('Failed to create root folder in Google Drive.');
    const createData = await createRes.json();
    this.authSession.setGoogleRootFolderId(createData.id);
    return createData.id;
  }

  /**
   * List files and folders
   */
  async listFiles(folderId?: string): Promise<FileItem[]> {
    const token = this.authSession.getGoogleDriveToken();
    if (!token) throw new Error('Not connected to Google Drive.');

    let targetFolder = folderId || this.authSession.getGoogleRootFolderId();
    if (!targetFolder) {
      targetFolder = await this.getOrCreateRootFolder();
    }

    const q = `'${targetFolder}' in parents and trashed = false`;
    const res = await fetch(
      `${this.API_BASE}/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,size,modifiedTime,md5Checksum)&pageSize=100`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!res.ok) throw new Error(`Failed to list files: ${res.statusText}`);
    const data = await res.json();

    const files: FileItem[] = (data.files || []).map((f: {
      id: string;
      name: string;
      mimeType: string;
      size?: string;
      modifiedTime?: string;
      md5Checksum?: string;
    }) => ({
      id: f.id,
      name: f.name,
      path: f.name,
      size: Number(f.size || 0),
      mimeType: f.mimeType,
      lastModified: f.modifiedTime ? new Date(f.modifiedTime).getTime() : Date.now(),
      provider: 'gdrive',
      isFolder: f.mimeType === 'application/vnd.google-apps.folder',
      parentId: targetFolder,
      remoteId: f.id
    }));

    return files;
  }

  /**
   * Upload File (Supports Multipart & Direct upload with real progress tracking)
   */
  async uploadFile(
    fileName: string,
    content: Blob | ArrayBuffer | Uint8Array,
    parentFolderId?: string,
    onProgress?: (percent: number, loaded: number, total: number) => void
  ): Promise<{ id: string; name: string; size: number; md5Checksum?: string }> {
    const token = this.authSession.getGoogleDriveToken();
    if (!token) throw new Error('Not connected to Google Drive.');

    let targetFolder = parentFolderId || this.authSession.getGoogleRootFolderId();
    if (!targetFolder) {
      targetFolder = await this.getOrCreateRootFolder();
    }

    const blob = content instanceof Blob ? content : new Blob([content as ArrayBuffer]);
    const metadata = {
      name: fileName,
      parents: [targetFolder]
    };

    // Multipart upload
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
    const mediaPartHeader = `${delimiter}Content-Type: ${blob.type || 'application/octet-stream'}\r\n\r\n`;

    const metadataBlob = new Blob([metadataPart]);
    const mediaHeaderBlob = new Blob([mediaPartHeader]);
    const closeBlob = new Blob([closeDelimiter]);

    const multipartBody = new Blob([metadataBlob, mediaHeaderBlob, blob, closeBlob]);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.UPLOAD_BASE}?uploadType=multipart&fields=id,name,size,md5Checksum`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('Content-Type', `multipart/related; boundary=${boundary}`);

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent, event.loaded, event.total);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (onProgress) onProgress(100, blob.size, blob.size);
            resolve(data);
          } catch (e) {
            reject(e);
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during Google Drive upload.'));
      xhr.send(multipartBody);
    });
  }

  /**
   * Download File
   */
  async downloadFile(fileId: string): Promise<Blob> {
    const token = this.authSession.getGoogleDriveToken();
    if (!token) throw new Error('Not connected to Google Drive.');

    const res = await fetch(`${this.API_BASE}/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error(`Download failed with status ${res.status}: ${res.statusText}`);
    return res.blob();
  }

  /**
   * Delete File
   */
  async deleteFile(fileId: string): Promise<void> {
    const token = this.authSession.getGoogleDriveToken();
    if (!token) throw new Error('Not connected to Google Drive.');

    const res = await fetch(`${this.API_BASE}/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok && res.status !== 204) {
      throw new Error(`Delete failed with status ${res.status}: ${res.statusText}`);
    }
  }

  /**
   * Get Detailed File Metadata
   */
  async getMetadata(fileId: string): Promise<{ id: string; name: string; size: number; md5Checksum?: string; mimeType: string }> {
    const token = this.authSession.getGoogleDriveToken();
    if (!token) throw new Error('Not connected to Google Drive.');

    const res = await fetch(`${this.API_BASE}/files/${fileId}?fields=id,name,size,md5Checksum,mimeType`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error(`Failed to fetch file metadata: ${res.statusText}`);
    const data = await res.json();
    return {
      id: data.id,
      name: data.name,
      size: Number(data.size || 0),
      md5Checksum: data.md5Checksum,
      mimeType: data.mimeType
    };
  }
}
