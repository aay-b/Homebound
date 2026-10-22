import { z } from 'zod'

export const platformIssueReportSchema = z.object({
  title: z.string({ error: 'Please enter a title.' })
    .trim()
    .min(1, 'Please enter a title.')
    .max(150, 'The title must be 150 characters or fewer.'),
  category: z.string({ error: 'Please select a category.' })
    .trim()
    .min(1, 'Please select a category.')
    .max(50, 'The category must be 50 characters or fewer.'),
  description: z.string({ error: 'Please describe the issue.' })
    .trim()
    .min(1, 'Please describe the issue.')
    .max(5000, 'The description must be 5,000 characters or fewer.'),
})

export type PlatformIssueReportInput = z.infer<typeof platformIssueReportSchema>
