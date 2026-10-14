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
exports.createDepartment = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const roles_1 = require("../lib/roles");
exports.createDepartment = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required');
    }
    const actorSnap = await admin.firestore().doc(`users/${request.auth.uid}`).get();
    const actor = actorSnap.data();
    if (!actor?.isActive) {
        throw new https_1.HttpsError('permission-denied', 'Inactive account');
    }
    if (!(0, roles_1.hasMinRole)(actor.role, 'admin')) {
        throw new https_1.HttpsError('permission-denied', 'Admin access required');
    }
    const data = request.data;
    const name = data?.name?.trim();
    if (!name || name.length < 2) {
        throw new https_1.HttpsError('invalid-argument', 'Department name is required');
    }
    const ref = await admin.firestore().collection('departments').add({
        name,
        description: data.description?.trim() ?? null,
        adminIds: [],
        memberIds: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await admin.firestore().collection('activityLogs').add({
        actorId: request.auth.uid,
        action: 'department.created',
        entityType: 'department',
        entityId: ref.id,
        metadata: { name },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { departmentId: ref.id };
});
//# sourceMappingURL=createDepartment.js.map