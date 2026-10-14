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
exports.runRequestUpload = runRequestUpload;
exports.runConfirmUpload = runConfirmUpload;
exports.runGetDownloadUrl = runGetDownloadUrl;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const r2Env_1 = require("../lib/r2Env");
const r2_1 = require("../lib/r2");
const access_1 = require("./access");
async function runRequestUpload(uid, payload) {
    const user = await (0, access_1.getActiveUser)(uid);
    if (!user)
        throw new https_1.HttpsError('permission-denied', 'Inactive user');
    const { fileName, contentType, size, relatedEntityType, relatedEntityId } = payload;
    if (!fileName || !contentType || !size || !relatedEntityType || !relatedEntityId) {
        throw new https_1.HttpsError('invalid-argument', 'Missing upload metadata');
    }
    try {
        (0, r2_1.validateUpload)(contentType, size);
    }
    catch (err) {
        throw new https_1.HttpsError('invalid-argument', err instanceof Error ? err.message : 'Invalid file');
    }
    if (relatedEntityType === 'conversation') {
        await (0, access_1.assertConversationMediaAccess)(uid, relatedEntityId);
    }
    else if (relatedEntityType === 'task') {
        await (0, access_1.assertTaskMediaAccess)(uid, relatedEntityId);
    }
    else if (relatedEntityType === 'profile') {
        await (0, access_1.assertProfileMediaAccess)(uid, relatedEntityId);
    }
    try {
        (0, r2Env_1.bindR2Env)();
        const objectKey = (0, r2_1.buildObjectKey)(uid, fileName, relatedEntityType, contentType);
        const uploadRef = await admin.firestore().collection('uploads').add({
            ownerId: uid,
            objectKey,
            contentType,
            size,
            fileName,
            relatedEntityType,
            relatedEntityId,
            status: 'pending',
            createdAt: firestore_1.FieldValue.serverTimestamp(),
        });
        const uploadUrl = await (0, r2_1.presignPutUrl)(objectKey, contentType);
        const fileUrl = (0, r2_1.buildPublicFileUrl)(objectKey);
        return {
            uploadId: uploadRef.id,
            objectKey,
            uploadUrl,
            fileUrl: fileUrl ?? undefined,
            expiresIn: 900,
        };
    }
    catch (err) {
        console.error('requestUpload failed', err);
        const msg = err instanceof Error ? err.message : 'Upload setup failed';
        if (msg.includes('R2') || msg.includes('configured') || msg.includes('credentials')) {
            throw new https_1.HttpsError('failed-precondition', 'File storage is not configured on the server. Set R2 secrets and redeploy upload functions.');
        }
        throw new https_1.HttpsError('internal', msg);
    }
}
async function runConfirmUpload(uid, uploadId) {
    if (!uploadId)
        throw new https_1.HttpsError('invalid-argument', 'uploadId required');
    const ref = admin.firestore().doc(`uploads/${uploadId}`);
    const snap = await ref.get();
    if (!snap.exists)
        throw new https_1.HttpsError('not-found', 'Upload not found');
    const data = snap.data();
    if (data.ownerId !== uid) {
        throw new https_1.HttpsError('permission-denied', 'Not your upload');
    }
    (0, r2Env_1.bindR2Env)();
    const fileUrl = (0, r2_1.buildPublicFileUrl)(data.objectKey);
    await ref.update({
        status: 'completed',
        completedAt: firestore_1.FieldValue.serverTimestamp(),
        ...(fileUrl ? { fileUrl } : {}),
    });
    return { ok: true, fileUrl: fileUrl ?? undefined };
}
async function runGetDownloadUrl(uid, uploadId) {
    const user = await (0, access_1.getActiveUser)(uid);
    if (!user)
        throw new https_1.HttpsError('permission-denied', 'Inactive user');
    if (!uploadId)
        throw new https_1.HttpsError('invalid-argument', 'uploadId required');
    const snap = await admin.firestore().doc(`uploads/${uploadId}`).get();
    if (!snap.exists)
        throw new https_1.HttpsError('not-found', 'Upload not found');
    const upload = snap.data();
    if (upload.status !== 'completed') {
        throw new https_1.HttpsError('failed-precondition', 'Upload not completed');
    }
    if (upload.relatedEntityType === 'conversation') {
        await (0, access_1.assertConversationMediaAccess)(uid, upload.relatedEntityId);
    }
    else if (upload.relatedEntityType === 'task') {
        await (0, access_1.assertTaskMediaAccess)(uid, upload.relatedEntityId);
    }
    else if (upload.relatedEntityType !== 'profile' && upload.ownerId !== uid) {
        throw new https_1.HttpsError('permission-denied', 'Access denied');
    }
    if (upload.fileUrl && typeof upload.fileUrl === 'string') {
        return { downloadUrl: upload.fileUrl, expiresIn: 86400 };
    }
    try {
        (0, r2Env_1.bindR2Env)();
        const downloadUrl = await (0, r2_1.presignGetUrl)(upload.objectKey);
        return { downloadUrl, expiresIn: 900 };
    }
    catch (err) {
        console.error('getDownloadUrl failed', err);
        const msg = err instanceof Error ? err.message : 'Could not create download link';
        if (msg.includes('R2') || msg.includes('configured') || msg.includes('credentials')) {
            throw new https_1.HttpsError('failed-precondition', 'File storage is not configured on the server. Set R2 secrets and redeploy upload functions.');
        }
        throw new https_1.HttpsError('internal', 'Could not create download link');
    }
}
//# sourceMappingURL=core.js.map