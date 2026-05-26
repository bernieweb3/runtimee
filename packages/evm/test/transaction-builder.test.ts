import { describe, expect, it } from 'vitest'
import { encodeUsdcTransfer, buildEvmTransaction } from '../src/transaction-builder.js'

describe('encodeUsdcTransfer', () => {
  it('encodes a USDC transfer to a valid hex string', () => {
    const data = encodeUsdcTransfer(
      '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
      1000000n // 1 USDC
    )
    expect(data).toMatch(/^0x[0-9a-f]+$/)
    // Should contain the transfer function signature
    expect(data.length).toBeGreaterThan(10)
  })

  it('encodes different amounts differently', () => {
    const a = encodeUsdcTransfer(
      '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
      1000000n
    )
    const b = encodeUsdcTransfer(
      '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
      2000000n
    )
    expect(a).not.toBe(b)
  })
})

describe('buildEvmTransaction', () => {
  it('builds a valid EVM transaction object', () => {
    const tx = buildEvmTransaction({
      to: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
      from: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`,
      amount: 5000000n, // 5 USDC
      chainId: 8453,
      nonce: 0,
      gasLimit: 100000n,
    })
    expect(tx.to).toBe('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913')
    expect(tx.value).toBe(0n) // USDC is ERC20, value is 0
    expect(tx.data).toMatch(/^0x[0-9a-f]+$/)
    expect(tx.chainId).toBe(8453)
    expect(tx.nonce).toBe(0)
  })
})
