import { Router, type Request, type Response } from 'express'
import type { Store } from './store/interface.js'
import type { ExecutionProvider } from '@runtimee/evm'
import { PolicyEngine, createBudgetCheckPolicy, createAllowlistPolicy } from '@runtimee/core'

export interface RouterConfig {
  store: Store
  executionProvider?: ExecutionProvider
}

export function createRouter(config: RouterConfig): Router {
  const router = Router()

  router.post('/actors', async (req: Request, res: Response) => {
    try {
      const { name, budget, policies } = req.body
      if (!name || !budget) {
        res.status(400).json({ error: 'name and budget are required' })
        return
      }

      const actorId = `actor_${Date.now()}`
      const record = await config.store.createActor({
        id: actorId,
        name,
        budget: {
          amount: BigInt(budget.amount),
          currency: budget.currency || 'USDC',
          period: budget.period || 'monthly',
        },
        policies: (policies || []).map((p: Record<string, unknown>, i: number) => ({
          type: p.type as string,
          version: (p.version as string) || '1',
          config: (p.config as Record<string, unknown>) || {},
          priority: i,
        })),
      })

      res.status(201).json({
        id: record.actor.id,
        name: record.actor.name,
        status: record.actor.status,
        createdAt: record.actor.createdAt,
      })
    } catch (err) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  router.get('/actors/:id', async (req: Request, res: Response) => {
    try {
      const record = await config.store.getActor(req.params.id)
      if (!record) {
        res.status(404).json({ error: 'Actor not found' })
        return
      }

      const budget = await config.store.getBudgetState(req.params.id)
      const txCount = await config.store.getActorExecutionCount(req.params.id)

      res.json({
        id: record.actor.id,
        name: record.actor.name,
        status: record.actor.status,
        createdAt: record.actor.createdAt,
        budget: {
          total: budget.total.toString(),
          used: budget.used.toString(),
          remaining: budget.remaining.toString(),
          period: budget.period,
          currency: budget.currency,
        },
        txCount,
      })
    } catch (err) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  router.post('/actors/:id/preview-pay', async (req: Request, res: Response) => {
    try {
      const record = await config.store.getActor(req.params.id)
      if (!record) {
        res.status(404).json({ error: 'Actor not found' })
        return
      }

      const { target, amount, purpose } = req.body
      if (!target || !amount) {
        res.status(400).json({ error: 'target and amount are required' })
        return
      }

      const evaluators = record.policies.map((p) => {
        switch (p.type) {
          case 'budget-check':
            return createBudgetCheckPolicy(p.id, p.version)
          case 'allowlist':
            return createAllowlistPolicy(p.id, p.version, (p.config.allowedTargets || []) as string[])
          default:
            throw new Error(`Unknown policy type: ${p.type}`)
        }
      })

      const engine = new PolicyEngine(evaluators)
      const budgetState = await config.store.getBudgetState(req.params.id)

      const authorization = await engine.evaluate(
        record.actor,
        {
          target,
          amount: BigInt(amount),
          purpose: purpose || { type: 'preview', id: '' },
        },
        budgetState
      )

      res.json({
        decision: authorization.decision,
        policyResults: authorization.policyResults,
      })
    } catch (err) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  router.post('/actors/:id/pay', async (req: Request, res: Response) => {
    try {
      const record = await config.store.getActor(req.params.id)
      if (!record) {
        res.status(404).json({ error: 'Actor not found' })
        return
      }

      const { target, amount, purpose, idempotencyKey } = req.body
      if (!target || !amount) {
        res.status(400).json({ error: 'target and amount are required' })
        return
      }

      if (idempotencyKey) {
        const existing = await config.store.getExecutionByIdempotencyKey(idempotencyKey)
        if (existing) {
          res.json({ executionId: existing.id, status: 'confirmed' })
          return
        }
      }

      const evaluators = record.policies.map((p) => {
        switch (p.type) {
          case 'budget-check':
            return createBudgetCheckPolicy(p.id, p.version)
          case 'allowlist':
            return createAllowlistPolicy(p.id, p.version, (p.config.allowedTargets || []) as string[])
          default:
            throw new Error(`Unknown policy type: ${p.type}`)
        }
      })

      const engine = new PolicyEngine(evaluators)
      const budgetState = await config.store.getBudgetState(req.params.id)

      const authorization = await engine.evaluate(
        record.actor,
        {
          target,
          amount: BigInt(amount),
          purpose: purpose || { type: 'payment', id: '' },
          idempotencyKey,
        },
        budgetState
      )

      if (authorization.decision !== 'approved') {
        res.status(403).json({
          error: 'Payment denied by policy',
          decision: authorization.decision,
          policyResults: authorization.policyResults,
        })
        return
      }

      const consumed = await config.store.consumeBudget(req.params.id, BigInt(amount))
      if (!consumed) {
        res.status(403).json({ error: 'Budget exhausted' })
        return
      }

      const executionId = `exec_${Date.now()}`
      const now = new Date().toISOString()
      await config.store.createExecution({
        id: executionId,
        actorId: req.params.id,
        idempotencyKey: idempotencyKey || executionId,
        requestHash: '',
        authorization: {
          intent: authorization.intent,
          policyResults: authorization.policyResults,
          decision: authorization.decision,
          evaluatedAt: authorization.evaluatedAt,
          actorVersion: authorization.actorVersion,
        },
        createdAt: now,
      })

      await config.store.appendExecutionEvent({
        id: `evt_${executionId}_1`,
        executionId,
        type: 'submitted',
        data: {},
        timestamp: now,
      })

      res.status(201).json({
        executionId,
        status: 'pending',
      })
    } catch (err) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  return router
}
