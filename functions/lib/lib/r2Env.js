"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicHttpOptions = exports.callableOptions = exports.r2PublicUrl = exports.r2PublicUrlBase = exports.r2ObjectPrefix = exports.r2BucketName = exports.r2AccountId = exports.r2SecretAccessKey = exports.r2AccessKeyId = void 0;
exports.bindR2Env = bindR2Env;
const params_1 = require("firebase-functions/params");
/**
 * R2 credentials are loaded from functions/.env.internal-chat-bc793 at deploy time
 * (server-only, never exposed to the React app).
 *
 * Optional: on Blaze plan you may use Secret Manager instead by switching back to defineSecret.
 */
exports.r2AccessKeyId = (0, params_1.defineString)('R2_ACCESS_KEY_ID');
exports.r2SecretAccessKey = (0, params_1.defineString)('R2_SECRET_ACCESS_KEY');
exports.r2AccountId = (0, params_1.defineString)('R2_ACCOUNT_ID', {
    default: '45b20d97ffbad9e7a7573c735af61f19',
});
exports.r2BucketName = (0, params_1.defineString)('R2_BUCKET_NAME', { default: 'lms-portal' });
exports.r2ObjectPrefix = (0, params_1.defineString)('R2_OBJECT_PREFIX', { default: 'zuvius-internal' });
/** Optional public base URL for objects (e.g. R2 custom domain). Alias: R2_PUBLIC_URL. */
exports.r2PublicUrlBase = (0, params_1.defineString)('R2_PUBLIC_URL_BASE', { default: '' });
exports.r2PublicUrl = (0, params_1.defineString)('R2_PUBLIC_URL', { default: '' });
/** Makes R2 settings available to lib/r2.ts via process.env for this invocation. */
function bindR2Env() {
    const accessKeyId = exports.r2AccessKeyId.value();
    const secretAccessKey = exports.r2SecretAccessKey.value();
    if (!accessKeyId || !secretAccessKey) {
        throw new Error('R2 credentials are not configured');
    }
    process.env.R2_ACCESS_KEY_ID = accessKeyId;
    process.env.R2_SECRET_ACCESS_KEY = secretAccessKey;
    process.env.R2_ACCOUNT_ID = exports.r2AccountId.value();
    process.env.R2_BUCKET_NAME = exports.r2BucketName.value();
    process.env.R2_OBJECT_PREFIX = exports.r2ObjectPrefix.value();
    const publicBase = exports.r2PublicUrl.value() || exports.r2PublicUrlBase.value();
    if (publicBase) {
        process.env.R2_PUBLIC_URL = publicBase;
        process.env.R2_PUBLIC_URL_BASE = publicBase;
    }
}
/** String origins only — RegExp breaks Gen2 callable CORS in some runtimes. */
const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://internal-chat-bc793.web.app',
    'https://internal-chat-bc793.firebaseapp.com',
];
/** Gen2 HTTP/callables — public invoker so browser OPTIONS preflight succeeds. */
exports.callableOptions = {
    cors: allowedOrigins,
    invoker: 'public',
};
exports.publicHttpOptions = {
    cors: allowedOrigins,
    invoker: 'public',
    region: 'asia-south1',
};
//# sourceMappingURL=r2Env.js.map