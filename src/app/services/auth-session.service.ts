import { Injectable, signal, inject } from '@angular/core';
import { ProviderType, ConnectionStatus } from '../models/types';
import { ActivityLogService } from './activity-log.service';

export interface SessionCredentials {
  gdriveToken?: {
    accessToken: string;
    expiresAt: number;
    userEmail?: string;
    rootFolderId?: string;
  };
  githubToken?: {
    pat: string;
    username?: string;
    scope?: string;
  };
  onedriveToken?: {
    accessToken: string;
    expiresAt: number;
    userPrincipal?: string;
  };
  cpanelConfig?: {
    serverUrl: string;
    username: string;
    token: string;
  };
  customApiConfig?: {
    baseUrl: string;
    authHeaderKey: string;
    authHeaderValue: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthSessionService {
  private logger = inject(ActivityLogService);

  // Strictly in-memory session credentials
  private credentials = signal<SessionCredentials>({});

  // Signal status for each provider
  gdriveStatus = signal<ConnectionStatus>('not_configured');
  githubStatus = signal<ConnectionStatus>('not_configured');
  onedriveStatus = signal<ConnectionStatus>('not_configured');
  cpanelStatus = signal<ConnectionStatus>('not_configured');
  customApiStatus = signal<ConnectionStatus>('not_configured');

  // Identifiers for display
  gdriveUser = signal<string | null>(null);
  githubUser = signal<string | null>(null);
  onedriveUser = signal<string | null>(null);

  // Google Drive Credentials
  setGoogleDriveToken(accessToken: string, expiresInSeconds: number, email?: string, rootFolderId?: string) {
    const expiresAt = Date.now() + (expiresInSeconds - 60) * 1000;
    this.credentials.update((c) => ({
      ...c,
      gdriveToken: {
        accessToken,
        expiresAt,
        userEmail: email,
        rootFolderId
      }
    }));
    this.gdriveStatus.set('connected');
    if (email) this.gdriveUser.set(email);
    this.logger.log('auth', 'success', `Google Drive session established for ${email || 'authorized user'}.`, `اتصال گوگل درایو برای ${email || 'کاربر مجاز'} برقرار شد.`);
  }

  getGoogleDriveToken(): string | null {
    const token = this.credentials().gdriveToken;
    if (!token) return null;
    if (Date.now() >= token.expiresAt) {
      this.gdriveStatus.set('disconnected');
      return null;
    }
    return token.accessToken;
  }

  getGoogleRootFolderId(): string | null {
    return this.credentials().gdriveToken?.rootFolderId || null;
  }

  setGoogleRootFolderId(folderId: string) {
    this.credentials.update((c) => {
      if (!c.gdriveToken) return c;
      return {
        ...c,
        gdriveToken: {
          ...c.gdriveToken,
          rootFolderId: folderId
        }
      };
    });
  }

  disconnectGoogleDrive() {
    this.credentials.update((c) => {
      const copy = { ...c };
      delete copy.gdriveToken;
      return copy;
    });
    this.gdriveStatus.set('disconnected');
    this.gdriveUser.set(null);
    this.logger.log('auth', 'info', 'Google Drive disconnected and token purged from memory.', 'گوگل درایو قطع و توکن آن از حافظه پاک شد.');
  }

  // GitHub Credentials
  setGithubToken(pat: string, username: string, scope?: string) {
    this.credentials.update((c) => ({
      ...c,
      githubToken: {
        pat,
        username,
        scope
      }
    }));
    this.githubStatus.set('connected');
    this.githubUser.set(username);
    this.logger.log('auth', 'success', `GitHub PAT validated for @${username}.`, `توکن گیت‌هاب برای کاربر @${username} تایید شد.`);
  }

  getGithubToken(): string | null {
    return this.credentials().githubToken?.pat || null;
  }

  disconnectGithub() {
    this.credentials.update((c) => {
      const copy = { ...c };
      delete copy.githubToken;
      return copy;
    });
    this.githubStatus.set('disconnected');
    this.githubUser.set(null);
    this.logger.log('auth', 'info', 'GitHub disconnected and token purged from memory.', 'گیت‌هاب قطع و توکن آن از حافظه پاک شد.');
  }

  // OneDrive Credentials
  setOnedriveToken(accessToken: string, expiresInSeconds: number, userPrincipal?: string) {
    const expiresAt = Date.now() + (expiresInSeconds - 60) * 1000;
    this.credentials.update((c) => ({
      ...c,
      onedriveToken: {
        accessToken,
        expiresAt,
        userPrincipal
      }
    }));
    this.onedriveStatus.set('connected');
    if (userPrincipal) this.onedriveUser.set(userPrincipal);
    this.logger.log('auth', 'success', `Microsoft OneDrive token established for ${userPrincipal || 'authorized user'}.`, `توکن وان‌درایو برای ${userPrincipal || 'کاربر'} ثبت شد.`);
  }

  getOnedriveToken(): string | null {
    const token = this.credentials().onedriveToken;
    if (!token) return null;
    if (Date.now() >= token.expiresAt) {
      this.onedriveStatus.set('disconnected');
      return null;
    }
    return token.accessToken;
  }

  disconnectOnedrive() {
    this.credentials.update((c) => {
      const copy = { ...c };
      delete copy.onedriveToken;
      return copy;
    });
    this.onedriveStatus.set('disconnected');
    this.onedriveUser.set(null);
    this.logger.log('auth', 'info', 'OneDrive disconnected and token purged.', 'وان‌درایو قطع شد و توکن پاکسازی شد.');
  }

  // cPanel Credentials
  setCpanelConfig(serverUrl: string, username: string, token: string) {
    this.credentials.update((c) => ({
      ...c,
      cpanelConfig: { serverUrl, username, token }
    }));
    this.cpanelStatus.set('connected');
    this.logger.log('auth', 'info', `cPanel connection configured for ${username}@${serverUrl}`, `پیکربندی cPanel برای کاربر ${username} تنظیم گردید.`);
  }

  getCpanelConfig() {
    return this.credentials().cpanelConfig || null;
  }

  disconnectCpanel() {
    this.credentials.update((c) => {
      const copy = { ...c };
      delete copy.cpanelConfig;
      return copy;
    });
    this.cpanelStatus.set('disconnected');
    this.logger.log('auth', 'info', 'cPanel session purged from memory.', 'سشن cPanel از حافظه پاک شد.');
  }

  // Custom API
  setCustomApiConfig(baseUrl: string, authHeaderKey: string, authHeaderValue: string) {
    this.credentials.update((c) => ({
      ...c,
      customApiConfig: { baseUrl, authHeaderKey, authHeaderValue }
    }));
    this.customApiStatus.set('connected');
    this.logger.log('auth', 'info', `Custom API connection configured for ${baseUrl}`, `سرویس سفارشی برای ${baseUrl} پیکربندی شد.`);
  }

  getCustomApiConfig() {
    return this.credentials().customApiConfig || null;
  }

  disconnectCustomApi() {
    this.credentials.update((c) => {
      const copy = { ...c };
      delete copy.customApiConfig;
      return copy;
    });
    this.customApiStatus.set('disconnected');
  }

  /**
   * SECURITY CENTER AUDIT: Zero-persistence purge
   */
  purgeAllSessions() {
    this.credentials.set({});
    this.gdriveStatus.set('disconnected');
    this.githubStatus.set('disconnected');
    this.onedriveStatus.set('disconnected');
    this.cpanelStatus.set('disconnected');
    this.customApiStatus.set('disconnected');
    this.gdriveUser.set(null);
    this.githubUser.set(null);
    this.onedriveUser.set(null);

    // Also clear session storage if any legacy tokens exist
    try {
      sessionStorage.clear();
    } catch {
      // ignore
    }

    this.logger.log('security', 'warning', 'All active session credentials purged from memory.', 'کلیه اعتبارنامه‌های موقت از حافظه برنامه پاکسازی شدند.');
  }

  hasActiveCredentials(type: ProviderType): boolean {
    switch (type) {
      case 'gdrive':
        return !!this.getGoogleDriveToken();
      case 'github':
        return !!this.getGithubToken();
      case 'onedrive':
        return !!this.getOnedriveToken();
      case 'cpanel':
        return !!this.getCpanelConfig();
      case 'custom_api':
        return !!this.getCustomApiConfig();
      default:
        return true; // local
    }
  }
}
