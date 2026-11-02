# Deployment Guide — NONONICK UNIVERSAL CODE HUB

NONONICK UNIVERSAL CODE HUB is 100% backend-free and requires no Node.js server, PHP runtime, or custom database in production. It compiles down to a clean, static Single Page Application (SPA) with Progressive Web App (PWA) compliance.

---

## 1. Deploying to GitHub Pages (Automated GitHub Action)

1. Create a repository on GitHub (e.g., `nononick-code-hub`).
2. Push this repository's source code to `main`.
3. Create `.github/workflows/deploy.yml` in your repository with the following workflow:

```yaml
name: Deploy NONONICK Code Hub to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: true

jobs:
  build-and-deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build static bundle
        run: npx ng build --configuration production --base-href /${{ github.event.repository.name }}/

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist/app/browser

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

4. Go to **Settings > Pages** in your GitHub repository and set **Source** to **GitHub Actions**.
5. Once deployed, note your URL: `https://<your-username>.github.io/<repo-name>/`.
6. Add this exact origin into your Google Cloud Console's **Authorized JavaScript origins**.

---

## 2. Deploying to Cloudflare Pages / Vercel / Netlify

* **Framework Preset**: None (or Angular)
* **Build Command**: `npm run build`
* **Output Directory**: `dist/app/browser`
* **Single Page App Routing**: In Cloudflare Pages or Netlify, ensure standard fallback (`_redirects` with `/* /index.html 200`).

---

## 3. PWA Installation

Once hosted over HTTPS:
1. **Desktop (Chrome/Edge)**: Click the **Install App (PWA)** button in the top navbar or the install icon in the address bar.
2. **Apple Safari (iPhone/iPad)**:
   - Tap the **Share** button in Safari's bottom toolbar.
   - Tap **Add to Home Screen**.
   - Launch directly as an offline-capable fullscreen app.
