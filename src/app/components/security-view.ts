import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { I18nService } from '../services/i18n.service';
import { AuthSessionService } from '../services/auth-session.service';

@Component({
  selector: 'app-security-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="space-y-6">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <h2 class="text-lg font-bold text-white flex items-center gap-2">
            <mat-icon class="text-cyan-400">shield</mat-icon>
            <span>{{ i18n.t('securityCenter') }}</span>
          </h2>
          <p class="text-xs text-slate-400">
            {{ i18n.isRtl() ? 'مرکز بازرسی امنیتی، مدیریت سشن‌ها، پاکسازی اضطراری و راهنمای لغو دسترسی' : 'Security audit center, session credential guard, memory purging & revocation guides' }}
          </p>
        </div>

        <button
          (click)="purgeAllSessions()"
          class="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/25 transition cursor-pointer"
        >
          <mat-icon class="scale-80">lock_reset</mat-icon>
          <span>{{ i18n.t('purgeSessions') }}</span>
        </button>
      </div>

      <!-- Core Security Principle Banner -->
      <div class="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 flex items-start gap-3">
        <mat-icon class="text-cyan-400 shrink-0 mt-0.5">verified_user</mat-icon>
        <div class="space-y-1">
          <span class="text-xs font-bold text-cyan-300 block">{{ i18n.isRtl() ? 'اصل عدم ماندگاری توکن‌های محرمانه' : 'Zero-Secret Persistence Standard' }}</span>
          <p class="text-xs text-slate-300 leading-relaxed">
            {{ i18n.t('tokenGuardNotice') }}
          </p>
        </div>
      </div>

      <!-- Active In-Memory Credentials Audit Table -->
      <div class="space-y-3">
        <h3 class="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <mat-icon class="scale-75 text-cyan-400">inventory_2</mat-icon>
          <span>{{ i18n.isRtl() ? 'وضعیت زنده اعتبارسنجی در سشن فعلی' : 'Current Session Credential Audit' }}</span>
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <!-- Google Drive Session -->
          <div class="p-4 rounded-xl glass-panel border border-white/5 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-200">Google Drive Token (GIS)</span>
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
            <p class="text-[11px] text-slate-400">
              {{ authSession.getGoogleDriveToken() ? (i18n.isRtl() ? 'توکن فعال در RAM - زمان انقضا بررسی می‌شود' : 'Active token in volatile RAM memory') : (i18n.isRtl() ? 'هیچ توکنی در حافظه نیست' : 'No token in session') }}
            </p>
          </div>

          <!-- GitHub Session -->
          <div class="p-4 rounded-xl glass-panel border border-white/5 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-200">GitHub PAT Session</span>
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
            <p class="text-[11px] text-slate-400">
              {{ authSession.getGithubToken() ? '@' + authSession.githubUser() + ' (Memory Only)' : (i18n.isRtl() ? 'بدون توکن فعال' : 'No PAT configured') }}
            </p>
          </div>

        </div>
      </div>

      <!-- Access Revocation Guides -->
      <div class="space-y-3">
        <h3 class="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <mat-icon class="scale-75 text-cyan-400">help_outline</mat-icon>
          <span>{{ i18n.isRtl() ? 'راهنمای لغو رسمی دسترسی در سرویس‌ها' : 'Provider Access Revocation Guidance' }}</span>
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          
          <div class="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
            <span class="font-bold text-blue-400">Google Account</span>
            <p class="text-slate-400 text-[11px] leading-relaxed">
              {{ i18n.isRtl()
                ? 'برای لغو دسترسی به myaccount.google.com/permissions مراجعه کرده و اتصال NONONICK Hub را حذف کنید.'
                : 'Visit myaccount.google.com/permissions and revoke Third-party apps access.' }}
            </p>
          </div>

          <div class="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
            <span class="font-bold text-purple-400">GitHub Settings</span>
            <p class="text-slate-400 text-[11px] leading-relaxed">
              {{ i18n.isRtl()
                ? 'در github.com/settings/tokens می‌توانید توکن ایجادشده را هر لحظه Delete نمایید.'
                : 'Navigate to github.com/settings/tokens to delete or revoke your Personal Access Token.' }}
            </p>
          </div>

          <div class="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
            <span class="font-bold text-orange-400">cPanel Host</span>
            <p class="text-slate-400 text-[11px] leading-relaxed">
              {{ i18n.isRtl()
                ? 'در منوی Manage API Tokens هاست خود، توکن ایجادشده را ابطال نمایید.'
                : 'In cPanel under "Manage API Tokens", revoke the token anytime.' }}
            </p>
          </div>

        </div>
      </div>

    </div>
  `
})
export class SecurityView {
  i18n = inject(I18nService);
  authSession = inject(AuthSessionService);

  purgeAllSessions() {
    const confirmed = confirm(
      this.i18n.isRtl()
        ? 'آیا از پاکسازی تمامی توکن‌ها و سشن‌های فعال اطمینان دارید؟ کلیه دسترسی‌ها از حافظه برنامه پاک خواهند شد.'
        : 'Purge all active session tokens and credentials from memory?'
    );
    if (confirmed) {
      this.authSession.purgeAllSessions();
      alert(this.i18n.t('purgeSessionsSuccess'));
    }
  }
}
