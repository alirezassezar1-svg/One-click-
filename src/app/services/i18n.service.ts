import { Injectable, signal, computed } from '@angular/core';

export type SupportedLanguage = 'en' | 'fa';

export type Translations = Record<string, {
  en: string;
  fa: string;
}>;

export const I18N_DICTIONARY: Translations = {
  // Navigation & Headers
  appTitle: {
    en: 'NONONICK UNIVERSAL CODE HUB',
    fa: 'مرکز جامع کد نونونیک'
  },
  appSubtitle: {
    en: 'Personal Browser-Based File Transfer & Project Engine',
    fa: 'موتور انتقال فایل و مدیریت پروژه ابری، بدون سرور واسط'
  },
  dashboard: {
    en: 'Dashboard',
    fa: 'داشبورد'
  },
  projects: {
    en: 'Projects',
    fa: 'پروژه‌ها'
  },
  fileExplorer: {
    en: 'File Explorer',
    fa: 'کاوشگر فایل'
  },
  transferCenter: {
    en: 'Transfer Center',
    fa: 'مرکز انتقال فایل'
  },
  providers: {
    en: 'Provider Connections',
    fa: 'اتصالات سرویس‌دهنده‌ها'
  },
  deployment: {
    en: 'Deployment Center',
    fa: 'مرکز استقرار'
  },
  backupRestore: {
    en: 'Backup & Restore',
    fa: 'پشتیبان‌گیری و بازیابی'
  },
  activityHistory: {
    en: 'Activity History',
    fa: 'تاریخچه فعالیت‌ها'
  },
  securityCenter: {
    en: 'Security Center',
    fa: 'مرکز امنیت'
  },
  settings: {
    en: 'Settings',
    fa: 'تنظیمات'
  },

  // Common Actions
  save: { en: 'Save', fa: 'ذخیره' },
  cancel: { en: 'Cancel', fa: 'انصراف' },
  delete: { en: 'Delete', fa: 'حذف' },
  confirm: { en: 'Confirm', fa: 'تأیید' },
  close: { en: 'Close', fa: 'بستن' },
  refresh: { en: 'Refresh', fa: 'بروزرسانی' },
  testConnection: { en: 'Test Connection', fa: 'آزمایش اتصال' },
  connect: { en: 'Connect', fa: 'اتصال' },
  disconnect: { en: 'Disconnect', fa: 'قطع اتصال' },
  upload: { en: 'Upload', fa: 'بارگذاری' },
  download: { en: 'Download', fa: 'دانلود' },
  browse: { en: 'Browse', fa: 'مرور' },
  create: { en: 'Create', fa: 'ایجاد' },
  import: { en: 'Import', fa: 'وارد کردن' },
  export: { en: 'Export', fa: 'صادر کردن' },
  search: { en: 'Search...', fa: 'جستجو...' },
  actions: { en: 'Actions', fa: 'عملیات' },
  status: { en: 'Status', fa: 'وضعیت' },
  details: { en: 'Details', fa: 'جزئیات' },

  // Status Labels
  notConfigured: { en: 'Not Configured', fa: 'پیکربندی نشده' },
  disconnected: { en: 'Disconnected', fa: 'قطع شده' },
  authorizing: { en: 'Authorizing...', fa: 'در حال احراز هویت...' },
  connected: { en: 'Connected', fa: 'متصل' },
  permissionDenied: { en: 'Permission Denied', fa: 'دسترسی رد شد' },
  serviceUnavailable: { en: 'Service Unavailable', fa: 'سرویس در دسترس نیست' },
  connectionError: { en: 'Connection Error', fa: 'خطای ارتباط' },

  // Dashboard Stats
  connectedProviders: { en: 'Active Connections', fa: 'اتصالات فعال' },
  localProjectsCount: { en: 'Managed Projects', fa: 'پروژه‌های مدیریت‌شده' },
  transferReceiptsCount: { en: 'Verified Receipts', fa: 'رسیدهای تاییدشده' },
  storageQuota: { en: 'Local Storage Quota', fa: 'فضای ذخیره‌سازی محلی' },
  primaryStorageStatus: { en: 'Primary Storage (Google Drive)', fa: 'فضای ابری اصلی (گوگل درایو)' },
  quickActions: { en: 'Quick Hub Actions', fa: 'دسترسی سریع' },

  // Setup Wizard
  wizardTitle: { en: 'Initial Setup Wizard', fa: 'راهنمای راه‌اندازی اولیه' },
  wizardStep1: { en: '1. Architecture & Security', fa: '۱. معماری و امنیت' },
  wizardStep2: { en: '2. Google Drive Setup', fa: '۲. تنظیمات گوگل درایو' },
  wizardStep3: { en: '3. Root Folder Setup', fa: '۳. ساخت پوشه ریشه' },
  wizardStep4: { en: '4. GitHub & Providers', fa: '۴. گیت‌هاب و سایر سرویس‌ها' },
  wizardStep5: { en: '5. Complete & Verify', fa: '۵. تکمیل و راستی‌آزمایی' },

  // Security
  tokenGuardNotice: {
    en: 'Zero Secret Persistence: Access tokens are held strictly in temporary session memory and are never written to disk, local files, or backups.',
    fa: 'عدم ذخیره توکن‌های محرمانه: توکن‌های دسترسی صرفاً در حافظه موقت سشن نگهداری می‌شوند و هرگز روی دیسک، فایل یا پشتیبان ذخیره نخواهند شد.'
  },
  purgeSessions: { en: 'Purge All Active Sessions', fa: 'پاکسازی کلیه سشن‌های فعال' },
  purgeSessionsSuccess: { en: 'All session tokens cleared from memory.', fa: 'کلیه توکن‌های سشن از حافظه موقت پاک شدند.' },

  // PWA
  installApp: { en: 'Install App (PWA)', fa: 'نصب برنامه (PWA)' },
  installed: { en: 'App Installed', fa: 'برنامه نصب شده است' },
  installSafariTitle: { en: 'Install on Apple Safari (iOS)', fa: 'نصب در سافاری اپل (iOS)' },
  installSafariStep1: { en: '1. Tap the Share button in Safari bottom bar.', fa: '۱. روی دکمه اشتراک‌گذاری (Share) در نوار پایینی ضربه بزنید.' },
  installSafariStep2: { en: '2. Scroll down and tap "Add to Home Screen".', fa: '۲. به پایین بروید و گزینه «Add to Home Screen» را لمس کنید.' }
};

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  currentLang = signal<SupportedLanguage>('en');

  isRtl = computed(() => this.currentLang() === 'fa');

  init() {
    const saved = localStorage.getItem('nononick_lang') as SupportedLanguage;
    if (saved === 'fa' || saved === 'en') {
      this.setLanguage(saved);
    } else {
      // Auto detect user browser language
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith('fa')) {
        this.setLanguage('fa');
      } else {
        this.setLanguage('en');
      }
    }
  }

  setLanguage(lang: SupportedLanguage) {
    this.currentLang.set(lang);
    try {
      localStorage.setItem('nononick_lang', lang);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
      }
    } catch {
      // storage unavailable
    }
  }

  toggleLanguage() {
    this.setLanguage(this.currentLang() === 'en' ? 'fa' : 'en');
  }

  t(key: string, defaultText?: string): string {
    const item = I18N_DICTIONARY[key];
    if (!item) {
      return defaultText || key;
    }
    return item[this.currentLang()] || item['en'] || defaultText || key;
  }
}
