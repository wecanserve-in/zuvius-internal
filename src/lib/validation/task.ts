import { z } from 'zod'

export const taskFormSchema = z.object({
  body: z.string().min(3, 'Enter what needs to be done'),
  assigneeIds: z.array(z.string()).min(1, 'Select at least one assignee'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  deadlineAt: z.string().optional(),
  requiresReview: z.boolean().optional(),
  category: z.string().optional(),
})

export type TaskFormValues = z.infer<typeof taskFormSchema>

export const projectFormSchema = z.object({
  body: z.string().min(3, 'Enter project details'),
  deadlineAt: z.string().optional(),
})

export type ProjectFormValues = z.infer<typeof projectFormSchema>

export const projectTaskDraftSchema = z.object({
  body: z.string().min(3, 'Enter task details'),
  assigneeIds: z.array(z.string()).min(1, 'Select an assignee'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  deadlineAt: z.string().optional(),
})

export type ProjectTaskDraft = z.infer<typeof projectTaskDraftSchema>
