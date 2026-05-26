import { describe, expect, it } from 'vitest'
import { parseUsdc, formatUsdc } from '../src/conversion.js'

describe('parseUsdc', () => {
  it('converts whole USDC to smallest unit', () => {
    expect(parseUsdc('1')).toBe(1_000_000n)
    expect(parseUsdc('100')).toBe(100_000_000n)
  })

  it('converts decimal USDC to smallest unit', () => {
    expect(parseUsdc('0.05')).toBe(50_000n)
    expect(parseUsdc('1.5')).toBe(1_500_000n)
  })

  it('handles very small amounts', () => {
    expect(parseUsdc('0.000001')).toBe(1n)
  })

  it('throws on invalid input', () => {
    expect(() => parseUsdc('not-a-number')).toThrow()
  })
})

describe('formatUsdc', () => {
  it('converts smallest unit to whole USDC string', () => {
    expect(formatUsdc(1_000_000n)).toBe('1')
    expect(formatUsdc(100_000_000n)).toBe('100')
  })

  it('converts smallest unit to decimal USDC string', () => {
    expect(formatUsdc(50_000n)).toBe('0.05')
    expect(formatUsdc(1_500_000n)).toBe('1.5')
  })

  it('handles zero', () => {
    expect(formatUsdc(0n)).toBe('0')
  })

  it('handles 1 micro USDC', () => {
    expect(formatUsdc(1n)).toBe('0.000001')
  })
})
