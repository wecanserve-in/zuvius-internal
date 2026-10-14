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
exports.onTaskWritten = exports.taskDeadlineReminders = exports.uploadHealthR2 = exports.uploadHealthHttp = exports.uploadHealth = exports.uploadCorsProbe = exports.getDownloadUrl = exports.confirmUpload = exports.requestUpload = exports.getDownloadUrlCallable = exports.confirmUploadCallable = exports.requestUploadCallable = exports.createDepartment = exports.createEmployeeAccount = void 0;
const admin = __importStar(require("firebase-admin"));
const v2_1 = require("firebase-functions/v2");
admin.initializeApp();
(0, v2_1.setGlobalOptions)({ region: process.env.FUNCTIONS_REGION ?? 'asia-south1' });
var createUser_1 = require("./auth/createUser");
Object.defineProperty(exports, "createEmployeeAccount", { enumerable: true, get: function () { return createUser_1.createEmployeeAccount; } });
var createDepartment_1 = require("./departments/createDepartment");
Object.defineProperty(exports, "createDepartment", { enumerable: true, get: function () { return createDepartment_1.createDepartment; } });
var uploads_1 = require("./uploads");
Object.defineProperty(exports, "requestUploadCallable", { enumerable: true, get: function () { return uploads_1.requestUploadCallable; } });
Object.defineProperty(exports, "confirmUploadCallable", { enumerable: true, get: function () { return uploads_1.confirmUploadCallable; } });
Object.defineProperty(exports, "getDownloadUrlCallable", { enumerable: true, get: function () { return uploads_1.getDownloadUrlCallable; } });
var http_1 = require("./uploads/http");
Object.defineProperty(exports, "requestUpload", { enumerable: true, get: function () { return http_1.requestUpload; } });
Object.defineProperty(exports, "confirmUpload", { enumerable: true, get: function () { return http_1.confirmUpload; } });
Object.defineProperty(exports, "getDownloadUrl", { enumerable: true, get: function () { return http_1.getDownloadUrl; } });
Object.defineProperty(exports, "uploadCorsProbe", { enumerable: true, get: function () { return http_1.uploadCorsProbe; } });
var health_1 = require("./uploads/health");
Object.defineProperty(exports, "uploadHealth", { enumerable: true, get: function () { return health_1.uploadHealth; } });
Object.defineProperty(exports, "uploadHealthHttp", { enumerable: true, get: function () { return health_1.uploadHealthHttp; } });
Object.defineProperty(exports, "uploadHealthR2", { enumerable: true, get: function () { return health_1.uploadHealthR2; } });
var deadlineReminders_1 = require("./scheduled/deadlineReminders");
Object.defineProperty(exports, "taskDeadlineReminders", { enumerable: true, get: function () { return deadlineReminders_1.taskDeadlineReminders; } });
var onTaskWrite_1 = require("./tasks/onTaskWrite");
Object.defineProperty(exports, "onTaskWritten", { enumerable: true, get: function () { return onTaskWrite_1.onTaskWritten; } });
// Optional: export { onAssigneeWritten } from './tasks/onAssigneeWrite' if you prefer server-only notifications
//# sourceMappingURL=index.js.map