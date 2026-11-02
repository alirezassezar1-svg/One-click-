import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { I18nService } from '../services/i18n.service';
import { AuthSessionService } from '../services/auth-session.service';
import { GoogleDriveService } from '../services/providers/google-drive.service';
import { GitHubService } from '../services/providers/github.service';
import { OneDriveService } from '../services/providers/onedrive.service';
import { CPanelService, CPanelTestResult } from '../services/providers/cpanel.service';

@Component({
  selector: 'app-providers-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="space-y-6">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <h2 class="text-lg font-bold text-white flex items-center gap-2">
            <mat-icon class="text-cyan-400">hub</mat-icon>
            <span>{{ i18n.t('providers') }}</span>
          </h2>
          <p class="text-xs text-slate-400">
            {{ i18n.isRtl() ? 'اتصال مستقیم به سرویس‌های ابری، اعتبارسنجی زنده توکن‌ها و بازرسی پروتکل‌ها' : 'Direct cloud provider authorization, live token validation & protocol diagnostics' }}
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <!-- 1. GOOGLE DRIVE CARD -->
        <div class="p-5 rounded-2xl glass-panel border border-cyan-500/20 space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <mat-icon>cloud</mat-icon>
              </div>
              <div>
                <h3 class="text-sm font-bold text-white">Google Drive API v3</h3>
                <span class="text-[11px] text-cyan-400 font-mono">{{ i18n.isRtl() ? 'فضای ابری اصلی' : 'Primary Cloud Storage' }}</span>
              </div>
            </div>

            <span
              class="px-2 py-0.5 rounded text-[10px] font-mono font-medium"
              [class.bg-emerald-950]="authSession.gdriveStatus() === 'connected'"
              [class.text-emerald-400]="authSession.gdriveStatus() === 'connected'"
              [class.bg-slate-800]="authSession.gdriveStatus() !== 'connected'"
              [class.text-slate-400]="authSession.gdriveStatus() !== 'connected'"
            >
              {{ authSession.gdriveStatus() }}
            </span>
          </div>

          <p class="text-xs text-slate-300 leading-relaxed">
            {{ i18n.isRtl()
              ? 'اتصال بدون سرور از طریق Google Identity Services (GIS). نیاز به Client ID با مبدأ مجاز جاوااسکریپت دارد.'
              : 'Serverless browser authentication via Google Identity Services (GIS TokenClient) with drive.file scope.' }}
          </p>

          <div class="space-y-3">
            <div>
              <span class="block text-xs font-medium text-slate-400 mb-1">OAuth Client ID</span>
              <input
                type="text"
                [formControl]="gdriveClientIdControl"
                placeholder="123456789-xyz.apps.googleusercontent.com"
                class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div class="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                (click)="authorizeGoogleDrive()"
                [disabled]="isAuthorizingGdrive() || !gdriveClientIdControl.value"
                class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition cursor-pointer disabled:opacity-40"
              >
                <mat-icon class="scale-80">login</mat-icon>
                <span>{{ isAuthorizingGdrive() ? 'Authorizing...' : 'Authorize GIS' }}</span>
              </button>

              @if (authSession.gdriveStatus() === 'connected') {
                <button
                  type="button"
                  (click)="testDriveQuota()"
                  class="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
                >
                  <mat-icon class="scale-80">speed</mat-icon>
                  <span>{{ i18n.t('testConnection') }}</span>
                </button>

                <button
                  type="button"
                  (click)="authSession.disconnectGoogleDrive()"
                  class="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-500/30 bg-red-950/20 hover:bg-red-900/40 text-red-400 text-xs font-medium transition cursor-pointer"
                >
                  <mat-icon class="scale-80">link_off</mat-icon>
                  <span>{{ i18n.t('disconnect') }}</span>
                </button>
              }
            </div>

            @if (gdriveTestMsg()) {
              <div class="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs">
                {{ gdriveTestMsg() }}
              </div>
            }
          </div>
        </div>

        <!-- 2. GITHUB REST API CARD -->
        <div class="p-5 rounded-2xl glass-panel border border-purple-500/20 space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <mat-icon>code</mat-icon>
              </div>
              <div>
                <h3 class="text-sm font-bold text-white">GitHub REST API</h3>
                <span class="text-[11px] text-purple-400 font-mono">Repositories & Workflows</span>
              </div>
            </div>

            <span
              class="px-2 py-0.5 rounded text-[10px] font-mono font-medium"
              [class.bg-emerald-950]="authSession.githubStatus() === 'connected'"
              [class.text-emerald-400]="authSession.githubStatus() === 'connected'"
              [class.bg-slate-800]="authSession.githubStatus() !== 'connected'"
              [class.text-slate-400]="authSession.githubStatus() !== 'connected'"
            >
              {{ authSession.githubStatus() }}
            </span>
          </div>

          <p class="text-xs text-slate-300 leading-relaxed">
            {{ i18n.isRtl()
              ? 'توکن دسترسی شخصی (PAT) برای ویرایش کد، ساخت کامیت با بررسی SHA، و استعلام GitHub Actions.'
              : 'Personal Access Token for reading repos, committing files with SHA collision check, and tracking workflows.' }}
          </p>

          <div class="space-y-3">
            <div>
              <span class="block text-xs font-medium text-slate-400 mb-1">GitHub PAT (Fine-Grained or Classic)</span>
              <input
                type="password"
                [formControl]="githubTokenControl"
                placeholder="ghp_... or github_pat_..."
                class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-100 font-mono focus:outline-none focus:border-purple-400"
              />
            </div>

            <div class="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                (click)="testGitHub()"
                [disabled]="isTestingGithub() || !githubTokenControl.value"
                class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs transition cursor-pointer disabled:opacity-40"
              >
                <mat-icon class="scale-80">check_circle</mat-icon>
                <span>{{ isTestingGithub() ? 'Validating...' : 'Verify Token' }}</span>
              </button>

              @if (authSession.githubStatus() === 'connected') {
                <button
                  type="button"
                  (click)="authSession.disconnectGithub()"
                  class="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-500/30 bg-red-950/20 hover:bg-red-900/40 text-red-400 text-xs font-medium transition cursor-pointer"
                >
                  <mat-icon class="scale-80">link_off</mat-icon>
                  <span>{{ i18n.t('disconnect') }}</span>
                </button>
              }
            </div>

            @if (githubTestMsg()) {
              <div class="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs">
                {{ githubTestMsg() }}
              </div>
            }
          </div>
        </div>

        <!-- 3. MICROSOFT ONEDRIVE CARD -->
        <div class="p-5 rounded-2xl glass-panel border border-blue-500/20 space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <mat-icon>folder_shared</mat-icon>
              </div>
              <div>
                <h3 class="text-sm font-bold text-white">Microsoft OneDrive</h3>
                <span class="text-[11px] text-blue-400 font-mono">Microsoft Graph API</span>
              </div>
            </div>

            <span
              class="px-2 py-0.5 rounded text-[10px] font-mono font-medium"
              [class.bg-emerald-950]="authSession.onedriveStatus() === 'connected'"
              [class.text-emerald-400]="authSession.onedriveStatus() === 'connected'"
              [class.bg-slate-800]="authSession.onedriveStatus() !== 'connected'"
              [class.text-slate-400]="authSession.onedriveStatus() !== 'connected'"
            >
              {{ authSession.onedriveStatus() }}
            </span>
          </div>

          <p class="text-xs text-slate-300 leading-relaxed">
            {{ i18n.isRtl()
              ? 'اتصال مستقیم به Microsoft Graph API با دسترسی Files.ReadWrite بدون نیاز به سکرت سمت سرور.'
              : 'Direct Microsoft Graph integration with Files.ReadWrite scope using client-side OAuth Bearer token.' }}
          </p>

          <div class="space-y-3">
            <div>
              <span class="block text-xs font-medium text-slate-400 mb-1">OneDrive Bearer Token</span>
              <input
                type="password"
                [formControl]="onedriveTokenControl"
                placeholder="EwB..."
                class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-400"
              />
            </div>

            <div class="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                (click)="testOneDrive()"
                [disabled]="isTestingOnedrive() || !onedriveTokenControl.value"
                class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-xs transition cursor-pointer disabled:opacity-40"
              >
                <mat-icon class="scale-80">check_circle</mat-icon>
                <span>{{ isTestingOnedrive() ? 'Testing...' : 'Verify OneDrive' }}</span>
              </button>

              @if (authSession.onedriveStatus() === 'connected') {
                <button
                  type="button"
                  (click)="authSession.disconnectOnedrive()"
                  class="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-500/30 bg-red-950/20 hover:bg-red-900/40 text-red-400 text-xs font-medium transition cursor-pointer"
                >
                  <mat-icon class="scale-80">link_off</mat-icon>
                  <span>{{ i18n.t('disconnect') }}</span>
                </button>
              }
            </div>

            @if (onedriveTestMsg()) {
              <div class="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs">
                {{ onedriveTestMsg() }}
              </div>
            }
          </div>
        </div>

        <!-- 4. CPANEL / SHATAAB HOSTING CARD -->
        <div class="p-5 rounded-2xl glass-panel border border-orange-500/20 space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                <mat-icon>dns</mat-icon>
              </div>
              <div>
                <h3 class="text-sm font-bold text-white">cPanel / Shataab Hosting</h3>
                <span class="text-[11px] text-orange-400 font-mono">UAPI & Git Deployment</span>
              </div>
            </div>

            <span
              class="px-2 py-0.5 rounded text-[10px] font-mono font-medium"
              [class.bg-emerald-950]="authSession.cpanelStatus() === 'connected'"
              [class.text-emerald-400]="authSession.cpanelStatus() === 'connected'"
              [class.bg-slate-800]="authSession.cpanelStatus() !== 'connected'"
              [class.text-slate-400]="authSession.cpanelStatus() !== 'connected'"
            >
              {{ authSession.cpanelStatus() }}
            </span>
          </div>

          <p class="text-xs text-slate-300 leading-relaxed">
            {{ i18n.isRtl()
              ? 'بررسی قابلیت‌های سرور cPanel و آزمایش محدودیت‌های مرورگری CORS. در صورت مسدود بودن، استقرار با Git پیشنهاد می‌شود.'
              : 'Evaluates cPanel UAPI operations and accurately tests browser CORS access. If CORS is blocked, provides Git version control alternative.' }}
          </p>

          <form [formGroup]="cpanelForm" class="space-y-3">
            <div>
              <span class="block text-xs font-medium text-slate-400 mb-1">Server URL</span>
              <input
                type="text"
                formControlName="serverUrl"
                placeholder="https://cpanel.domain.com:2083"
                class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-100 font-mono focus:outline-none focus:border-orange-400"
              />
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <span class="block text-xs font-medium text-slate-400 mb-1">Username</span>
                <input
                  type="text"
                  formControlName="username"
                  placeholder="cp_user"
                  class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-100 font-mono focus:outline-none focus:border-orange-400"
                />
              </div>
              <div>
                <span class="block text-xs font-medium text-slate-400 mb-1">UAPI Token</span>
                <input
                  type="password"
                  formControlName="token"
                  placeholder="API token"
                  class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-100 font-mono focus:outline-none focus:border-orange-400"
                />
              </div>
            </div>

            <div class="pt-1">
              <button
                type="button"
                (click)="testCpanel()"
                [disabled]="isTestingCpanel() || !cpanelForm.valid"
                class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs transition cursor-pointer disabled:opacity-40"
              >
                <mat-icon class="scale-80">network_check</mat-icon>
                <span>{{ isTestingCpanel() ? 'Testing CORS...' : 'Test cPanel CORS & UAPI' }}</span>
              </button>
            </div>

            @if (cpanelDiagnostic()) {
              <div
                class="p-3 rounded-xl border text-xs space-y-1.5"
                [class.bg-emerald-950/40]="cpanelDiagnostic()!.corsAllowed"
                [class.border-emerald-500/30]="cpanelDiagnostic()!.corsAllowed"
                [class.text-emerald-300]="cpanelDiagnostic()!.corsAllowed"
                [class.bg-amber-950/40]="!cpanelDiagnostic()!.corsAllowed"
                [class.border-amber-500/30]="!cpanelDiagnostic()!.corsAllowed"
                [class.text-amber-300]="!cpanelDiagnostic()!.corsAllowed"
              >
                <div class="font-semibold flex items-center gap-1.5">
                  <mat-icon class="scale-75">{{ cpanelDiagnostic()!.corsAllowed ? 'check_circle' : 'warning' }}</mat-icon>
                  <span>{{ cpanelDiagnostic()!.corsAllowed ? 'Direct UAPI Available' : 'Browser CORS Limitation' }}</span>
                </div>
                <p class="text-[11px] leading-relaxed">{{ cpanelDiagnostic()!.diagnostics }}</p>
                @if (cpanelDiagnostic()!.recommendedWorkflow === 'git_version_control') {
                  <div class="p-2 rounded bg-black/40 text-[11px] text-cyan-300 font-medium">
                    {{ i18n.isRtl() ? 'روش پیشنهادی معتبر: استفاده از استقرار مبتنی بر Git در منوی استقرار' : 'Recommended genuine alternative: Git-based deployment workflow in Deployment Center' }}
                  </div>
                }
              </div>
            }
          </form>
        </div>

      </div>

    </div>
  `
})
export class ProvidersView {
  i18n = inject(I18nService);
  authSession = inject(AuthSessionService);
  gdrive = inject(GoogleDriveService);
  github = inject(GitHubService);
  onedrive = inject(OneDriveService);
  cpanel = inject(CPanelService);

  gdriveClientIdControl = new FormControl('');
  githubTokenControl = new FormControl('');
  onedriveTokenControl = new FormControl('');

  cpanelForm = new FormGroup({
    serverUrl: new FormControl('', [Validators.required]),
    username: new FormControl('', [Validators.required]),
    token: new FormControl('', [Validators.required])
  });

  isAuthorizingGdrive = signal(false);
  gdriveTestMsg = signal<string | null>(null);

  isTestingGithub = signal(false);
  githubTestMsg = signal<string | null>(null);

  isTestingOnedrive = signal(false);
  onedriveTestMsg = signal<string | null>(null);

  isTestingCpanel = signal(false);
  cpanelDiagnostic = signal<CPanelTestResult | null>(null);

  async authorizeGoogleDrive() {
    const cid = this.gdriveClientIdControl.value;
    if (!cid) return;

    this.isAuthorizingGdrive.set(true);
    this.gdriveTestMsg.set(null);

    try {
      await this.gdrive.requestOAuthToken(cid);
      this.gdriveTestMsg.set('Authorized successfully with Google Identity Services.');
    } catch (err: unknown) {
      alert(`Google OAuth error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      this.isAuthorizingGdrive.set(false);
    }
  }

  async testDriveQuota() {
    try {
      const q = await this.gdrive.testConnection();
      this.gdriveTestMsg.set(`Connected as ${q.email}. Quota usage: ${q.storageQuota.usage}`);
    } catch (err: unknown) {
      alert(`Google Drive test error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async testGitHub() {
    const token = this.githubTokenControl.value;
    if (!token) return;

    this.isTestingGithub.set(true);
    this.githubTestMsg.set(null);

    try {
      const res = await this.github.testConnection(token);
      this.githubTestMsg.set(`Connected as @${res.login} with ${res.publicRepos} repos. Scopes: ${res.scopes}`);
    } catch (err: unknown) {
      alert(`GitHub test error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      this.isTestingGithub.set(false);
    }
  }

  async testOneDrive() {
    const token = this.onedriveTokenControl.value;
    if (!token) return;

    this.isTestingOnedrive.set(true);
    this.onedriveTestMsg.set(null);

    try {
      const res = await this.onedrive.testConnection(token);
      this.onedriveTestMsg.set(`Connected to ${res.owner} (${res.driveType}). Quota: ${res.quota}`);
    } catch (err: unknown) {
      alert(`OneDrive test error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      this.isTestingOnedrive.set(false);
    }
  }

  async testCpanel() {
    if (!this.cpanelForm.valid) return;
    const { serverUrl, username, token } = this.cpanelForm.value;

    this.isTestingCpanel.set(true);
    this.cpanelDiagnostic.set(null);

    try {
      const result = await this.cpanel.testCapabilities(serverUrl!, username!, token!);
      this.cpanelDiagnostic.set(result);
    } catch (err: unknown) {
      console.warn('cPanel test threw error:', err);
    } finally {
      this.isTestingCpanel.set(false);
    }
  }
}
