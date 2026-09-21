import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../src/generated/prisma/client.js'

const connectionString = process.env.SUPABASE_DB_URL
if (!connectionString) throw new Error('SUPABASE_DB_URL is missing.')

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const demoUsers = [
  { id: 1, name: 'Mia Carter', email: 'mia.carter@gmail.com', role: 'user' },
  { id: 2, name: 'Noah Bennett', email: 'noah.bennett@gmail.com', role: 'user' },
  { id: 3, name: 'Olivia Brooks', email: 'olivia.brooks@gmail.com', role: 'user' },
  { id: 4, name: 'Ethan Walker', email: 'ethan.walker@gmail.com', role: 'user' },
  { id: 5, name: 'Sophia Reed', email: 'sophia.reed@gmail.com', role: 'user' },
  { id: 6, name: 'Happy Paws Shelter', email: 'happypawsshelter@gmail.com', role: 'shelter_staff' },
  { id: 7, name: 'City Animal Rescue', email: 'cityanimalrescue@gmail.com', role: 'shelter_staff' },
  { id: 8, name: 'Northside Shelter', email: 'northsideshelter@gmail.com', role: 'shelter_staff' },
  { id: 9, name: 'Safe Haven Rescue', email: 'safehavenrescue@gmail.com', role: 'shelter_staff' },
  { id: 10, name: 'Paws and Hope', email: 'pawsandhope@gmail.com', role: 'shelter_staff' },
  { id: 11, name: 'Liam Foster', email: 'liam.foster@gmail.com', role: 'user' },
  { id: 12, name: 'Ava Morgan', email: 'ava.morgan@gmail.com', role: 'user' },
  { id: 13, name: 'Lucas Turner', email: 'lucas.turner@gmail.com', role: 'user' },
  { id: 14, name: 'Isabella Hayes', email: 'isabella.hayes@gmail.com', role: 'user' },
  { id: 15, name: 'Henry Collins', email: 'henry.collins@gmail.com', role: 'user' },
  { id: 16, name: 'Second Chance Shelter', email: 'secondchanceshelter@gmail.com', role: 'shelter_staff' },
  { id: 17, name: 'Golden Tail Rescue', email: 'goldentailrescue@gmail.com', role: 'shelter_staff' },
  { id: 18, name: 'Bright Future Shelter', email: 'brightfutureshelter@gmail.com', role: 'shelter_staff' },
  { id: 19, name: 'Kind Hearts Animal Care', email: 'kindheartsanimalcare@gmail.com', role: 'shelter_staff' },
  { id: 20, name: 'New Beginnings Rescue', email: 'newbeginningsrescue@gmail.com', role: 'shelter_staff' },
]

async function main() {
  for (const user of demoUsers) {
    const { id, ...userData } = user
    await prisma.user.upsert({
      where: { id: BigInt(id) },
      update: userData,
      create: { id: BigInt(id), ...userData },
    })
  }

  await prisma.$executeRawUnsafe(
    "select setval(pg_get_serial_sequence('public.users', 'id'), (select max(id) from public.users))",
  )
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
