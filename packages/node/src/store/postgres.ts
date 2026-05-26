import pg from 'pg'
import type { Store, CreateActorRecord, ActorRecord, ExecutionRecord, ExecutionEventRecord } from './interface.js'

export function createPostgresStore(pool: pg.Pool): Store {
  return {
    async createActor(record: CreateActorRecord): Promise<ActorRecord> {
      const actorId = record.id
      const budgetId = `budget_${actorId}`
      const now = new Date().toISOString()

      await pool.query('BEGIN')
      try {
        await pool.query(
          `INSERT INTO actors (id, name, status, created_at)
           VALUES ($1, $2, 'active', $3)`,
          [actorId, record.name, now]
        )
        await pool.query(
          `INSERT INTO budgets (id, actor_id, amount, used, currency, period, reset_at)
           VALUES ($1, $2, $3, 0, $4, $5, $6)`,
          [budgetId, actorId, record.budget.amount.toString(), record.budget.currency, record.budget.period, now]
        )
        for (let i = 0; i < record.policies.length; i++) {
          const p = record.policies[i]
          await pool.query(
            `INSERT INTO policies (id, actor_id, type, version, config, priority)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [`pol_${actorId}_${i}`, actorId, p.type, p.version, JSON.stringify(p.config), p.priority]
          )
        }
        await pool.query('COMMIT')
      } catch (e) {
        await pool.query('ROLLBACK')
        throw e
      }

      const result = await this.getActor(actorId)
      return result as ActorRecord
    },

    async getActor(id: string): Promise<ActorRecord | null> {
      const actorRes = await pool.query(
        'SELECT id, name, status, created_at FROM actors WHERE id = $1',
        [id]
      )
      if (actorRes.rows.length === 0) return null
      const a = actorRes.rows[0]

      const budgetRes = await pool.query(
        'SELECT id, actor_id, amount, used, currency, period, reset_at FROM budgets WHERE actor_id = $1',
        [id]
      )
      const b = budgetRes.rows[0]

      const policyRes = await pool.query(
        'SELECT id, actor_id, type, version, config, priority FROM policies WHERE actor_id = $1 ORDER BY priority',
        [id]
      )

      return {
        actor: {
          id: a.id,
          name: a.name,
          status: a.status,
          createdAt: a.created_at,
        },
        budget: {
          id: b.id,
          actorId: b.actor_id,
          amount: BigInt(b.amount),
          used: BigInt(b.used),
          currency: b.currency,
          period: b.period,
          resetAt: b.reset_at,
        },
        policies: policyRes.rows.map((p: Record<string, unknown>) => ({
          id: p.id as string,
          actorId: p.actor_id as string,
          type: p.type as string,
          version: p.version as string,
          config: JSON.parse(p.config as string) as Record<string, unknown>,
          priority: p.priority as number,
        })),
        targets: [],
      }
    },

    async updateActorStatus(id: string, status: string): Promise<void> {
      await pool.query('UPDATE actors SET status = $1 WHERE id = $2', [status, id])
    },

    async consumeBudget(actorId: string, amount: bigint): Promise<boolean> {
      const res = await pool.query(
        `UPDATE budgets
         SET used = used + $1
         WHERE actor_id = $2 AND used + $1 <= amount
         RETURNING id`,
        [amount.toString(), actorId]
      )
      return (res.rowCount ?? 0) > 0
    },

    async getBudgetState(actorId: string) {
      const res = await pool.query(
        'SELECT amount, used, currency, period FROM budgets WHERE actor_id = $1',
        [actorId]
      )
      if (res.rows.length === 0) throw new Error(`Actor not found: ${actorId}`)
      const b = res.rows[0]
      const total = BigInt(b.amount)
      const used = BigInt(b.used)
      return {
        total,
        used,
        remaining: total - used,
        period: b.period,
        currency: b.currency,
      }
    },

    async createExecution(record: ExecutionRecord): Promise<void> {
      await pool.query(
        `INSERT INTO executions (id, actor_id, idempotency_key, request_hash, authorization, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          record.id,
          record.actorId,
          record.idempotencyKey,
          record.requestHash,
          JSON.stringify(record.authorization),
          record.createdAt,
        ]
      )
    },

    async getExecutionByIdempotencyKey(key: string): Promise<ExecutionRecord | null> {
      const res = await pool.query(
        'SELECT id, actor_id, idempotency_key, request_hash, authorization, created_at FROM executions WHERE idempotency_key = $1',
        [key]
      )
      if (res.rows.length === 0) return null
      const e = res.rows[0]
      return {
        id: e.id,
        actorId: e.actor_id,
        idempotencyKey: e.idempotency_key,
        requestHash: e.request_hash,
        authorization: JSON.parse(e.authorization),
        createdAt: e.created_at,
      }
    },

    async appendExecutionEvent(event: ExecutionEventRecord): Promise<void> {
      await pool.query(
        `INSERT INTO execution_events (id, execution_id, type, data, timestamp)
         VALUES ($1, $2, $3, $4, $5)`,
        [event.id, event.executionId, event.type, JSON.stringify(event.data), event.timestamp]
      )
    },

    async getExecutionEvents(executionId: string): Promise<ExecutionEventRecord[]> {
      const res = await pool.query(
        'SELECT id, execution_id, type, data, timestamp FROM execution_events WHERE execution_id = $1 ORDER BY timestamp',
        [executionId]
      )
      return res.rows.map((e: Record<string, unknown>) => ({
        id: e.id as string,
        executionId: e.execution_id as string,
        type: e.type as ExecutionEventRecord['type'],
        data: JSON.parse(e.data as string),
        timestamp: e.timestamp as string,
      }))
    },

    async getActorExecutionCount(actorId: string): Promise<number> {
      const res = await pool.query(
        'SELECT COUNT(*) as count FROM executions WHERE actor_id = $1',
        [actorId]
      )
      return parseInt(res.rows[0].count, 10)
    },
  }
}
