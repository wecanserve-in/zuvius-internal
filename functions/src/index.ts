import * as admin from 'firebase-admin'
import { setGlobalOptions } from 'firebase-functions/v2'

admin.initializeApp()
setGlobalOptions({ region: process.env.FUNCTIONS_REGION ?? 'asia-south1' })

export { createEmployeeAccount } from './auth/createUser'
export { createDepartment } from './departments/createDepartment'
export {
  requestUploadCallable,
  confirmUploadCallable,
  getDownloadUrlCallable,
} from './uploads'
export { requestUpload, confirmUpload, getDownloadUrl, uploadCorsProbe } from './uploads/http'
export { uploadHealth, uploadHealthHttp, uploadHealthR2 } from './uploads/health'
export { taskDeadlineReminders } from './scheduled/deadlineReminders'
export { onTaskWritten } from './tasks/onTaskWrite'
// Optional: export { onAssigneeWritten } from './tasks/onAssigneeWrite' if you prefer server-only notifications
