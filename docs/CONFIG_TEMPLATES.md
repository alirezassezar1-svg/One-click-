# Configuration Templates — NONONICK UNIVERSAL CODE HUB

This document provides ready-to-use configuration templates for registering client-side credentials in third-party developer portals.

---

## 1. Google Cloud Console (Google Drive API v3)

* **Purpose**: Primary cloud storage for personal projects, file backups, and transfer manifests.
* **Architecture**: Client-side OAuth 2.0 using Google Identity Services (GIS) TokenClient. No backend server or client secret required.

### Setup Steps:
1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a Google Cloud Project (e.g., `Nononick-Code-Hub`).
3. Enable the **Google Drive API**:
   - Go to **APIs & Services > Library** > Search for "Google Drive API" > Click **Enable**.
4. Configure the **OAuth Consent Screen**:
   - User Type: **External** (for personal Gmail account).
   - App Name: `NONONICK UNIVERSAL CODE HUB`
   - User Support Email: Your email.
   - Scopes: Add `https://www.googleapis.com/auth/drive.file` and `https://www.googleapis.com/auth/userinfo.email`.
   - Test Users: Add your personal Gmail address.
5. Create **OAuth 2.0 Client ID**:
   - Go to **APIs & Services > Credentials > Create Credentials > OAuth client ID**.
   - Application type: **Web application**.
   - Name: `Nononick Hub Web Client`.
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (for local development)
     - `https://<your-username>.github.io` (for GitHub Pages)
     - Or your custom domain URL (e.g., `https://codehub.yourdomain.com`).
   - Leave **Authorized redirect URIs** empty (GIS TokenClient uses in-page popup postMessage).
6. Copy the generated **Client ID** (e.g., `1234567890-abcdefg.apps.googleusercontent.com`).
7. Enter this Client ID in the Hub Setup Wizard or **Settings > Google OAuth Client ID**.

---

## 2. GitHub Personal Access Token (PAT)

* **Purpose**: Browse repositories, commit files with SHA conflict prevention, and monitor GitHub Actions workflows.
* **Storage**: Strictly in-memory for the active session (never saved to localStorage, disk, or logs).

### Option A: Fine-Grained Personal Access Token (Recommended)
1. Go to [GitHub Settings > Developer Settings > Fine-grained tokens](https://github.com/settings/tokens?type=beta).
2. Click **Generate new token**.
3. Name: `Nononick Hub Personal Token`.
4. Expiration: 30, 60, or 90 days.
5. Repository access: **Only select repositories** (select your code repos).
6. Repository permissions:
   - **Contents**: Read and write (to read and commit repository files).
   - **Workflows**: Read and write (to trigger and monitor GitHub Actions).
   - **Metadata**: Read-only (automatically included).
7. Generate and copy the token (`github_pat_...`).

### Option B: Classic Personal Access Token
1. Go to [GitHub Settings > Tokens (classic)](https://github.com/settings/tokens).
2. Select scopes:
   - `repo` (Full control of private repositories).
   - `workflow` (Update GitHub Action workflows).

---

## 3. Microsoft OneDrive (Microsoft Graph API)

* **Purpose**: Secondary cloud storage for cross-cloud file transfers.
* **Flow**: Client-side OAuth 2.0 PKCE / Bearer token with `Files.ReadWrite` scope.

### Entra App Registration:
1. Open [Microsoft Entra Admin Center](https://entra.microsoft.com/).
2. Go to **Applications > App registrations > New registration**.
3. Supported account types: **Personal Microsoft accounts only** or **Accounts in any organizational directory**.
4. Redirect URI: Select **Single-page application (SPA)** and add your hosted origin URL.
5. API Permissions:
   - Microsoft Graph > Delegated permissions: `Files.ReadWrite`, `User.Read`.

---

## 4. cPanel / Shataab Hosting

* **Purpose**: File uploads via UAPI Fileman and Git Version Control deployment.
* **Host URL**: `https://cpanel.yourdomain.com:2083` or your server IP.
* **Security Notice**: Browser CORS policies prevent web browsers from sending direct cross-origin API requests to cPanel unless the server is configured with explicit CORS headers. If blocked, use the **Git Version Control deployment workflow** provided in the Deployment Center.
