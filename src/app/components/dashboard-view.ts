import { ChangeDetectionStrategy, Component, signal, inject, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { I18nService } from '../services/i18n.service';
import { AuthSessionService } from '../services/auth-session.service';
import { ProjectManagerService } from '../services/project-manager.service';
import { TransferEngineService } from '../services/transfer-engine.service';
import { CryptoService } from '../services/crypto.service';
import { GoogleDriveService } from '../services/providers/google-drive.service';

@Component({
  selector: 'app-dashboard-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="space-y-6">
      
      <!-- Top Cybernetic Hero Banner -->
      <div class="p-6 rounded-2xl glass-panel relative overflow-hidden border border-cyan-500/20 bg-gradient-to-r from-slate-950 via-[#0a1222] to-slate-950">
        <div class="absolute -right-12 -top-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -left-12 -bottom-12 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded text-[10px] font-mono tracking-wider font-semibold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {{ i18n.isRtl() ? 'موتور کلاینت-ساید نسخه ۱.۰' : 'Client-Side Engine v1.0' }}
              </span>
              <span class="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                {{ i18n.isRtl() ? 'سشن ایزوله و امن' : 'Zero-Backend Architecture' }}
              </span>
            </div>
            <h1 class="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>{{ i18n.t('appTitle') }}</span>
            </h1>
            <p class="text-xs text-slate-400 max-w-xl leading-relaxed">
              {{ i18n.t('appSubtitle') }}
            </p>
          </div>

          <!-- Quick Action Buttons -->
          <div class="flex flex-wrap items-center gap-2 shrink-0">
            <button
              (click)="navigateRequested.emit('transfer')"
              class="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <mat-icon class="text-sm scale-90">sync_alt</mat-icon>
              <span>{{ i18n.isRtl() ? 'انتقال سریع فایل' : 'New Transfer' }}</span>
            </button>
            <button
              (click)="navigateRequested.emit('projects')"
              class="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/10 bg-slate-900/60 hover:bg-slate-800 text-slate-200 text-xs font-medium transition cursor-pointer"
            >
              <mat-icon class="text-sm scale-90">create_new_folder</mat-icon>
              <span>{{ i18n.isRtl() ? 'پروژه جدید' : 'New Project' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Real Metrics Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <!-- Metric 1: Google Drive Status -->
        <div class="p-4 rounded-xl glass-panel-subtle glass-panel-hover transition-all space-y-2">
          <div class="flex items-center justify-between text-xs text-slate-400">
            <span class="font-medium">{{ i18n.t('primaryStorageStatus') }}</span>
            <mat-icon class="text-cyan-400 scale-90">cloud</mat-icon>
          </div>
          <div class="flex items-baseline gap-2">
            <span
              class="w-2.5 h-2.5 rounded-full shrink-0"
              [class.bg-emerald-400]="authSession.gdriveStatus() === 'connected'"
              [class.bg-amber-400]="authSession.gdriveStatus() === 'not_configured'"
              [class.bg-red-400]="authSession.gdriveStatus() === 'connection_error' || authSession.gdriveStatus() === 'permission_denied'"
              [class.bg-slate-500]="authSession.gdriveStatus() === 'disconnected'"
            ></span>
            <span class="text-sm font-bold text-white uppercase tracking-wider">
              {{ authSession.gdriveStatus() === 'connected' ? (i18n.isRtl() ? 'متصل' : 'Connected') : (i18n.isRtl() ? 'غیرفعال' : 'Disconnected') }}
            </span>
          </div>
          <p class="text-[11px] text-slate-400 truncate">
            {{ authSession.gdriveUser() || (i18n.isRtl() ? 'برای راه‌اندازی به تنظیمات مراجعه کنید' : 'Ready for OAuth setup') }}
          </p>
        </div>

        <!-- Metric 2: Active Projects -->
        <div class="p-4 rounded-xl glass-panel-subtle glass-panel-hover transition-all space-y-2">
          <div class="flex items-center justify-between text-xs text-slate-400">
            <span class="font-medium">{{ i18n.t('localProjectsCount') }}</span>
            <mat-icon class="text-purple-400 scale-90">folder</mat-icon>
          </div>
          <div class="text-2xl font-bold font-mono text-white">
            {{ projectManager.projects().length }}
          </div>
          <p class="text-[11px] text-slate-400">
            {{ totalProjectFiles() }} {{ i18n.isRtl() ? 'فایل در حافظه امن مرورگر' : 'files tracked in manifest' }}
          </p>
        </div>

        <!-- Metric 3: Verified Receipts -->
        <div class="p-4 rounded-xl glass-panel-subtle glass-panel-hover transition-all space-y-2">
          <div class="flex items-center justify-between text-xs text-slate-400">
            <span class="font-medium">{{ i18n.t('transferReceiptsCount') }}</span>
            <mat-icon class="text-blue-400 scale-90">receipt_long</mat-icon>
          </div>
          <div class="text-2xl font-bold font-mono text-white">
            {{ transferEngine.recentReceipts().length }}
          </div>
          <p class="text-[11px] text-slate-400">
            {{ i18n.isRtl() ? 'تایید رمزنگاری‌شده با هش SHA-256' : '100% cryptographic SHA-256' }}
          </p>
        </div>

        <!-- Metric 4: Browser Storage Quota -->
        <div class="p-4 rounded-xl glass-panel-subtle glass-panel-hover transition-all space-y-2">
          <div class="flex items-center justify-between text-xs text-slate-400">
            <span class="font-medium">{{ i18n.t('storageQuota') }}</span>
            <mat-icon class="text-emerald-400 scale-90">storage</mat-icon>
          </div>
          <div class="text-2xl font-bold font-mono text-white">
            {{ storageUsage() }}
          </div>
          <p class="text-[11px] text-slate-400">
            {{ storageQuota() }} {{ i18n.isRtl() ? 'کل سهمیه مجاز سیستم' : 'total quota estimated' }}
          </p>
        </div>

      </div>

      <!-- Real Provider Connection Status Cards -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <mat-icon class="text-cyan-400 scale-90">hub</mat-icon>
            <span>{{ i18n.t('providers') }}</span>
          </h2>
          <button
            (click)="navigateRequested.emit('providers')"
            class="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition cursor-pointer flex items-center gap-1"
          >
            <span>{{ i18n.isRtl() ? 'مدیریت و آزمایش اتصالات' : 'Manage Connections' }}</span>
            <mat-icon class="scale-75">chevron_right</mat-icon>
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          <!-- Google Drive -->
          <div class="p-3.5 rounded-xl bg-slate-900/50 border border-white/5 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <mat-icon class="scale-90">cloud</mat-icon>
              </div>
              <div>
                <span class="text-xs font-semibold text-slate-200 block">Google Drive</span>
                <span class="text-[11px] text-slate-400">{{ authSession.gdriveUser() || (i18n.isRtl() ? 'نیاز به احراز هویت' : 'OAuth token needed') }}</span>
              </div>
            </div>
            <span
              class="px-2 py-0.5 rounded text-[10px] font-mono font-medium"
              [class.bg-emerald-950]="authSession.gdriveStatus() === 'connected'"
              [class.text-emerald-400]="authSession.gdriveStatus() === 'connected'"
              [class.bg-slate-800]="authSession.gdriveStatus() !== 'connected'"
              [class.text-slate-400]="authSession.gdriveStatus() !== 'connected'"
            >
              {{ authSession.gdriveStatus() === 'connected' ? (i18n.isRtl() ? 'متصل' : 'Connected') : (i18n.isRtl() ? 'غیرفعال' : 'Offline') }}
            </span>
          </div>

          <!-- GitHub -->
          <div class="p-3.5 rounded-xl bg-slate-900/50 border border-white/5 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <mat-icon class="scale-90">code</mat-icon>
              </div>
              <div>
                <span class="text-xs font-semibold text-slate-200 block">GitHub API</span>
                <span class="text-[11px] text-slate-400">{{ authSession.githubUser() ? '@' + authSession.githubUser() : (i18n.isRtl() ? 'توکن PAT ثبت نشده' : 'PAT not set') }}</span>
              </div>
            </div>
            <span
              class="px-2 py-0.5 rounded text-[10px] font-mono font-medium"
              [class.bg-emerald-950]="authSession.githubStatus() === 'connected'"
              [class.text-emerald-400]="authSession.githubStatus() === 'connected'"
              [class.bg-slate-800]="authSession.githubStatus() !== 'connected'"
              [class.text-slate-400]="authSession.githubStatus() !== 'connected'"
            >
              {{ authSession.githubStatus() === 'connected' ? (i18n.isRtl() ? 'متصل' : 'Connected') : (i18n.isRtl() ? 'اختیاری' : 'Optional') }}
            </span>
          </div>

          <!-- cPanel / Hosting -->
          <div class="p-3.5 rounded-xl bg-slate-900/50 border border-white/5 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                <mat-icon class="scale-90">dns</mat-icon>
              </div>
              <div>
                <span class="text-xs font-semibold text-slate-200 block">cPanel Hosting</span>
                <span class="text-[11px] text-slate-400">{{ authSession.cpanelStatus() === 'connected' ? (i18n.isRtl() ? 'UAPI فعال' : 'UAPI configured') : (i18n.isRtl() ? 'بررسی CORS هاست' : 'CORS / Git target') }}</span>
              </div>
            </div>
            <span
              class="px-2 py-0.5 rounded text-[10px] font-mono font-medium"
              [class.bg-emerald-950]="authSession.cpanelStatus() === 'connected'"
              [class.text-emerald-400]="authSession.cpanelStatus() === 'connected'"
              [class.bg-slate-800]="authSession.cpanelStatus() !== 'connected'"
              [class.text-slate-400]="authSession.cpanelStatus() !== 'connected'"
            >
              {{ authSession.cpanelStatus() === 'connected' ? (i18n.isRtl() ? 'متصل' : 'Connected') : (i18n.isRtl() ? 'آزمایش نشده' : 'Untested') }}
            </span>
          </div>

        </div>
      </div>

      <!-- Recent Verified Receipts Section -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <mat-icon class="text-cyan-400 scale-90">verified</mat-icon>
            <span>{{ i18n.isRtl() ? 'آخرین رسیدهای انتقال تاییدشده' : 'Recent Verified Transfer Receipts' }}</span>
          </h2>
          <button
            (click)="navigateRequested.emit('transfer')"
            class="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition cursor-pointer flex items-center gap-1"
          >
            <span>{{ i18n.isRtl() ? 'مشاهده مرکز انتقال' : 'Open Transfer Center' }}</span>
            <mat-icon class="scale-75">chevron_right</mat-icon>
          </button>
        </div>

        @if (transferEngine.recentReceipts().length === 0) {
          <div class="p-8 rounded-2xl glass-panel text-center space-y-2 border border-white/5">
            <mat-icon class="text-slate-600 scale-125">receipt_long</mat-icon>
            <p class="text-xs text-slate-400">
              {{ i18n.isRtl() ? 'هنوز انتقالی ثبت نشده است. از دکمه «انتقال سریع فایل» استفاده کنید.' : 'No transfer receipts yet. Start by performing a verified transfer.' }}
            </p>
          </div>
        } @else {
          <div class="rounded-xl glass-panel border border-white/10 overflow-hidden">
            <div class="divide-y divide-white/5">
              @for (receipt of transferEngine.recentReceipts().slice(0, 5); track receipt.id) {
                <div class="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition">
                  <div class="flex items-start gap-3">
                    <div class="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                      <mat-icon class="scale-90">verified</mat-icon>
                    </div>
                    <div>
                      <span class="text-xs font-semibold text-slate-200 block">{{ receipt.fileName }}</span>
                      <div class="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                        <span>{{ receipt.sourceProvider }} &rarr; {{ receipt.destinationProvider }}</span>
                        <span>&bull;</span>
                        <span>{{ crypto.formatBytes(receipt.fileSize) }}</span>
                        <span>&bull;</span>
                        <span class="text-cyan-400 truncate max-w-xs" title="{{ receipt.sha256 }}">
                          SHA-256: {{ receipt.sha256.substring(0, 16) }}...
                        </span>
                      </div>
                    </div>
                  </div>
                  <div class="text-[11px] text-slate-500 font-mono shrink-0">
                    {{ receipt.timestamp | date:'short' }}
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </div>

    </div>
  `
})
export class DashboardView implements OnInit {
  i18n = inject(I18nService);
  authSession = inject(AuthSessionService);
  projectManager = inject(ProjectManagerService);
  transferEngine = inject(TransferEngineService);
  crypto = inject(CryptoService);
  gdrive = inject(GoogleDriveService);

  navigateRequested = output<string>();

  storageUsage = signal('0 KB');
  storageQuota = signal('0 MB');

  async ngOnInit() {
    await this.inspectStorage();
  }

  totalProjectFiles(): number {
    return this.projectManager.projects().reduce((sum, p) => sum + (p.fileCount || 0), 0);
  }

  async inspectStorage() {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        this.storageUsage.set(this.crypto.formatBytes(estimate.usage || 0));
        this.storageQuota.set(this.crypto.formatBytes(estimate.quota || 0));
      } catch (err) {
        console.warn('Could not estimate storage:', err);
      }
    }
  }
}
