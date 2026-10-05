import cors from 'cors'
import express from 'express'
import { env } from '@/config/env.js'
import { applicationRouter } from '@/modules/application/applications.routes.js'
import { authRouter } from '@/modules/auth/auth.routes.js'
import { profileRouter } from "@/modules/profile/profile.routes.js";

export const app = express()

app.use(cors({ origin: env.clientOrigin }))
app.use(express.json())

app.use('/api/applications', applicationRouter)
app.use('/api/auth', authRouter)
app.get('/api/health', (_request, response) => response.json({ status: 'ok' }))
app.use("/api/profile", profileRouter);
