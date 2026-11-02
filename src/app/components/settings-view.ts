import { ChangeDetectionStrategy, Component, inject, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { I18nService } from '../services/i18n.service';
import { DbService } from '../services/db.service';
import { AppSettings } from '../models/types';
import { PwaInstall } from './pwa-install';

@Component({
  selector: 'app-settings-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, PwaInstall],
  template: `
    <div class="space-y-6">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <h2 class="text-lg font-bold text-white flex items-center gap-2">
            <mat-icon class="text-cyan-400">tune</mat-icon>
            <span>{{ i18n.t('settings') }}</span>
          </h2>
          <p class="text-xs text-slate-400">
            {{ i18n.isRtl() ? 'پیکربندی تنظیمات سیستم، زبان، الگوهای انتقال و راهنمای نصب PWA' : 'Application preferences, language, transfer policies & PWA installation' }}
          </p>
        </div>

        <button
          (click)="saveSettings()"
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer"
        >
          <mat-icon class="scale-80">save</mat-icon>
          <span>{{ i18n.t('save') }}</span>
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <!-- GENERAL & LANGUAGE -->
        <div class="p-5 rounded-2xl glass-panel border border-white/10 space-y-4">
          <h3 class="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
            <mat-icon class="scale-75">translate</mat-icon>
            <span>{{ i18n.isRtl() ? 'زبان و رابط کاربری' : 'Language & Interface' }}</span>
          </h3>

          <div class="space-y-3">
            <div>
              <span class="block text-xs font-medium text-slate-300 mb-1">{{ i18n.isRtl() ? 'انتخاب زبان سیستم' : 'Active Language' }}</span>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  (click)="setLanguage('en')"
                  class="p-2.5 rounded-xl border text-xs font-medium transition cursor-pointer"
                  [class.border-cyan-500]="i18n.currentLang() === 'en'"
                  [class.bg-cyan-950/30]="i18n.currentLang() === 'en'"
                  [class.text-cyan-300]="i18n.currentLang() === 'en'"
                  [class.border-white/10]="i18n.currentLang() !== 'en'"
                  [class.text-slate-400]="i18n.currentLang() !== 'en'"
                >
                  English (LTR)
                </button>
                <button
                  type="button"
                  (click)="setLanguage('fa')"
                  class="p-2.5 rounded-xl border text-xs font-medium transition cursor-pointer"
                  [class.border-cyan-500]="i18n.currentLang() === 'fa'"
                  [class.bg-cyan-950/30]="i18n.currentLang() === 'fa'"
                  [class.text-cyan-300]="i18n.currentLang() === 'fa'"
                  [class.border-white/10]="i18n.currentLang() !== 'fa'"
                  [class.text-slate-400]="i18n.currentLang() !== 'fa'"
                >
                  فارسی (RTL)
                </button>
              </div>
            </div>

            <!-- PWA Installation -->
            <div class="pt-2 border-t border-white/5 space-y-2">
              <span class="block text-xs font-medium text-slate-300">{{ i18n.isRtl() ? 'نصب برنامه روی دستگاه (PWA)' : 'PWA Desktop & Mobile Installation' }}</span>
              <app-pwa-install></app-pwa-install>
            </div>

            <!-- Re-open Setup Wizard -->
            <div class="pt-2 border-t border-white/5">
              <button
                type="button"
                (click)="reopenWizardRequested.emit()"
                class="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium transition cursor-pointer"
              >
                <mat-icon class="scale-75">restart_alt</mat-icon>
                <span>{{ i18n.isRtl() ? 'اجرای مجدد راهنمای راه‌اندازی اولیه' : 'Re-run First-Launch Setup Wizard' }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- TRANSFER POLICIES -->
        <div class="p-5 rounded-2xl glass-panel border border-white/10 space-y-4">
          <h3 class="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
            <mat-icon class="scale-75">policy</mat-icon>
            <span>{{ i18n.isRtl() ? 'قوانین و استراتژی انتقال فایل' : 'Transfer & Integrity Policies' }}</span>
          </h3>

          <form [formGroup]="settingsForm" class="space-y-3">
            <div>
              <span class="block text-xs font-medium text-slate-300 mb-1">{{ i18n.isRtl() ? 'سیاست رفع تداخل فایل‌های همنام' : 'Duplicate File Conflict Policy' }}</span>
              <select
                formControlName="conflictResolution"
                class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-100 focus:outline-none focus:border-purple-400"
              >
                <option value="ask">{{ i18n.isRtl() ? 'پرسش پیش از اقدام (توصیه می‌شود)' : 'Prompt User for Confirmation (Recommended)' }}</option>
                <option value="rename">{{ i18n.isRtl() ? 'تغییر نام خودکار فایل جدید' : 'Auto-Rename Duplicate File' }}</option>
                <option value="overwrite">{{ i18n.isRtl() ? 'جایگزینی فایل قدیمی' : 'Overwrite Existing File' }}</option>
                <option value="skip">{{ i18n.isRtl() ? 'صرف‌نظر از فایل تکراری' : 'Skip Existing File' }}</option>
              </select>
            </div>

            <div>
              <span class="block text-xs font-medium text-slate-300 mb-1">Google Drive Root Folder Name</span>
              <input
                type="text"
                formControlName="gdriveRootFolderName"
                class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-100 font-mono focus:outline-none focus:border-purple-400"
              />
            </div>

            <div>
              <span class="block text-xs font-medium text-slate-300 mb-1">Google OAuth Client ID</span>
              <input
                type="text"
                formControlName="gdriveClientId"
                class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-100 font-mono focus:outline-none focus:border-purple-400"
              />
            </div>
          </form>
        </div>

      </div>

    </div>
  `
})
export class SettingsView implements OnInit {
  i18n = inject(I18nService);
  db = inject(DbService);

  reopenWizardRequested = output<void>();

  settingsForm = new FormGroup({
    conflictResolution: new FormControl<'ask' | 'overwrite' | 'skip' | 'rename'>('ask'),
    gdriveRootFolderName: new FormControl('NONONICK_UNIVERSAL_CODE_HUB'),
    gdriveClientId: new FormControl('')
  });

  async ngOnInit() {
    try {
      const s = await this.db.getSettings();
      if (s) {
        this.settingsForm.patchValue({
          conflictResolution: s.conflictResolution || 'ask',
          gdriveRootFolderName: s.gdriveRootFolderName || 'NONONICK_UNIVERSAL_CODE_HUB',
          gdriveClientId: s.gdriveClientId || ''
        });
      }
    } catch (err) {
      console.warn('Could not load settings:', err);
    }
  }

  setLanguage(lang: 'en' | 'fa') {
    this.i18n.setLanguage(lang);
  }

  async saveSettings() {
    const val = this.settingsForm.value;
    const settings: AppSettings = {
      language: this.i18n.currentLang(),
      theme: 'dark',
      gdriveClientId: val.gdriveClientId || '',
      gdriveRootFolderName: val.gdriveRootFolderName || 'NONONICK_UNIVERSAL_CODE_HUB',
      firstRunCompleted: true,
      autoVerifyTransfers: true,
      conflictResolution: val.conflictResolution || 'ask'
    };

    await this.db.saveSettings(settings);
    alert(this.i18n.isRtl() ? 'تنظیمات با موفقیت ذخیره شد.' : 'Settings saved successfully.');
  }
}
