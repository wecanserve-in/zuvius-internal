# Task ID migration (`businessTaskId`)

New tasks receive a human-readable ID: `ZVS-{DEPT_CODE}-000001`, allocated atomically via Firestore `taskIdCounters/{departmentId}`.

## Deploy rules

After pulling this change, deploy Firestore rules:

```bash
firebase deploy --only firestore:rules
```

Without updated rules, task creation will fail (missing `businessTaskId` / counter permissions).

## Existing tasks

Tasks created before this feature have no `businessTaskId`. The UI shows `—` until backfilled.

### Safe backfill (recommended)

Run a one-off script or admin tool (not in the browser on page load):

1. For each department, ensure `taskIdCounters/{departmentId}` reflects the highest sequence already assigned (or `0` if none).
2. For each task missing `businessTaskId`, in a transaction: increment the department counter and set `businessTaskId` on the task document.
3. Process in `createdAt` order per department to keep IDs roughly chronological.

Do not assign IDs from the client by scanning “latest task” — use the same counter transaction as `createTask`.
