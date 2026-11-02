import { ChangeDetectionStrategy, Component, signal, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { I18nService } from '../services/i18n.service';
import { GoogleDriveService } from '../services/providers/google-drive.service';
import { GitHubService } from '../services/providers/github.service';
import { DbService } from '../services/db.service';
import { AuthSessionService } from '../services/auth-session.service';

@Component({
  selector: 'app-setup-wizard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div class="w-full max-w-2xl rounded-2xl glass-panel p-6 border border-cyan-500/30 text-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <!-- Header -->
        <div class="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <mat-icon>hub</mat-icon>
            </div>
            <div>
              <h2 class="text-lg font-bold text-slate-100">{{ i18n.t('wizardTitle') }}</h2>
              <p class="text-xs text-slate-400">
                {{ i18n.isRtl() ? 'پیکربندی هوشمند و اتصال به سرویس‌های ابری بدون نیاز به سرور واسط' : 'Client-side configuration & provider setup without any backend' }}
              </p>
            </div>
          </div>
          <button
            (click)="skipOrClose()"
            class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
          >
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <!-- Stepper Progress Bar -->
        <div class="grid grid-cols-5 gap-1.5 py-4 shrink-0">
          @for (s of [1, 2, 3, 4, 5]; track s) {
            <div
              class="h-1.5 rounded-full transition-all duration-300"
              [class.bg-cyan-400]="currentStep() >= s"
              [class.bg-slate-800]="currentStep() < s"
            ></div>
          }
        </div>

        <!-- Step Content Area -->
        <div class="overflow-y-auto pr-1 space-y-4 flex-1">
          
          <!-- STEP 1: Architecture & Zero-Backend Overview -->
          @if (currentStep() === 1) {
            <div class="space-y-4">
              <div class="p-4 rounded-xl bg-slate-900/60 border border-cyan-500/20 space-y-2">
                <div class="flex items-center gap-2 text-cyan-300 font-semibold text-sm">
                  <mat-icon class="scale-90">verified_user</mat-icon>
                  <span>{{ i18n.isRtl() ? 'معماری صددرصد کلاینت-ساید و امن' : '100% Client-Side Secure Architecture' }}</span>
                </div>
                <p class="text-xs text-slate-300 leading-relaxed">
                  {{ i18n.isRtl()
                    ? 'این سامانه کاملاً روی مرورگر شما (Static SPA) اجرا می‌شود. هیچ سرور Node.js یا پایگاه داده واسطه‌ای برای سرقت یا شنود اطلاعات شما وجود ندارد. تمام توکن‌ها فقط در حافظه موقت سشن نگهداری می‌شوند.'
                    : 'NONONICK UNIVERSAL CODE HUB operates strictly in your browser. There is no intermediate Node.js server, PHP backend, or remote database intercepting your credentials. Tokens are held exclusively in memory for the active session.' }}
                </p>
              </div>

              <div class="grid grid-cols-2 gap-3 text-xs">
                <div class="p-3 rounded-xl bg-slate-900/40 border border-white/5 space-y-1">
                  <span class="text-cyan-400 font-semibold">{{ i18n.isRtl() ? 'فضای ابری اصلی' : 'Primary Storage' }}</span>
                  <p class="text-slate-400">{{ i18n.isRtl() ? 'گوگل درایو شخصی (Google Drive v3)' : 'Personal Google Drive via OAuth2' }}</p>
                </div>
                <div class="p-3 rounded-xl bg-slate-900/40 border border-white/5 space-y-1">
                  <span class="text-cyan-400 font-semibold">{{ i18n.isRtl() ? 'ذخیره‌سازی محلی' : 'Local Persistence' }}</span>
                  <p class="text-slate-400">{{ i18n.isRtl() ? 'پایگاه داده مرورگر (IndexedDB)' : 'Browser IndexedDB engine' }}</p>
                </div>
              </div>

              <!-- Language Selection in Step 1 -->
              <div class="p-3 rounded-xl bg-slate-900/40 border border-white/5 flex items-center justify-between">
                <div class="text-xs">
                  <span class="text-slate-200 font-medium">{{ i18n.isRtl() ? 'زبان سامانه:' : 'Application Language:' }}</span>
                  <span class="text-cyan-400 font-semibold ml-2">{{ i18n.isRtl() ? 'فارسی (RTL)' : 'English (LTR)' }}</span>
                </div>
                <button
                  type="button"
                  (click)="i18n.toggleLanguage()"
                  class="px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 text-xs hover:bg-cyan-900/40 transition cursor-pointer"
                >
                  {{ i18n.isRtl() ? 'تغییر به English' : 'Switch to فارسی' }}
                </button>
              </div>
            </div>
          }

          <!-- STEP 2: Google Drive OAuth Configuration -->
          @if (currentStep() === 2) {
            <div class="space-y-4">
              <div class="space-y-2">
                <h3 class="text-sm font-semibold text-cyan-300 flex items-center gap-2">
                  <mat-icon class="scale-90">cloud_queue</mat-icon>
                  <span>{{ i18n.isRtl() ? 'تنظیم شناسه کلاینت گوگل درایو' : 'Configure Google Drive Client ID' }}</span>
                </h3>
                <p class="text-xs text-slate-300 leading-relaxed">
                  {{ i18n.isRtl()
                    ? 'برای دسترسی امن به گوگل درایو از طریق مرورگر، نیاز به یک OAuth 2.0 Web Client ID دارید. در کنسول ابری گوگل، نشانی فعلی شما باید در قسمت «Authorized JavaScript origins» ثبت شده باشد:'
                    : 'To communicate directly with Google Drive API v3 without a proxy server, an OAuth 2.0 Web Client ID is required. In Google Cloud Console, register your current origin under "Authorized JavaScript origins":' }}
                </p>
                <div class="p-2 rounded-lg bg-black/60 border border-cyan-500/30 font-mono text-cyan-400 text-xs select-all">
                  {{ currentOrigin }}
                </div>
              </div>

              <form [formGroup]="gdriveForm" class="space-y-3">
                <div>
                  <span class="block text-xs font-medium text-slate-300 mb-1">
                    {{ i18n.isRtl() ? 'شناسه کلاینت گوگل (Google OAuth Client ID)' : 'Google OAuth Client ID' }}
                  </span>
                  <input
                    type="text"
                    formControlName="clientId"
                    placeholder="e.g. 123456789-abcdef.apps.googleusercontent.com"
                    class="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                  <p class="text-[11px] text-slate-500 mt-1">
                    {{ i18n.isRtl()
                      ? 'دامنه دسترسی حداقل: https://www.googleapis.com/auth/drive.file'
                      : 'Scope requested: https://www.googleapis.com/auth/drive.file (least-privilege)' }}
                  </p>
                </div>

                <!-- Connect Button -->
                <button
                  type="button"
                  (click)="connectGoogleDrive()"
                  [disabled]="isConnectingDrive() || !gdriveForm.get('clientId')?.value"
                  class="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  <mat-icon class="scale-90">{{ isConnectingDrive() ? 'hourglass_top' : 'login' }}</mat-icon>
                  <span>
                    {{ isConnectingDrive()
                      ? (i18n.isRtl() ? 'در حال برقراری اتصال...' : 'Requesting authorization...')
                      : (authSession.gdriveStatus() === 'connected' ? (i18n.isRtl() ? 'اتصال موفق شد (تکرار)' : 'Connected (Re-authorize)') : (i18n.isRtl() ? 'ورود و اعطای دسترسی گوگل درایو' : 'Authorize & Connect Google Drive')) }}
                  </span>
                </button>

                @if (driveError()) {
                  <div class="p-2.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
                    {{ driveError() }}
                  </div>
                }

                @if (authSession.gdriveStatus() === 'connected') {
                  <div class="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                    <mat-icon class="scale-90">check_circle</mat-icon>
                    <span>{{ i18n.isRtl() ? 'اتصال به درایو با موفقیت تأیید شد:' : 'Google Drive connection established:' }} {{ authSession.gdriveUser() || 'Authorized User' }}</span>
                  </div>
                }
              </form>
            </div>
          }

          <!-- STEP 3: Root Folder Identification -->
          @if (currentStep() === 3) {
            <div class="space-y-4">
              <div class="space-y-2">
                <h3 class="text-sm font-semibold text-cyan-300 flex items-center gap-2">
                  <mat-icon class="scale-90">folder_special</mat-icon>
                  <span>{{ i18n.isRtl() ? 'ساخت و شناسایی پوشه ریشه اختصاصی' : 'Create & Identify Application Root Folder' }}</span>
                </h3>
                <p class="text-xs text-slate-300 leading-relaxed">
                  {{ i18n.isRtl()
                    ? 'برای جلوگیری از پراکندگی فایل‌ها در درایو شخصی شما، یک پوشه اختصاصی با نام پیش‌فرض زیر در گوگل درایو ایجاد یا شناسایی می‌شود:'
                    : 'To isolate application files and avoid cluttering your personal drive, a designated root folder is identified or created in Google Drive:' }}
                </p>
              </div>

              <div class="p-3 rounded-xl bg-slate-900/70 border border-white/10 flex items-center justify-between">
                <div>
                  <span class="text-xs text-slate-400 block">{{ i18n.isRtl() ? 'نام پوشه ریشه:' : 'Root Folder Name:' }}</span>
                  <span class="text-sm font-mono text-cyan-400 font-semibold">NONONICK_UNIVERSAL_CODE_HUB</span>
                </div>
                <button
                  type="button"
                  (click)="createRootFolder()"
                  [disabled]="isCreatingFolder() || authSession.gdriveStatus() !== 'connected'"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-medium text-xs transition disabled:opacity-40 cursor-pointer"
                >
                  <mat-icon class="scale-80">create_new_folder</mat-icon>
                  <span>{{ isCreatingFolder() ? (i18n.isRtl() ? 'در حال ساخت...' : 'Creating...') : (i18n.isRtl() ? 'ایجاد / تایید پوشه' : 'Verify / Create') }}</span>
                </button>
              </div>

              @if (folderSuccessMessage()) {
                <div class="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <mat-icon class="scale-90">folder</mat-icon>
                  <span>{{ folderSuccessMessage() }}</span>
                </div>
              }
            </div>
          }

          <!-- STEP 4: Optional GitHub Integration -->
          @if (currentStep() === 4) {
            <div class="space-y-4">
              <div class="space-y-2">
                <h3 class="text-sm font-semibold text-cyan-300 flex items-center gap-2">
                  <mat-icon class="scale-90">code</mat-icon>
                  <span>{{ i18n.isRtl() ? 'اتصال به گیت‌هاب (اختیاری)' : 'Connect GitHub (Optional)' }}</span>
                </h3>
                <p class="text-xs text-slate-300 leading-relaxed">
                  {{ i18n.isRtl()
                    ? 'جهت واکشی مخازن، خواندن فایل‌ها، ایجاد کامیت مستقیم و رهگیری گردش کارهای GitHub Actions، یک توکن دسترسی شخصی (PAT) با دسترسی repo وارد نمایید:'
                    : 'To browse repositories, commit code updates, and track GitHub Actions deployment runs, enter a Personal Access Token with repo scope:' }}
                </p>
              </div>

              <div class="space-y-3">
                <div>
                  <span class="block text-xs font-medium text-slate-300 mb-1">GitHub Personal Access Token (PAT)</span>
                  <input
                    type="password"
                    [formControl]="githubTokenControl"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx or github_pat_..."
                    class="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                  <p class="text-[11px] text-slate-500 mt-1">
                    {{ i18n.isRtl() ? 'توکن صرفاً در حافظه سشن نگهداری می‌شود و هیچ‌گاه در دیسک ذخیره نمی‌شود.' : 'Token is kept in session memory only and never written to disk or logs.' }}
                  </p>
                </div>

                <button
                  type="button"
                  (click)="testGitHubToken()"
                  [disabled]="isTestingGithub() || !githubTokenControl.value"
                  class="flex items-center justify-center gap-2 w-full py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer disabled:opacity-40"
                >
                  <mat-icon class="scale-90">done_all</mat-icon>
                  <span>{{ isTestingGithub() ? (i18n.isRtl() ? 'در حال آزمایش...' : 'Testing...') : (i18n.isRtl() ? 'آزمایش و تایید توکن گیت‌هاب' : 'Test & Verify GitHub Token') }}</span>
                </button>

                @if (githubSuccessMessage()) {
                  <div class="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs">
                    {{ githubSuccessMessage() }}
                  </div>
                }

                @if (githubErrorMessage()) {
                  <div class="p-2.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
                    {{ githubErrorMessage() }}
                  </div>
                }
              </div>
            </div>
          }

          <!-- STEP 5: Final Acceptance Summary -->
          @if (currentStep() === 5) {
            <div class="space-y-4">
              <div class="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-2">
                <div class="flex items-center gap-2 text-cyan-300 font-semibold text-sm">
                  <mat-icon>task_alt</mat-icon>
                  <span>{{ i18n.isRtl() ? 'پیکربندی اولیه آماده است' : 'Initial Setup Complete & Ready' }}</span>
                </div>
                <p class="text-xs text-slate-300 leading-relaxed">
                  {{ i18n.isRtl()
                    ? 'مرکز جامع کد نونونیک آماده استفاده است. می‌توانید پروژه‌های خود را ایجاد یا وارد کنید، فایل‌ها را با اعتبارسنجی رمزنگاری SHA-256 بین گوگل درایو و گیت‌هاب جابه‌جا کنید و رسیدهای دیجیتال دریافت نمایید.'
                    : 'NONONICK UNIVERSAL CODE HUB is initialized and ready. You can now create or import projects, transfer verified files with SHA-256 integrity checks between Google Drive, GitHub, and other endpoints, and manage snapshots.' }}
                </p>
              </div>

              <div class="grid grid-cols-2 gap-3 text-xs">
                <div class="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
                  <span class="text-slate-400 block">{{ i18n.isRtl() ? 'وضعیت درایو:' : 'Google Drive:' }}</span>
                  <span class="font-semibold" [class.text-emerald-400]="authSession.gdriveStatus() === 'connected'" [class.text-amber-400]="authSession.gdriveStatus() !== 'connected'">
                    {{ authSession.gdriveStatus() === 'connected' ? (i18n.isRtl() ? 'متصل و فعال' : 'Connected') : (i18n.isRtl() ? 'نیاز به پیکربندی' : 'Unconfigured') }}
                  </span>
                </div>
                <div class="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
                  <span class="text-slate-400 block">{{ i18n.isRtl() ? 'وضعیت گیت‌هاب:' : 'GitHub:' }}</span>
                  <span class="font-semibold" [class.text-emerald-400]="authSession.githubStatus() === 'connected'" [class.text-amber-400]="authSession.githubStatus() !== 'connected'">
                    {{ authSession.githubStatus() === 'connected' ? (i18n.isRtl() ? 'متصل (@' + authSession.githubUser() + ')' : 'Connected (@' + authSession.githubUser() + ')') : (i18n.isRtl() ? 'غیرفعال (اختیاری)' : 'Optional') }}
                  </span>
                </div>
              </div>
            </div>
          }

        </div>

        <!-- Footer Navigation Buttons -->
        <div class="flex items-center justify-between pt-4 border-t border-white/10 shrink-0">
          @if (currentStep() > 1) {
            <button
              type="button"
              (click)="previousStep()"
              class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
            >
              {{ i18n.isRtl() ? 'مرحله قبل' : 'Back' }}
            </button>
          } @else {
            <div></div>
          }

          <div class="flex items-center gap-2">
            @if (currentStep() < 5) {
              <button
                type="button"
                (click)="nextStep()"
                class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs shadow-md transition cursor-pointer"
              >
                <span>{{ i18n.isRtl() ? 'مرحله بعد' : 'Next' }}</span>
                <mat-icon class="scale-75">arrow_forward</mat-icon>
              </button>
            } @else {
              <button
                type="button"
                (click)="completeWizard()"
                class="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 transition cursor-pointer"
              >
                <mat-icon class="scale-80">check</mat-icon>
                <span>{{ i18n.isRtl() ? 'ورود به محیط سامانه' : 'Launch Hub Dashboard' }}</span>
              </button>
            }
          </div>
        </div>

      </div>
    </div>
  `
})
export class SetupWizard {
  i18n = inject(I18nService);
  gdrive = inject(GoogleDriveService);
  github = inject(GitHubService);
  db = inject(DbService);
  authSession = inject(AuthSessionService);

  wizardClosed = output<void>();

  currentStep = signal(1);
  currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://...';

  gdriveForm = new FormGroup({
    clientId: new FormControl('')
  });

  githubTokenControl = new FormControl('');

  isConnectingDrive = signal(false);
  driveError = signal<string | null>(null);

  isCreatingFolder = signal(false);
  folderSuccessMessage = signal<string | null>(null);

  isTestingGithub = signal(false);
  githubSuccessMessage = signal<string | null>(null);
  githubErrorMessage = signal<string | null>(null);

  nextStep() {
    this.currentStep.update((s) => Math.min(5, s + 1));
  }

  previousStep() {
    this.currentStep.update((s) => Math.max(1, s - 1));
  }

  async connectGoogleDrive() {
    const clientId = this.gdriveForm.get('clientId')?.value;
    if (!clientId) return;

    this.isConnectingDrive.set(true);
    this.driveError.set(null);

    try {
      await this.gdrive.requestOAuthToken(clientId);
      this.isConnectingDrive.set(false);
    } catch (err: unknown) {
      this.isConnectingDrive.set(false);
      this.driveError.set(err instanceof Error ? err.message : String(err));
    }
  }

  async createRootFolder() {
    this.isCreatingFolder.set(true);
    try {
      const folderId = await this.gdrive.getOrCreateRootFolder();
      this.folderSuccessMessage.set(`Root folder ready. ID: ${folderId}`);
    } catch (err: unknown) {
      this.folderSuccessMessage.set(null);
      this.driveError.set(err instanceof Error ? err.message : String(err));
    } finally {
      this.isCreatingFolder.set(false);
    }
  }

  async testGitHubToken() {
    const val = this.githubTokenControl.value;
    if (!val) return;

    this.isTestingGithub.set(true);
    this.githubSuccessMessage.set(null);
    this.githubErrorMessage.set(null);

    try {
      const res = await this.github.testConnection(val);
      this.githubSuccessMessage.set(`Connected as @${res.login} with ${res.scopes}`);
    } catch (err: unknown) {
      this.githubErrorMessage.set(err instanceof Error ? err.message : String(err));
    } finally {
      this.isTestingGithub.set(false);
    }
  }

  async completeWizard() {
    try {
      const settings = (await this.db.getSettings()) || {
        language: this.i18n.currentLang(),
        theme: 'dark',
        gdriveClientId: this.gdriveForm.get('clientId')?.value || '',
        gdriveRootFolderName: 'NONONICK_UNIVERSAL_CODE_HUB',
        firstRunCompleted: true,
        autoVerifyTransfers: true,
        conflictResolution: 'ask'
      };
      settings.firstRunCompleted = true;
      if (this.gdriveForm.get('clientId')?.value) {
        settings.gdriveClientId = this.gdriveForm.get('clientId')!.value!;
      }
      await this.db.saveSettings(settings);
    } catch (err) {
      console.warn('Could not save settings:', err);
    }
    this.wizardClosed.emit();
  }

  skipOrClose() {
    this.wizardClosed.emit();
  }
}
