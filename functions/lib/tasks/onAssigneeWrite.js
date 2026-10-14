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
exports.onAssigneeWritten = void 0;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-functions/v2/firestore");
const db = admin.firestore();
async function notifyRecipients(recipientIds, taskId, title, body) {
    for (const recipientId of recipientIds) {
        await db.collection('notifications').add({
            recipientId,
            type: 'task_completed',
            title,
            body,
            entityType: 'task',
            entityId: taskId,
            readAt: null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
}
exports.onAssigneeWritten = (0, firestore_1.onDocumentWritten)('tasks/{taskId}/assignees/{assigneeId}', async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after || before?.status === after.status)
        return;
    if (after.status !== 'completed')
        return;
    const taskId = event.params.taskId;
    const assigneeId = event.params.assigneeId;
    const taskSnap = await db.doc(`tasks/${taskId}`).get();
    if (!taskSnap.exists)
        return;
    const task = taskSnap.data();
    const taskTitle = String(task.title ?? 'Task');
    const assigneeSnap = await db.doc(`users/${assigneeId}`).get();
    const assigneeName = assigneeSnap.exists
        ? String(assigneeSnap.data()?.displayName ?? 'Someone')
        : 'Someone';
    const recipients = new Set();
    const createdBy = String(task.createdBy ?? '');
    if (createdBy && createdBy !== assigneeId)
        recipients.add(createdBy);
    const departmentId = task.departmentId ? String(task.departmentId) : null;
    if (departmentId) {
        const usersSnap = await db
            .collection('users')
            .where('departmentIds', 'array-contains', departmentId)
            .get();
        for (const doc of usersSnap.docs) {
            if (doc.id === assigneeId)
                continue;
            const role = String(doc.data().role ?? 'member');
            if (role === 'department_admin' || role === 'admin' || role === 'super_admin') {
                recipients.add(doc.id);
            }
        }
    }
    if (recipients.size === 0)
        return;
    await notifyRecipients(Array.from(recipients), taskId, 'Task completed', `${assigneeName} marked "${taskTitle}" as completed.`);
});
//# sourceMappingURL=onAssigneeWrite.js.map