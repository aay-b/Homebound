import { prisma } from '@/config/prisma.js'
import { supabase } from '@/config/supabase.js'

export async function getMessagingAvatarUrls(userIds: bigint[]): Promise<Record<string, string | null>> {
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  })
  const avatars: Record<string, string | null> = Object.fromEntries(users.map((user) => [user.id.toString(), null]))
  if (users.length === 0) return avatars

  const names = [...new Set(users.map((user) => user.name))]
  // Registration and Profile currently synchronize display names rather than a shared user foreign key.
  // Ambiguous names use the default avatar instead of exposing another account's picture.
  const [profiles, nameCounts] = await Promise.all([
    prisma.profile.findMany({
      where: { name: { in: names } },
      select: { name: true, userId: true, profilePicturePath: true, updatedAt: true },
    }),
    prisma.user.groupBy({ by: ['name'], where: { name: { in: names } }, _count: { _all: true } }),
  ])
  const uniqueUserNames = new Set(nameCounts.filter((entry) => entry._count._all === 1).map((entry) => entry.name))
  const profilesByName = new Map<string, (typeof profiles)[number] | null>()
  for (const profile of profiles) profilesByName.set(profile.name, profilesByName.has(profile.name) ? null : profile)

  const pictures = users.flatMap((user) => {
    const profile = profilesByName.get(user.name)
    const path = profile?.profilePicturePath
    if (!uniqueUserNames.has(user.name) || !profile || !path || !path.startsWith(`${profile.userId}/`) || path.split('/').includes('..')) return []
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
