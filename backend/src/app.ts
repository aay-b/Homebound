import cors from 'cors'
import express from 'express'
import { env, isAllowedClientOrigin } from '@/config/env.js'

import { applicationRouter } from '@/modules/application/applications.routes.js'
import { authRouter } from '@/modules/auth/auth.routes.js'
import { conversationsRouter } from '@/modules/messages/conversations.router.js'
import { messageRequestsRouter } from '@/modules/messages/message-requests.router.js'
import { messagesRouter } from '@/modules/messages/messages.router.js'
import { profileRouter } from '@/modules/profile/profile.routes.js'
import { usersRouter } from '@/modules/users/users.router.js'

export const app = express()

app.use(cors({ origin: (origin, callback) => callback(null, isAllowedClientOrigin(origin)) }))
app.use(express.json())

app.use('/api/applications', applicationRouter)
app.use('/api/auth', authRouter)
app.get('/api/health', (_request, response) => response.json({ status: 'ok' }))
app.use('/api/users', usersRouter)
app.use('/api/message-requests', messageRequestsRouter)
app.use('/api/conversations', conversationsRouter)
app.use('/api/conversations', messagesRouter)
app.use('/api/profile', profileRouter)
