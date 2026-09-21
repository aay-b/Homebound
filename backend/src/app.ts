import cors from 'cors'
import express from 'express'
import { env, isAllowedClientOrigin } from '@/config/env.js'
import { conversationsRouter } from '@/modules/messages/conversations.router.js'
import { messageRequestsRouter } from '@/modules/messages/message-requests.router.js'
import { usersRouter } from '@/modules/users/users.router.js'

export const app = express()
app.use(cors({ origin: (origin, callback) => callback(null, isAllowedClientOrigin(origin)) }))
app.use(express.json())
app.get('/api/health', (_request, response) => response.json({ status: 'ok' }))
// User endpoints are grouped under one API prefix for future modules.
app.use('/api/users', usersRouter)
app.use('/api/message-requests', messageRequestsRouter)
app.use('/api/conversations', conversationsRouter)
