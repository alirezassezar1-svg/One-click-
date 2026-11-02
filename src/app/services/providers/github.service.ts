import { Injectable, inject } from '@angular/core';
import { AuthSessionService } from '../auth-session.service';
import { FileItem } from '../../models/types';
import { CryptoService } from '../crypto.service';

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  html_url: string;
  description: string | null;
  updated_at: string;
}

export interface GitHubWorkflowRun {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'timed_out' | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  head_branch: string;
  head_sha: string;
  event: string;
}

@Injectable({
  providedIn: 'root'
})
export class GitHubService {
  private authSession = inject(AuthSessionService);
  private crypto = inject(CryptoService);

  private readonly API_BASE = 'https://api.github.com';

  private getHeaders(): HeadersInit {
    const token = this.authSession.getGithubToken();
    if (!token) throw new Error('Not connected to GitHub. Enter a Personal Access Token.');
    return {
      Authorization: `Bearer ${token.trim()}`,
      Accept: 'application/vnd.github.v3+json'
    };
  }

  /**
   * Real connection test
   */
  async testConnection(tokenInput?: string): Promise<{ login: string; name: string; publicRepos: number; scopes: string }> {
    const token = tokenInput || this.authSession.getGithubToken();
    if (!token) {
      this.authSession.githubStatus.set('disconnected');
      throw new Error('GitHub token not provided.');
    }

    this.authSession.githubStatus.set('authorizing');

    try {
      const res = await fetch(`${this.API_BASE}/user`, {
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });

      if (res.status === 401) {
        this.authSession.githubStatus.set('permission_denied');
        throw new Error('Bad credentials: The provided GitHub token is invalid or has expired.');
      }

      if (!res.ok) {
        this.authSession.githubStatus.set('connection_error');
        throw new Error(`GitHub API error (${res.status}): ${res.statusText}`);
      }

      const scopes = res.headers.get('x-oauth-scopes') || 'fine-grained-token';
      const user = await res.json();

      this.authSession.setGithubToken(token, user.login, scopes);

      return {
        login: user.login,
        name: user.name || user.login,
        publicRepos: user.public_repos,
        scopes
      };
    } catch (err) {
      this.authSession.githubStatus.set('connection_error');
      throw err;
    }
  }

  /**
   * List user repositories
   */
  async listRepositories(): Promise<GitHubRepo[]> {
    const res = await fetch(`${this.API_BASE}/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator`, {
      headers: this.getHeaders()
    });

    if (!res.ok) throw new Error(`Failed to list GitHub repositories: ${res.statusText}`);
    return res.json();
  }

  /**
   * List repository branches
   */
  async listBranches(owner: string, repo: string): Promise<string[]> {
    const res = await fetch(`${this.API_BASE}/repos/${owner}/${repo}/branches`, {
      headers: this.getHeaders()
    });

    if (!res.ok) throw new Error(`Failed to list branches: ${res.statusText}`);
    const data = await res.json();
    return (data || []).map((b: { name: string }) => b.name);
  }

  /**
   * List files in a repository directory
   */
  async listContents(owner: string, repo: string, path = '', ref = 'main'): Promise<FileItem[]> {
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    const url = `${this.API_BASE}/repos/${owner}/${repo}/contents/${cleanPath}?ref=${encodeURIComponent(ref)}`;

    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch repo contents: ${res.statusText}`);

    const data = await res.json();
    const items = Array.isArray(data) ? data : [data];

    return items.map((item: {
      name: string;
      path: string;
      sha: string;
      size: number;
      type: string;
      download_url: string | null;
    }) => ({
      id: item.sha,
      name: item.name,
      path: item.path,
      size: item.size || 0,
      mimeType: item.type === 'dir' ? 'application/vnd.github.folder' : 'text/plain',
      lastModified: Date.now(),
      sha256: undefined,
      provider: 'github',
      isFolder: item.type === 'dir',
      remoteId: item.sha,
      downloadUrl: item.download_url || undefined
    }));
  }

  /**
   * Read raw file content from GitHub repository
   */
  async readFile(owner: string, repo: string, path: string, ref = 'main'): Promise<{ content: string; sha: string; size: number }> {
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    const url = `${this.API_BASE}/repos/${owner}/${repo}/contents/${cleanPath}?ref=${encodeURIComponent(ref)}`;

    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error(`Could not read file from GitHub: ${res.statusText}`);

    const data = await res.json();
    if (data.type !== 'file') throw new Error(`Item at ${path} is not a file.`);

    // GitHub returns Base64 encoded content
    const base64Content = (data.content || '').replace(/\n/g, '');
    const decodedText = decodeURIComponent(
      Array.prototype.map
        .call(atob(base64Content), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return {
      content: decodedText,
      sha: data.sha,
      size: data.size
    };
  }

  /**
   * Create or update a file in a GitHub repository
   */
  async writeRepoFile(
    owner: string,
    repo: string,
    path: string,
    content: string | Uint8Array,
    commitMessage: string,
    branch = 'main',
    existingSha?: string
  ): Promise<{ commitSha: string; fileSha: string }> {
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    const url = `${this.API_BASE}/repos/${owner}/${repo}/contents/${cleanPath}`;

    let base64Content: string;
    if (typeof content === 'string') {
      const bytes = new TextEncoder().encode(content);
      base64Content = this.crypto.arrayBufferToBase64(bytes);
    } else {
      base64Content = this.crypto.arrayBufferToBase64(content);
    }

    // Check if file already exists to get SHA if not provided
    let sha = existingSha;
    if (!sha) {
      try {
        const checkRes = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, { headers: this.getHeaders() });
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          sha = checkData.sha;
        }
      } catch {
        // File does not exist yet
      }
    }

    const payload: {
      message: string;
      content: string;
      branch: string;
      sha?: string;
    } = {
      message: commitMessage || `Update ${cleanPath} via Nononick Code Hub`,
      content: base64Content,
      branch
    };

    if (sha) {
      payload.sha = sha;
    }

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (res.status === 409) {
      throw new Error(`Conflict detected: File SHA mismatch on ${cleanPath}. Someone else modified this file.`);
    }

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`GitHub commit failed (${res.status}): ${errBody}`);
    }

    const result = await res.json();
    return {
      commitSha: result.commit?.sha || '',
      fileSha: result.content?.sha || ''
    };
  }

  /**
   * List recent GitHub Actions workflow runs (for real deployment verification)
   */
  async listWorkflowRuns(owner: string, repo: string, limit = 10): Promise<GitHubWorkflowRun[]> {
    const res = await fetch(`${this.API_BASE}/repos/${owner}/${repo}/actions/runs?per_page=${limit}`, {
      headers: this.getHeaders()
    });

    if (!res.ok) {
      if (res.status === 404) {
        return []; // No actions configured
      }
      throw new Error(`Failed to fetch workflow runs: ${res.statusText}`);
    }

    const data = await res.json();
    return (data.workflow_runs || []).map((run: {
      id: number;
      name: string;
      status: string;
      conclusion: string | null;
      html_url: string;
      created_at: string;
      updated_at: string;
      head_branch: string;
      head_sha: string;
      event: string;
    }) => ({
      id: run.id,
      name: run.name,
      status: run.status as GitHubWorkflowRun['status'],
      conclusion: run.conclusion as GitHubWorkflowRun['conclusion'],
      html_url: run.html_url,
      created_at: run.created_at,
      updated_at: run.updated_at,
      head_branch: run.head_branch,
      head_sha: run.head_sha,
      event: run.event
    }));
  }

  /**
   * Trigger GitHub Actions workflow dispatch
   */
  async triggerWorkflowDispatch(owner: string, repo: string, workflowIdOrFilename: string, ref = 'main'): Promise<void> {
    const url = `${this.API_BASE}/repos/${owner}/${repo}/actions/workflows/${workflowIdOrFilename}/dispatches`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ref })
    });

    if (!res.ok && res.status !== 204) {
      const err = await res.text();
      throw new Error(`Failed to trigger workflow dispatch (${res.status}): ${err}`);
    }
  }
}
