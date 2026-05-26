import type { Intent, ExecutionPlan, SignedTransaction, Receipt, SimulationResult } from '@runtimee/core'
import type { ExecutionProvider, Signer } from './types.js'
import type { BroadcasterConfig } from './broadcaster.js'
import { createViemBroadcaster } from './broadcaster.js'
import { estimateGasWithBuffer } from './gas-strategy.js'
import { buildEvmTransaction } from './transaction-builder.js'

export interface EVMProviderConfig extends BroadcasterConfig {
  signerAddress: `0x${string}`
}

export function createEVMProvider(
  config: EVMProviderConfig,
  signer?: Signer
): ExecutionProvider {
  const broadcaster = createViemBroadcaster(config)
  const chainId = 8453

  return {
    async simulate(intent: Intent): Promise<SimulationResult> {
      return {
        decision: 'approved',
        policyResults: [],
        estimatedGas: 100000n,
        estimatedCost: intent.amount,
      }
    },

    async sign(executionPlan: ExecutionPlan): Promise<SignedTransaction> {
      if (!signer) {
        throw new Error('No signer configured. Cannot sign transactions.')
      }
      const auth = executionPlan.authorization
      const nonce = await broadcaster.getTransactionCount(config.signerAddress)
      const gasEstimate = await broadcaster.estimateGas({
        to: config.signerAddress,
        data: '0x' as `0x${string}`,
        value: 0n,
        from: config.signerAddress,
      })
      const gasLimit = estimateGasWithBuffer(gasEstimate)

      const tx = buildEvmTransaction({
        to: auth.intent.target as `0x${string}`,
        from: config.signerAddress,
        amount: auth.intent.amount,
        chainId,
        nonce,
        gasLimit,
      })

      const serialized = await signer.signTransaction({
        to: tx.to,
        data: tx.data,
        value: tx.value,
        chainId: tx.chainId,
        gasLimit: tx.gasLimit,
        nonce: tx.nonce,
        maxFeePerGas: tx.maxFeePerGas,
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
      })

      return { serialized, hash: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}` }
    },

    async broadcast(signed: SignedTransaction): Promise<`0x${string}`> {
      return broadcaster.sendRawTransaction(signed.serialized)
    },

    async wait(txHash: `0x${string}`, confirmations = 12): Promise<Receipt> {
      while (true) {
        const receipt = await broadcaster.getTransactionReceipt(txHash)
        if (receipt && receipt.blockNumber > 0n) {
          return {
            txHash,
            status: receipt.status === 'success' ? 'confirmed' : 'failed',
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed,
            effectiveGasPrice: receipt.effectiveGasPrice,
          }
        }
        await new Promise((r) => setTimeout(r, 2000))
      }
    },
  }
}
