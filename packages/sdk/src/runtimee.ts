import { ActorClient } from './actor-client.js'
import type { RuntimeeConfig } from './types.js'

export class Runtimee {
  public readonly actors: ActorClient

  constructor(config: RuntimeeConfig) {
    if (!config.apiKey) throw new Error('Runtimee: apiKey is required')
    this.actors = new ActorClient({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || 'https://api.runtimee.dev',
    })
  }
}
