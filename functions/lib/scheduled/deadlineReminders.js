"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskDeadlineReminders = void 0;
const admin = __importStar(require("firebase-admin"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const db = admin.firestore();
exports.taskDeadlineReminders = (0, scheduler_1.onSchedule)('every 60 minutes', async () => {
    const now = admin.firestore.Timestamp.now();
    const in24h = admin.firestore.Timestamp.fromMillis(now.toMillis() + 24 * 60 * 60 * 1000);
    const dueSoonSnap = await db
        .collection('tasks')
        .where('status', 'in', ['todo', 'in_progress', 'needs_revision'])
        .where('deadlineAt', '>=', now)
        .where('deadlineAt', '<=', in24h)
        .get();
    for (const taskDoc of dueSoonSnap.docs) {
        const task = taskDoc.data();
        const assigneeIds = (task.assigneeIds ?? []);
        for (const recipientId of assigneeIds) {
            const idempotencyKey = `deadline:${taskDoc.id}:${recipientId}:${now.toDate().toISOString().slice(0, 10)}`;
            const existing = await db.collection('reminderEvents').doc(idempotencyKey).get();
            if (existing.exists)
                continue;
            await db.collection('notifications').add({
                recipientId,
                type: 'task_deadline',
                title: 'Upcoming deadline',
                body: `Task "${task.title}" is due within 24 hours.`,
                entityType: 'task',
                entityId: taskDoc.id,
                readAt: null,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            await db.collection('reminderEvents').doc(idempotencyKey).set({
                taskId: taskDoc.id,
                recipientId,
                kind: 'deadline_24h',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    }
    const overdueSnap = await db
        .collection('tasks')
        .where('status', 'in', ['todo', 'in_progress', 'needs_revision'])
        .where('deadlineAt', '<', now)
        .get();
    for (const taskDoc of overdueSnap.docs) {
        const task = taskDoc.data();
        const assigneeIds = (task.assigneeIds ?? []);
        for (const recipientId of assigneeIds) {
            const idempotencyKey = `overdue:${taskDoc.id}:${recipientId}:${now.toDate().toISOString().slice(0, 10)}`;
            const existing = await db.collection('reminderEvents').doc(idempotencyKey).get();
            if (existing.exists)
                continue;
            await db.collection('notifications').add({
                recipientId,
                type: 'task_overdue',
                title: 'Task overdue',
                body: `Task "${task.title}" is past its deadline.`,
                entityType: 'task',
                entityId: taskDoc.id,
                readAt: null,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            await db.collection('reminderEvents').doc(idempotencyKey).set({
                taskId: taskDoc.id,
                recipientId,
                kind: 'overdue',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    }
});
//# sourceMappingURL=deadlineReminders.js.map