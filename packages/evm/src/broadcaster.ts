import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import type { Broadcaster } from './types.js'

export interface BroadcasterConfig {
  rpcUrl: string
}

export function createViemBroadcaster(config: BroadcasterConfig): Broadcaster {
  const publicClient = createPublicClient({
    chain: base,
    transport: http(config.rpcUrl),
  })

  return {
    async sendRawTransaction(signedTx) {
      const hash = await publicClient.request({
        method: 'eth_sendRawTransaction',
        params: [signedTx],
      })
      return hash
    },

    async getTransactionReceipt(txHash) {
      const receipt = await publicClient.getTransactionReceipt({ hash: txHash })
      if (!receipt) return null
      return {
        status: receipt.status === 'success' ? 'success' : 'reverted',
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        effectiveGasPrice: receipt.effectiveGasPrice,
      }
    },

    async getTransactionCount(address) {
      return publicClient.getTransactionCount({ address })
    },

    async estimateGas(tx) {
      return publicClient.estimateGas({
        account: tx.from,
        to: tx.to,
        data: tx.data,
        value: tx.value,
      })
    },
  }
}
