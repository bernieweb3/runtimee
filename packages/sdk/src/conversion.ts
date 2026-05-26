const USDC_DECIMALS = 6
const MULTIPLIER = 10n ** BigInt(USDC_DECIMALS)

export function parseUsdc(amount: string): bigint {
  const parts = amount.split('.')
  if (parts.length > 2) throw new Error(`Invalid USDC amount: ${amount}`)
  const whole = parts[0] || '0'
  let fraction = parts[1] || ''
  if (fraction.length > USDC_DECIMALS) {
    fraction = fraction.slice(0, USDC_DECIMALS)
  }
  fraction = fraction.padEnd(USDC_DECIMALS, '0')
  const full = whole + fraction
  const parsed = BigInt(full)
  if (parsed < 0n) throw new Error(`Negative USDC amount: ${amount}`)
  return parsed
}

export function formatUsdc(amount: bigint): string {
  const whole = amount / MULTIPLIER
  const fraction = amount % MULTIPLIER
  if (fraction === 0n) return whole.toString()
  const fractionStr = fraction.toString().padStart(USDC_DECIMALS, '0').replace(/0+$/, '')
  return `${whole}.${fractionStr}`
}
