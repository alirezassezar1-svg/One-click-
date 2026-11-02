import { Injectable, inject } from '@angular/core';
import { AuthSessionService } from '../auth-session.service';

@Injectable({
  providedIn: 'root'
})
export class CustomApiService {
  private authSession = inject(AuthSessionService);

  /**
   * Test connection to a custom user-configured HTTPS API
   */
  async testConnection(baseUrl: string, authHeaderKey: string, authHeaderValue: string, testPath = '/health'): Promise<{ status: number; message: string }> {
    const cleanUrl = baseUrl.trim().replace(/\/+$/, '');
    const target = `${cleanUrl}${testPath.startsWith('/') ? testPath : '/' + testPath}`;

    this.authSession.customApiStatus.set('authorizing');

    const headers: HeadersInit = {
      Accept: 'application/json'
    };
    if (authHeaderKey && authHeaderValue) {
      headers[authHeaderKey.trim()] = authHeaderValue.trim();
    }

    try {
      const res = await fetch(target, {
        method: 'GET',
        headers
      });

      if (res.ok) {
        this.authSession.setCustomApiConfig(cleanUrl, authHeaderKey, authHeaderValue);
        this.authSession.customApiStatus.set('connected');
        return {
          status: res.status,
          message: `Custom API reached successfully (${res.status} ${res.statusText})`
        };
      }

      this.authSession.customApiStatus.set('connection_error');
      return {
        status: res.status,
        message: `Custom API responded with error status ${res.status}: ${res.statusText}`
      };
    } catch (err) {
      this.authSession.customApiStatus.set('connection_error');
      throw err;
    }
  }

  /**
   * Upload binary or text payload to custom API endpoint
   */
  async uploadFile(endpointPath: string, fileName: string, data: Blob | ArrayBuffer): Promise<{ status: number; text: string }> {
    const config = this.authSession.getCustomApiConfig();
    if (!config) throw new Error('Custom API is not configured.');

    const cleanPath = endpointPath.startsWith('/') ? endpointPath : '/' + endpointPath;
    const url = `${config.baseUrl}${cleanPath}`;

    const headers: HeadersInit = {};
    if (config.authHeaderKey && config.authHeaderValue) {
      headers[config.authHeaderKey] = config.authHeaderValue;
    }

    const blob = data instanceof Blob ? data : new Blob([data]);
    const formData = new FormData();
    formData.append('file', blob, fileName);

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: formData
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Custom API upload failed (${res.status}): ${text}`);
    }

    return {
      status: res.status,
      text
    };
  }
}
