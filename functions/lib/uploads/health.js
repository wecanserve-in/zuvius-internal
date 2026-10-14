"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadHealthHttp = exports.uploadHealthR2 = exports.uploadHealth = void 0;
const https_1 = require("firebase-functions/v2/https");
const r2Env_1 = require("../lib/r2Env");
const r2_1 = require("../lib/r2");
/** Callable ping (use from app / Firebase SDK). */
exports.uploadHealth = (0, https_1.onCall)({ cors: r2Env_1.callableOptions.cors, invoker: 'public' }, async () => ({ ok: true, service: 'uploads' }));
/**
 * Verifies R2 credentials are bound (requires secrets on deploy).
 * Does not expose secret values.
 */
exports.uploadHealthR2 = (0, https_1.onCall)(r2Env_1.callableOptions, async () => {
    try {
        (0, r2Env_1.bindR2Env)();
        (0, r2_1.getR2Client)();
        return { ok: true, service: 'uploads', r2: true };
    }
    catch (err) {
        console.error('uploadHealthR2', err);
        return {
            ok: false,
            service: 'uploads',
            r2: false,
            hint: 'Set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY secrets, then redeploy upload functions.',
        };
    }
});
/**
 * Open in browser after deploy:
 * https://asia-south1-internal-chat-bc793.cloudfunctions.net/uploadHealthHttp
 * Should return {"ok":true}. If 404, functions are not deployed.
 */
exports.uploadHealthHttp = (0, https_1.onRequest)(r2Env_1.publicHttpOptions, (_req, res) => {
    res.status(200).json({ ok: true, service: 'uploads' });
});
//# sourceMappingURL=health.js.map