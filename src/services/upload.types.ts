export class UploadApiError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

export interface RequestUploadInput {
  fileName: string
  contentType: string
  size: number
  relatedEntityType: 'task' | 'conversation' | 'message' | 'profile'
  relatedEntityId: string
}

export interface RequestUploadResult {
  uploadId: string
  objectKey: string
  uploadUrl: string
  fileUrl?: string
  expiresIn: number
}

export interface UploadFileMeta {
  uploadId: string
  objectKey: string
  contentType: string
  size: number
  fileName: string
  fileUrl?: string
}

export interface SignedDownloadResult {
  downloadUrl: string
  expiresIn: number
}
