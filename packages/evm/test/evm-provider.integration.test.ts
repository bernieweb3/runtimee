import { describe, expect, it } from 'vitest'
import { USDC_ADDRESS_BASE, USDC_DECIMALS } from '../src/types.js'

describe('EVM types', () => {
  it('USDC address on Base is valid hex', () => {
    expect(USDC_ADDRESS_BASE).toMatch(/^0x[0-9a-fA-F]{40}$/)
  })

  it('USDC has 6 decimals', () => {
    expect(USDC_DECIMALS).toBe(6)
  })
})

import { estimateGasWithBuffer } from '../src/gas-strategy.js'
import { createEVMProvider } from '../src/evm-provider.js'
import type { Intent } from '@runtimee/core'

describe('EVMProvider', () => {
  it('can be instantiated', () => {
    const provider = createEVMProvider({
      rpcUrl: 'https://sepolia.base.org',
      signerAddress: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
    })
    expect(provider).toBeDefined()
    expect(typeof provider.simulate).toBe('function')
    expect(typeof provider.broadcast).toBe('function')
  })
})

describe('GasStrategy', () => {
  it('adds 20% buffer to estimated gas', () => {
    const result = estimateGasWithBuffer(100000n)
    expect(result).toBe(120000n)
  })

  it('handles zero gas', () => {
    const result = estimateGasWithBuffer(0n)
    expect(result).toBe(0n)
  })

  it('rounds up fractional buffers', () => {
    const result = estimateGasWithBuffer(1n)
    expect(result).toBe(2n) // ceil(1 * 1.2) = 2
  })
})
