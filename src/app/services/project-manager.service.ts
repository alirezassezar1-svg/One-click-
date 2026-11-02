import { Injectable, signal, inject } from '@angular/core';
import { ProjectManifest, FileItem, ProjectSnapshot, ProviderType } from '../models/types';
import { DbService } from './db.service';
import { CryptoService } from './crypto.service';
import { ActivityLogService } from './activity-log.service';
import { GoogleDriveService } from './providers/google-drive.service';
import { GitHubService } from './providers/github.service';
import JSZip from 'jszip';

@Injectable({
  providedIn: 'root'
})
export class ProjectManagerService {
  private db = inject(DbService);
  private crypto = inject(CryptoService);
  private logger = inject(ActivityLogService);
  private gdrive = inject(GoogleDriveService);
  private github = inject(GitHubService);

  projects = signal<ProjectManifest[]>([]);
  activeProject = signal<ProjectManifest | null>(null);
  activeProjectFiles = signal<FileItem[]>([]);
  activeSnapshots = signal<ProjectSnapshot[]>([]);

  async loadAllProjects() {
    try {
      const list = await this.db.getAllProjects();
      this.projects.set(list);
      if (list.length > 0 && !this.activeProject()) {
        await this.selectProject(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  }

  async selectProject(id: string) {
    const proj = await this.db.getProject(id);
    if (!proj) return;
    this.activeProject.set(proj);

    const files = await this.db.getFilesByProject(id);
    this.activeProjectFiles.set(files);

    const snapshots = await this.db.getSnapshots(id);
    this.activeSnapshots.set(snapshots);
  }

  /**
   * Create a new project
   */
  async createProject(name: string, description: string, sourceProvider: ProviderType = 'local'): Promise<ProjectManifest> {
    const id = this.crypto.generateId();
    const manifest: ProjectManifest = {
      id,
      name: name.trim(),
      description: description.trim(),
      version: '1.0.0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sourceProvider,
      tags: ['core'],
      fileCount: 0,
      totalSize: 0
    };

    await this.db.saveProject(manifest);
    this.projects.update((list) => [manifest, ...list]);
    await this.selectProject(id);

    // Create an initial README.md
    await this.addFileToActiveProject('README.md', `# ${manifest.name}\n\n${manifest.description}\n\nCreated with Nononick Universal Code Hub.`);

    // Create initial snapshot v1.0.0
    await this.createSnapshot('Initial release v1.0.0', 'Initial project baseline snapshot');

    this.logger.log('project', 'success', `Project "${manifest.name}" created.`, `پروژه «${manifest.name}» ایجاد گردید.`);
    return manifest;
  }

  /**
   * Add file to active project
   */
  async addFileToActiveProject(filePath: string, content: string | Uint8Array, mimeType = 'text/plain'): Promise<FileItem> {
    const project = this.activeProject();
    if (!project) throw new Error('No active project selected.');

    const cleanPath = filePath.trim().replace(/^\/+/, '');
    const fileName = cleanPath.split('/').pop() || cleanPath;

    let size = 0;
    if (typeof content === 'string') {
      size = new TextEncoder().encode(content).byteLength;
    } else {
      size = content.byteLength;
    }

    const sha256 = await this.crypto.computeSha256(content);

    const fileItem: FileItem = {
      id: this.crypto.generateId(),
      name: fileName,
      path: cleanPath,
      size,
      mimeType,
      lastModified: Date.now(),
      sha256,
      provider: 'local',
      isFolder: false,
      parentId: project.id,
      content
    };

    await this.db.saveFile(fileItem);

    // Update active project files
    this.activeProjectFiles.update((files) => {
      const filtered = files.filter((f) => f.path !== cleanPath);
      return [...filtered, fileItem];
    });

    // Update project stats
    await this.refreshProjectStats(project.id);
    return fileItem;
  }

  /**
   * Remove file from active project
   */
  async deleteFileFromActiveProject(fileId: string) {
    const project = this.activeProject();
    if (!project) return;

    await this.db.deleteFile(fileId);
    this.activeProjectFiles.update((files) => files.filter((f) => f.id !== fileId));
    await this.refreshProjectStats(project.id);
  }

  /**
   * Refresh project size and file count
   */
  private async refreshProjectStats(projectId: string) {
    const files = await this.db.getFilesByProject(projectId);
    const totalSize = files.reduce((acc, f) => acc + f.size, 0);
    const fileCount = files.length;

    const proj = await this.db.getProject(projectId);
    if (proj) {
      proj.fileCount = fileCount;
      proj.totalSize = totalSize;
      proj.updatedAt = Date.now();
      await this.db.saveProject(proj);

      this.activeProject.set(proj);
      this.projects.update((list) => list.map((p) => (p.id === projectId ? { ...proj } : p)));
    }
  }

  /**
   * Create version snapshot
   */
  async createSnapshot(title: string, description: string): Promise<ProjectSnapshot> {
    const project = this.activeProject();
    if (!project) throw new Error('No active project selected.');

    const files = this.activeProjectFiles();
    const snapFiles = files.map((f) => ({
      path: f.path,
      size: f.size,
      sha256: f.sha256 || 'unknown',
      mimeType: f.mimeType
    }));

    // Auto increment version
    const parts = (project.version || '1.0.0').split('.');
    const patch = Number(parts[2] || 0) + 1;
    const newVersion = `${parts[0] || '1'}.${parts[1] || '0'}.${patch}`;

    const snapshot: ProjectSnapshot = {
      id: this.crypto.generateId(),
      projectId: project.id,
      version: newVersion,
      title: title.trim(),
      description: description.trim(),
      timestamp: Date.now(),
      files: snapFiles,
      manifestSummary: `${files.length} files, ${this.crypto.formatBytes(project.totalSize)}`
    };

    await this.db.saveSnapshot(snapshot);

    // Update project version
    project.version = newVersion;
    project.updatedAt = Date.now();
    await this.db.saveProject(project);

    this.activeSnapshots.update((list) => [snapshot, ...list]);
    this.activeProject.set({ ...project });

    this.logger.log(
      'snapshot',
      'success',
      `Snapshot ${newVersion} created for "${project.name}".`,
      `اسنپ‌شات نسخه ${newVersion} برای پروژه «${project.name}» ثبت شد.`
    );

    return snapshot;
  }

  /**
   * Export project as downloadable ZIP archive
   */
  async exportProjectAsZip(projectId: string): Promise<{ blob: Blob; fileName: string }> {
    const project = await this.db.getProject(projectId);
    if (!project) throw new Error('Project not found.');

    const files = await this.db.getFilesByProject(projectId);
    const zip = new JSZip();

    // Add project manifest
    zip.file('hub-manifest.json', JSON.stringify(project, null, 2));

    // Add files
    for (const file of files) {
      if (typeof file.content === 'string') {
        zip.file(file.path, file.content);
      } else if (file.content instanceof Uint8Array) {
        zip.file(file.path, file.content);
      } else {
        zip.file(file.path, '');
      }
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const safeName = project.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    return {
      blob,
      fileName: `${safeName}-v${project.version}.zip`
    };
  }

  /**
   * Import project from a user-uploaded ZIP archive
   */
  async importProjectFromZip(file: File): Promise<ProjectManifest> {
    const zip = await JSZip.loadAsync(file);
    const projName = file.name.replace(/\.zip$/i, '') || 'Imported Project';

    const project = await this.createProject(projName, `Imported from ${file.name}`);
    const filesToSave: FileItem[] = [];

    // Check if zip contains hub-manifest.json
    const manifestFile = zip.file('hub-manifest.json');
    if (manifestFile) {
      try {
        const manifestText = await manifestFile.async('text');
        const parsed = JSON.parse(manifestText);
        if (parsed.name) project.name = parsed.name;
        if (parsed.description) project.description = parsed.description;
        if (parsed.version) project.version = parsed.version;
        await this.db.saveProject(project);
      } catch {
        // use default
      }
    }

    for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.dir || relativePath === 'hub-manifest.json') continue;

      const isText = /\.(txt|md|json|js|ts|html|css|py|sh|yaml|yml|xml|env)$/i.test(relativePath);
      let content: string | Uint8Array;
      let mimeType = 'application/octet-stream';

      if (isText) {
        content = await zipEntry.async('text');
        mimeType = 'text/plain';
      } else {
        content = await zipEntry.async('uint8array');
      }

      const sha = await this.crypto.computeSha256(content);
      const fileName = relativePath.split('/').pop() || relativePath;

      filesToSave.push({
        id: this.crypto.generateId(),
        name: fileName,
        path: relativePath,
        size: typeof content === 'string' ? new TextEncoder().encode(content).byteLength : content.byteLength,
        mimeType,
        lastModified: Date.now(),
        sha256: sha,
        provider: 'local',
        isFolder: false,
        parentId: project.id,
        content
      });
    }

    await this.db.saveFilesBatch(filesToSave);
    await this.refreshProjectStats(project.id);
    await this.selectProject(project.id);

    this.logger.log('project', 'success', `Imported ${filesToSave.length} files into "${project.name}".`, `تعداد ${filesToSave.length} فایل به پروژه «${project.name}» وارد شدند.`);
    return project;
  }

  /**
   * Delete Project with confirmation
   */
  async deleteProject(id: string) {
    const proj = await this.db.getProject(id);
    if (!proj) return;

    await this.db.deleteProject(id);
    this.projects.update((list) => list.filter((p) => p.id !== id));

    if (this.activeProject()?.id === id) {
      const remaining = this.projects();
      if (remaining.length > 0) {
        await this.selectProject(remaining[0].id);
      } else {
        this.activeProject.set(null);
        this.activeProjectFiles.set([]);
        this.activeSnapshots.set([]);
      }
    }

    this.logger.log('project', 'warning', `Project "${proj.name}" permanently deleted.`, `پروژه «${proj.name}» به طور کامل حذف شد.`);
  }

  /**
   * Import project from a GitHub repository
   */
  async importFromGitHub(owner: string, repo: string, branch = 'main'): Promise<ProjectManifest> {
    const files = await this.github.listContents(owner, repo, '', branch);
    const projectName = `${repo} (${branch})`;
    const project = await this.createProject(projectName, `Imported from GitHub ${owner}/${repo}@${branch}`, 'github');

    for (const item of files) {
      if (!item.isFolder) {
        try {
          const fileData = await this.github.readFile(owner, repo, item.path, branch);
          await this.addFileToActiveProject(item.path, fileData.content);
        } catch (err) {
          console.warn(`Could not read ${item.path}:`, err);
        }
      }
    }

    await this.refreshProjectStats(project.id);
    return project;
  }
}
