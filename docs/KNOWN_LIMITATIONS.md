# Known Limitations & Browser Architecture Constraints

Per the Non-Negotiable Architecture standards of NONONICK UNIVERSAL CODE HUB, this application operates 100% in the user's browser without any backend server.

The following technical boundaries exist in static client-side web applications:

---

## 1. Browser Cross-Origin Resource Sharing (CORS) on cPanel

* **Constraint**: Standard web browsers enforce the Same-Origin Policy (SOP). Most default cPanel / Shataab hosting installations do not send `Access-Control-Allow-Origin: *` headers for arbitrary browser origins.
* **Impact**: Direct browser `fetch()` requests to `https://cpanel.domain.com:2083/execute/...` will be blocked by browser CORS security policies.
* **Genuine Solution Provided**: 
  1. The Hub includes a live **CORS & Capability Test** that identifies this restriction accurately.
  2. The application provides a built-in **Git Version Control workflow** (via GitHub and cPanel's native Git Version Control tool) to deploy code securely without browser CORS obstacles.
  3. Alternatively, users can configure a reverse proxy or add CORS headers on their server.

---

## 2. In-Memory Token Lifetime

* **Constraint**: In accordance with the Zero-Secret Persistence rule, access tokens and PATs are never stored in `localStorage` or `IndexedDB`.
* **Impact**: If the browser tab is closed or hard-refreshed, session tokens must be re-authorized via Google Identity Services or re-entered for GitHub/OneDrive.
* **Benefit**: Protects your Google and GitHub accounts from browser extension theft, XSS extraction, or shared computer exposure.

---

## 3. Large File Single-Blob Limits

* **Constraint**: The browser heap memory limits how large a single file Blob can be constructed in JavaScript (typically ~1GB to 2GB depending on available device RAM).
* **Workaround**: Resumable chunked uploads are supported for Google Drive and multi-part transfers.

---

## 4. iOS Safari PWA Installation

* **Constraint**: iOS WebKit does not trigger the standard `beforeinstallprompt` event.
* **Solution**: The application detects iOS Safari and presents a guided instruction sheet to use Safari's native **Share > Add to Home Screen** feature.
