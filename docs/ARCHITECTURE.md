# Zuvius Internal — Architecture

## Overview

Single-page React app (Vite + TypeScript) with Firebase Auth, Firestore real-time data, Cloud Functions for privileged operations, and Cloudflare R2 for object storage.

## Layers

| Layer | Responsibility |
|--------|----------------|
| UI (`src/features`, `src/components`) | Role-aware screens, forms, real-time views |
| Services (`src/services`) | Firestore reads/writes, callable functions |
| Permissions (`src/lib/permissions`) | Client-side UX gating (not security boundary) |
| Firestore rules | Authoritative data access |
| Cloud Functions | User provisioning, uploads, reminders, audit side-effects |

## Roles

| Role | Scope |
|------|--------|
| `super_admin` | Full org + super-admin assignment |
| `admin` | Org operations, all tasks, users (non-super-admin) |
| `department_admin` | Department tasks, members, groups |
| `member` | Own tasks, assigned chats |

## Data model

See `src/types/index.ts` and Firestore collections: `users`, `departments`, `conversations`, `tasks`, `notifications`, `activityLogs`, `uploads`, `reminderEvents`.

## File uploads (R2)

1. Client calls `requestUpload` (callable).
2. Function validates MIME/size and context, writes `uploads/{id}` (`pending`), returns presigned PUT URL.
3. Client uploads to R2 directly.
4. Client calls `confirmUpload`.
5. Downloads use `getDownloadUrl` with membership checks.

## Scheduled jobs

`taskDeadlineReminders` runs hourly, writes notifications with idempotency keys in `reminderEvents`.

## Initial super admin

No public registration. After creating a Firebase Auth user in the console, create matching `users/{uid}` with `role: super_admin` and `isActive: true`, or use the `createEmployeeAccount` callable once one admin exists.

## Indexes

Deploy `firestore.indexes.json` before production queries on conversations and tasks.
