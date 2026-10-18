import { prisma } from '@/config/prisma.js'
import type { Prisma } from '@/generated/prisma/client.js'

export type UserBlockEvent = { blockerId: string; blockedId: string }
export const blockedMessagingError = 'You cannot send messages to this person.'

// Both directions share a lock so a send cannot slip past a block being saved concurrently.
export async function lockMessagingPair(transaction: Prisma.TransactionClient, firstId: bigint, secondId: bigint) {
  const pairKey = firstId < secondId ? `messaging:${firstId}:${secondId}` : `messaging:${secondId}:${firstId}`
  await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${pairKey}, 0))`
}

export async function hasBlockBetween(firstId: bigint, secondId: bigint, database: Pick<Prisma.TransactionClient, 'userBlock'> = prisma) {
  const block = await database.userBlock.findFirst({
    where: { OR: [{ blockerId: firstId, blockedId: secondId }, { blockerId: secondId, blockedId: firstId }] },
    select: { blockerId: true },
  })
  return Boolean(block)
}

export async function lockAndCheckParticipantBlocks(transaction: Prisma.TransactionClient, userId: bigint, participantIds: bigint[]) {
  const otherIds = [...new Set(participantIds.filter((id) => id !== userId))]
    .sort((a, b) => a < b ? -1 : a > b ? 1 : 0)
  for (const otherId of otherIds) {
    await lockMessagingPair(transaction, userId, otherId)
    if (await hasBlockBetween(userId, otherId, transaction)) return true
  }
  return false
}

export async function blockUser(blockerId: bigint, blockedId: bigint) {
  if (blockerId === blockedId) return { status: 'self_block' as const }

  return prisma.$transaction(async (transaction) => {
    await lockMessagingPair(transaction, blockerId, blockedId)
    const participant = await transaction.user.findUnique({ where: { id: blockedId }, select: { id: true } })
    if (!participant) return { status: 'not_found' as const }

    // Repeating the same action is safe, including a retry after a lost acknowledgement.
    await transaction.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    })
    return { status: 'blocked' as const, block: { blockerId: blockerId.toString(), blockedId: blockedId.toString() } }
  })
}
