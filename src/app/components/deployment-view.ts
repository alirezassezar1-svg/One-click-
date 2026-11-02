import { ChangeDetectionStrategy, Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { I18nService } from '../services/i18n.service';
import { GitHubService, GitHubWorkflowRun, GitHubRepo } from '../services/providers/github.service';
import { AuthSessionService } from '../services/auth-session.service';

@Component({
  selector: 'app-deployment-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="space-y-6">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <h2 class="text-lg font-bold text-white flex items-center gap-2">
            <mat-icon class="text-cyan-400">rocket_launch</mat-icon>
            <span>{{ i18n.t('deployment') }}</span>
          </h2>
          <p class="text-xs text-slate-400">
            {{ i18n.isRtl() ? 'اتصال به مخازن، اجرای پایپ‌لاین‌های واقعی GitHub Actions و استقرار Git' : 'Trigger and monitor genuine CI/CD workflows and Git version control deployments' }}
          </p>
        </div>

        @if (authSession.githubStatus() === 'connected') {
          <button
            (click)="refreshWorkflowRuns()"
            [disabled]="isLoadingRuns()"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-slate-900/60 hover:bg-slate-800 text-slate-200 text-xs font-medium transition cursor-pointer"
          >
            <mat-icon class="scale-75" [class.animate-spin]="isLoadingRuns()">refresh</mat-icon>
            <span>{{ i18n.t('refresh') }}</span>
          </button>
        }
      </div>

      @if (authSession.githubStatus() !== 'connected') {
        <div class="p-8 rounded-2xl glass-panel text-center space-y-3 border border-purple-500/20">
          <mat-icon class="text-purple-400 scale-150">code</mat-icon>
          <h3 class="text-sm font-semibold text-white">
            {{ i18n.isRtl() ? 'نیازمند اتصال به گیت‌هاب' : 'GitHub Connection Required for CI/CD' }}
          </h3>
          <p class="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            {{ i18n.isRtl()
              ? 'برای استعلام و راه‌اندازی گردش‌کارهای خودکار در هاست‌های Node.js یا سرورها، ابتدا توکن گیت‌هاب را وارد کنید.'
              : 'Configure your GitHub Personal Access Token in Provider Connections to query real workflow runs and trigger deployments.' }}
          </p>
        </div>
      } @else {
        
        <!-- Repo Selection & Trigger Dispatch -->
        <div class="p-5 rounded-2xl glass-panel border border-cyan-500/20 space-y-4">
          <h3 class="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
            <mat-icon class="scale-75">settings</mat-icon>
            <span>{{ i18n.isRtl() ? 'تنظیمات استقرار مخزن' : 'Repository Deployment Configuration' }}</span>
          </h3>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <span class="block text-xs text-slate-400 mb-1">{{ i18n.isRtl() ? 'انتخاب مخزن' : 'Select Repository' }}</span>
              <select
                (change)="onRepoChange($event)"
                class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-400"
              >
                @for (repo of repos(); track repo.id) {
                  <option [value]="repo.full_name">{{ repo.full_name }}</option>
                }
              </select>
            </div>

            <div>
              <span class="block text-xs text-slate-400 mb-1">{{ i18n.isRtl() ? 'شاخه (Branch)' : 'Branch' }}</span>
              <input
                type="text"
                [formControl]="branchControl"
                placeholder="main"
                class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <span class="block text-xs text-slate-400 mb-1">{{ i18n.isRtl() ? 'شناسه / فایل ورک‌فلو' : 'Workflow ID / File' }}</span>
              <input
                type="text"
                [formControl]="workflowControl"
                placeholder="deploy.yml"
                class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div class="flex items-center justify-between pt-2">
            <div class="text-[11px] text-slate-400">
              {{ i18n.isRtl() ? 'وضعیت استقرار صرفاً بر اساس نتایج واقعی API نمایش داده می‌شود.' : 'Deployment statuses reflect actual GitHub Actions workflow states.' }}
            </div>

            <button
              type="button"
              (click)="triggerDispatch()"
              [disabled]="isTriggering() || !selectedRepo()"
              class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition cursor-pointer disabled:opacity-40"
            >
              <mat-icon class="scale-80">play_circle</mat-icon>
              <span>{{ isTriggering() ? 'Triggering...' : (i18n.isRtl() ? 'اجرای استقرار (Workflow Dispatch)' : 'Trigger Workflow Dispatch') }}</span>
            </button>
          </div>
        </div>

        <!-- Real Workflow Runs List -->
        <div class="space-y-3">
          <h3 class="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <mat-icon class="scale-75 text-cyan-400">history</mat-icon>
            <span>{{ i18n.isRtl() ? 'گزارش واقعی اجرای پایپ‌لاین‌ها (GitHub Actions)' : 'Actual GitHub Actions Pipeline Runs' }}</span>
          </h3>

          @if (isLoadingRuns()) {
            <div class="p-8 rounded-2xl glass-panel text-center text-xs text-slate-400 space-y-2">
              <mat-icon class="animate-spin text-cyan-400">rotate_right</mat-icon>
              <p>Fetching workflow runs...</p>
            </div>
          } @else if (runs().length === 0) {
            <div class="p-8 rounded-2xl glass-panel text-center text-xs text-slate-400 border border-white/5">
              {{ i18n.isRtl() ? 'هیچ گردش کار ثبت‌شده‌ای در این مخزن یافت نشد.' : 'No workflow runs found for this repository.' }}
            </div>
          } @else {
            <div class="rounded-xl glass-panel border border-white/10 overflow-hidden divide-y divide-white/5">
              @for (run of runs(); track run.id) {
                <div class="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition">
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-bold text-white">{{ run.name }}</span>
                      <span
                        class="px-2 py-0.5 rounded text-[10px] font-mono font-semibold"
                        [class.bg-emerald-950]="run.conclusion === 'success'"
                        [class.text-emerald-400]="run.conclusion === 'success'"
                        [class.bg-amber-950]="run.status === 'in_progress' || run.status === 'queued'"
                        [class.text-amber-300]="run.status === 'in_progress' || run.status === 'queued'"
                        [class.bg-red-950]="run.conclusion === 'failure'"
                        [class.text-red-400]="run.conclusion === 'failure'"
                      >
                        {{ run.conclusion ? run.conclusion.toUpperCase() : run.status.toUpperCase() }}
                      </span>
                    </div>

                    <div class="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                      <span>Branch: {{ run.head_branch }}</span>
                      <span>&bull;</span>
                      <span>Commit: {{ run.head_sha.substring(0, 7) }}</span>
                      <span>&bull;</span>
                      <span>Event: {{ run.event }}</span>
                    </div>
                  </div>

                  <a
                    [href]="run.html_url"
                    target="_blank"
                    rel="noreferrer"
                    class="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition"
                  >
                    <span>View on GitHub</span>
                    <mat-icon class="scale-65">open_in_new</mat-icon>
                  </a>
                </div>
              }
            </div>
          }
        </div>

      }

    </div>
  `
})
export class DeploymentView implements OnInit {
  i18n = inject(I18nService);
  github = inject(GitHubService);
  authSession = inject(AuthSessionService);

  repos = signal<GitHubRepo[]>([]);
  selectedRepo = signal<string>('');
  runs = signal<GitHubWorkflowRun[]>([]);
  isLoadingRuns = signal(false);
  isTriggering = signal(false);

  branchControl = new FormControl('main');
  workflowControl = new FormControl('deploy.yml');

  async ngOnInit() {
    if (this.authSession.githubStatus() === 'connected') {
      try {
        const repoList = await this.github.listRepositories();
        this.repos.set(repoList);
        if (repoList.length > 0) {
          this.selectedRepo.set(repoList[0].full_name);
          await this.refreshWorkflowRuns();
        }
      } catch (err) {
        console.warn('Could not load repos:', err);
      }
    }
  }

  async onRepoChange(event: Event) {
    const sel = event.target as HTMLSelectElement;
    this.selectedRepo.set(sel.value);
    await this.refreshWorkflowRuns();
  }

  async refreshWorkflowRuns() {
    const repoFull = this.selectedRepo();
    if (!repoFull) return;

    this.isLoadingRuns.set(true);
    const [owner, name] = repoFull.split('/');

    try {
      const data = await this.github.listWorkflowRuns(owner, name);
      this.runs.set(data);
    } catch (err) {
      console.warn('Could not list runs:', err);
      this.runs.set([]);
    } finally {
      this.isLoadingRuns.set(false);
    }
  }

  async triggerDispatch() {
    const repoFull = this.selectedRepo();
    const branch = this.branchControl.value || 'main';
    const wf = this.workflowControl.value || 'deploy.yml';
    if (!repoFull) return;

    this.isTriggering.set(true);
    const [owner, name] = repoFull.split('/');

    try {
      await this.github.triggerWorkflowDispatch(owner, name, wf, branch);
      alert('Workflow dispatch triggered successfully.');
      setTimeout(() => this.refreshWorkflowRuns(), 2000);
    } catch (err: unknown) {
      alert(`Trigger error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      this.isTriggering.set(false);
    }
  }
}
