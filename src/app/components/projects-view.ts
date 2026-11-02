import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { I18nService } from '../services/i18n.service';
import { ProjectManagerService } from '../services/project-manager.service';
import { CryptoService } from '../services/crypto.service';
import { FileItem } from '../models/types';

@Component({
  selector: 'app-projects-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="space-y-6">
      
      <!-- Top Action Bar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <h2 class="text-lg font-bold text-white flex items-center gap-2">
            <mat-icon class="text-cyan-400">folder_special</mat-icon>
            <span>{{ i18n.t('projects') }}</span>
          </h2>
          <p class="text-xs text-slate-400">
            {{ i18n.isRtl() ? 'مدیریت پروژه‌ها، اسنپ‌شات‌های نسخه‌ای، ساختار فایل‌ها و خروجی ZIP' : 'Project manifests, version snapshots, file browser & ZIP packaging' }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            (click)="showCreateModal.set(true)"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs shadow-md shadow-cyan-500/20 transition cursor-pointer"
          >
            <mat-icon class="scale-80">add</mat-icon>
            <span>{{ i18n.isRtl() ? 'پروژه جدید' : 'New Project' }}</span>
          </button>

          <!-- Import ZIP Button with hidden file input -->
          <label class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-slate-900/60 hover:bg-slate-800 text-slate-200 text-xs font-medium transition cursor-pointer">
            <mat-icon class="scale-80">file_upload</mat-icon>
            <span>{{ i18n.isRtl() ? 'وارد کردن ZIP' : 'Import ZIP' }}</span>
            <input type="file" accept=".zip" class="hidden" (change)="handleZipUpload($event)" />
          </label>

          @if (pm.activeProject()) {
            <button
              (click)="exportCurrentZip()"
              [disabled]="isExportingZip()"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-slate-900/60 hover:bg-slate-800 text-slate-200 text-xs font-medium transition cursor-pointer disabled:opacity-50"
            >
              <mat-icon class="scale-80">archive</mat-icon>
              <span>{{ isExportingZip() ? (i18n.isRtl() ? 'در حال خروجی...' : 'Exporting...') : (i18n.isRtl() ? 'خروجی ZIP' : 'Export ZIP') }}</span>
            </button>
          }
        </div>
      </div>

      <!-- Main Project Layout: Left List + Right Detail -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <!-- Left Sidebar: Project List -->
        <div class="lg:col-span-4 space-y-3">
          <div class="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
            <span>{{ i18n.isRtl() ? 'لیست پروژه‌ها' : 'Managed Projects' }} ({{ pm.projects().length }})</span>
          </div>

          @if (pm.projects().length === 0) {
            <div class="p-6 rounded-2xl glass-panel text-center space-y-3 border border-white/5">
              <mat-icon class="text-slate-600 scale-125">folder_off</mat-icon>
              <p class="text-xs text-slate-400">
                {{ i18n.isRtl() ? 'هنوز پروژه‌ای ثبت نشده است.' : 'No projects created yet.' }}
              </p>
              <button
                (click)="showCreateModal.set(true)"
                class="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-medium text-xs transition cursor-pointer"
              >
                {{ i18n.isRtl() ? 'ایجاد اولین پروژه' : 'Create First Project' }}
              </button>
            </div>
          } @else {
            <div class="space-y-2">
              @for (proj of pm.projects(); track proj.id) {
                <button
                  type="button"
                  (click)="pm.selectProject(proj.id)"
                  class="w-full text-left p-3.5 rounded-xl transition-all cursor-pointer border block"
                  [class.border-cyan-500/50]="pm.activeProject()?.id === proj.id"
                  [class.bg-cyan-950/20]="pm.activeProject()?.id === proj.id"
                  [class.border-white/5]="pm.activeProject()?.id !== proj.id"
                  [class.bg-slate-900/40]="pm.activeProject()?.id !== proj.id"
                  [class.hover:bg-slate-900/70]="pm.activeProject()?.id !== proj.id"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="space-y-1">
                      <div class="flex items-center gap-2">
                        <mat-icon class="scale-75 text-cyan-400">folder</mat-icon>
                        <span class="text-xs font-semibold text-white">{{ proj.name }}</span>
                      </div>
                      <p class="text-[11px] text-slate-400 line-clamp-1">{{ proj.description }}</p>
                    </div>
                    <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 text-cyan-300">
                      v{{ proj.version }}
                    </span>
                  </div>

                  <div class="flex items-center justify-between text-[10px] text-slate-500 mt-2 font-mono pt-2 border-t border-white/5">
                    <span>{{ proj.fileCount }} {{ i18n.isRtl() ? 'فایل' : 'files' }}</span>
                    <span>{{ crypto.formatBytes(proj.totalSize) }}</span>
                  </div>
                </button>
              }
            </div>
          }
        </div>

        <!-- Right Content: Active Project Details, Files & Snapshots -->
        <div class="lg:col-span-8 space-y-4">
          @if (pm.activeProject(); as current) {
            
            <!-- Project Header Card -->
            <div class="p-4 rounded-xl glass-panel border border-white/10 space-y-3">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <h3 class="text-base font-bold text-white">{{ current.name }}</h3>
                    <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      v{{ current.version }}
                    </span>
                  </div>
                  <p class="text-xs text-slate-400">{{ current.description }}</p>
                </div>

                <div class="flex items-center gap-2">
                  <button
                    (click)="showSnapshotModal.set(true)"
                    class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-purple-500/40 bg-purple-950/30 hover:bg-purple-900/40 text-purple-300 text-xs font-medium transition cursor-pointer"
                  >
                    <mat-icon class="scale-75">camera</mat-icon>
                    <span>{{ i18n.isRtl() ? 'ثبت اسنپ‌شات' : 'Snapshot' }}</span>
                  </button>

                  <button
                    (click)="deleteCurrentProject(current.id)"
                    class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-500/30 bg-red-950/20 hover:bg-red-900/40 text-red-400 text-xs font-medium transition cursor-pointer"
                  >
                    <mat-icon class="scale-75">delete</mat-icon>
                    <span>{{ i18n.t('delete') }}</span>
                  </button>
                </div>
              </div>

              <!-- Metadata row -->
              <div class="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 font-mono pt-2 border-t border-white/5">
                <span>ID: {{ current.id.substring(0, 8) }}...</span>
                <span>{{ i18n.isRtl() ? 'بروزرسانی:' : 'Updated:' }} {{ current.updatedAt | date:'short' }}</span>
                <span>{{ i18n.isRtl() ? 'منبع:' : 'Source:' }} {{ current.sourceProvider }}</span>
              </div>
            </div>

            <!-- Tab Switcher: Files vs Snapshots -->
            <div class="flex items-center gap-2 border-b border-white/10 pb-2">
              <button
                (click)="activeTab.set('files')"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                [class.bg-cyan-500/20]="activeTab() === 'files'"
                [class.text-cyan-300]="activeTab() === 'files'"
                [class.text-slate-400]="activeTab() !== 'files'"
              >
                <mat-icon class="scale-75">description</mat-icon>
                <span>{{ i18n.isRtl() ? 'فایل‌های پروژه' : 'Project Files' }} ({{ pm.activeProjectFiles().length }})</span>
              </button>
              <button
                (click)="activeTab.set('snapshots')"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                [class.bg-cyan-500/20]="activeTab() === 'snapshots'"
                [class.text-cyan-300]="activeTab() === 'snapshots'"
                [class.text-slate-400]="activeTab() !== 'snapshots'"
              >
                <mat-icon class="scale-75">history</mat-icon>
                <span>{{ i18n.isRtl() ? 'تاریخچه اسنپ‌شات‌ها' : 'Version Snapshots' }} ({{ pm.activeSnapshots().length }})</span>
              </button>
            </div>

            <!-- TAB 1: FILES LIST & PREVIEW -->
            @if (activeTab() === 'files') {
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-slate-400">{{ i18n.isRtl() ? 'فهرست فایل‌های این پروژه در حافظه محلی:' : 'Files stored in local manifest:' }}</span>
                  <button
                    (click)="showAddFileModal.set(true)"
                    class="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-medium transition cursor-pointer"
                  >
                    <mat-icon class="scale-75">add_circle</mat-icon>
                    <span>{{ i18n.isRtl() ? 'افزودن فایل جدید' : 'Add File' }}</span>
                  </button>
                </div>

                <div class="rounded-xl glass-panel border border-white/10 overflow-hidden divide-y divide-white/5">
                  @for (file of pm.activeProjectFiles(); track file.id) {
                    <div class="p-3 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition">
                      <div class="flex items-center gap-3">
                        <mat-icon class="text-cyan-400 scale-85">insert_drive_file</mat-icon>
                        <div>
                          <span class="text-xs font-mono font-medium text-slate-200 block">{{ file.path }}</span>
                          <span class="text-[10px] text-slate-500 font-mono">{{ crypto.formatBytes(file.size) }}</span>
                        </div>
                      </div>

                      <div class="flex items-center gap-1">
                        <button
                          (click)="previewFile(file)"
                          class="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
                          title="Preview"
                        >
                          <mat-icon class="scale-75">visibility</mat-icon>
                        </button>
                        <button
                          (click)="pm.deleteFileFromActiveProject(file.id)"
                          class="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition cursor-pointer"
                          title="Delete"
                        >
                          <mat-icon class="scale-75">delete_outline</mat-icon>
                        </button>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- TAB 2: VERSION SNAPSHOTS TIMELINE -->
            @if (activeTab() === 'snapshots') {
              <div class="space-y-3">
                @for (snap of pm.activeSnapshots(); track snap.id) {
                  <div class="p-3.5 rounded-xl glass-panel border border-white/10 space-y-2">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          v{{ snap.version }}
                        </span>
                        <h4 class="text-xs font-semibold text-white">{{ snap.title }}</h4>
                      </div>
                      <span class="text-[10px] text-slate-500 font-mono">{{ snap.timestamp | date:'short' }}</span>
                    </div>

                    <p class="text-xs text-slate-400">{{ snap.description }}</p>

                    <!-- Snapshot file list -->
                    <div class="p-2 rounded-lg bg-black/40 border border-white/5 space-y-1 font-mono text-[11px] max-h-36 overflow-y-auto">
                      @for (f of snap.files; track f.path) {
                        <div class="flex items-center justify-between text-slate-400">
                          <span>{{ f.path }}</span>
                          <span class="text-cyan-400">{{ f.sha256.substring(0, 10) }}...</span>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            }

          } @else {
            <div class="p-12 rounded-2xl glass-panel text-center space-y-3 border border-white/5">
              <mat-icon class="text-slate-600 scale-150">source</mat-icon>
              <h3 class="text-sm font-semibold text-slate-300">
                {{ i18n.isRtl() ? 'هیچ پروژه‌ای انتخاب نشده است' : 'Select or Create a Project' }}
              </h3>
              <p class="text-xs text-slate-400 max-w-sm mx-auto">
                {{ i18n.isRtl() ? 'برای مشاهده فایل‌ها و مدیریت نسخه‌ها، از منوی سمت چپ یک پروژه را انتخاب نمایید.' : 'Choose a project from the left panel or create a new one to begin.' }}
              </p>
            </div>
          }
        </div>

      </div>

      <!-- CREATE PROJECT MODAL -->
      @if (showCreateModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div class="w-full max-w-md rounded-2xl glass-panel p-6 border border-cyan-500/30 text-slate-100 shadow-2xl space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 class="font-semibold text-base text-white flex items-center gap-2">
                <mat-icon class="text-cyan-400">create_new_folder</mat-icon>
                <span>{{ i18n.isRtl() ? 'ایجاد پروژه جدید' : 'Create New Project' }}</span>
              </h3>
              <button (click)="showCreateModal.set(false)" class="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="createForm" class="space-y-3">
              <div>
                <span class="block text-xs font-medium text-slate-300 mb-1">{{ i18n.isRtl() ? 'نام پروژه' : 'Project Name' }}</span>
                <input
                  type="text"
                  formControlName="name"
                  placeholder="e.g. core-auth-engine"
                  class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <span class="block text-xs font-medium text-slate-300 mb-1">{{ i18n.isRtl() ? 'توضیحات مختصر' : 'Description' }}</span>
                <textarea
                  formControlName="description"
                  rows="3"
                  placeholder="Brief description of the project"
                  class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 resize-none"
                ></textarea>
              </div>

              <div class="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  (click)="showCreateModal.set(false)"
                  class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
                >
                  {{ i18n.t('cancel') }}
                </button>
                <button
                  type="button"
                  (click)="submitCreateProject()"
                  [disabled]="!createForm.valid"
                  class="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition cursor-pointer disabled:opacity-40"
                >
                  {{ i18n.t('create') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- ADD FILE MODAL -->
      @if (showAddFileModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div class="w-full max-w-lg rounded-2xl glass-panel p-6 border border-cyan-500/30 text-slate-100 shadow-2xl space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 class="font-semibold text-base text-white flex items-center gap-2">
                <mat-icon class="text-cyan-400">note_add</mat-icon>
                <span>{{ i18n.isRtl() ? 'افزودن فایل به پروژه' : 'Add File to Project' }}</span>
              </h3>
              <button (click)="showAddFileModal.set(false)" class="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="addFileForm" class="space-y-3">
              <div>
                <span class="block text-xs font-medium text-slate-300 mb-1">{{ i18n.isRtl() ? 'مسیر و نام فایل' : 'File Path / Name' }}</span>
                <input
                  type="text"
                  formControlName="path"
                  placeholder="e.g. src/config.json"
                  class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div>
                <span class="block text-xs font-medium text-slate-300 mb-1">{{ i18n.isRtl() ? 'محتوای فایل' : 'File Content' }}</span>
                <textarea
                  formControlName="content"
                  rows="8"
                  placeholder="Enter file text content..."
                  class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono resize-none"
                ></textarea>
              </div>

              <div class="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  (click)="showAddFileModal.set(false)"
                  class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
                >
                  {{ i18n.t('cancel') }}
                </button>
                <button
                  type="button"
                  (click)="submitAddFile()"
                  [disabled]="!addFileForm.valid"
                  class="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition cursor-pointer disabled:opacity-40"
                >
                  {{ i18n.t('save') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- SNAPSHOT MODAL -->
      @if (showSnapshotModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div class="w-full max-w-md rounded-2xl glass-panel p-6 border border-purple-500/30 text-slate-100 shadow-2xl space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 class="font-semibold text-base text-white flex items-center gap-2">
                <mat-icon class="text-purple-400">camera</mat-icon>
                <span>{{ i18n.isRtl() ? 'ثبت اسنپ‌شات نسخه' : 'Create Version Snapshot' }}</span>
              </h3>
              <button (click)="showSnapshotModal.set(false)" class="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="snapshotForm" class="space-y-3">
              <div>
                <span class="block text-xs font-medium text-slate-300 mb-1">{{ i18n.isRtl() ? 'عنوان اسنپ‌شات' : 'Snapshot Title' }}</span>
                <input
                  type="text"
                  formControlName="title"
                  placeholder="e.g. Feature release"
                  class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <span class="block text-xs font-medium text-slate-300 mb-1">{{ i18n.isRtl() ? 'توضیحات تغییرات' : 'Change Notes' }}</span>
                <textarea
                  formControlName="description"
                  rows="3"
                  placeholder="Describe snapshot changes"
                  class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 resize-none"
                ></textarea>
              </div>

              <div class="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  (click)="showSnapshotModal.set(false)"
                  class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
                >
                  {{ i18n.t('cancel') }}
                </button>
                <button
                  type="button"
                  (click)="submitSnapshot()"
                  [disabled]="!snapshotForm.valid"
                  class="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs transition cursor-pointer disabled:opacity-40"
                >
                  {{ i18n.t('confirm') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- FILE PREVIEW MODAL -->
      @if (previewingFile()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div class="w-full max-w-3xl rounded-2xl glass-panel p-6 border border-cyan-500/30 text-slate-100 shadow-2xl space-y-4 flex flex-col max-h-[85vh]">
            <div class="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <div class="flex items-center gap-2 font-mono text-xs text-cyan-400">
                <mat-icon class="scale-80">code</mat-icon>
                <span>{{ previewingFile()!.path }}</span>
              </div>
              <button (click)="previewingFile.set(null)" class="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="p-4 rounded-xl bg-slate-950/90 border border-white/5 font-mono text-xs text-slate-200 overflow-y-auto whitespace-pre-wrap flex-1 select-text">
              {{ previewingContent() }}
            </div>
          </div>
        </div>
      }

    </div>
  `
})
export class ProjectsView {
  i18n = inject(I18nService);
  pm = inject(ProjectManagerService);
  crypto = inject(CryptoService);

  activeTab = signal<'files' | 'snapshots'>('files');
  showCreateModal = signal(false);
  showAddFileModal = signal(false);
  showSnapshotModal = signal(false);
  isExportingZip = signal(false);

  previewingFile = signal<FileItem | null>(null);
  previewingContent = signal<string>('');

  createForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
    description: new FormControl('', [Validators.required])
  });

  addFileForm = new FormGroup({
    path: new FormControl('', [Validators.required]),
    content: new FormControl('', [Validators.required])
  });

  snapshotForm = new FormGroup({
    title: new FormControl('', [Validators.required]),
    description: new FormControl('', [Validators.required])
  });

  async submitCreateProject() {
    if (!this.createForm.valid) return;
    const { name, description } = this.createForm.value;
    await this.pm.createProject(name!, description!);
    this.createForm.reset();
    this.showCreateModal.set(false);
  }

  async submitAddFile() {
    if (!this.addFileForm.valid) return;
    const { path, content } = this.addFileForm.value;
    await this.pm.addFileToActiveProject(path!, content!);
    this.addFileForm.reset();
    this.showAddFileModal.set(false);
  }

  async submitSnapshot() {
    if (!this.snapshotForm.valid) return;
    const { title, description } = this.snapshotForm.value;
    await this.pm.createSnapshot(title!, description!);
    this.snapshotForm.reset();
    this.showSnapshotModal.set(false);
  }

  async exportCurrentZip() {
    const proj = this.pm.activeProject();
    if (!proj) return;
    this.isExportingZip.set(true);
    try {
      const res = await this.pm.exportProjectAsZip(proj.id);
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export zip:', err);
    } finally {
      this.isExportingZip.set(false);
    }
  }

  async handleZipUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      try {
        await this.pm.importProjectFromZip(file);
      } catch (err) {
        console.error('Failed to import zip:', err);
      }
    }
  }

  previewFile(file: FileItem) {
    this.previewingFile.set(file);
    if (typeof file.content === 'string') {
      this.previewingContent.set(file.content);
    } else {
      this.previewingContent.set('[Binary data: ' + this.crypto.formatBytes(file.size) + ']');
    }
  }

  async deleteCurrentProject(id: string) {
    const confirmed = confirm(
      this.i18n.isRtl()
        ? 'آیا از حذف کامل این پروژه و کلیه فایل‌های آن اطمینان دارید؟'
        : 'Are you sure you want to permanently delete this project and all its files?'
    );
    if (confirmed) {
      await this.pm.deleteProject(id);
    }
  }
}
