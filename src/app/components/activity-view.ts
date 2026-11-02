import { ChangeDetectionStrategy, Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { I18nService } from '../services/i18n.service';
import { ActivityLogService } from '../services/activity-log.service';

@Component({
  selector: 'app-activity-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="space-y-6">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <h2 class="text-lg font-bold text-white flex items-center gap-2">
            <mat-icon class="text-cyan-400">history</mat-icon>
            <span>{{ i18n.t('activityHistory') }}</span>
          </h2>
          <p class="text-xs text-slate-400">
            {{ i18n.isRtl() ? 'ثبت زنده رخدادها، تراکنش‌های انتقال، اسنپ‌شات‌ها و گزارش‌های امنیتی' : 'Audit logs, transfer actions, snapshot versions and security events' }}
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            (click)="exportCsv()"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-slate-900/60 hover:bg-slate-800 text-slate-200 text-xs font-medium transition cursor-pointer"
          >
            <mat-icon class="scale-75">download</mat-icon>
            <span>CSV</span>
          </button>
          <button
            (click)="clearAllLogs()"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/30 bg-red-950/20 hover:bg-red-900/40 text-red-400 text-xs font-medium transition cursor-pointer"
          >
            <mat-icon class="scale-75">delete_sweep</mat-icon>
            <span>{{ i18n.isRtl() ? 'پاکسازی' : 'Clear Logs' }}</span>
          </button>
        </div>
      </div>

      <!-- Filter bar -->
      <div class="flex flex-wrap items-center gap-3">
        <input
          type="text"
          [formControl]="searchControl"
          [placeholder]="i18n.t('search')"
          class="flex-1 min-w-[200px] px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400"
        />

        <div class="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-white/10">
          <button
            (click)="selectedCategory.set('all')"
            class="px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer"
            [class.bg-cyan-500]="selectedCategory() === 'all'"
            [class.text-slate-950]="selectedCategory() === 'all'"
            [class.text-slate-400]="selectedCategory() !== 'all'"
          >
            All
          </button>
          <button
            (click)="selectedCategory.set('transfer')"
            class="px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer"
            [class.bg-cyan-500]="selectedCategory() === 'transfer'"
            [class.text-slate-950]="selectedCategory() === 'transfer'"
            [class.text-slate-400]="selectedCategory() !== 'transfer'"
          >
            Transfers
          </button>
          <button
            (click)="selectedCategory.set('auth')"
            class="px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer"
            [class.bg-cyan-500]="selectedCategory() === 'auth'"
            [class.text-slate-950]="selectedCategory() === 'auth'"
            [class.text-slate-400]="selectedCategory() !== 'auth'"
          >
            Auth
          </button>
          <button
            (click)="selectedCategory.set('security')"
            class="px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer"
            [class.bg-cyan-500]="selectedCategory() === 'security'"
            [class.text-slate-950]="selectedCategory() === 'security'"
            [class.text-slate-400]="selectedCategory() !== 'security'"
          >
            Security
          </button>
        </div>
      </div>

      <!-- Logs List -->
      @if (filteredLogs().length === 0) {
        <div class="p-8 rounded-2xl glass-panel text-center text-xs text-slate-400 border border-white/5">
          {{ i18n.isRtl() ? 'هیچ رخدادی با این فیلتر یافت نشد.' : 'No activity entries matching current filter.' }}
        </div>
      } @else {
        <div class="rounded-xl glass-panel border border-white/10 overflow-hidden divide-y divide-white/5">
          @for (log of filteredLogs(); track log.id) {
            <div class="p-3.5 flex items-start justify-between gap-3 hover:bg-white/[0.02] transition">
              <div class="flex items-start gap-3">
                <div
                  class="p-1.5 rounded-lg shrink-0 mt-0.5"
                  [class.bg-emerald-500/10]="log.level === 'success'"
                  [class.text-emerald-400]="log.level === 'success'"
                  [class.bg-blue-500/10]="log.level === 'info'"
                  [class.text-blue-400]="log.level === 'info'"
                  [class.bg-amber-500/10]="log.level === 'warning'"
                  [class.text-amber-400]="log.level === 'warning'"
                  [class.bg-red-500/10]="log.level === 'error'"
                  [class.text-red-400]="log.level === 'error'"
                >
                  <mat-icon class="scale-75">
                    {{ log.level === 'success' ? 'check_circle' : (log.level === 'error' ? 'error' : (log.level === 'warning' ? 'warning' : 'info')) }}
                  </mat-icon>
                </div>

                <div class="space-y-0.5">
                  <p class="text-xs text-slate-200 leading-relaxed font-mono">
                    {{ i18n.isRtl() ? log.messageFa : log.messageEn }}
                  </p>
                  <div class="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                    <span class="uppercase font-semibold tracking-wider text-slate-400">{{ log.category }}</span>
                    <span>&bull;</span>
                    <span>{{ log.timestamp | date:'medium' }}</span>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      }

    </div>
  `
})
export class ActivityView {
  i18n = inject(I18nService);
  logger = inject(ActivityLogService);

  searchControl = new FormControl('');
  selectedCategory = signal<string>('all');

  filteredLogs = computed(() => {
    const list = this.logger.logs();
    const query = (this.searchControl.value || '').toLowerCase().trim();
    const cat = this.selectedCategory();

    return list.filter((l) => {
      if (cat !== 'all' && l.category !== cat) return false;
      if (!query) return true;
      const text = `${l.messageEn} ${l.messageFa} ${l.category}`.toLowerCase();
      return text.includes(query);
    });
  });

  async clearAllLogs() {
    const confirmed = confirm(this.i18n.isRtl() ? 'آیا از پاکسازی تاریخچه فعالیت‌ها اطمینان دارید؟' : 'Clear all activity logs?');
    if (confirmed) {
      await this.logger.clearAll();
    }
  }

  exportCsv() {
    const list = this.filteredLogs();
    const headers = ['ID', 'Timestamp', 'Date', 'Category', 'Level', 'Message'];
    const rows = list.map((l) => [
      l.id,
      l.timestamp,
      new Date(l.timestamp).toISOString(),
      l.category,
      l.level,
      `"${(this.i18n.isRtl() ? l.messageFa : l.messageEn).replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nononick-hub-activity-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
