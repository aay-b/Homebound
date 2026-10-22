import { prisma } from '@/config/prisma.js'
import type { PlatformIssueReportInput } from '@/modules/platform-issues/platform-issues.validation.js'

export async function createPlatformIssueReport(reporterId: bigint, input: PlatformIssueReportInput) {
  const report = await prisma.platformIssueReport.create({
    data: {
      reporterId,
      title: input.title,
      category: input.category,
      description: input.description,
    },
    select: {
      id: true,
      createdAt: true,
    },
  })

  return {
    id: report.id.toString(),
    createdAt: report.createdAt.toISOString(),
  }
}
