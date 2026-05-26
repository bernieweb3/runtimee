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
