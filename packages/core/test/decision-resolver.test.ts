import { describe, expect, it } from 'vitest'
import { DecisionResolver } from '../src/decision-resolver.js'
import type { PolicyResult } from '../src/types.js'

function makeResult(decision: PolicyResult['decision']): PolicyResult {
  return {
    policyId: 'pol_1',
    policyType: 'test',
    version: '1',
    decision,
    reason: { code: 'test', message: 'test' },
    evaluatedAt: new Date().toISOString(),
  }
}

describe('DecisionResolver', () => {
  it('returns denied for empty results', () => {
    expect(DecisionResolver.resolve([])).toBe('denied')
  })

  it('returns approved for single pass', () => {
    expect(DecisionResolver.resolve([makeResult('pass')])).toBe('approved')
  })

  it('returns denied for single deny', () => {
    expect(DecisionResolver.resolve([makeResult('deny')])).toBe('denied')
  })

  it('returns pending-review for single review', () => {
    expect(DecisionResolver.resolve([makeResult('review')])).toBe('pending-review')
  })

  it('deny overrides pass', () => {
    const results = [makeResult('pass'), makeResult('deny'), makeResult('pass')]
    expect(DecisionResolver.resolve(results)).toBe('denied')
  })

  it('deny overrides review', () => {
    const results = [makeResult('review'), makeResult('deny')]
    expect(DecisionResolver.resolve(results)).toBe('denied')
  })

  it('review overrides pass', () => {
    const results = [makeResult('pass'), makeResult('review')]
    expect(DecisionResolver.resolve(results)).toBe('pending-review')
  })

  it('returns approved for all passes', () => {
    const results = [makeResult('pass'), makeResult('pass'), makeResult('pass')]
    expect(DecisionResolver.resolve(results)).toBe('approved')
  })
})
