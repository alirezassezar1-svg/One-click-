import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { I18nService } from '../services/i18n.service';
import { DbService } from '../services/db.service';
import { ProjectManagerService } from '../services/project-manager.service';
import { TransferEngineService } from '../services/transfer-engine.service';
import { ActivityLogService } from '../services/activity-log.service';

@Component({
  selector: 'app-backup-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="space-y-6">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <h2 class="text-lg font-bold text-white flex items-center gap-2">
            <mat-icon class="text-cyan-400">settings_backup_restore</mat-icon>
            <span>{{ i18n.t('backupRestore') }}</span>
          </h2>
          <p class="text-xs text-slate-400">
            {{ i18n.isRtl() ? 'پشتیبان‌گیری کامل از داده‌های محلی، پروژه‌ها و رسیدها بدون ذخیره اسرار' : 'Full JSON snapshot backup & restore for local database without secret retention' }}
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <!-- EXPORT CARD -->
        <div class="p-5 rounded-2xl glass-panel border border-cyan-500/20 space-y-4">
          <div class="flex items-center gap-3">
            <div class="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <mat-icon>file_download</mat-icon>
            </div>
            <div>
              <h3 class="text-sm font-bold text-white">{{ i18n.isRtl() ? 'خروجی فایل پشتیبان' : 'Export Full Backup' }}</h3>
              <p class="text-[11px] text-slate-400">NONONICK_HUB_DB &rarr; JSON</p>
            </div>
          </div>

          <p class="text-xs text-slate-300 leading-relaxed">
            {{ i18n.isRtl()
              ? 'یک نسخه پشتیبان کامل از تمامی پروژه‌ها، اسناد، رسیدهای انتقال تاییدشده و لاگ‌های فعالیت ایجاد کرده و روی کامپیوتر شما ذخیره می‌کند.'
              : 'Dumps all projects, files, verified transfer receipts, and activity audit logs into a clean, portable JSON archive.' }}
          </p>

          <button
            type="button"
            (click)="exportBackup()"
            [disabled]="isExporting()"
            class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
          >
            <mat-icon class="scale-80">download</mat-icon>
            <span>{{ isExporting() ? (i18n.isRtl() ? 'در حال خروجی...' : 'Exporting...') : (i18n.isRtl() ? 'دانلود فایل پشتیبان (JSON)' : 'Download Backup File') }}</span>
          </button>
        </div>

        <!-- IMPORT CARD -->
        <div class="p-5 rounded-2xl glass-panel border border-purple-500/20 space-y-4">
          <div class="flex items-center gap-3">
            <div class="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <mat-icon>file_upload</mat-icon>
            </div>
            <div>
              <h3 class="text-sm font-bold text-white">{{ i18n.isRtl() ? 'بازیابی از فایل پشتیبان' : 'Restore from Backup' }}</h3>
              <p class="text-[11px] text-purple-400">JSON &rarr; NONONICK_HUB_DB</p>
            </div>
          </div>

          <p class="text-xs text-slate-300 leading-relaxed">
            {{ i18n.isRtl()
              ? 'فایل پشتیبان JSON را انتخاب نمایید. پس از راستی‌آزمایی ساختار فایل، داده‌ها به پایگاه داده مرورگر اضافه خواهند شد.'
              : 'Select a previously exported JSON backup. Data is parsed, validated, and safely merged into your browser IndexedDB.' }}
          </p>

          <label class="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition cursor-pointer">
            <mat-icon class="scale-80">upload_file</mat-icon>
            <span>{{ isImporting() ? 'Restoring...' : (i18n.isRtl() ? 'انتخاب فایل و بازیابی' : 'Select Backup to Restore') }}</span>
            <input type="file" accept=".json" class="hidden" (change)="importBackup($event)" [disabled]="isImporting()" />
          </label>

          @if (importSuccessMsg()) {
            <div class="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <mat-icon class="scale-80">check_circle</mat-icon>
              <span>{{ importSuccessMsg() }}</span>
            </div>
          }
        </div>

      </div>

    </div>
  `
})
export class BackupView {
  i18n = inject(I18nService);
  db = inject(DbService);
  pm = inject(ProjectManagerService);
  transferEngine = inject(TransferEngineService);
  logger = inject(ActivityLogService);

  isExporting = signal(false);
  isImporting = signal(false);
  importSuccessMsg = signal<string | null>(null);

  async exportBackup() {
    this.isExporting.set(true);
    try {
      const dump = await this.db.exportFullBackup();
      const blob = new Blob([dump], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nononick-hub-backup-${new Date().toISOString().substring(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      this.isExporting.set(false);
    }
  }

  async importBackup(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.isImporting.set(true);
    this.importSuccessMsg.set(null);

    try {
      const text = await file.text();
      const res = await this.db.importFullBackup(text);
      await this.pm.loadAllProjects();
      await this.transferEngine.loadReceipts();
      await this.logger.loadRecentLogs();
      this.importSuccessMsg.set(`Restored successfully: ${res.projectsImported} projects, ${res.filesImported} files.`);
    } catch (err: unknown) {
      alert(`Import error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      this.isImporting.set(false);
    }
  }
}
