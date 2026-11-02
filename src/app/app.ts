import { ChangeDetectionStrategy, Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { I18nService } from './services/i18n.service';
import { DbService } from './services/db.service';
import { AuthSessionService } from './services/auth-session.service';
import { ProjectManagerService } from './services/project-manager.service';
import { TransferEngineService } from './services/transfer-engine.service';
import { ActivityLogService } from './services/activity-log.service';

// View Components
import { DashboardView } from './components/dashboard-view';
import { ProjectsView } from './components/projects-view';
import { ExplorerView } from './components/explorer-view';
import { TransferView } from './components/transfer-view';
import { ProvidersView } from './components/providers-view';
import { DeploymentView } from './components/deployment-view';
import { BackupView } from './components/backup-view';
import { ActivityView } from './components/activity-view';
import { SecurityView } from './components/security-view';
import { TestsView } from './components/tests-view';
import { SettingsView } from './components/settings-view';
import { SetupWizard } from './components/setup-wizard';
import { PwaInstall } from './components/pwa-install';

export type NavItem =
  | 'dashboard'
  | 'projects'
  | 'explorer'
  | 'transfer'
  | 'providers'
  | 'deployment'
  | 'backup'
  | 'activity'
  | 'security'
  | 'tests'
  | 'settings';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [
    CommonModule,
    MatIconModule,
    DashboardView,
    ProjectsView,
    ExplorerView,
    TransferView,
    ProvidersView,
    DeploymentView,
    BackupView,
    ActivityView,
    SecurityView,
    TestsView,
    SettingsView,
    SetupWizard,
    PwaInstall
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  i18n = inject(I18nService);
  db = inject(DbService);
  authSession = inject(AuthSessionService);
  pm = inject(ProjectManagerService);
  transferEngine = inject(TransferEngineService);
  logger = inject(ActivityLogService);

  activeView = signal<NavItem>('dashboard');
  showSetupWizard = signal(false);
  mobileMenuOpen = signal(false);
  isOnline = signal(true);

  async ngOnInit() {
    this.i18n.init();

    // Online/Offline tracking
    if (typeof window !== 'undefined') {
      this.isOnline.set(navigator.onLine);
      window.addEventListener('online', () => this.isOnline.set(true));
      window.addEventListener('offline', () => this.isOnline.set(false));
    }

    try {
      await this.db.init();
      await this.logger.loadRecentLogs();
      await this.pm.loadAllProjects();
      await this.transferEngine.loadReceipts();

      const settings = await this.db.getSettings();
      if (!settings || !settings.firstRunCompleted) {
        // Open First-Run Wizard
        this.showSetupWizard.set(true);
      }
    } catch (err) {
      console.warn('Initialization error:', err);
    }
  }

  navigateTo(view: string) {
    this.activeView.set(view as NavItem);
    this.mobileMenuOpen.set(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onInitiateTransfer() {
    this.navigateTo('transfer');
  }

  openWizard() {
    this.showSetupWizard.set(true);
  }

  closeWizard() {
    this.showSetupWizard.set(false);
  }
}
