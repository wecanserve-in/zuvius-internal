"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDownloadUrlCallable = exports.confirmUploadCallable = exports.requestUploadCallable = void 0;
const https_1 = require("firebase-functions/v2/https");
const core_1 = require("./core");
/** Callable wrappers (Firebase SDK). CORS: string origins only on Gen2. */
const callCors = {
    cors: [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'https://internal-chat-bc793.web.app',
        'https://internal-chat-bc793.firebaseapp.com',
    ],
    invoker: 'public',
};
exports.requestUploadCallable = (0, https_1.onCall)({ cors: callCors.cors, invoker: 'public' }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Authentication required');
    return (0, core_1.runRequestUpload)(request.auth.uid, request.data);
});
exports.confirmUploadCallable = (0, https_1.onCall)({ cors: callCors.cors, invoker: 'public' }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Authentication required');
    const { uploadId } = request.data;
    return (0, core_1.runConfirmUpload)(request.auth.uid, uploadId);
});
exports.getDownloadUrlCallable = (0, https_1.onCall)({ cors: callCors.cors, invoker: 'public' }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Authentication required');
    const { uploadId } = request.data;
    return (0, core_1.runGetDownloadUrl)(request.auth.uid, uploadId);
});
//# sourceMappingURL=index.js.map