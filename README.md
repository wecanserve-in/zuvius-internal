# Zuvius Internal Communication & Task Management

Production-oriented internal app for Zuvius Lifesciences: authentication, RBAC, real-time messaging, tasks, notifications, R2 file uploads, and scheduled deadline reminders.

## Stack

- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS 4, React Router, React Hook Form + Zod
- **Backend:** Firebase Auth, Firestore, Cloud Functions, FCM (web push)
- **Files:** Cloudflare R2 (presigned URLs via Cloud Functions)

## Prerequisites

- Node.js 20+
- Firebase project (Blaze plan for scheduled functions)
- Cloudflare R2 bucket (private) and API credentials

## Local setup

```bash
npm install
cp .env.example .env.local
# Fill VITE_FIREBASE_* values from Firebase console
npm run dev
```

### Firebase emulators

```bash
npm install -g firebase-tools
firebase login
cd functions && npm install && cd ..
# Set VITE_USE_FIREBASE_EMULATORS=true in .env.local
firebase emulators:start
```

### Functions environment

Set secrets (recommended):

```bash
firebase functions:secrets:set R2_ACCESS_KEY_ID
firebase functions:secrets:set R2_SECRET_ACCESS_KEY
```

Set params in `firebase functions:config` or `.env` for local emulator:

- `R2_ACCOUNT_ID`, `R2_BUCKET_NAME` (e.g. shared `lms-portal` bucket)
- `R2_OBJECT_PREFIX` (default `zuvius-internal` — all objects live under `lms-portal/zuvius-internal/...`)
- `ALLOWED_EMAIL_DOMAIN` (optional)
- `FUNCTIONS_REGION` (default `asia-south1`)

Build functions:

```bash
cd functions && npm run build
```

Deploy:

```bash
firebase deploy --only firestore:rules,firestore:indexes,functions
npm run build
# Host dist/ on Firebase Hosting, Cloudflare Pages, or your CDN
```

## Bootstrap first super admin

1. Create a user in Firebase Authentication (email/password).
2. In Firestore, create document `users/{uid}`:

```json
{
  "displayName": "Super Admin",
  "email": "admin@yourcompany.com",
  "role": "super_admin",
  "departmentIds": [],
  "isActive": true
}
```

3. Sign in at `/login`. Use callable `createEmployeeAccount` for additional users (no public sign-up).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build + `tsc` |
| `npm run test` | Vitest (permissions unit tests) |

## Project structure

```
src/features/     # auth, dashboard, tasks, messaging, …
src/services/     # Firestore + callable wrappers
functions/src/    # Auth, uploads, schedulers, triggers
firestore.rules   # Security rules (deploy required)
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for roles, upload flow, and data model.

## Status

Core flows are implemented; configure Firebase and R2 before end-to-end testing. Security rules should be validated with the Emulator Suite and your org’s access scenarios.
