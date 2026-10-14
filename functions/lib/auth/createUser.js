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
exports.createEmployeeAccount = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const roles_1 = require("../lib/roles");
exports.createEmployeeAccount = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required');
    }
    const actorSnap = await admin.firestore().doc(`users/${request.auth.uid}`).get();
    const actor = actorSnap.data();
    if (!actor?.isActive) {
        throw new https_1.HttpsError('permission-denied', 'Inactive account');
    }
    const actorRole = actor.role;
    if (!(0, roles_1.hasMinRole)(actorRole, 'admin')) {
        throw new https_1.HttpsError('permission-denied', 'Admin access required');
    }
    const data = request.data;
    if (!data?.email || !data.password || !data.displayName || !data.role) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required fields');
    }
    if (data.role === 'super_admin' && actorRole !== 'super_admin') {
        throw new https_1.HttpsError('permission-denied', 'Only super admin can assign super admin');
    }
    const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN;
    if (allowedDomain && !data.email.toLowerCase().endsWith(`@${allowedDomain.toLowerCase()}`)) {
        throw new https_1.HttpsError('invalid-argument', 'Email domain is not authorized');
    }
    const userRecord = await admin.auth().createUser({
        email: data.email,
        password: data.password,
        displayName: data.displayName,
        disabled: false,
    });
    await admin.firestore().doc(`users/${userRecord.uid}`).set({
        displayName: data.displayName,
        email: data.email,
        role: data.role,
        departmentIds: data.departmentIds ?? [],
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await admin.firestore().collection('activityLogs').add({
        actorId: request.auth.uid,
        action: 'user.created',
        entityType: 'user',
        entityId: userRecord.uid,
        metadata: { email: data.email, role: data.role },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { userId: userRecord.uid };
});
//# sourceMappingURL=createUser.js.map