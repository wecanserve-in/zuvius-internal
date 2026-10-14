"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadBufferToR2 = uploadBufferToR2;
const client_s3_1 = require("@aws-sdk/client-s3");
const r2_1 = require("./r2");
/** Server-side PutObject (same SDK pattern as AddCourse). Used by Cloud Functions, not the browser. */
async function uploadBufferToR2(input) {
    (0, r2_1.validateUpload)(input.contentType, input.size);
    const bucket = process.env.R2_BUCKET_NAME;
    if (!bucket)
        throw new Error('R2_BUCKET_NAME is not configured');
    const objectKey = (0, r2_1.buildObjectKey)(input.ownerId, input.fileName, input.relatedEntityType, input.contentType);
    const client = (0, r2_1.getR2Client)();
    await client.send(new client_s3_1.PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: input.body,
        ContentType: input.contentType,
        Metadata: {
            originalFileName: input.fileName.slice(0, 200),
            uploadedBy: input.ownerId,
        },
    }));
    return { objectKey, fileUrl: (0, r2_1.buildPublicFileUrl)(objectKey) };
}
//# sourceMappingURL=r2DirectUpload.js.map