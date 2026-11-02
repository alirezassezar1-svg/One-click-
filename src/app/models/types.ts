export type ProviderType = 'local' | 'gdrive' | 'github' | 'onedrive' | 'cpanel' | 'custom_api';

export type ConnectionStatus =
  | 'not_configured'
  | 'disconnected'
  | 'authorizing'
  | 'connected'
  | 'permission_denied'
  | 'service_unavailable'
  | 'connection_error';

export interface ProviderConnection {
  type: ProviderType;
  name: string;
  status: ConnectionStatus;
  accountIdentifier?: string;
  lastTested?: number;
  lastError?: string;
  capabilities: {
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
    resumableUpload: boolean;
    hasCorsLimitations?: boolean;
  };
}

export interface FileItem {
  id: string;
  name: string;
  path: string;
  size: number;
  mimeType: string;
  lastModified: number;
  sha256?: string;
  provider: ProviderType;
  isFolder: boolean;
  parentId?: string;
  remoteId?: string; // e.g. Google Drive fileId, GitHub SHA/path, OneDrive ID
  downloadUrl?: string;
  content?: string | Uint8Array; // in-memory or cached content
}

export interface ProjectManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  createdAt: number;
  updatedAt: number;
  sourceProvider: ProviderType;
  sourceIdentifier?: string;
  rootFolderId?: string;
  tags: string[];
  fileCount: number;
  totalSize: number;
  deploymentTarget?: {
    type: 'github_actions' | 'cpanel_git' | 'custom_webhook';
    repo?: string;
    branch?: string;
    workflowId?: string;
    webhookUrl?: string;
  };
}

export interface ProjectSnapshot {
  id: string;
  projectId: string;
  version: string;
  title: string;
  description: string;
  timestamp: number;
  files: {
    path: string;
    size: number;
    sha256: string;
    mimeType: string;
  }[];
  manifestSummary: string;
}

export type TransferStatus = 'queued' | 'reading' | 'hashing' | 'uploading' | 'verifying' | 'completed' | 'failed' | 'cancelled';

export interface TransferJob {
  id: string;
  sourceProvider: ProviderType;
  sourcePath: string;
  sourceFileId?: string;
  fileName: string;
  fileSize: number;
  destinationProvider: ProviderType;
  destinationPath: string;
  destinationFolderId?: string;
  status: TransferStatus;
  progressPercent: number;
  bytesTransferred: number;
  sha256Source?: string;
  sha256Destination?: string;
  verified: boolean;
  error?: string;
  startTime?: number;
  endTime?: number;
}

export interface TransferReceipt {
  id: string;
  jobId: string;
  fileName: string;
  fileSize: number;
  sourceProvider: ProviderType;
  sourceIdentifier: string;
  destinationProvider: ProviderType;
  destinationIdentifier: string;
  sha256: string;
  timestamp: number;
  verificationMethod: 'hash_match' | 'metadata_match' | 'byte_length_match';
  verified: boolean;
  durationMs: number;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: number;
  category: 'auth' | 'transfer' | 'project' | 'snapshot' | 'security' | 'system';
  level: 'info' | 'success' | 'warning' | 'error';
  messageEn: string;
  messageFa: string;
  details?: Record<string, unknown>;
}

export interface AppSettings {
  language: 'en' | 'fa';
  theme: 'dark';
  gdriveClientId: string;
  gdriveRootFolderName: string;
  githubClientId?: string;
  onedriveClientId?: string;
  cpanelBaseUrl?: string;
  customApiUrl?: string;
  firstRunCompleted: boolean;
  autoVerifyTransfers: boolean;
  conflictResolution: 'ask' | 'overwrite' | 'skip' | 'rename';
}

export interface TestReportItem {
  testNameEn: string;
  testNameFa: string;
  status: 'PASSED' | 'FAILED' | 'UNVERIFIED' | 'PENDING';
  resultDescription: string;
  error?: string;
  requiredConfig?: string;
}
