"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getR2Client = getR2Client;
exports.validateUpload = validateUpload;
exports.getObjectPrefix = getObjectPrefix;
exports.buildPublicFileUrl = buildPublicFileUrl;
exports.buildObjectKey = buildObjectKey;
exports.presignPutUrl = presignPutUrl;
exports.presignGetUrl = presignGetUrl;
const client_s3_1 = require("@aws-sdk/client-s3");
const client_s3_2 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const node_crypto_1 = require("node:crypto");
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const ALLOWED_MIME_PREFIXES = [
    'image/',
    'video/',
    'audio/',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument',
    'text/plain',
];
function getR2Client() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    if (!accountId || !accessKeyId || !secretAccessKey) {
        throw new Error('R2 credentials are not configured');
    }
    return new client_s3_2.S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
    });
}
function validateUpload(contentType, size) {
    if (size <= 0 || size > MAX_UPLOAD_BYTES) {
        throw new Error('File size is not allowed');
    }
    const allowed = ALLOWED_MIME_PREFIXES.some((p) => contentType.startsWith(p)) ||
        contentType === 'application/octet-stream';
    if (!allowed) {
        throw new Error('File type is not allowed');
    }
}
/** Root folder inside a shared bucket (e.g. lms-portal/zuvius-internal/...) */
function getObjectPrefix() {
    const raw = process.env.R2_OBJECT_PREFIX ?? 'zuvius-internal';
    return raw.replace(/^\/+|\/+$/g, '');
}
/** Public CDN / R2 custom domain base (no trailing slash). When set, Firestore stores stable file URLs. */
function buildPublicFileUrl(objectKey) {
    const base = (process.env.R2_PUBLIC_URL ?? process.env.R2_PUBLIC_URL_BASE)?.replace(/\/+$/, '');
    if (!base)
        return null;
    const key = objectKey.replace(/^\/+/, '');
    return `${base}/${key}`;
}
function folderForUpload(relatedEntityType, contentType) {
    if (relatedEntityType === 'task')
        return 'tasks';
    if (relatedEntityType === 'profile')
        return 'profiles';
    if (contentType.startsWith('image/'))
        return 'chat-images';
    if (contentType.startsWith('video/'))
        return 'chat-videos';
    if (contentType.startsWith('audio/'))
        return 'chat-audio';
    if (contentType.startsWith('application/pdf') ||
        contentType.includes('document') ||
        contentType.includes('msword') ||
        contentType.includes('spreadsheet') ||
        contentType === 'text/plain') {
        return 'chat-documents';
    }
    return 'chat-attachments';
}
function buildObjectKey(ownerId, fileName, relatedEntityType = 'conversation', contentType = 'application/octet-stream') {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
    const prefix = getObjectPrefix();
    const folder = folderForUpload(relatedEntityType, contentType);
    return `${prefix}/${folder}/${ownerId}/${(0, node_crypto_1.randomUUID)()}-${safeName}`;
}
async function presignPutUrl(objectKey, contentType, expiresIn = 900) {
    const bucket = process.env.R2_BUCKET_NAME;
    if (!bucket)
        throw new Error('R2_BUCKET_NAME is not configured');
    const client = getR2Client();
    const command = new client_s3_1.PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        ContentType: contentType,
    });
    return (0, s3_request_presigner_1.getSignedUrl)(client, command, { expiresIn });
}
async function presignGetUrl(objectKey, expiresIn = 900) {
    const bucket = process.env.R2_BUCKET_NAME;
    if (!bucket)
        throw new Error('R2_BUCKET_NAME is not configured');
    const client = getR2Client();
    const command = new client_s3_1.GetObjectCommand({ Bucket: bucket, Key: objectKey });
    return (0, s3_request_presigner_1.getSignedUrl)(client, command, { expiresIn });
}
//# sourceMappingURL=r2.js.map