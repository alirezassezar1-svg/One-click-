import { ChangeDetectionStrategy, Component, signal, inject, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { I18nService } from '../services/i18n.service';
import { GoogleDriveService } from '../services/providers/google-drive.service';
import { GitHubService, GitHubRepo } from '../services/providers/github.service';
import { OneDriveService } from '../services/providers/onedrive.service';
import { CPanelService } from '../services/providers/cpanel.service';
import { AuthSessionService } from '../services/auth-session.service';
import { ProjectManagerService } from '../services/project-manager.service';
import { CryptoService } from '../services/crypto.service';
import { FileItem, ProviderType } from '../models/types';

@Component({
  selector: 'app-explorer-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="space-y-6">
      
      <!-- Top Explorer Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <h2 class="text-lg font-bold text-white flex items-center gap-2">
            <mat-icon class="text-cyan-400">explore</mat-icon>
            <span>{{ i18n.t('fileExplorer') }}</span>
          </h2>
          <p class="text-xs text-slate-400">
            {{ i18n.isRtl() ? 'مرور و مدیریت مستقیم فایل‌ها در تمامی سرویس‌دهنده‌های متصل' : 'Direct file inspection across connected cloud & local providers' }}
          </p>
        </div>

        <!-- Provider Switcher -->
        <div class="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-900/80 border border-white/10">
          <button
            (click)="selectProvider('local')"
            class="px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer"
            [class.bg-cyan-500]="activeProvider() === 'local'"
            [class.text-slate-950]="activeProvider() === 'local'"
            [class.text-slate-400]="activeProvider() !== 'local'"
          >
            Local
          </button>
          <button
            (click)="selectProvider('gdrive')"
            class="px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer"
            [class.bg-cyan-500]="activeProvider() === 'gdrive'"
            [class.text-slate-950]="activeProvider() === 'gdrive'"
            [class.text-slate-400]="activeProvider() !== 'gdrive'"
          >
            Google Drive
          </button>
          <button
            (click)="selectProvider('github')"
            class="px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer"
            [class.bg-cyan-500]="activeProvider() === 'github'"
            [class.text-slate-950]="activeProvider() === 'github'"
            [class.text-slate-400]="activeProvider() !== 'github'"
          >
            GitHub
          </button>
          <button
            (click)="selectProvider('onedrive')"
            class="px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer"
            [class.bg-cyan-500]="activeProvider() === 'onedrive'"
            [class.text-slate-950]="activeProvider() === 'onedrive'"
            [class.text-slate-400]="activeProvider() !== 'onedrive'"
          >
            OneDrive
          </button>
        </div>
      </div>

      <!-- Provider Context / Authentication Status Alert -->
      @if (!isProviderReady()) {
        <div class="p-6 rounded-2xl glass-panel text-center space-y-3 border border-amber-500/20">
          <mat-icon class="text-amber-400 scale-125">lock</mat-icon>
          <h3 class="text-sm font-semibold text-slate-200">
            {{ i18n.isRtl() ? 'سرویس‌دهنده نیاز به احراز هویت دارد' : 'Provider Authorization Required' }}
          </h3>
          <p class="text-xs text-slate-400 max-w-md mx-auto">
            {{ i18n.isRtl() ? 'برای دسترسی به فایل‌های این بخش، ابتدا اتصال را در بخش اتصالات برقرار نمایید.' : 'Authorize this provider in Provider Connections to browse remote files.' }}
          </p>
        </div>
      } @else {
        
        <!-- GitHub Repo Selector when GitHub is active -->
        @if (activeProvider() === 'github') {
          <div class="p-3 rounded-xl glass-panel border border-white/10 flex flex-wrap items-center gap-3">
            <span class="text-xs text-slate-300 font-medium">{{ i18n.isRtl() ? 'انتخاب مخزن:' : 'Repository:' }}</span>
            <select
              (change)="onSelectGitHubRepo($event)"
              class="px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-cyan-300 focus:outline-none"
            >
              @for (repo of githubRepos(); track repo.id) {
                <option [value]="repo.full_name">{{ repo.full_name }}</option>
              }
            </select>
          </div>
        }

        <!-- File Toolbar -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <button
              (click)="loadFiles()"
              [disabled]="isLoading()"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-slate-900/60 hover:bg-slate-800 text-slate-200 text-xs font-medium transition cursor-pointer"
            >
              <mat-icon class="scale-75" [class.animate-spin]="isLoading()">refresh</mat-icon>
              <span>{{ i18n.t('refresh') }}</span>
            </button>

            <!-- Upload File to current provider -->
            <label class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition cursor-pointer">
              <mat-icon class="scale-75">upload_file</mat-icon>
              <span>{{ i18n.t('upload') }}</span>
              <input type="file" class="hidden" (change)="handleFileUpload($event)" />
            </label>
          </div>

          <span class="text-xs text-slate-400 font-mono">
            {{ fileList().length }} {{ i18n.isRtl() ? 'مورد' : 'items' }}
          </span>
        </div>

        <!-- Files List Table -->
        <div class="rounded-xl glass-panel border border-white/10 overflow-hidden">
          @if (isLoading()) {
            <div class="p-10 text-center space-y-2 text-slate-400">
              <mat-icon class="animate-spin text-cyan-400 scale-125">rotate_right</mat-icon>
              <p class="text-xs">{{ i18n.isRtl() ? 'در حال خواندن اطلاعات از سرور...' : 'Querying provider files...' }}</p>
            </div>
          } @else if (fileList().length === 0) {
            <div class="p-8 text-center space-y-2 text-slate-400">
              <mat-icon class="scale-125 text-slate-600">folder_open</mat-icon>
              <p class="text-xs">{{ i18n.isRtl() ? 'هیچ فایلی در این شاخه یافت نشد.' : 'No files in this directory.' }}</p>
            </div>
          } @else {
            <div class="divide-y divide-white/5">
              @for (file of fileList(); track file.id) {
                <div class="p-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition">
                  <div class="flex items-center gap-3">
                    <mat-icon class="scale-85" [class.text-amber-400]="file.isFolder" [class.text-cyan-400]="!file.isFolder">
                      {{ file.isFolder ? 'folder' : 'insert_drive_file' }}
                    </mat-icon>
                    <div>
                      <span class="text-xs font-semibold text-slate-200 block">{{ file.name }}</span>
                      <div class="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                        <span>{{ crypto.formatBytes(file.size) }}</span>
                        <span>&bull;</span>
                        <span>{{ file.lastModified | date:'short' }}</span>
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-1.5">
                    @if (!file.isFolder) {
                      <!-- Send to Transfer Center -->
                      <button
                        (click)="sendToTransfer(file)"
                        class="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs font-medium hover:bg-cyan-900/40 transition cursor-pointer"
                        title="Transfer this file"
                      >
                        <mat-icon class="scale-75">sync_alt</mat-icon>
                        <span class="hidden sm:inline">{{ i18n.isRtl() ? 'انتقال' : 'Transfer' }}</span>
                      </button>

                      <!-- Download -->
                      <button
                        (click)="downloadFile(file)"
                        class="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
                        title="Download"
                      >
                        <mat-icon class="scale-75">download</mat-icon>
                      </button>
                    }

                    <!-- Delete -->
                    <button
                      (click)="deleteFile(file)"
                      class="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition cursor-pointer"
                      title="Delete"
                    >
                      <mat-icon class="scale-75">delete_outline</mat-icon>
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>

      }

    </div>
  `
})
export class ExplorerView implements OnInit {
  i18n = inject(I18nService);
  gdrive = inject(GoogleDriveService);
  github = inject(GitHubService);
  onedrive = inject(OneDriveService);
  cpanel = inject(CPanelService);
  authSession = inject(AuthSessionService);
  pm = inject(ProjectManagerService);
  crypto = inject(CryptoService);

  transferInitiated = output<{ provider: ProviderType; fileId: string; fileName: string }>();

  activeProvider = signal<ProviderType>('local');
  isLoading = signal(false);
  fileList = signal<FileItem[]>([]);
  githubRepos = signal<GitHubRepo[]>([]);
  selectedGhRepo = signal<string>('');

  ngOnInit() {
    this.selectProvider('local');
  }

  isProviderReady(): boolean {
    const prov = this.activeProvider();
    if (prov === 'local') return true;
    return this.authSession.hasActiveCredentials(prov);
  }

  async selectProvider(provider: ProviderType) {
    this.activeProvider.set(provider);
    if (!this.isProviderReady()) return;

    if (provider === 'github' && this.githubRepos().length === 0) {
      try {
        const repos = await this.github.listRepositories();
        this.githubRepos.set(repos);
        if (repos.length > 0) {
          this.selectedGhRepo.set(repos[0].full_name);
        }
      } catch (err) {
        console.error('Could not list repos:', err);
      }
    }

    await this.loadFiles();
  }

  async loadFiles() {
    this.isLoading.set(true);
    const prov = this.activeProvider();

    try {
      if (prov === 'local') {
        const files = this.pm.activeProjectFiles();
        this.fileList.set(files);
      } else if (prov === 'gdrive') {
        const files = await this.gdrive.listFiles();
        this.fileList.set(files);
      } else if (prov === 'github') {
        const repoFullName = this.selectedGhRepo();
        if (repoFullName) {
          const [owner, name] = repoFullName.split('/');
          const files = await this.github.listContents(owner, name);
          this.fileList.set(files);
        }
      } else if (prov === 'onedrive') {
        const files = await this.onedrive.listItems();
        this.fileList.set(files);
      }
    } catch (err) {
      console.error('Failed to load files:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  async onSelectGitHubRepo(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.selectedGhRepo.set(select.value);
    await this.loadFiles();
  }

  async handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    const prov = this.activeProvider();
    this.isLoading.set(true);

    try {
      if (prov === 'local') {
        const text = await file.text();
        await this.pm.addFileToActiveProject(file.name, text, file.type);
      } else if (prov === 'gdrive') {
        await this.gdrive.uploadFile(file.name, file);
      } else if (prov === 'github') {
        const [owner, name] = this.selectedGhRepo().split('/');
        const text = await file.text();
        await this.github.writeRepoFile(owner, name, file.name, text, `Upload ${file.name}`);
      } else if (prov === 'onedrive') {
        await this.onedrive.uploadFile(file.name, file);
      }

      await this.loadFiles();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  async downloadFile(file: FileItem) {
    const prov = this.activeProvider();
    try {
      let blob: Blob;
      if (prov === 'gdrive') {
        blob = await this.gdrive.downloadFile(file.id);
      } else if (prov === 'onedrive') {
        blob = await this.onedrive.downloadFile(file.id);
      } else if (prov === 'github') {
        const [owner, name] = this.selectedGhRepo().split('/');
        const res = await this.github.readFile(owner, name, file.path);
        blob = new Blob([res.content], { type: 'text/plain' });
      } else {
        blob = new Blob([typeof file.content === 'string' ? file.content : ''], { type: 'text/plain' });
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  }

  async deleteFile(file: FileItem) {
    const confirmed = confirm(
      this.i18n.isRtl()
        ? `آیا از حذف فایل «${file.name}» اطمینان دارید؟`
        : `Are you sure you want to delete "${file.name}"?`
    );
    if (!confirmed) return;

    const prov = this.activeProvider();
    this.isLoading.set(true);

    try {
      if (prov === 'gdrive') {
        await this.gdrive.deleteFile(file.id);
      } else if (prov === 'onedrive') {
        await this.onedrive.deleteItem(file.id);
      } else if (prov === 'local') {
        await this.pm.deleteFileFromActiveProject(file.id);
      }

      await this.loadFiles();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  sendToTransfer(file: FileItem) {
    this.transferInitiated.emit({
      provider: this.activeProvider(),
      fileId: file.id,
      fileName: file.name
    });
  }
}
