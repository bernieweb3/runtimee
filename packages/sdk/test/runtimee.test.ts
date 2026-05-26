import { describe, expect, it, vi } from 'vitest'
import { Runtimee } from '../src/runtimee.js'
import type { RuntimeeConfig } from '../src/types.js'

describe('Runtimee', () => {
  const config: RuntimeeConfig = {
    apiKey: 're_test_key',
    baseUrl: 'http://localhost:3000',
  }

  it('creates instance with config', () => {
    const rt = new Runtimee(config)
    expect(rt).toBeDefined()
  })

  it('throws without apiKey', () => {
    expect(() => new Runtimee({} as RuntimeeConfig)).toThrow('apiKey')
  })

  it('exposes actors namespace', () => {
    const rt = new Runtimee(config)
    expect(rt.actors).toBeDefined()
    expect(typeof rt.actors.create).toBe('function')
    expect(typeof rt.actors.pay).toBe('function')
    expect(typeof rt.actors.previewPay).toBe('function')
    expect(typeof rt.actors.status).toBe('function')
  })
})
