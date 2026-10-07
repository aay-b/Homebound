import { createServer } from 'node:http'
import { app } from '@/app.js'
import { env } from '@/config/env.js'
import { createSocketServer } from '@/realtime/socket.js'

// Express and Socket.IO share one HTTP server and port.
const httpServer = createServer(app)
createSocketServer(httpServer)

httpServer.listen(env.port, () => console.log(`API listening at http://localhost:${env.port}`))
