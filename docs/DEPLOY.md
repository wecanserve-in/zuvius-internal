# Deploy backend (next step after local login works)

## 1. Install Firebase CLI

```powershell
npm install -g firebase-tools
firebase login
cd C:\Users\Lenovo\Codes\Internal-chat
firebase use internal-chat-bc793
```

## 2. Function env file (required for R2)

Create **`functions/.env.internal-chat-bc793`** from `functions/.env.example` (not committed):

```
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_BUCKET_NAME=lms-portal
R2_OBJECT_PREFIX=zuvius-internal
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
# Optional — stable URLs in Firestore (match VITE_R2_PUBLIC_URL_BASE in .env.local):
# R2_PUBLIC_URL_BASE=https://your-public-cdn-or-r2-host
```

Verify credentials:

```powershell
cd functions
node scripts/verify-r2-put.mjs
```

## 5. R2 bucket CORS (required for browser uploads)

In **Cloudflare** → R2 → bucket **lms-portal** → **Settings** → **CORS**, paste `docs/r2-cors.json` (add your production URL if different).

## 6. Deploy

```powershell
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions
```

After deploy, confirm in [Firebase Console](https://console.firebase.google.com) → **Functions** that `requestUpload`, `confirmUpload`, and `getDownloadUrl` exist in **asia-south1** (must match `VITE_FIREBASE_FUNCTIONS_REGION` in `.env.local`).

### CORS error on `requestUpload` from localhost

The browser often reports **CORS** when the real problem is **404** (function not deployed). Check Network tab: status **404** on `cloudfunctions.net/requestUpload` means deploy the upload functions (or use local emulator below).

**Local dev (no Blaze):**

1. `cd functions && npm run build` then from repo root: `npx firebase-tools emulators:start --only functions`
2. In `.env.local`: `VITE_UPLOAD_USE_VITE_PROXY=true`
3. Restart `npm run dev` — upload API goes through Vite → emulator (same origin, no CORS).

Apply `docs/r2-cors.json` on bucket **lms-portal** for browser **PUT** to presigned R2 URLs.

## 7. Deploy indexes (optional)

```powershell
firebase deploy --only firestore:indexes
```

Indexes fix query errors on tasks/messages/notifications lists.

## 8. Verify in the app

1. **Departments** → create a department  
2. **Team** → create an employee  
3. **Tasks** → assign to that employee  
4. **Messages** → attach a file

## Blaze plan

**Cloud Functions Gen 2 deploy** (including `requestUpload`) requires Blaze on this project so Google can enable Artifact Registry / Cloud Build. Spark is fine for Firestore + Hosting + Auth; only the **hosted** upload API needs Blaze.

Scheduled deadline reminders (`taskDeadlineReminders`) also need Blaze.
