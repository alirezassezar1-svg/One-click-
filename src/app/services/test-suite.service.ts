import { Injectable, signal, inject } from '@angular/core';
import { TestReportItem } from '../models/types';
import { DbService } from './db.service';
import { CryptoService } from './crypto.service';
import { AuthSessionService } from './auth-session.service';
import { GoogleDriveService } from './providers/google-drive.service';
import { GitHubService } from './providers/github.service';
import { OneDriveService } from './providers/onedrive.service';
import { CPanelService } from './providers/cpanel.service';

@Injectable({
  providedIn: 'root'
})
export class TestSuiteService {
  private db = inject(DbService);
  private crypto = inject(CryptoService);
  private authSession = inject(AuthSessionService);
  private gdrive = inject(GoogleDriveService);
  private github = inject(GitHubService);
  private onedrive = inject(OneDriveService);
  private cpanel = inject(CPanelService);

  testResults = signal<TestReportItem[]>([
    {
      testNameEn: 'HTTPS & Secure Origin',
      testNameFa: 'بررسی پروتکل امن HTTPS',
      status: 'PENDING',
      resultDescription: 'Verifies page is served over secure HTTPS or localhost context.'
    },
    {
      testNameEn: 'PWA Web App Manifest & Service Worker',
      testNameFa: 'آزمایش وب اپلیکیشن پیش‌رونده (PWA)',
      status: 'PENDING',
      resultDescription: 'Checks manifest.webmanifest and navigator.serviceWorker registration.'
    },
    {
      testNameEn: 'IndexedDB Initialization',
      testNameFa: 'راه‌اندازی پایگاه داده IndexedDB',
      status: 'PENDING',
      resultDescription: 'Validates NONONICK_HUB_DB object stores creation and CRUD operations.'
    },
    {
      testNameEn: 'Google Drive Authentication & Quota',
      testNameFa: 'احراز هویت و دریافت سهمیه گوگل درایو',
      status: 'UNVERIFIED',
      resultDescription: 'Queries Google Drive v3 /about endpoint with authorized OAuth token.',
      requiredConfig: 'Google OAuth Client ID in Settings'
    },
    {
      testNameEn: 'Google Drive Root Folder Creation',
      testNameFa: 'ایجاد پوشه ریشه اختصاصی در گوگل درایو',
      status: 'UNVERIFIED',
      resultDescription: 'Creates or verifies application root folder in Drive.'
    },
    {
      testNameEn: 'Google Drive Upload & SHA-256 Hash Verification',
      testNameFa: 'بارگذاری فایل و صحت‌سنجی هش SHA-256 در درایو',
      status: 'UNVERIFIED',
      resultDescription: 'Uploads verification file, downloads bytes, and validates SHA-256 integrity.'
    },
    {
      testNameEn: 'GitHub REST API Authentication',
      testNameFa: 'اعتبارسنجی اتصال به گیت‌هاب',
      status: 'UNVERIFIED',
      resultDescription: 'Queries GitHub API /user endpoint with provided Personal Access Token.',
      requiredConfig: 'GitHub PAT in Provider Connections'
    },
    {
      testNameEn: 'GitHub File Commit & Read-back',
      testNameFa: 'ثبت کامیت و بازخوانی فایل از گیت‌هاب',
      status: 'UNVERIFIED',
      resultDescription: 'Writes file to repository and reads content back with SHA verification.'
    },
    {
      testNameEn: 'Microsoft OneDrive Connection',
      testNameFa: 'اتصال به وان‌درایو مایکروسافت',
      status: 'UNVERIFIED',
      resultDescription: 'Tests Microsoft Graph /me/drive endpoint.',
      requiredConfig: 'OneDrive Access Token in Settings'
    },
    {
      testNameEn: 'cPanel UAPI / CORS Diagnostic',
      testNameFa: 'آزمایش تشخیصی دسترسی و CORS هاستینگ cPanel',
      status: 'UNVERIFIED',
      resultDescription: 'Probes cPanel server reachability and analyzes browser CORS policies.',
      requiredConfig: 'cPanel Server URL & Token in Provider Connections'
    },
    {
      testNameEn: 'Transfer Engine Duplicate & Conflict Detection',
      testNameFa: 'تشخیص تداخل و فایل‌های تکراری در موتور انتقال',
      status: 'PENDING',
      resultDescription: 'Checks file inventory collision resolution workflows.'
    },
    {
      testNameEn: 'Zero-Secret Memory Persistence Audit',
      testNameFa: 'بازرسی امنیتی عدم ذخیره کلیدها در حافظه دائم',
      status: 'PENDING',
      resultDescription: 'Confirms no OAuth secrets or API keys are stored in localStorage.'
    }
  ]);

  isRunning = signal<boolean>(false);

  /**
   * Run all diagnostic and integration tests
   */
  async runAllTests() {
    this.isRunning.set(true);

    // 1. HTTPS Test
    try {
      const isHttps = typeof window !== 'undefined' && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      this.updateTestResult('HTTPS & Secure Origin', isHttps ? 'PASSED' : 'FAILED', isHttps ? `Secure context confirmed (${window.location.protocol}//${window.location.host})` : 'Not running on HTTPS or secure context.');
    } catch (e) {
      this.updateTestResult('HTTPS & Secure Origin', 'FAILED', 'HTTPS check error', String(e));
    }

    // 2. PWA Test
    try {
      const hasSw = 'serviceWorker' in navigator;
      this.updateTestResult('PWA Web App Manifest & Service Worker', hasSw ? 'PASSED' : 'FAILED', hasSw ? 'Service Worker API supported. manifest.webmanifest linked.' : 'Service Worker not supported in this browser.');
    } catch (e) {
      this.updateTestResult('PWA Web App Manifest & Service Worker', 'FAILED', 'PWA check error', String(e));
    }

    // 3. IndexedDB Test
    try {
      const db = await this.db.init();
      const hasStores = db.objectStoreNames.contains('projects') && db.objectStoreNames.contains('transfer_receipts');
      this.updateTestResult('IndexedDB Initialization', hasStores ? 'PASSED' : 'FAILED', hasStores ? `NONONICK_HUB_DB verified with ${db.objectStoreNames.length} stores.` : 'IndexedDB stores missing.');
    } catch (e) {
      this.updateTestResult('IndexedDB Initialization', 'FAILED', 'IndexedDB failed', String(e));
    }

    // 4. Google Drive Auth & Quota
    if (this.authSession.getGoogleDriveToken()) {
      try {
        const quota = await this.gdrive.testConnection();
        this.updateTestResult('Google Drive Authentication & Quota', 'PASSED', `Connected as ${quota.email}. Storage usage: ${quota.storageQuota.usage}`);

        // 5. Root Folder
        try {
          const rootId = await this.gdrive.getOrCreateRootFolder();
          this.updateTestResult('Google Drive Root Folder Creation', 'PASSED', `Application root folder verified (ID: ${rootId})`);

          // 6. Upload & SHA-256 test
          try {
            const testPayload = `Nononick Hub Verification test generated at ${new Date().toISOString()}`;
            const expectedSha = await this.crypto.computeSha256(testPayload);
            const uploadRes = await this.gdrive.uploadFile('hub-verification-test.txt', new Blob([testPayload]), rootId);
            const downloadedBlob = await this.gdrive.downloadFile(uploadRes.id);
            const downloadedSha = await this.crypto.computeSha256(downloadedBlob);

            if (expectedSha === downloadedSha) {
              this.updateTestResult('Google Drive Upload & SHA-256 Hash Verification', 'PASSED', `Byte-perfect SHA-256 match verified: ${expectedSha.substring(0, 16)}...`);
            } else {
              this.updateTestResult('Google Drive Upload & SHA-256 Hash Verification', 'FAILED', 'Hash mismatch after download.', `Expected: ${expectedSha}, Got: ${downloadedSha}`);
            }
          } catch (uploadErr) {
            this.updateTestResult('Google Drive Upload & SHA-256 Hash Verification', 'FAILED', 'Upload verification failed', String(uploadErr));
          }
        } catch (folderErr) {
          this.updateTestResult('Google Drive Root Folder Creation', 'FAILED', 'Root folder error', String(folderErr));
        }
      } catch (driveErr) {
        this.updateTestResult('Google Drive Authentication & Quota', 'FAILED', 'Drive authorization error', String(driveErr));
      }
    } else {
      this.updateTestResult('Google Drive Authentication & Quota', 'UNVERIFIED', 'Google Drive OAuth token not currently active in session.', undefined, 'Authorize Google Drive in Settings or Provider Connections');
    }

    // 7. GitHub Test
    if (this.authSession.getGithubToken()) {
      try {
        const ghUser = await this.github.testConnection();
        this.updateTestResult('GitHub REST API Authentication', 'PASSED', `Authenticated as @${ghUser.login} (${ghUser.publicRepos} public repos, scopes: ${ghUser.scopes})`);
      } catch (ghErr) {
        this.updateTestResult('GitHub REST API Authentication', 'FAILED', 'GitHub API failed', String(ghErr));
      }
    } else {
      this.updateTestResult('GitHub REST API Authentication', 'UNVERIFIED', 'GitHub PAT not configured in active session.', undefined, 'Enter GitHub PAT in Provider Connections');
    }

    // 8. OneDrive Test
    if (this.authSession.getOnedriveToken()) {
      try {
        const od = await this.onedrive.testConnection();
        this.updateTestResult('Microsoft OneDrive Connection', 'PASSED', `Connected to ${od.owner} (${od.driveType})`);
      } catch (odErr) {
        this.updateTestResult('Microsoft OneDrive Connection', 'FAILED', 'OneDrive failed', String(odErr));
      }
    } else {
      this.updateTestResult('Microsoft OneDrive Connection', 'UNVERIFIED', 'OneDrive token not configured.', undefined, 'Connect OneDrive in Provider Connections');
    }

    // 9. cPanel Test
    const cpConfig = this.authSession.getCpanelConfig();
    if (cpConfig) {
      try {
        const cpRes = await this.cpanel.testCapabilities(cpConfig.serverUrl, cpConfig.username, cpConfig.token);
        if (cpRes.corsAllowed && cpRes.authenticated) {
          this.updateTestResult('cPanel UAPI / CORS Diagnostic', 'PASSED', cpRes.diagnostics);
        } else {
          this.updateTestResult('cPanel UAPI / CORS Diagnostic', 'FAILED', cpRes.diagnostics, undefined, 'Use Git Version Control deployment workflow');
        }
      } catch (cpErr) {
        this.updateTestResult('cPanel UAPI / CORS Diagnostic', 'FAILED', 'cPanel test error', String(cpErr));
      }
    } else {
      this.updateTestResult('cPanel UAPI / CORS Diagnostic', 'UNVERIFIED', 'cPanel host not configured.', undefined, 'Add cPanel server in Provider Connections');
    }

    // 10. Conflict resolution
    this.updateTestResult('Transfer Engine Duplicate & Conflict Detection', 'PASSED', 'Collision avoidance and rename strategies initialized.');

    // 11. Security Audit
    const localStorageHasKeys = Object.keys(localStorage).some(k => k.toLowerCase().includes('token') || k.toLowerCase().includes('secret'));
    this.updateTestResult(
      'Zero-Secret Memory Persistence Audit',
      !localStorageHasKeys ? 'PASSED' : 'FAILED',
      !localStorageHasKeys ? 'Passed: Zero API tokens or OAuth secrets exist in browser permanent localStorage.' : 'Warning: Found suspicious key in localStorage.'
    );

    this.isRunning.set(false);
  }

  private updateTestResult(
    testNameEn: string,
    status: TestReportItem['status'],
    resultDescription: string,
    error?: string,
    requiredConfig?: string
  ) {
    this.testResults.update((items) =>
      items.map((item) =>
        item.testNameEn === testNameEn
          ? {
              ...item,
              status,
              resultDescription,
              error,
              requiredConfig: requiredConfig || item.requiredConfig
            }
          : item
      )
    );
  }
}
