import { prisma } from '@/config/prisma.js'
import { supabase } from '@/config/supabase.js'

export async function getMessagingAvatarUrls(userIds: bigint[]): Promise<Record<string, string | null>> {
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, authUserId: true },
  })
  const avatars: Record<string, string | null> = Object.fromEntries(users.map((user) => [user.id.toString(), null]))
  if (users.length === 0) return avatars

  const authUserIds = users.flatMap(user => user.authUserId ? [user.authUserId] : [])
  if (authUserIds.length === 0) return avatars

  // Profile.userId and Users.authUserId identify the same Auth account, regardless of display names.
  const profiles = await prisma.profile.findMany({
    where: { userId: { in: authUserIds } },
    select: { userId: true, profilePicturePath: true, updatedAt: true },
  })
  const profilesByAuthId = new Map(profiles.map(profile => [profile.userId, profile]))

  const pictures = users.flatMap((user) => {
    if (!user.authUserId) return []
    const profile = profilesByAuthId.get(user.authUserId)
    const path = profile?.profilePicturePath
    if (!profile || !path || !path.startsWith(`${user.authUserId}/`) || path.split('/').includes('..')) return []
    return [{ id: user.id.toString(), path, updatedAt: profile.updatedAt.getTime() }]
  })
  if (pictures.length === 0) return avatars

  const { data, error } = await supabase.storage.from('profile-pictures').createSignedUrls([...new Set(pictures.map((picture) => picture.path))], 60 * 60)
  if (error || !data) return avatars
  const signedUrls = new Map(data.filter((item) => !item.error && item.signedUrl).map((item) => [item.path, item.signedUrl]))
  for (const picture of pictures) {
    const signedUrl = signedUrls.get(picture.path)
    if (signedUrl) {
      const url = new URL(signedUrl)
      url.searchParams.set('v', picture.updatedAt.toString())
      avatars[picture.id] = url.toString()
    }
  }
  return avatars
}
