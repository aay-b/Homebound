import cors from 'cors'
import express from 'express'
import { env, isAllowedClientOrigin } from '@/config/env.js'
import { supabase } from '@/config/supabase.js'

import { applicationRouter } from '@/modules/application/applications.routes.js'
import { authRouter } from '@/modules/auth/auth.routes.js'
import { conversationsRouter } from '@/modules/messages/conversations.router.js'
import { messageRequestsRouter } from '@/modules/messages/message-requests.router.js'
import { messagesRouter } from '@/modules/messages/messages.router.js'
import { profileRouter } from '@/modules/profile/profile.routes.js'
import { usersRouter } from '@/modules/users/users.router.js'
import { createPetRouter } from '@/modules/pets/pet.routes.js'
import { createPetManagementRouter } from '@/modules/pets/pet.management.js'
import { requireAuth } from '@/modules/auth/auth.middleware.js'
import { createFavoritesRouter } from '@/modules/favorites/favorites.routes.js'

export const app = express()

app.use(cors({ origin: (origin, callback) => callback(null, isAllowedClientOrigin(origin)) }))
app.use('/api/pets/photos', express.json({ limit: '8mb' }))
app.use(express.json())

app.use('/api/pets', createPetManagementRouter(supabase, requireAuth))
app.use('/api/pets', createPetRouter(supabase))
app.use('/api/applications', applicationRouter)
app.use('/api/auth', authRouter)
app.get('/api/health', (_request, response) => response.json({ status: 'ok' }))
app.use('/api/users', usersRouter)
app.use('/api/message-requests', messageRequestsRouter)
app.use('/api/conversations', conversationsRouter)
app.use('/api/conversations', messagesRouter)
app.use('/api/profile', profileRouter)
app.use('/api/favorites', createFavoritesRouter(supabase))
