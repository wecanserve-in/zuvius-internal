"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadCorsOption = exports.UPLOAD_HTTP_ALLOWED_ORIGINS = void 0;
exports.isAllowedUploadOrigin = isAllowedUploadOrigin;
exports.resolveCorsOrigin = resolveCorsOrigin;
exports.applyUploadCorsHeaders = applyUploadCorsHeaders;
exports.handleUploadCorsPreflight = handleUploadCorsPreflight;
/** Browser origins allowed to call upload HTTP endpoints (not R2 presigned PUT). */
exports.UPLOAD_HTTP_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://internal-chat-bc793.web.app',
    'https://internal-chat-bc793.firebaseapp.com',
];
/** For Firebase `onRequest({ cors })` — must be a plain string array. */
exports.uploadCorsOption = [...exports.UPLOAD_HTTP_ALLOWED_ORIGINS];
function isAllowedUploadOrigin(origin) {
    if (!origin)
        return false;
    if (exports.UPLOAD_HTTP_ALLOWED_ORIGINS.includes(origin))
        return true;
    if (/^http:\/\/localhost:\d+$/.test(origin))
        return true;
    if (/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))
        return true;
    return false;
}
function resolveCorsOrigin(req) {
    const origin = req.get('origin') ?? req.get('Origin') ?? undefined;
    return isAllowedUploadOrigin(origin) ? origin : null;
}
const ALLOWED_METHODS = 'GET, POST, OPTIONS';
const ALLOWED_HEADERS = 'Authorization, Content-Type, X-Requested-With, X-Firebase-AppCheck, Firebase-Instance-ID-Token';
/** Sets CORS headers on success and error responses. */
function applyUploadCorsHeaders(req, res) {
    const origin = resolveCorsOrigin(req);
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
    res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
    res.setHeader('Access-Control-Max-Age', '3600');
}
/** Returns true when the request was handled as OPTIONS preflight (204, no auth). */
function handleUploadCorsPreflight(req, res) {
    applyUploadCorsHeaders(req, res);
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return true;
    }
    return false;
}
//# sourceMappingURL=cors.js.map