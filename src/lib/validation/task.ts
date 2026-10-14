import { z } from 'zod'

export const taskFormSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  departmentId: z.string().optional(),
  assigneeIds: z.array(z.string()).min(1, 'Select at least one assignee'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  deadlineAt: z.string().optional(),
  requiresReview: z.boolean(),
  category: z.string().optional(),
})

export type TaskFormValues = z.infer<typeof taskFormSchema>
