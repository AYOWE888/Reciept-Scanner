# Receipt Scanner & Inventory Tracker — System Documentation & Antigravity Guide

An AI-powered, full-stack receipt scanning and automated inventory management application built with **Remix**, **TypeScript**, **SQLite**, and **Google Workspace Integrations** (Google Auth / OIDC & Google Sheets API).

---

## 🛠️ Tech Stack & Architecture

- **Frontend & App Framework**: Remix (React, TypeScript, Tailwind CSS / Brutalist UI)
- **AI Processing Engine**: Google Gemini API (Multimodal OCR & Data Extraction)
- **Authentication**: Google OAuth 2.0 / OpenID Connect (OIDC) SSO
- **Database**: SQLite (`./data/receipt_tracker.db` with WAL mode enabled)
- **Integrations**: Google Sheets API v4 (Real-time live inventory sync)
- **Runtime & Tooling**: Node.js, `npm`, Vite / Remix Compiler

---

## 📁 Repository & Key File Structure

```text
remix-receipt-scanner-&-inventory-tracker/
├── server/
│   ├── config/             # App & Auth environment configurations
│   ├── db/                 # SQLite database connection & schema migrations
│   ├── routes/             # API routes (Assistant, Auth, Receipts, Inventory)
│   └── services/
│       ├── auth.service.ts # OAuth session verification & token refresh
│       ├── db.service.ts   # Local SQLite persistence queries
│       ├── gemini.service.ts # Base64 receipt image processing & Gemini OCR
│       └── sheets.service.ts # Google Sheets creation & live row appending
├── src/
│   ├── components/         # UI Components (Dashboard, Scanners, Inventory, Settings)
│   ├── utils/
│   │   ├── googleAuth.ts   # Google Identity Services / OAuth client initialization
│   │   └── sanitizer.ts   # Input & payload sanitization
│   ├── App.tsx             # Main application layout & route provider
│   └── types.ts            # Global TypeScript definitions
├── data/
│   └── receipt_tracker.db  # Local SQLite database instance
├── .env                    # Environment credentials & runtime configuration
├── package.json            # Project dependencies & npm scripts
└── README.md               # Quickstart & setup documentation
```

---

## ⚙️ Environment Configuration (`.env`)

Ensure the following key-value pairs are configured in the root `.env` file:

```env
# GEMINI API KEY (AI OCR & Extraction)
GEMINI_API_KEY="AIzaSy..."

# GOOGLE OAUTH CLIENT CREDENTIALS
GOOGLE_CLIENT_ID="745576921142-63e6nrfnb9ams9g35d3n0oa364tcprnk.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-1beGzaTyiH2IvVeLBaG-CU2kCex"

# GOOGLE SHEET ID (Leave empty for automatic spreadsheet generation)
GOOGLE_SHEET_ID=""

# LOCAL DATABASE PATH
DATABASE_PATH="./data/receipt_tracker.db"

# SERVER CONFIGURATION
APP_URL="http://localhost:3000"
PORT=3000
```

> **Note**: In Google Cloud Console, ensure `http://localhost:3000` is listed under **Authorized JavaScript origins** and `http://localhost:3000/api/auth/google/callback` under **Authorized redirect URIs**.

---

## 🚀 Local Development & Execution Setup

### 1. PowerShell Path Configuration
If running on Windows PowerShell where `npm` is not globally indexed in the path, append Node.js to the active terminal session:

```powershell
$env:Path += ";C:\Program Files
odejs"
```

### 2. Dependency Installation & Dev Server
```powershell
# Install required dependencies
npm install

# Launch local development server
npm run dev
```

### 3. Clearing Stale Port Locks
If port `3000` becomes occupied after an abrupt termination:

```powershell
Stop-Process -Name "node" -Force
npm run dev
```

---

## 🧠 Antigravity Agent Guidelines & Operational Directives

When using **Antigravity** for autonomous edits, refactoring, or feature development, adhere to the following rules:

### 💡 Environment & State Management
- Never hardcode the OAuth Client ID (`745576921142-...`) or API Keys directly in frontend files (`src/utils/googleAuth.ts`, `App.tsx`, etc.). Always reference environment variables (`import.meta.env` or `process.env`).
- Always treat `GOOGLE_SHEET_ID=""` as dynamic. The backend creates an **"Inventory Tracker"** spreadsheet in the user's Google Drive upon initial OAuth login.

### 📷 Gemini Service (`server/services/gemini.service.ts`)
- All image payloads sent to Gemini must be sanitized before processing. Strip Data URI prefixes (e.g., `data:image/png;base64,`, `data:application/pdf;base64,`) using regex:
  ```typescript
  const cleanBase64 = rawImagePayload.replace(/^data:[^;]+;base64,/, '').trim();
  ```
- Detect dynamic MIME types (`image/jpeg`, `image/png`, `application/pdf`) and supply them to Gemini's multimodal input object.

### 🔐 Authentication & OAuth Flows
- Support both **Google SSO (OIDC)** and local session storage.
- Maintain test user access under Google Cloud Console's **Audience / Test Users** section during development mode.

---

## 📊 Features & Core Workflows

1. **Receipt Scanning & Multimodal OCR**:
   - Capture receipt via webcam or image upload.
   - Send payload to Gemini API for itemization (Merchant, Date, Line Items, Tax, Total Spend).
2. **Local SQLite Persistence**:
   - Stores transactions, scanned items, and categories locally in `./data/receipt_tracker.db`.
3. **Live Google Sheets Synchronization**:
   - Appends parsed item rows into the user's personal Google Sheet in real time.
4. **Inventory & Expense Analytics**:
   - Brutalist-styled dashboard presenting monthly spend metrics, OCR confidence thresholds, and inventory tracking.
