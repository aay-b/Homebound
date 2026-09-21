import cors from 'cors'
import express from 'express'
import { env } from '@/config/env.js'
import { messageRequestsRouter } from '@/modules/messages/message-requests.router.js'
import { usersRouter } from '@/modules/users/users.router.js'

export const app = express()
app.use(cors({ origin: env.clientOrigins }))
app.use(express.json())
app.get('/api/health', (_request, response) => response.json({ status: 'ok' }))
// User endpoints are grouped under one API prefix for future modules.
app.use('/api/users', usersRouter)
app.use('/api/message-requests', messageRequestsRouter)
