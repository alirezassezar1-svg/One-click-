import { ChangeDetectionStrategy, Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { I18nService } from '../services/i18n.service';
import { TransferEngineService } from '../services/transfer-engine.service';
import { AuthSessionService } from '../services/auth-session.service';
import { ProjectManagerService } from '../services/project-manager.service';
import { GoogleDriveService } from '../services/providers/google-drive.service';
import { GitHubService } from '../services/providers/github.service';
import { OneDriveService } from '../services/providers/onedrive.service';
import { CryptoService } from '../services/crypto.service';
import { ProviderType, FileItem } from '../models/types';

@Component({
  selector: 'app-transfer-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="space-y-6">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <h2 class="text-lg font-bold text-white flex items-center gap-2">
            <mat-icon class="text-cyan-400">sync_alt</mat-icon>
            <span>{{ i18n.t('transferCenter') }}</span>
          </h2>
          <p class="text-xs text-slate-400">
            {{ i18n.isRtl() ? 'موتور انتقال رمزنگاری‌شده با راستی‌آزمایی هش SHA-256 و صدور رسید دیجیتال' : 'Cryptographic file transfer engine with SHA-256 verification and immutable receipts' }}
          </p>
        </div>

        @if (engine.isTransferring()) {
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs font-medium">
            <span class="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span>{{ i18n.isRtl() ? 'عملیات انتقال در جریان است...' : 'Transfer in progress...' }}</span>
          </div>
        }
      </div>

      <!-- ACTIVE TRANSFER JOBS QUEUE (If any) -->
      @if (engine.activeJobs().length > 0) {
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <mat-icon class="scale-75 text-cyan-400">pending_actions</mat-icon>
              <span>{{ i18n.isRtl() ? 'صف انتقال‌های فعال' : 'Transfer Queue & Progress' }} ({{ engine.activeJobs().length }})</span>
            </span>
            <button
              (click)="engine.clearFinishedJobs()"
              class="text-[11px] text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              {{ i18n.isRtl() ? 'پاکسازی موارد خاتمه‌یافته' : 'Clear Completed' }}
            </button>
          </div>

          <div class="space-y-2">
            @for (job of engine.activeJobs(); track job.id) {
              <div class="p-3.5 rounded-xl glass-panel border border-white/10 space-y-2">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-semibold text-white">{{ job.fileName }}</span>
                    <span class="text-[10px] text-slate-400 font-mono">
                      ({{ job.sourceProvider }} &rarr; {{ job.destinationProvider }})
                    </span>
                  </div>
                  <span
                    class="px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase"
                    [class.bg-cyan-950]="job.status === 'reading' || job.status === 'uploading' || job.status === 'hashing'"
                    [class.text-cyan-400]="job.status === 'reading' || job.status === 'uploading' || job.status === 'hashing'"
                    [class.bg-emerald-950]="job.status === 'completed'"
                    [class.text-emerald-400]="job.status === 'completed'"
                    [class.bg-red-950]="job.status === 'failed'"
                    [class.text-red-400]="job.status === 'failed'"
                  >
                    {{ job.status }}
                  </span>
                </div>

                <!-- Progress Bar -->
                <div class="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    class="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                    [style.width.%]="job.progressPercent"
                  ></div>
                </div>

                <div class="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>{{ job.progressPercent }}% &bull; {{ crypto.formatBytes(job.bytesTransferred) }} / {{ crypto.formatBytes(job.fileSize) }}</span>
                  @if (job.sha256Source) {
                    <span class="text-cyan-400">SHA-256: {{ job.sha256Source.substring(0, 12) }}...</span>
                  }
                </div>

                @if (job.error) {
                  <p class="text-[11px] text-red-400 font-mono">{{ job.error }}</p>
                }
              </div>
            }
          </div>
        </div>
      }

      <!-- NEW TRANSFER WIZARD PANEL -->
      <div class="p-6 rounded-2xl glass-panel border border-cyan-500/20 space-y-6">
        <h3 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <mat-icon class="text-cyan-400 scale-90">swap_horiz</mat-icon>
          <span>{{ i18n.isRtl() ? 'پیکربندی انتقال جدید' : 'Configure New Transfer' }}</span>
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <!-- SOURCE CARD -->
          <div class="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-3">
            <div class="flex items-center justify-between pb-2 border-b border-white/5">
              <span class="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                <mat-icon class="scale-75">cloud_download</mat-icon>
                <span>{{ i18n.isRtl() ? '۱. سرویس‌دهنده مبدأ' : '1. Source Provider' }}</span>
              </span>
              <span class="text-[11px] text-slate-400 font-mono">FROM</span>
            </div>

            <div class="space-y-3">
              <div>
                <span class="block text-[11px] text-slate-400 mb-1">{{ i18n.isRtl() ? 'انتخاب منبع' : 'Select Source' }}</span>
                <select
                  [formControl]="sourceProviderControl"
                  (change)="onSourceProviderChange()"
                  class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
                >
                  <option value="local">Local Project Files (IndexedDB)</option>
                  <option value="gdrive">Google Drive (OAuth v3)</option>
                  <option value="github">GitHub Repository</option>
                  <option value="onedrive">Microsoft OneDrive</option>
                </select>
              </div>

              <!-- Source Files List to select from -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <span class="block text-[11px] text-slate-400">{{ i18n.isRtl() ? 'فایل مبدأ' : 'Source File' }}</span>
                  <button
                    type="button"
                    (click)="loadSourceFiles()"
                    class="text-[10px] text-cyan-400 hover:text-cyan-300 cursor-pointer flex items-center gap-0.5"
                  >
                    <mat-icon class="scale-60">refresh</mat-icon>
                    <span>{{ i18n.t('refresh') }}</span>
                  </button>
                </div>

                @if (isLoadingSource()) {
                  <div class="p-3 text-center text-xs text-slate-400">Loading files...</div>
                } @else if (sourceFiles().length === 0) {
                  <div class="p-3 rounded-lg bg-black/40 text-center text-xs text-slate-500">
                    {{ i18n.isRtl() ? 'هیچ فایلی برای انتخاب در این منبع یافت نشد.' : 'No files found for this source.' }}
                  </div>
                } @else {
                  <select
                    [formControl]="selectedSourceFileControl"
                    class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-100 focus:outline-none focus:border-cyan-400 font-mono"
                  >
                    @for (f of sourceFiles(); track f.id) {
                      <option [value]="f.id">{{ f.name }} ({{ crypto.formatBytes(f.size) }})</option>
                    }
                  </select>
                }
              </div>
            </div>
          </div>

          <!-- DESTINATION CARD -->
          <div class="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-3">
            <div class="flex items-center justify-between pb-2 border-b border-white/5">
              <span class="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                <mat-icon class="scale-75">cloud_upload</mat-icon>
                <span>{{ i18n.isRtl() ? '۲. سرویس‌دهنده مقصد' : '2. Destination Provider' }}</span>
              </span>
              <span class="text-[11px] text-slate-400 font-mono">TO</span>
            </div>

            <div class="space-y-3">
              <div>
                <span class="block text-[11px] text-slate-400 mb-1">{{ i18n.isRtl() ? 'انتخاب مقصد' : 'Select Destination' }}</span>
                <select
                  [formControl]="destProviderControl"
                  class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-100 focus:outline-none focus:border-purple-400"
                >
                  <option value="gdrive">Google Drive (OAuth v3)</option>
                  <option value="github">GitHub Repository</option>
                  <option value="onedrive">Microsoft OneDrive</option>
                  <option value="cpanel">cPanel Fileman (public_html)</option>
                  <option value="local">Local Project Manifest</option>
                </select>
              </div>

              <!-- Destination folder / path -->
              <div>
                <span class="block text-[11px] text-slate-400 mb-1">{{ i18n.isRtl() ? 'مسیر یا پوشه مقصد' : 'Destination Path / Folder ID' }}</span>
                <input
                  type="text"
                  [formControl]="destPathControl"
                  placeholder="e.g. root or folderId or public_html"
                  class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-100 font-mono focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>
          </div>

        </div>

        <!-- Confirmation & Execution Bar -->
        <div class="p-4 rounded-xl bg-slate-950/80 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <mat-icon class="scale-75 text-emerald-400">security</mat-icon>
              <span>{{ i18n.isRtl() ? 'سیاست انتقال امن: کپی، اعتبارسنجی هش، صدور رسید' : 'Safe Policy: Read, Hash SHA-256, Write, Verify, Issue Receipt' }}</span>
            </div>
            <p class="text-[11px] text-slate-400">
              {{ i18n.isRtl() ? 'فایل مبدأ هرگز به طور خودکار پاک نمی‌شود.' : 'Source files are never deleted automatically.' }}
            </p>
          </div>

          <button
            type="button"
            (click)="triggerTransferExecution()"
            [disabled]="engine.isTransferring() || !selectedSourceFileControl.value"
            class="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition cursor-pointer disabled:opacity-40"
          >
            <mat-icon class="scale-80">play_arrow</mat-icon>
            <span>{{ i18n.isRtl() ? 'تایید و اجرای انتقال' : 'Confirm & Execute Transfer' }}</span>
          </button>
        </div>

      </div>

      <!-- IMMUTABLE TRANSFER RECEIPTS HISTORY -->
      <div class="space-y-3">
        <h3 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <mat-icon class="text-cyan-400 scale-90">receipt_long</mat-icon>
          <span>{{ i18n.isRtl() ? 'رسیدهای تاییدشده انتقال (Transfer Receipts)' : 'Immutable Verified Transfer Receipts' }}</span>
        </h3>

        @if (engine.recentReceipts().length === 0) {
          <div class="p-8 rounded-2xl glass-panel text-center text-xs text-slate-400 border border-white/5">
            {{ i18n.isRtl() ? 'هنوز رسیدی صادر نشده است.' : 'No transfer receipts generated yet.' }}
          </div>
        } @else {
          <div class="rounded-xl glass-panel border border-white/10 overflow-hidden divide-y divide-white/5">
            @for (receipt of engine.recentReceipts(); track receipt.id) {
              <div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition">
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-white">{{ receipt.fileName }}</span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                      VERIFIED ({{ receipt.verificationMethod }})
                    </span>
                  </div>
                  <div class="text-[11px] text-slate-400 font-mono flex flex-wrap items-center gap-2">
                    <span>{{ receipt.sourceProvider }} &rarr; {{ receipt.destinationProvider }}</span>
                    <span>&bull;</span>
                    <span>{{ crypto.formatBytes(receipt.fileSize) }}</span>
                    <span>&bull;</span>
                    <span>{{ receipt.durationMs }}ms</span>
                  </div>
                  <div class="text-[10px] text-cyan-300 font-mono select-all">
                    SHA-256: {{ receipt.sha256 }}
                  </div>
                </div>

                <div class="text-[11px] text-slate-500 font-mono shrink-0">
                  {{ receipt.timestamp | date:'medium' }}
                </div>
              </div>
            }
          </div>
        }
      </div>

    </div>
  `
})
export class TransferView implements OnInit {
  i18n = inject(I18nService);
  engine = inject(TransferEngineService);
  authSession = inject(AuthSessionService);
  pm = inject(ProjectManagerService);
  gdrive = inject(GoogleDriveService);
  github = inject(GitHubService);
  onedrive = inject(OneDriveService);
  crypto = inject(CryptoService);

  sourceProviderControl = new FormControl<ProviderType>('local');
  destProviderControl = new FormControl<ProviderType>('gdrive');
  selectedSourceFileControl = new FormControl<string>('');
  destPathControl = new FormControl<string>('');

  sourceFiles = signal<FileItem[]>([]);
  isLoadingSource = signal(false);

  async ngOnInit() {
    await this.engine.loadReceipts();
    await this.loadSourceFiles();
  }

  async onSourceProviderChange() {
    await this.loadSourceFiles();
  }

  async loadSourceFiles() {
    const prov = this.sourceProviderControl.value || 'local';
    this.isLoadingSource.set(true);
    this.sourceFiles.set([]);

    try {
      if (prov === 'local') {
        const files = this.pm.activeProjectFiles();
        this.sourceFiles.set(files);
        if (files.length > 0) this.selectedSourceFileControl.setValue(files[0].id);
      } else if (prov === 'gdrive' && this.authSession.getGoogleDriveToken()) {
        const files = await this.gdrive.listFiles();
        const nonFolders = files.filter((f) => !f.isFolder);
        this.sourceFiles.set(nonFolders);
        if (nonFolders.length > 0) this.selectedSourceFileControl.setValue(nonFolders[0].id);
      } else if (prov === 'onedrive' && this.authSession.getOnedriveToken()) {
        const files = await this.onedrive.listItems();
        const nonFolders = files.filter((f) => !f.isFolder);
        this.sourceFiles.set(nonFolders);
        if (nonFolders.length > 0) this.selectedSourceFileControl.setValue(nonFolders[0].id);
      }
    } catch (err) {
      console.warn('Could not load source files:', err);
    } finally {
      this.isLoadingSource.set(false);
    }
  }

  async triggerTransferExecution() {
    const srcProv = this.sourceProviderControl.value || 'local';
    const destProv = this.destProviderControl.value || 'gdrive';
    const fileId = this.selectedSourceFileControl.value;
    const destPath = this.destPathControl.value || '';

    if (!fileId) return;

    const confirmed = confirm(
      this.i18n.isRtl()
        ? `آیا از شروع انتقال فایل از ${srcProv} به ${destProv} و انجام اعتبارسنجی رمزنگاری اطمینان دارید؟`
        : `Confirm executing transfer from ${srcProv} to ${destProv} with cryptographic verification?`
    );

    if (!confirmed) return;

    try {
      await this.engine.executeTransfer(srcProv, fileId, destProv, destPath);
    } catch (err: unknown) {
      alert(`Transfer failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
