import type { Timestamp } from 'firebase/firestore'

export type UserRole = 'super_admin' | 'admin' | 'department_admin' | 'member'

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export type TaskStatus =
  | 'todo'
  | 'in_progress'
  | 'completed'
  | 'needs_revision'
  | 'cancelled'

export type AssigneeStatus = 'todo' | 'in_progress' | 'completed'

export type ConversationType = 'direct' | 'group'

export type MessageType = 'text' | 'image' | 'file' | 'audio' | 'video' | 'system'

export type TaskHistoryEventKind = 'created' | 'assigned' | 'forwarded' | 'completed'

export interface TaskHistoryEvent {
  id: string
  taskId: string
  kind: TaskHistoryEventKind
  actorId: string
  assignedById?: string
  previousAssigneeId?: string
  newAssigneeId?: string
  handoverNote?: string
  assigneeIds?: string[]
  createdAt?: Timestamp
}

export interface TaskChatEvent {
  eventKind: TaskHistoryEventKind
  taskId: string
  title: string
  description?: string | null
  priority: string
  status: string
  assignedById: string
  assigneeId: string
  previousAssigneeId?: string
  handoverNote?: string
  deadlineMs?: number | null
  eventKey: string
}

export type NotificationType =
  | 'task_assigned'
  | 'task_reassigned'
  | 'task_forwarded'
  | 'task_completed'
  | 'task_revision'
  | 'task_deadline'
  | 'task_overdue'
  | 'message_direct'
  | 'message_group'
  | 'admin_change'

export interface AppUser {
  id: string
  displayName: string
  email: string
  photoURL?: string
  /** R2 upload doc id — use getDownloadUrl; do not store permanent URLs. */
  photoUploadId?: string
  /** R2 object key for presigned/public profile image URLs. */
  photoObjectKey?: string
  departmentIds: string[]
  role: UserRole
  isActive: boolean
  phone?: string
  fcmTokens?: string[]
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export interface Department {
  id: string
  name: string
  description?: string
  adminIds: string[]
  memberIds: string[]
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export interface Project {
  id: string
  title: string
  description: string
  createdBy: string
  departmentId?: string
  deadlineAt?: Timestamp
  /** Optional recovery marker when task creation partially failed. */
  creationStatus?: 'complete' | 'partial'
  taskCount?: number
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export interface Task {
  id: string
  title: string
  description: string
  createdBy: string
  departmentId?: string
  /** When set, task belongs to a project (separate actionable record). */
  projectId?: string
  assigneeIds: string[]
  /** First assignees at creation (unchanged by forwarding). */
  initialAssigneeIds?: string[]
  priority: TaskPriority
  status: TaskStatus
  deadlineAt?: Timestamp
  startAt?: Timestamp
  requiresReview: boolean
  category?: string
  attachmentIds?: string[]
  /** Stable R2 keys for attachment links (assignees + creator). */
  attachmentMeta?: { uploadId: string; objectKey: string; fileName?: string }[]
  formerAssigneeIds?: string[]
  /** Users who forwarded this task (forward actor ids). */
  forwardedByIds?: string[]
  createdAt?: Timestamp
  updatedAt?: Timestamp
  completedAt?: Timestamp
  completionNotes?: string
}

export interface TaskAssignee {
  userId: string
  status: AssigneeStatus
  progress: number
  completedAt?: Timestamp
  completionNotes?: string
  updatedAt?: Timestamp
}

export interface TaskComment {
  id: string
  authorId: string
  text: string
  attachmentIds?: string[]
  createdAt?: Timestamp
}

export interface Conversation {
  id: string
  type: ConversationType
  title?: string
  description?: string
  imageURL?: string
  memberIds: string[]
  departmentId?: string
  isDepartmentChannel?: boolean
  /** Group chat tied to a task (all task participants). */
  isTaskChannel?: boolean
  taskId?: string
  createdBy: string
  lastMessage?: string
  lastMessageAt?: Timestamp
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export interface ChatMessage {
  id: string
  senderId: string
  type: MessageType
  text?: string
  attachment?: {
    uploadId: string
    objectKey: string
    contentType: string
    size: number
    fileName?: string
    fileUrl?: string
    durationMs?: number
  }
  taskEvent?: TaskChatEvent
  replyToMessageId?: string
  createdAt?: Timestamp
  editedAt?: Timestamp
  deletedAt?: Timestamp
}

export interface AppNotification {
  id: string
  recipientId: string
  type: NotificationType
  title: string
  body: string
  entityType?: 'task' | 'conversation' | 'user' | 'department'
  entityId?: string
  readAt?: Timestamp | null
  createdAt?: Timestamp
}

export interface ActivityLog {
  id: string
  actorId: string
  action: string
  entityType: string
  entityId: string
  metadata?: Record<string, unknown>
  createdAt?: Timestamp
}

export interface FileUpload {
  id: string
  ownerId: string
  objectKey: string
  contentType: string
  size: number
  fileName?: string
  relatedEntityType?: 'task' | 'conversation' | 'message' | 'profile'
  relatedEntityId?: string
  status: 'pending' | 'completed' | 'failed'
  fileUrl?: string
  createdAt?: Timestamp
}
