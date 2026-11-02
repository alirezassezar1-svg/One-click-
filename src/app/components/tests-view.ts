import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { I18nService } from '../services/i18n.service';
import { TestSuiteService } from '../services/test-suite.service';

@Component({
  selector: 'app-tests-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="space-y-6">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <h2 class="text-lg font-bold text-white flex items-center gap-2">
            <mat-icon class="text-cyan-400">fact_check</mat-icon>
            <span>{{ i18n.isRtl() ? 'آزمون‌های پذیرش و صحه‌گذاری سیستم' : 'Acceptance Criteria & Live System Verification' }}</span>
          </h2>
          <p class="text-xs text-slate-400">
            {{ i18n.isRtl() ? 'اجرای زنده آزمایش‌ها، راستی‌آزمایی پروتکل‌ها و گزارش رسمی معیارها' : 'Live verification suite testing real APIs, cryptographic hashes & browser protocols' }}
          </p>
        </div>

        <button
          (click)="testSuite.runAllTests()"
          [disabled]="testSuite.isRunning()"
          class="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
        >
          <mat-icon class="scale-80" [class.animate-spin]="testSuite.isRunning()">refresh</mat-icon>
          <span>{{ testSuite.isRunning() ? 'Running Tests...' : (i18n.isRtl() ? 'اجرای کلیه آزمون‌ها' : 'Execute Test Suite') }}</span>
        </button>
      </div>

      <!-- Test Results Table -->
      <div class="rounded-xl glass-panel border border-white/10 overflow-hidden divide-y divide-white/5">
        @for (item of testSuite.testResults(); track item.testNameEn) {
          <div class="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-white/[0.02] transition">
            
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span
                  class="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider"
                  [class.bg-emerald-950]="item.status === 'PASSED'"
                  [class.text-emerald-400]="item.status === 'PASSED'"
                  [class.border]="item.status === 'PASSED'"
                  [class.border-emerald-500/30]="item.status === 'PASSED'"
                  [class.bg-red-950]="item.status === 'FAILED'"
                  [class.text-red-400]="item.status === 'FAILED'"
                  [class.bg-slate-800]="item.status === 'UNVERIFIED' || item.status === 'PENDING'"
                  [class.text-slate-400]="item.status === 'UNVERIFIED' || item.status === 'PENDING'"
                >
                  {{ item.status }}
                </span>
                <span class="text-xs font-bold text-white">
                  {{ i18n.isRtl() ? item.testNameFa : item.testNameEn }}
                </span>
              </div>

              <p class="text-xs text-slate-300">{{ item.resultDescription }}</p>

              @if (item.error) {
                <p class="text-[11px] text-red-400 font-mono">{{ item.error }}</p>
              }

              @if (item.requiredConfig && item.status === 'UNVERIFIED') {
                <div class="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                  <mat-icon class="scale-60">info</mat-icon>
                  <span>Required: {{ item.requiredConfig }}</span>
                </div>
              }
            </div>

            <div class="text-right shrink-0">
              <mat-icon
                class="scale-90"
                [class.text-emerald-400]="item.status === 'PASSED'"
                [class.text-red-400]="item.status === 'FAILED'"
                [class.text-slate-600]="item.status === 'UNVERIFIED' || item.status === 'PENDING'"
              >
                {{ item.status === 'PASSED' ? 'check_circle' : (item.status === 'FAILED' ? 'cancel' : 'help_outline') }}
              </mat-icon>
            </div>

          </div>
        }
      </div>

    </div>
  `
})
export class TestsView {
  i18n = inject(I18nService);
  testSuite = inject(TestSuiteService);
}
