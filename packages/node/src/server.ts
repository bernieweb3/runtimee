import express, { type Express } from 'express'
import { createRouter } from './routes.js'

export interface ServerConfig {
  port: number
  store: import('./store/interface.js').Store
  executionProvider?: import('@runtimee/evm').ExecutionProvider
}

export function createApp(config: ServerConfig): Express {
  const app = express()
  app.use(express.json())

  const router = createRouter({
    store: config.store,
    executionProvider: config.executionProvider,
  })

  app.use('/api', router)

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', version: '0.1.0' })
  })

  return app
}

export function startServer(config: ServerConfig) {
  const app = createApp(config)
  app.listen(config.port, () => {
    console.log(`Runtimee server listening on port ${config.port}`)
  })
}
