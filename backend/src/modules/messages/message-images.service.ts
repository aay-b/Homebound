import { randomUUID } from 'node:crypto'
import { prisma } from '@/config/prisma.js'
import { supabase } from '@/config/supabase.js'
import { hasBlockBetween } from '@/modules/messages/blocking.service.js'

const bucket = 'message-images'
const imagePathPattern = /^[1-9]\d*\/[1-9]\d*\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const imageContentTypePattern = /^image\/[a-z0-9][a-z0-9.+-]*$/i
const imageUrlLifetimeSeconds = 60 * 60

export function isImageContentType(contentType: string) {
  return imageContentTypePattern.test(contentType)
}

export function isMessageImagePath(imagePath: string, conversationId: bigint, senderId: bigint) {
  return imagePathPattern.test(imagePath) && imagePath.startsWith(`${conversationId}/${senderId}/`)
}

export async function createMessageImageUpload(conversationId: bigint, senderId: bigint, contentType: string) {
  if (!isImageContentType(contentType)) return { status: 'invalid_image' as const }

  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: senderId } },
    select: { conversation: { select: { members: { select: { userId: true } } } } },
  })
  if (!membership) return { status: 'not_found' as const }
  for (const member of membership.conversation.members) {
    if (member.userId !== senderId && await hasBlockBetween(senderId, member.userId)) {
      return { status: 'blocked' as const }
    }
  }

  // The server chooses the destination. Do not accept filenames, public URLs, or arbitrary storage paths.
  const imagePath = `${conversationId}/${senderId}/${randomUUID()}`
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(imagePath, { upsert: false })
  if (error || !data) return { status: 'storage_unavailable' as const }

  return {
    status: 'created' as const,
    upload: {
      bucket,
      imagePath,
      contentType,
      signedUrl: data.signedUrl,
      token: data.token,
    },
  }
}

export async function validateMessageImage(imagePath: string, conversationId: bigint, senderId: bigint) {
  if (!isMessageImagePath(imagePath, conversationId, senderId)) return 'invalid_image' as const

  // Inspect Storage metadata, not the content type claimed in the socket payload.
  const { data, error } = await supabase.storage.from(bucket).info(imagePath)
  if (error || !data) {
    if (error && (('statusCode' in error && Number(error.statusCode) === 404)
      || ('code' in error && ['NoSuchKey', 'not_found'].includes(String(error.code))))) {
      return 'invalid_image' as const
    }
    return 'storage_unavailable' as const
  }
  if (!data.contentType || !isImageContentType(data.contentType) || !data.size || data.size <= 0) {
    return 'invalid_image' as const
  }
  return 'valid' as const
}

export async function getMessageImageUrl(conversationId: bigint, messageId: bigint, currentUserId: bigint) {
  const message = await prisma.message.findFirst({
    where: {
      id: messageId,
      conversationId,
      deletedAt: null,
      imagePath: { not: null },
      conversation: { members: { some: { userId: currentUserId } } },
    },
    select: { imagePath: true, senderId: true },
  })
  if (!message?.imagePath || !isMessageImagePath(message.imagePath, conversationId, message.senderId)) {
    return { status: 'not_found' as const }
  }

  // Historical images remain readable when blocked, just like historical text messages.
  const expiresAt = new Date(Date.now() + imageUrlLifetimeSeconds * 1000).toISOString()
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(message.imagePath, imageUrlLifetimeSeconds)
  if (error || !data) return { status: 'storage_unavailable' as const }
  return { status: 'success' as const, image: { url: data.signedUrl, expiresAt } }
}

export async function removeMessageImages(imagePaths: string[]) {
  const paths = [...new Set(imagePaths.filter((path) => imagePathPattern.test(path)))]
  // Best-effort cleanup happens after the database commit and never reverses a completed deletion.
  try {
    for (let index = 0; index < paths.length; index += 100) {
      const { error } = await supabase.storage.from(bucket).remove(paths.slice(index, index + 100))
      if (error) console.error('Unable to remove deleted message images from Storage.')
    }
  } catch {
    console.error('Unable to remove deleted message images from Storage.')
  }
}
