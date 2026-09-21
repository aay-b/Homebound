import { app } from '@/app.js'
import { env } from '@/config/env.js'

// Keep network startup separate from Express configuration for easier reuse in tests.
app.listen(env.port, () => console.log(`API listening at http://localhost:${env.port}`))
