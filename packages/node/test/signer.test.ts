import { describe, expect, it } from 'vitest'
import { createLocalSigner } from '../src/signer.js'

describe('LocalSigner', () => {
  const signer = createLocalSigner(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
  )

  it('signs a transaction', async () => {
    const signed = await signer.signTransaction({
      to: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
      data: '0x' as `0x${string}`,
      value: 0n,
      chainId: 8453,
      gasLimit: 100000n,
      nonce: 0,
    })
    expect(signed).toMatch(/^0x[0-9a-f]+$/)
    expect(signed.length).toBeGreaterThan(100)
  })
})
