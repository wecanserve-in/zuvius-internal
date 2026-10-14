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
exports.uploadCorsProbe = exports.getDownloadUrl = exports.confirmUpload = exports.requestUpload = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const cors_1 = require("../lib/cors");
const r2Env_1 = require("../lib/r2Env");
const core_1 = require("./core");
const httpOptions = {
    region: 'asia-south1',
    invoker: 'public',
    cors: cors_1.uploadCorsOption,
};
const httpOptionsNoSecrets = {
    region: 'asia-south1',
    invoker: 'public',
    cors: cors_1.uploadCorsOption,
};
function readJsonBody(req) {
    if (req.body && typeof req.body === 'object') {
        return req.body;
    }
    return {};
}
async function verifyAuthHeader(authorization) {
    if (!authorization?.startsWith('Bearer ')) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required');
    }
    const token = authorization.slice('Bearer '.length).trim();
    if (!token)
        throw new https_1.HttpsError('unauthenticated', 'Authentication required');
    const decoded = await admin.auth().verifyIdToken(token);
    return decoded.uid;
}
function httpsErrorStatus(code) {
    switch (code) {
        case 'invalid-argument':
            return 400;
        case 'unauthenticated':
            return 401;
        case 'permission-denied':
            return 403;
        case 'not-found':
            return 404;
        case 'failed-precondition':
            return 412;
        default:
            return 500;
    }
}
function sendHttpsError(res, err) {
    if (err instanceof https_1.HttpsError) {
        res.status(httpsErrorStatus(err.code)).json({
            error: { code: err.code, message: err.message },
        });
        return;
    }
    console.error('upload http error', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({
        error: { code: 'internal', message },
    });
}
function withUploadHttp(handler) {
    return async (req, res) => {
        if ((0, cors_1.handleUploadCorsPreflight)(req, res))
            return;
        (0, cors_1.applyUploadCorsHeaders)(req, res);
        if (req.method !== 'POST') {
            res.status(405).json({ error: { code: 'method-not-allowed', message: 'Use POST' } });
            return;
        }
        try {
            const uid = await verifyAuthHeader(req.get('authorization') ?? req.get('Authorization'));
            const body = readJsonBody(req);
            const result = await handler(uid, body);
            res.status(200).json(result);
        }
        catch (err) {
            sendHttpsError(res, err);
        }
    };
}
/** HTTP upload API with explicit OPTIONS/CORS (used by the Vite app). */
exports.requestUpload = (0, https_1.onRequest)(httpOptions, withUploadHttp(async (uid, body) => {
    return (0, core_1.runRequestUpload)(uid, body);
}));
exports.confirmUpload = (0, https_1.onRequest)(httpOptionsNoSecrets, withUploadHttp(async (uid, body) => {
    const uploadId = String(body.uploadId ?? '');
    return (0, core_1.runConfirmUpload)(uid, uploadId);
}));
exports.getDownloadUrl = (0, https_1.onRequest)(httpOptions, withUploadHttp(async (uid, body) => {
    const uploadId = String(body.uploadId ?? '');
    return (0, core_1.runGetDownloadUrl)(uid, uploadId);
}));
/** CORS probe — OPTIONS returns 204 with headers; GET returns ok without auth. */
exports.uploadCorsProbe = (0, https_1.onRequest)(r2Env_1.publicHttpOptions, (req, res) => {
    if ((0, cors_1.handleUploadCorsPreflight)(req, res))
        return;
    (0, cors_1.applyUploadCorsHeaders)(req, res);
    res.status(200).json({ ok: true, cors: true });
});
//# sourceMappingURL=http.js.map