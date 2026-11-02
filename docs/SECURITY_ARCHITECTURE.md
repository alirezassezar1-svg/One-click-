# Security Architecture & Credential Guard

NONONICK UNIVERSAL CODE HUB is designed for personal single-user operation with strict zero-trust standards for credentials.

---

## 1. Zero-Secret Persistence Standard

* **No Secrets in Disk Storage**: OAuth access tokens, refresh tokens, GitHub PATs, and cPanel credentials are **NEVER** written to `localStorage`, `IndexedDB`, session export dumps, or code files.
* **Volatile RAM Only**: Tokens are held exclusively in the `AuthSessionService` memory signals during the active browser session.
* **Auto Expiration**: Token validity is monitored against Google and Microsoft token expiry lifetimes.
* **Session Purge**: Clicking **Purge All Active Sessions** immediately clears all tokens from memory and purges session storage.

---

## 2. Cryptographic Integrity & Verification

* Every file transferred through the Transfer Center undergoes cryptographic SHA-256 hashing using the browser's native `crypto.subtle.digest('SHA-256')`.
* Transfers are verified against destination responses:
  - Byte length matching.
  - MD5 / SHA verification where supported by provider APIs.
* An immutable **Transfer Receipt** is generated and saved locally containing:
  - Unique receipt UUID.
  - Source and destination provider IDs.
  - SHA-256 hex digest.
  - Byte size and duration in milliseconds.
  - Timestamp.

---

## 3. Safe Rendering & Content Sanitization

* Remote code files, commit payloads, and markdown descriptions are rendered safely without `eval()`, `innerHTML` execution, or unsafe script injection.
* Previews of executable binaries are restricted with size and type indicators.

---

## 4. Provider Revocation Direct Links

* **Google**: [Google Account Third-Party Access](https://myaccount.google.com/permissions)
* **GitHub**: [GitHub Personal Access Tokens](https://github.com/settings/tokens)
* **Microsoft**: [Microsoft Account Consent](https://account.live.com/consent/Manage)
* **cPanel**: cPanel Dashboard > **Security > Manage API Tokens**
