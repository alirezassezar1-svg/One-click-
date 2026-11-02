import { Injectable, inject } from '@angular/core';
import { AuthSessionService } from '../auth-session.service';
import { FileItem } from '../../models/types';

export interface CPanelTestResult {
  reachable: boolean;
  corsAllowed: boolean;
  authenticated: boolean;
  diagnostics: string;
  recommendedWorkflow: 'direct_uapi' | 'git_version_control' | 'cpanel_proxy_required';
  details?: Record<string, unknown>;
}

@Injectable({
  providedIn: 'root'
})
export class CPanelService {
  private authSession = inject(AuthSessionService);

  /**
   * Real browser capability & CORS connectivity test
   * Tests whether the hosting server allows direct browser fetch requests or if CORS headers block it.
   */
  async testCapabilities(serverUrl: string, username: string, apiToken: string): Promise<CPanelTestResult> {
    const cleanUrl = serverUrl.trim().replace(/\/+$/, '');
    this.authSession.cpanelStatus.set('authorizing');

    // UAPI VersionControl or Fileman probe endpoint
    const testEndpoint = `${cleanUrl}/execute/VersionControl/retrieve`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(testEndpoint, {
        method: 'GET',
        headers: {
          Authorization: `cpanel ${username.trim()}:${apiToken.trim()}`,
          Accept: 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.status === 401 || res.status === 403) {
        this.authSession.cpanelStatus.set('permission_denied');
        return {
          reachable: true,
          corsAllowed: true,
          authenticated: false,
          diagnostics: `cPanel responded with authentication error (${res.status}). Verify your cPanel username and UAPI token privileges.`,
          recommendedWorkflow: 'direct_uapi'
        };
      }

      if (res.ok) {
        const json = await res.json();
        this.authSession.setCpanelConfig(cleanUrl, username, apiToken);
        this.authSession.cpanelStatus.set('connected');
        return {
          reachable: true,
          corsAllowed: true,
          authenticated: true,
          diagnostics: 'cPanel server responded with CORS headers enabled. Direct UAPI browser operations are active.',
          recommendedWorkflow: 'direct_uapi',
          details: json
        };
      }

      this.authSession.cpanelStatus.set('connection_error');
      return {
        reachable: true,
        corsAllowed: true,
        authenticated: false,
        diagnostics: `cPanel server returned status ${res.status}: ${res.statusText}`,
        recommendedWorkflow: 'direct_uapi'
      };
    } catch (err: unknown) {
      // Standard browser behavior: CORS blockage or network failure throws TypeError: Failed to fetch
      this.authSession.cpanelStatus.set('connection_error');

      const isCorsOrNetwork = err instanceof TypeError || (err instanceof Error && err.name === 'AbortError');
      return {
        reachable: false,
        corsAllowed: false,
        authenticated: false,
        diagnostics: isCorsOrNetwork
          ? 'Browser CORS Restriction Detected: Most cPanel/Shataab hosting servers do not return Access-Control-Allow-Origin headers for arbitrary web browsers. Per strict security rules, credentials were not exposed.'
          : String(err),
        recommendedWorkflow: 'git_version_control'
      };
    }
  }

  /**
   * List files in cPanel public_html or specified directory via UAPI Fileman
   */
  async listFiles(dirPath = 'public_html'): Promise<FileItem[]> {
    const config = this.authSession.getCpanelConfig();
    if (!config) throw new Error('cPanel is not configured in this session.');

    const url = `${config.serverUrl}/execute/Fileman/list_files?dir=${encodeURIComponent(dirPath)}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `cpanel ${config.username}:${config.token}`,
        Accept: 'application/json'
      }
    });

    if (!res.ok) throw new Error(`cPanel list_files failed: ${res.statusText}`);
    const json = await res.json();

    if (json.status !== 1) {
      throw new Error(`cPanel error: ${json.errors?.join(', ') || 'Unknown error'}`);
    }

    return (json.data || []).map((f: {
      file: string;
      size: number;
      type: string;
      mtime: number;
    }) => ({
      id: `${dirPath}/${f.file}`,
      name: f.file,
      path: `${dirPath}/${f.file}`,
      size: f.size || 0,
      mimeType: f.type === 'dir' ? 'application/vnd.cpanel.dir' : 'application/octet-stream',
      lastModified: f.mtime * 1000,
      provider: 'cpanel',
      isFolder: f.type === 'dir'
    }));
  }

  /**
   * Upload file to cPanel directory via UAPI Fileman::upload_files
   */
  async uploadFile(dirPath: string, fileName: string, content: Blob | ArrayBuffer): Promise<void> {
    const config = this.authSession.getCpanelConfig();
    if (!config) throw new Error('cPanel is not configured.');

    const blob = content instanceof Blob ? content : new Blob([content]);
    const formData = new FormData();
    formData.append('dir', dirPath);
    formData.append('file-1', blob, fileName);

    const url = `${config.serverUrl}/execute/Fileman/upload_files`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `cpanel ${config.username}:${config.token}`
      },
      body: formData
    });

    if (!res.ok) throw new Error(`cPanel upload failed (${res.status}): ${res.statusText}`);
    const json = await res.json();
    if (json.status !== 1) {
      throw new Error(`cPanel UAPI error: ${json.errors?.join(', ') || 'Upload failed'}`);
    }
  }
}
