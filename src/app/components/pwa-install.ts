import { ChangeDetectionStrategy, Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { I18nService } from '../services/i18n.service';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

@Component({
  selector: 'app-pwa-install',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (!isInstalled()) {
      @if (isInstallable()) {
        <button
          (click)="triggerInstall()"
          class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-semibold text-xs shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition-all cursor-pointer"
        >
          <mat-icon class="text-sm scale-90">download_for_offline</mat-icon>
          <span>{{ i18n.t('installApp') }}</span>
        </button>
      } @else if (isIOS()) {
        <button
          (click)="showIOSModal.set(true)"
          class="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/30 text-cyan-300 font-medium text-xs hover:bg-cyan-950/60 transition-all cursor-pointer"
        >
          <mat-icon class="text-sm scale-90">phone_iphone</mat-icon>
          <span>{{ i18n.isRtl() ? 'نصب در آیفون (iOS)' : 'Install on iOS' }}</span>
        </button>
      }
    }

    <!-- iOS Instructions Modal -->
    @if (showIOSModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div class="w-full max-w-sm rounded-2xl glass-panel p-6 border border-cyan-500/30 text-slate-100 shadow-2xl">
          <div class="flex items-center justify-between pb-3 border-b border-white/10">
            <div class="flex items-center gap-2 text-cyan-400">
              <mat-icon>apple</mat-icon>
              <h3 class="font-semibold text-base">{{ i18n.t('installSafariTitle') }}</h3>
            </div>
            <button
              (click)="showIOSModal.set(false)"
              class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
            >
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="py-4 space-y-4 text-sm text-slate-300">
            <div class="flex items-start gap-3">
              <span class="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold shrink-0">1</span>
              <p>{{ i18n.t('installSafariStep1') }}</p>
            </div>
            <div class="flex items-start gap-3">
              <span class="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold shrink-0">2</span>
              <p>{{ i18n.t('installSafariStep2') }}</p>
            </div>
          </div>

          <button
            (click)="showIOSModal.set(false)"
            class="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
          >
            {{ i18n.t('close') }}
          </button>
        </div>
      </div>
    }
  `
})
export class PwaInstall implements OnInit {
  i18n = inject(I18nService);

  isInstallable = signal(false);
  isInstalled = signal(false);
  isIOS = signal(false);
  showIOSModal = signal(false);

  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  ngOnInit() {
    if (typeof window === 'undefined') return;

    // Standalone check
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    this.isInstalled.set(isStandalone);

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    this.isIOS.set(/iphone|ipad|ipod/.test(ua));

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.isInstallable.set(true);
    });

    window.addEventListener('appinstalled', () => {
      this.isInstalled.set(true);
      this.isInstallable.set(false);
      this.deferredPrompt = null;
    });

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
    }
  }

  async triggerInstall() {
    if (!this.deferredPrompt) return;
    await this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      this.isInstalled.set(true);
      this.isInstallable.set(false);
      this.deferredPrompt = null;
    }
  }
}
