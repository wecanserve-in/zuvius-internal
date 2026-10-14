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
exports.getActiveUser = getActiveUser;
exports.assertConversationMediaAccess = assertConversationMediaAccess;
exports.assertTaskMediaAccess = assertTaskMediaAccess;
exports.assertProfileMediaAccess = assertProfileMediaAccess;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const roles_1 = require("../lib/roles");
async function getActiveUser(uid) {
    const snap = await admin.firestore().doc(`users/${uid}`).get();
    if (!snap.exists)
        return null;
    const data = snap.data();
    if (data.isActive === false)
        return null;
    return { id: snap.id, ...data };
}
async function assertConversationMediaAccess(uid, conversationId) {
    const user = await getActiveUser(uid);
    if (!user)
        throw new https_1.HttpsError('permission-denied', 'Inactive user');
    const role = user.role ?? 'member';
    if ((0, roles_1.hasMinRole)(role, 'admin'))
        return;
    const convo = await admin.firestore().doc(`conversations/${conversationId}`).get();
    if (!convo.exists)
        throw new https_1.HttpsError('not-found', 'Conversation not found');
    const memberIds = (convo.data()?.memberIds ?? []);
    if (!memberIds.includes(uid)) {
        throw new https_1.HttpsError('permission-denied', 'Not a conversation member');
    }
}
async function assertTaskMediaAccess(uid, taskId) {
    const user = await getActiveUser(uid);
    if (!user)
        throw new https_1.HttpsError('permission-denied', 'Inactive user');
    const role = user.role ?? 'member';
    const taskSnap = await admin.firestore().doc(`tasks/${taskId}`).get();
    if (!taskSnap.exists)
        throw new https_1.HttpsError('not-found', 'Task not found');
    const task = taskSnap.data();
    const assigneeIds = (task.assigneeIds ?? []);
    if ((0, roles_1.hasMinRole)(role, 'admin'))
        return;
    if (task.createdBy === uid || assigneeIds.includes(uid))
        return;
    if ((0, roles_1.hasMinRole)(role, 'department_admin') && task.departmentId) {
        const deptIds = (user.departmentIds ?? []);
        if (deptIds.includes(task.departmentId))
            return;
        const dept = await admin.firestore().doc(`departments/${task.departmentId}`).get();
        const adminIds = (dept.data()?.adminIds ?? []);
        if (adminIds.includes(uid))
            return;
    }
    throw new https_1.HttpsError('permission-denied', 'Access denied');
}
/** Profile media: user may upload for self; admins may upload for others. */
async function assertProfileMediaAccess(uid, targetUserId) {
    const user = await getActiveUser(uid);
    if (!user)
        throw new https_1.HttpsError('permission-denied', 'Inactive user');
    const role = user.role ?? 'member';
    if (uid === targetUserId)
        return;
    if ((0, roles_1.hasMinRole)(role, 'admin'))
        return;
    throw new https_1.HttpsError('permission-denied', 'Access denied');
}
//# sourceMappingURL=access.js.map